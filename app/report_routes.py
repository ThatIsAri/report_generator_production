import json
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from flask import (
    abort,
    Blueprint,
    current_app,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    send_file,
    send_from_directory,
    session,
    url_for,
)
from sqlalchemy import inspect, or_, text
from sqlalchemy.exc import OperationalError, ProgrammingError
from werkzeug.utils import secure_filename

from app.auth import login_required
from app.extensions import db
from app.file_security import validate_uploaded_file
from app.html_sanitizer import sanitize_editor_html
from app.models import (
    Folder,
    GroupReportAccess,
    ImportedDataBlock,
    ImportedSourceFile,
    Report,
    ReportDraft,
    ReportEditorState,
    ReportVersion,
    Template,
    UserGroup,
    UserGroupMember,
    ReportShare,
)
from app.organization_service import normalize_user_role
from app.report_export_service import (
    EXPORT_FORMATS,
    build_export_filename,
    build_report_export_data,
    export_report_to_docx,
    export_report_to_pdf,
    export_report_to_xml,
)
from app.report_share_service import (
    can_manage_report_shares,
    ensure_report_share_schema,
    get_current_user_with_organization,
    get_user_display_name,
    get_report_shares,
    replace_report_access,
)
from app.scanners.scan_dispatcher import scan_file_to_blocks
from app.template_taxonomy_service import get_template_taxonomy_payload
from app.time_utils import utc_now
from app.user_action_log_service import log_user_action


reports_bp = Blueprint("reports", __name__)
_folder_schema_ready = False

ALLOWED_UPLOAD_EXTENSIONS = {".docx", ".xlsx", ".xlsm", ".csv", ".pdf"}
ALLOWED_UPLOAD_MIME_TYPES = {
    ".docx": {"application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
    ".xlsx": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
    ".xlsm": {"application/vnd.ms-excel.sheet.macroenabled.12"},
    ".csv": {"text/csv", "application/csv", "text/plain", "application/vnd.ms-excel"},
    ".pdf": {"application/pdf"},
}

REPORT_TEMPLATE_OPTIONS = {
    "generic_report_default": "Универсальный отчет",
    "analytical_report_default": "Аналитический отчет",
    "table_report_default": "Табличный отчет",
    "imported_report_default": "Отчет на основе импортированных данных",
    "summary_report_default": "Сводный отчет",
}

EXPORT_MIME_TYPES = {
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "pdf": "application/pdf",
    "xml": "application/xml; charset=utf-8",
}

CREATE_TEMPLATE_OPTIONS = [
    {
        "key": "generic_report_default",
        "title": "Универсальный отчет",
        "type": "basic",
        "description": "Базовый шаблон для произвольной отчетности.",
    },
    {
        "key": "analytical_report_default",
        "title": "Аналитический отчет",
        "type": "analytical",
        "description": "Структура для выводов, сравнения и интерпретации данных.",
    },
    {
        "key": "table_report_default",
        "title": "Табличный отчет",
        "type": "table",
        "description": "Шаблон с акцентом на таблицы и числовые показатели.",
    },
    {
        "key": "imported_report_default",
        "title": "Отчет по импортированным данным",
        "type": "imported",
        "description": "Подходит для отчета, собранного из DOCX, PDF, Excel или CSV.",
    },
    {
        "key": "summary_report_default",
        "title": "Сводный отчет",
        "type": "summary",
        "description": "Краткая итоговая форма по нескольким источникам.",
    },
]

@reports_bp.before_request
def prepare_folder_schema():
    _ensure_folder_schema()


@reports_bp.route("/")
def index():
    current_user = get_current_user_with_organization(session.get("user_id"))
    reports = (
        _filter_accessible_reports(Report.query, current_user)
        .order_by(Report.updated_at.desc(), Report.created_at.desc())
        .all()
    )
    folders = Folder.query.order_by(Folder.parent_id.asc(), Folder.name.asc()).all()
    templates = Template.query.order_by(Template.updated_at.desc(), Template.created_at.desc()).all()
    organization_id = _get_session_organization_id()
    folder_rows = _build_folder_rows(folders)
    total_reports = len(reports)
    latest_report = reports[0] if reports else None

    return render_template(
        "reports/dashboard.html",
        reports=reports,
        total_reports=total_reports,
        latest_report=latest_report,
        folders=folders,
        folder_rows=folder_rows,
        dashboard_templates=[_template_to_dict(template) for template in templates],
        template_options=_build_report_template_options(templates),
        template_taxonomy=get_template_taxonomy_payload(organization_id),
        create_template_options=CREATE_TEMPLATE_OPTIONS,
        today_iso=utc_now().date().isoformat(),
        today_display=utc_now().strftime("%d.%m.%Y"),
    )


@reports_bp.route("/api/reports/import/scan", methods=["POST"])
@reports_bp.route("/reports/import/scan", methods=["POST"])
def scan_import_file():
    uploaded_file = request.files.get("file")

    if not uploaded_file or not uploaded_file.filename:
        return jsonify({"success": False, "error": "Выберите файл для импорта."}), 400

    try:
        stored_path, original_filename, extension = _save_temp_import_file(uploaded_file)
        blocks = scan_file_to_blocks(stored_path, extension)
    except ValueError as error:
        return jsonify({"success": False, "error": str(error)}), 400

    token = uuid4().hex
    payload = {
        "file_token": token,
        "original_filename": original_filename,
        "stored_filename": stored_path.name,
        "file_extension": extension,
        "blocks": [block.to_dict() for block in blocks],
        "warnings": [],
    }

    token_path = _get_storage_dir("temp_imports") / f"{token}.json"
    token_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    return jsonify(
        {
            "success": True,
            "file_token": token,
            "original_filename": original_filename,
            "blocks": payload["blocks"],
            "warnings": payload["warnings"],
        }
    )


@reports_bp.route("/api/folders", methods=["POST"])
def api_create_folder():
    _ensure_folder_schema()
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    parent_id = _normalize_optional_int(data.get("parent_id"))

    if not name:
        return jsonify({"success": False, "error": "Введите название папки"}), 400

    if parent_id and not db.session.get(Folder, parent_id):
        return jsonify({"success": False, "error": "Родительская папка не найдена"}), 400

    folder = Folder(name=name, parent_id=parent_id)
    db.session.add(folder)
    db.session.commit()

    return jsonify({"success": True, "folder": _folder_to_dict(folder)}), 201


@reports_bp.route("/api/folders", methods=["GET"])
def api_get_folders():
    _ensure_folder_schema()
    folders = Folder.query.order_by(Folder.parent_id.asc(), Folder.name.asc()).all()

    return jsonify(
        {
            "success": True,
            "folders": [_folder_to_dict(folder) for folder in folders],
        }
    )


@reports_bp.route("/api/folders/search", methods=["GET"])
def api_search_folders():
    _ensure_folder_schema()
    query = (request.args.get("q") or "").strip()
    folders_query = Folder.query

    if query:
        folders_query = folders_query.filter(Folder.name.ilike(f"%{query}%"))

    folders = folders_query.order_by(Folder.parent_id.asc(), Folder.name.asc()).all()

    return jsonify(
        {
            "success": True,
            "folders": [_folder_to_dict(folder) for folder in folders],
        }
    )


@reports_bp.route("/api/folders/<int:folder_id>/reports", methods=["GET"])
def api_get_folder_reports(folder_id):
    _ensure_folder_schema()
    Folder.query.get_or_404(folder_id)
    current_user = get_current_user_with_organization(session.get("user_id"))
    reports = (
        _filter_accessible_reports(Report.query.filter_by(folder_id=folder_id), current_user)
        .order_by(Report.updated_at.desc(), Report.created_at.desc())
        .all()
    )

    return jsonify(
        {
            "success": True,
            "reports": [_folder_report_to_dict(report) for report in reports],
        }
    )


@reports_bp.route("/api/folders/<int:folder_id>/reports/search", methods=["GET"])
def api_search_folder_reports(folder_id):
    _ensure_folder_schema()
    Folder.query.get_or_404(folder_id)
    current_user = get_current_user_with_organization(session.get("user_id"))
    query = (request.args.get("q") or "").strip()
    reports_query = _filter_accessible_reports(Report.query.filter_by(folder_id=folder_id), current_user)

    if query:
        search_pattern = f"%{query}%"
        reports_query = reports_query.filter(
            or_(
                Report.report_title.ilike(search_pattern),
                Report.tag.ilike(search_pattern),
                Report.template_key.ilike(search_pattern),
            )
        )

    reports = reports_query.order_by(Report.updated_at.desc(), Report.created_at.desc()).all()

    return jsonify(
        {
            "success": True,
            "reports": [_folder_report_to_dict(report) for report in reports],
        }
    )


@reports_bp.route("/api/reports/<int:report_id>/folder", methods=["PATCH"])
def api_update_report_folder(report_id):
    _ensure_folder_schema()
    report = Report.query.get_or_404(report_id)
    current_user = get_current_user_with_organization(session.get("user_id"))

    if not _can_access_report(report, current_user):
        return _report_access_denied_json()

    data = request.get_json(silent=True) or {}
    folder_id = _normalize_optional_int(data.get("folder_id"))
    folder = None

    if folder_id:
        folder = db.session.get(Folder, folder_id)

        if not folder:
            return jsonify({"success": False, "error": "Папка не найдена"}), 404

    report.folder_id = folder.id if folder else None

    draft = _find_draft_for_report(report.id)
    if draft:
        draft.folder_name = folder.name if folder else None

    db.session.commit()

    return jsonify(
        {
            "success": True,
            "folder_id": report.folder_id,
            "folder_name": folder.name if folder else "",
        }
    )


@reports_bp.route("/api/reports/<int:report_id>/link", methods=["PATCH"])
def api_update_report_link(report_id):
    _ensure_folder_schema()
    report = Report.query.get_or_404(report_id)
    current_user = get_current_user_with_organization(session.get("user_id"))

    if not _can_access_report(report, current_user):
        return _report_access_denied_json()

    data = request.get_json(silent=True) or {}
    linked_report_id = _normalize_optional_int(data.get("linked_report_id"))
    linked_report = None

    if linked_report_id:
        if linked_report_id == report.id:
            return jsonify({"success": False, "error": "Нельзя связать отчет сам с собой"}), 400

        linked_report = db.session.get(Report, linked_report_id)

        if not linked_report:
            return jsonify({"success": False, "error": "Связанный отчет не найден"}), 404

        if not _can_access_report(linked_report, current_user):
            return _report_access_denied_json("Недостаточно прав для связи с выбранным отчетом.")

    report.linked_report_id = linked_report.id if linked_report else None
    db.session.commit()

    return jsonify(
        {
            "success": True,
            "linked_report_id": report.linked_report_id,
            "linked_report_title": linked_report.report_title if linked_report else "",
            "linked_report_url": url_for("reports.view_report", report_id=linked_report.id) if linked_report else "",
        }
    )


@reports_bp.route("/api/reports/link-tree")
def api_report_link_tree():
    _ensure_folder_schema()
    current_user = get_current_user_with_organization(session.get("user_id"))
    folders = Folder.query.order_by(Folder.parent_id.asc(), Folder.name.asc()).all()
    reports = (
        _filter_accessible_reports(Report.query, current_user)
        .order_by(Report.report_title.asc(), Report.created_at.asc())
        .all()
    )

    return jsonify(
        {
            "success": True,
            "folders": [_folder_to_dict(folder) for folder in folders],
            "reports": [_link_tree_report_to_dict(report) for report in reports],
        }
    )


@reports_bp.route("/api/reports/create", methods=["POST"])
@reports_bp.route("/reports/create", methods=["POST"])
def create_report():
    _ensure_folder_schema()
    current_user = get_current_user_with_organization(session.get("user_id"))
    payload = request.get_json(silent=True) if request.is_json else None

    if payload:
        report_title = (payload.get("report_title") or "").strip()
        report_date_raw = (payload.get("report_date") or "").strip()
        tag = (payload.get("tag") or "").strip()
        template_key = (payload.get("template_key") or "").strip()
        template_title = (payload.get("template_title") or "").strip()
        folder_name = (payload.get("folder_name") or "").strip()
        folder_id_raw = str(payload.get("folder_id") or "").strip()
        linked_report_raw = str(payload.get("linked_report_id") or "").strip()
        file_tokens = payload.get("file_tokens") or [
            source_file.get("file_token")
            for source_file in payload.get("source_files") or []
            if source_file.get("file_token")
        ]
        share_user_ids = payload.get("share_user_ids") or []
        share_group_ids = payload.get("share_group_ids") or []
    else:
        report_title = request.form.get("report_title", "").strip()
        report_date_raw = request.form.get("report_date", "").strip()
        tag = request.form.get("tag", "").strip()
        template_key = request.form.get("template_key", "").strip()
        template_title = request.form.get("template_title", "").strip()
        folder_name = request.form.get("folder_name", "").strip()
        folder_id_raw = request.form.get("folder_id", "").strip()
        linked_report_raw = request.form.get("linked_report_id", "").strip()
        file_tokens = request.form.getlist("file_tokens")
        share_user_ids = _parse_share_user_ids(request.form.get("share_user_ids", ""))
        share_group_ids = _parse_share_user_ids(request.form.get("share_group_ids", ""))

    if not report_title:
        return _create_report_error("Введите обязательные данные")

    if not template_key:
        return _create_report_error("Выберите шаблон отчета")

    try:
        report_date = datetime.strptime(report_date_raw, "%Y-%m-%d").date()
    except ValueError:
        return _create_report_error("Исправьте ошибки во вводе данных")

    linked_report_id = None
    folder_id = None
    folder = None

    if folder_id_raw:
        try:
            folder_id = int(folder_id_raw)
        except ValueError:
            folder_id = None

    if folder_id:
        folder = db.session.get(Folder, folder_id)

        if not folder:
            folder_id = None

    if linked_report_raw:
        try:
            linked_report_id = int(linked_report_raw)
        except ValueError:
            linked_report_id = None

    if linked_report_id:
        linked_report = db.session.get(Report, linked_report_id)

        if not linked_report:
            linked_report_id = None
        elif not _can_access_report(linked_report, current_user):
            return _create_report_error("Недостаточно прав для связи с выбранным отчетом")

    imported_payloads = []

    for token in file_tokens:
        try:
            imported_payloads.append(_load_temp_import_payload(token))
        except ValueError as error:
            return _create_report_error(str(error))

    source_type = "imported_data" if imported_payloads else "manual"
    source_filename = None

    if imported_payloads:
        source_filename = ", ".join(
            payload["original_filename"] for payload in imported_payloads[:3]
        )

    report = Report(
        report_title=report_title,
        report_author=get_user_display_name(current_user) if current_user else "Пользователь",
        report_date=report_date,
        tag=tag or None,
        template_key=template_key or "generic_report_default",
        folder_id=folder_id,
        linked_report_id=linked_report_id,
        source_type=source_type,
        source_filename=source_filename,
    )

    db.session.add(report)
    db.session.flush()

    draft = ReportDraft(
        report_title=report_title,
        report_date=report_date,
        tag=tag or None,
        template_key=template_key,
        template_title=template_title or _get_template_title(template_key),
        folder_name=(folder.name if folder else folder_name or None),
        access_placeholder="not_configured",
        linked_report_id=report.id,
        status="draft",
    )

    db.session.add(draft)
    db.session.flush()

    block_order = 0

    for file_order, payload in enumerate(imported_payloads):
        source_file = ImportedSourceFile(
            draft_id=draft.id,
            original_filename=payload["original_filename"],
            stored_filename=payload["stored_filename"],
            file_extension=payload["file_extension"],
            status="completed",
            order_index=file_order,
        )
        db.session.add(source_file)
        db.session.flush()

        for block in payload.get("blocks", []):
            color_index = block_order % 7 + 1
            rows = block.get("rows")
            content_json = block.get("content_json") or {}
            if rows and "rows" not in content_json:
                content_json["rows"] = rows

            db.session.add(
                ImportedDataBlock(
                    draft_id=draft.id,
                    source_file_id=source_file.id,
                    block_type=block.get("type") or "text",
                    order_index=block_order,
                    source_file_name=payload["original_filename"],
                    content_text=block.get("content") or block.get("raw_text") or "",
                    content_json=json.dumps(content_json, ensure_ascii=False),
                    color_index=color_index,
                    is_deleted=False,
                )
            )
            block_order += 1

    direct_blocks = payload.get("blocks") if payload else []

    for block in direct_blocks or []:
        color_index = block_order % 7 + 1
        content_json = block.get("content_json") or {}
        rows = block.get("rows")

        if rows and "rows" not in content_json:
            content_json["rows"] = rows

        db.session.add(
            ImportedDataBlock(
                draft_id=draft.id,
                source_file_id=None,
                block_type=block.get("type") or block.get("block_type") or "text",
                order_index=block_order,
                source_file_name=block.get("source_file_name") or "",
                content_text=block.get("content_text") or block.get("content") or "",
                content_json=json.dumps(content_json, ensure_ascii=False),
                color_index=color_index,
                is_deleted=False,
            )
        )
        block_order += 1

    db.session.add(
        ReportEditorState(
            draft_id=draft.id,
            document_html="",
            document_json=json.dumps({"pages": []}, ensure_ascii=False),
        )
    )

    if current_user:
        replace_report_access(
            report,
            _include_current_user_share(share_user_ids, current_user),
            share_group_ids,
            current_user,
        )
        _grant_current_user_manage_access(report, current_user)

    db.session.commit()

    if _wants_json_response():
        return jsonify(
            {
                "success": True,
                "report_id": report.id,
                "draft_id": draft.id,
                "redirect_url": url_for("reports.compose_preview", draft_id=draft.id),
            }
        )

    flash("Отчет успешно создан", "success")
    return redirect(url_for("reports.compose_preview", draft_id=draft.id))


@reports_bp.route("/reports/<int:draft_id>/compose-preview")
def compose_preview(draft_id):
    draft = ReportDraft.query.get_or_404(draft_id)

    if not _can_access_draft(draft, get_current_user_with_organization(session.get("user_id"))):
        abort(403)

    block_models = (
        ImportedDataBlock.query.filter_by(draft_id=draft.id, is_deleted=False)
        .order_by(ImportedDataBlock.order_index.asc())
        .all()
    )

    return render_template(
        "reports/compose_preview.html",
        draft=draft,
        blocks=_build_block_views(block_models),
    )


@reports_bp.route("/api/reports/<int:draft_id>/blocks")
def api_report_blocks(draft_id):
    draft = ReportDraft.query.get_or_404(draft_id)

    if not _can_access_draft(draft, get_current_user_with_organization(session.get("user_id"))):
        return _report_access_denied_json()

    block_models = (
        ImportedDataBlock.query.filter_by(draft_id=draft_id, is_deleted=False)
        .order_by(ImportedDataBlock.order_index.asc())
        .all()
    )

    return jsonify(
        {
            "success": True,
            "blocks": _build_block_views(block_models),
        }
    )


@reports_bp.route("/api/reports/blocks/<int:block_id>", methods=["PATCH"])
def api_update_imported_block(block_id):
    block = ImportedDataBlock.query.get_or_404(block_id)

    if not _can_access_block(block, get_current_user_with_organization(session.get("user_id"))):
        return _report_access_denied_json()

    data = request.get_json(silent=True) or {}

    if "is_deleted" in data:
        block.is_deleted = bool(data.get("is_deleted"))

    if "content_text" in data:
        block.content_text = data.get("content_text") or ""

    if "content_json" in data:
        block.content_json = json.dumps(data.get("content_json") or {}, ensure_ascii=False)

    db.session.commit()

    return jsonify({"success": True})


@reports_bp.route("/api/reports/blocks/<int:block_id>/delete", methods=["POST", "PATCH", "DELETE"])
@reports_bp.route("/reports/blocks/<int:block_id>/delete", methods=["POST"])
def delete_imported_block(block_id):
    block = ImportedDataBlock.query.get_or_404(block_id)

    if not _can_access_block(block, get_current_user_with_organization(session.get("user_id"))):
        return _report_access_denied_json()

    block.is_deleted = True
    db.session.commit()

    return jsonify({"success": True})


@reports_bp.route("/api/reports/blocks/<int:block_id>/restore", methods=["POST", "PATCH"])
@reports_bp.route("/reports/blocks/<int:block_id>/restore", methods=["POST"])
def restore_imported_block(block_id):
    block = ImportedDataBlock.query.get_or_404(block_id)

    if not _can_access_block(block, get_current_user_with_organization(session.get("user_id"))):
        return _report_access_denied_json()

    block.is_deleted = False
    db.session.commit()

    return jsonify({"success": True})


@reports_bp.route("/api/reports/<int:draft_id>/blocks/order", methods=["PATCH", "POST"])
@reports_bp.route("/reports/<int:draft_id>/blocks/reorder", methods=["POST"])
def reorder_imported_blocks(draft_id):
    draft = ReportDraft.query.get_or_404(draft_id)

    if not _can_access_draft(draft, get_current_user_with_organization(session.get("user_id"))):
        return _report_access_denied_json()

    data = request.get_json(silent=True) or {}
    block_ids = data.get("block_ids") or []

    blocks = (
        ImportedDataBlock.query.filter(
            ImportedDataBlock.draft_id == draft_id,
            ImportedDataBlock.id.in_(block_ids),
        )
        .all()
    )
    blocks_by_id = {block.id: block for block in blocks}

    for order_index, block_id in enumerate(block_ids):
        try:
            normalized_id = int(block_id)
        except (TypeError, ValueError):
            continue

        block = blocks_by_id.get(normalized_id)
        if block:
            block.order_index = order_index

    db.session.commit()

    return jsonify({"success": True})


@reports_bp.route("/reports/<int:draft_id>/draft", methods=["POST"])
def save_draft(draft_id):
    draft = ReportDraft.query.get_or_404(draft_id)

    if not _can_access_draft(draft, get_current_user_with_organization(session.get("user_id"))):
        abort(403)

    draft.status = "draft"
    draft.updated_at = utc_now()
    db.session.commit()

    accept_header = request.headers.get("Accept", "")
    if request.headers.get("X-Requested-With") == "XMLHttpRequest" or "application/json" in accept_header:
        return jsonify(
            {
                "success": True,
                "draft_id": draft.id,
                "updated_at": draft.updated_at.isoformat() if draft.updated_at else None,
            }
        )

    flash("Сохранено в черновик", "success")

    return redirect(url_for("reports.index"))


@reports_bp.route("/reports/<int:draft_id>/editor")
def report_editor(draft_id):
    draft = ReportDraft.query.get_or_404(draft_id)

    if not _can_access_draft(draft, get_current_user_with_organization(session.get("user_id"))):
        abort(403)

    block_models = (
        ImportedDataBlock.query.filter_by(draft_id=draft.id, is_deleted=False)
        .order_by(ImportedDataBlock.order_index.asc())
        .all()
    )

    return render_template(
        "reports/editor.html",
        draft=draft,
        blocks=_build_block_views(block_models),
        editor_state=_get_or_create_editor_state(draft.id),
    )


@reports_bp.route("/reports/<int:report_id>/edit")
def report_editor_for_report(report_id):
    report = Report.query.get_or_404(report_id)
    current_user = get_current_user_with_organization(session.get("user_id"))

    if not _can_access_report(report, current_user):
        abort(403)

    draft = _find_draft_for_report(report.id)

    if not draft:
        abort(404)

    return redirect(url_for("reports.report_editor", draft_id=draft.id))


@reports_bp.route("/api/reports/<int:draft_id>/editor-state")
def api_get_editor_state(draft_id):
    draft = ReportDraft.query.get_or_404(draft_id)

    if not _can_access_draft(draft, get_current_user_with_organization(session.get("user_id"))):
        return _report_access_denied_json()

    state = _get_or_create_editor_state(draft_id)

    return jsonify(
        {
            "success": True,
            "draft_id": draft_id,
            "document_html": sanitize_editor_html(state.document_html or ""),
            "document_json": _sanitize_editor_snapshot(_load_json_text(state.document_json, {})),
            "updated_at": state.updated_at.isoformat() if state.updated_at else None,
        }
    )


@reports_bp.route("/api/reports/<int:draft_id>/editor-state", methods=["PATCH"])
@reports_bp.route("/api/reports/<int:draft_id>/autosave", methods=["POST", "PATCH"])
def api_update_editor_state(draft_id):
    draft = ReportDraft.query.get_or_404(draft_id)

    if not _can_access_draft(draft, get_current_user_with_organization(session.get("user_id"))):
        return _report_access_denied_json()

    data = request.get_json(silent=True) or {}
    state = _get_or_create_editor_state(draft.id)

    if "document_html" in data:
        state.document_html = sanitize_editor_html(data.get("document_html") or "")

    if "document_json" in data:
        state.document_json = json.dumps(
            _sanitize_editor_snapshot(data.get("document_json") or {}),
            ensure_ascii=False,
        )

    draft.status = "editing"
    draft.updated_at = utc_now()
    db.session.commit()

    return jsonify(
        {
            "success": True,
            "updated_at": state.updated_at.isoformat() if state.updated_at else None,
        }
    )


@reports_bp.route("/api/reports/<int:draft_id>/save-version", methods=["POST"])
def api_save_report_version(draft_id):
    draft = ReportDraft.query.get_or_404(draft_id)

    if not _can_access_draft(draft, get_current_user_with_organization(session.get("user_id"))):
        return _report_access_denied_json()

    data = request.get_json(silent=True) or {}
    current_version = (
        db.session.query(db.func.max(ReportVersion.version_number))
        .filter(ReportVersion.draft_id == draft_id)
        .scalar()
        or 0
    )

    version = ReportVersion(
        draft_id=draft_id,
        version_number=current_version + 1,
        snapshot_json=json.dumps(data.get("snapshot") or data, ensure_ascii=False),
    )
    db.session.add(version)
    db.session.commit()

    return jsonify({"success": True, "version_number": version.version_number})


@reports_bp.route("/reports/<int:report_id>/rename", methods=["POST"])
def rename_report(report_id):
    report = Report.query.get_or_404(report_id)

    if not _can_access_report(report, get_current_user_with_organization(session.get("user_id"))):
        abort(403)

    report_title = request.form.get("report_title", "").strip()
    tag = request.form.get("tag", "").strip()

    if not report_title:
        flash("Введите обязательные данные", "warning")
        return redirect(url_for("reports.index"))

    report.report_title = report_title
    report.tag = tag or None
    db.session.commit()

    flash("Данные сохранены", "success")
    return redirect(url_for("reports.index"))


@reports_bp.route("/reports/<int:report_id>/preview")
def preview_report(report_id):
    report = Report.query.get_or_404(report_id)

    if not _can_access_report(report, get_current_user_with_organization(session.get("user_id"))):
        return _report_access_denied_json()

    return jsonify(
        {
            "id": report.id,
            "report_title": report.report_title,
            "report_author": report.report_author,
            "report_date": report.report_date.strftime("%d.%m.%Y"),
            "tag": report.tag or "",
            "template_key": report.template_key or "",
            "template_title": _get_template_title(report.template_key),
            "source_type": report.source_type or "manual",
            "source_filename": report.source_filename or "",
            "pdf_status": "PDF готов" if report.pdf_filename else "Не сформирован",
            "created_at": report.created_at.strftime("%d.%m.%Y %H:%M"),
        }
    )


@reports_bp.route("/api/reports/<int:report_id>/dashboard-preview")
def dashboard_report_preview(report_id):
    report = Report.query.get_or_404(report_id)

    if not _can_access_report(report, get_current_user_with_organization(session.get("user_id"))):
        return _report_access_denied_json()

    return jsonify(_build_dashboard_preview_payload(report))


def _build_dashboard_preview_payload(report):
    _ensure_folder_schema()
    ensure_report_share_schema()
    draft = _find_draft_for_report(report.id)
    blocks = []
    editor_url = ""
    document_html = ""
    document_json = {}

    if draft:
        block_models = (
            ImportedDataBlock.query.filter_by(draft_id=draft.id, is_deleted=False)
            .order_by(ImportedDataBlock.order_index.asc())
            .all()
        )
        blocks = _build_block_views(block_models)
        editor_url = url_for("reports.report_editor_for_report", report_id=report.id)
        editor_state = _get_or_create_editor_state(draft.id)
        document_html = sanitize_editor_html(editor_state.document_html or "")
        document_json = _sanitize_editor_snapshot(_load_json_text(editor_state.document_json, {}))

    template_title = draft.template_title if draft else _get_template_title(report.template_key)

    return {
        "success": True,
        "id": report.id,
        "draft_id": draft.id if draft else None,
        "report_title": report.report_title,
        "report_author": report.report_author,
        "report_date": report.report_date.strftime("%d.%m.%Y"),
        "tag": report.tag or "",
        "template_key": report.template_key or "",
        "template_title": template_title,
        "folder_id": report.folder_id,
        "folder_name": report.folder.name if report.folder else "",
        "folder_update_url": url_for("reports.api_update_report_folder", report_id=report.id),
        "linked_report_id": report.linked_report_id,
        "linked_report_title": report.linked_report.report_title if report.linked_report else "",
        "linked_report_url": url_for("reports.view_report", report_id=report.linked_report_id) if report.linked_report_id else "",
        "link_update_url": url_for("reports.api_update_report_link", report_id=report.id),
        "shares": get_report_shares(report.id),
        "shares_url": url_for("reports.api_report_shares", report_id=report.id),
        "export_url": url_for("reports.export_report", report_id=report.id, export_format="__format__"),
        "source_type": report.source_type or "manual",
        "source_filename": report.source_filename or "",
        "pdf_status": "PDF готов" if report.pdf_filename else "Не сформирован",
        "created_at": report.created_at.strftime("%d.%m.%Y %H:%M"),
        "editor_url": editor_url,
        "open_url": url_for("reports.open_report", report_id=report.id),
        "document_html": document_html,
        "document_json": document_json,
        "blocks": blocks,
    }


@reports_bp.route("/api/reports/<int:report_id>/shares", methods=["GET"])
@login_required
def api_report_shares(report_id):
    ensure_report_share_schema()
    Report.query.get_or_404(report_id)
    shares = get_report_shares(report_id)

    return jsonify({
        "shares": shares,
        "users": [
            share
            for share in shares
            if share.get("subject_type") == "user"
        ],
        "groups": [
            share
            for share in shares
            if share.get("subject_type") == "group"
        ],
    })


@reports_bp.route("/api/reports/<int:report_id>/shares", methods=["POST"])
@login_required
def api_update_report_shares(report_id):
    ensure_report_share_schema()
    report = Report.query.get_or_404(report_id)
    current_user = get_current_user_with_organization(session.get("user_id"))

    if not can_manage_report_shares(report, current_user):
        return jsonify({"success": False, "error": "Недостаточно прав"}), 403

    data = request.get_json(silent=True) or {}
    shares = replace_report_access(
        report,
        data.get("user_ids") or [],
        data.get("group_ids") or [],
        current_user,
    )

    return jsonify({
        "success": True,
        "shares": shares,
    })


@reports_bp.route("/reports/<int:report_id>/export/<export_format>", methods=["POST"])
@login_required
def export_report(report_id, export_format):
    export_format = (export_format or "").strip().lower()

    if export_format not in EXPORT_FORMATS:
        return jsonify({"success": False, "error": "Неизвестный формат экспорта."}), 400

    ensure_report_share_schema()
    report = Report.query.get_or_404(report_id)
    current_user = get_current_user_with_organization(session.get("user_id"))

    if not _can_export_report(report, current_user):
        return jsonify({"success": False, "error": "Недостаточно прав для экспорта отчета."}), 403

    try:
        export_data = build_report_export_data(report, current_user)

        if export_format == "docx":
            file_buffer = export_report_to_docx(export_data)
        elif export_format == "pdf":
            file_buffer = export_report_to_pdf(export_data)
        else:
            file_buffer = export_report_to_xml(export_data)

        filename = build_export_filename(export_data, export_format)
        log_user_action(
            "report.export",
            user=current_user,
            entity_type="report",
            entity_id=report.id,
            description="Пользователь экспортировал отчет в формате {0}.".format(export_format.upper()),
            metadata={"format": export_format, "report_id": report.id},
        )

        return send_file(
            file_buffer,
            mimetype=EXPORT_MIME_TYPES[export_format],
            as_attachment=True,
            download_name=filename,
            max_age=0,
        )
    except Exception as exc:
        current_app.logger.exception("Report export failed: %s", exc)
        return jsonify({"success": False, "error": "Не удалось сформировать файл экспорта."}), 500


@reports_bp.route("/reports/<int:report_id>/download")
def download_report(report_id):
    report = Report.query.get_or_404(report_id)

    if not _can_access_report(report, get_current_user_with_organization(session.get("user_id"))):
        abort(403)

    if not report.pdf_filename:
        flash("PDF для данного отчета еще не сформирован", "warning")
        return redirect(url_for("reports.index"))

    pdf_dir = _get_storage_dir("generated")

    return send_from_directory(
        pdf_dir,
        report.pdf_filename,
        as_attachment=False,
    )


@reports_bp.route("/reports/<int:report_id>/view")
def view_report(report_id):
    report = Report.query.get_or_404(report_id)

    if not _can_access_report(report, get_current_user_with_organization(session.get("user_id"))):
        abort(403)

    return redirect(url_for("reports.open_report", report_id=report.id))


@reports_bp.route("/reports/<int:report_id>/open")
def open_report(report_id):
    report = Report.query.get_or_404(report_id)

    if not _can_access_report(report, get_current_user_with_organization(session.get("user_id"))):
        abort(403)

    preview_payload = _build_dashboard_preview_payload(report)

    return render_template(
        "reports/open.html",
        report=report,
        preview_payload=preview_payload,
        preview_url=url_for("reports.dashboard_report_preview", report_id=report.id),
        editor_url=preview_payload["editor_url"],
        export_url=preview_payload["export_url"],
        back_url=url_for("reports.index"),
    )


@reports_bp.route("/reports/<int:report_id>/delete", methods=["POST"])
def delete_report(report_id):
    report = Report.query.get_or_404(report_id)

    if not _can_access_report(report, get_current_user_with_organization(session.get("user_id"))):
        abort(403)

    db.session.delete(report)
    db.session.commit()

    flash("Отчет удален", "success")
    return redirect(url_for("reports.index"))


@reports_bp.route("/reports/<int:report_id>/share", methods=["POST"])
def share_report(report_id):
    report = Report.query.get_or_404(report_id)

    if not _can_access_report(report, get_current_user_with_organization(session.get("user_id"))):
        abort(403)

    flash("Откройте предпросмотр отчета и нажмите кнопку совместного доступа.", "warning")
    return redirect(url_for("reports.index"))


def _save_uploaded_source(uploaded_file):
    original_filename = uploaded_file.filename or ""
    safe_name, extension, _, _ = validate_uploaded_file(
        uploaded_file,
        ALLOWED_UPLOAD_EXTENSIONS,
        ALLOWED_UPLOAD_MIME_TYPES,
        current_app.config.get("MAX_CONTENT_LENGTH"),
    )

    upload_dir = _get_storage_dir("uploads")
    safe_stem = Path(safe_name).stem or "document"
    stored_filename = f"{uuid4().hex}_{safe_stem}{extension}"
    uploaded_file.save(upload_dir / stored_filename)

    return extension.lstrip("."), original_filename


def _save_temp_import_file(uploaded_file):
    original_filename = uploaded_file.filename or ""
    safe_name, extension, _, _ = validate_uploaded_file(
        uploaded_file,
        ALLOWED_UPLOAD_EXTENSIONS,
        ALLOWED_UPLOAD_MIME_TYPES,
        current_app.config.get("MAX_CONTENT_LENGTH"),
    )

    upload_dir = _get_storage_dir("temp_imports")
    safe_stem = Path(safe_name).stem or "document"
    stored_filename = f"{uuid4().hex}_{safe_stem}{extension}"
    stored_path = upload_dir / stored_filename
    uploaded_file.save(stored_path)

    return stored_path, original_filename, extension.lstrip(".")


def _load_temp_import_payload(token):
    if not token:
        raise ValueError("Данные могут быть не сохранены")

    token_name = secure_filename(token)
    token_path = _get_storage_dir("temp_imports") / f"{token_name}.json"

    if not token_path.exists():
        raise ValueError("Данные могут быть не сохранены")

    with token_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def _create_report_error(message):
    if _wants_json_response():
        return jsonify({"success": False, "category": "warning", "error": message}), 400

    flash(message, "warning")
    return redirect(url_for("reports.index"))


def _parse_share_user_ids(raw_value):
    if not raw_value:
        return []

    if isinstance(raw_value, list):
        return raw_value

    try:
        parsed_value = json.loads(raw_value)
    except (TypeError, ValueError):
        parsed_value = raw_value.split(",")

    if isinstance(parsed_value, list):
        return parsed_value

    return []


def _wants_json_response():
    return (
        request.headers.get("X-Requested-With") == "XMLHttpRequest"
        or "application/json" in request.headers.get("Accept", "")
    )


def _get_storage_dir(folder_name):
    base_dir = Path(current_app.root_path).parent
    storage_dir = base_dir / "storage" / folder_name
    storage_dir.mkdir(parents=True, exist_ok=True)
    return storage_dir


def _get_template_title(template_key):
    custom_template = _get_template_by_report_key(template_key)

    if custom_template:
        return custom_template.title

    return REPORT_TEMPLATE_OPTIONS.get(template_key, template_key or "Не выбран")


def _get_template_by_report_key(template_key):
    raw_key = (template_key or "").strip()

    if not raw_key.startswith("template:"):
        return None

    try:
        template_id = int(raw_key.split(":", 1)[1])
    except (IndexError, ValueError):
        return None

    return db.session.get(Template, template_id)


def _build_report_template_options(templates):
    options = dict(REPORT_TEMPLATE_OPTIONS)

    for template in templates:
        options[f"template:{template.id}"] = template.title

    return options


def _get_session_organization_id():
    organization_id = session.get("organization_id")

    if organization_id:
        return organization_id

    if not session.get("user_id"):
        return None

    current_user = get_current_user_with_organization(session.get("user_id"))

    if not current_user:
        return None

    session["organization_id"] = current_user.organization_id

    return current_user.organization_id


def _get_or_create_editor_state(draft_id):
    try:
        state = ReportEditorState.query.filter_by(draft_id=draft_id).first()
    except (OperationalError, ProgrammingError):
        db.session.rollback()
        db.create_all()
        state = ReportEditorState.query.filter_by(draft_id=draft_id).first()

    if state:
        return state

    state = ReportEditorState(
        draft_id=draft_id,
        document_html="",
        document_json=json.dumps({"pages": []}, ensure_ascii=False),
    )
    db.session.add(state)
    db.session.flush()
    return state


def _load_json_text(raw_text, fallback):
    if not raw_text:
        return fallback

    try:
        return json.loads(raw_text)
    except ValueError:
        return fallback


def _sanitize_editor_snapshot(snapshot):
    if not isinstance(snapshot, dict):
        return {}

    sanitized_snapshot = dict(snapshot)
    pages = sanitized_snapshot.get("pages")

    if isinstance(pages, list):
        sanitized_pages = []

        for page in pages:
            if not isinstance(page, dict):
                continue

            sanitized_page = dict(page)

            if "html" in sanitized_page:
                sanitized_page["html"] = sanitize_editor_html(sanitized_page.get("html") or "")

            sanitized_pages.append(sanitized_page)

        sanitized_snapshot["pages"] = sanitized_pages

    return sanitized_snapshot


def _filter_accessible_reports(query, user):
    if _is_admin_user(user):
        return query

    accessible_ids = _get_accessible_report_ids(user)
    return query.filter(Report.id.in_(accessible_ids))


def _get_accessible_report_ids(user):
    if not user:
        return []

    report_ids = {
        report_id
        for (report_id,) in (
            db.session.query(ReportShare.report_id)
            .filter(ReportShare.user_id == user.id)
            .all()
        )
    }

    group_ids = _get_active_user_group_ids(user)
    if group_ids:
        report_ids.update(
            report_id
            for (report_id,) in (
                db.session.query(GroupReportAccess.report_id)
                .filter(GroupReportAccess.group_id.in_(group_ids))
                .all()
            )
        )

    return list(report_ids)


def _can_access_report(report, user):
    if not report or not user:
        return False

    if _is_admin_user(user):
        return True

    if ReportShare.query.filter_by(report_id=report.id, user_id=user.id).first():
        return True

    group_ids = _get_active_user_group_ids(user)

    if not group_ids:
        return False

    return bool(
        GroupReportAccess.query
        .filter(GroupReportAccess.report_id == report.id)
        .filter(GroupReportAccess.group_id.in_(group_ids))
        .first()
    )


def _can_access_draft(draft, user):
    if not draft or not user:
        return False

    if _is_admin_user(user):
        return True

    if not draft.linked_report_id:
        return False

    report = db.session.get(Report, draft.linked_report_id)
    return _can_access_report(report, user)


def _can_access_block(block, user):
    return bool(block and _can_access_draft(block.draft, user))


def _can_export_report(report, user):
    return _can_access_report(report, user)


def _get_active_user_group_ids(user):
    if not user:
        return []

    group_ids = [
        group_id
        for (group_id,) in (
            db.session.query(UserGroupMember.group_id)
            .join(UserGroup, UserGroupMember.group_id == UserGroup.id)
            .filter(UserGroupMember.user_id == user.id)
            .filter(UserGroup.organization_id == user.organization_id)
            .filter(UserGroup.is_active == 1)
            .all()
        )
    ]

    return group_ids


def _is_admin_user(user):
    return bool(user and normalize_user_role(user.role) == "admin")


def _include_current_user_share(raw_user_ids, current_user):
    user_ids = _parse_share_user_ids(raw_user_ids)

    if current_user and current_user.id not in user_ids:
        user_ids.append(current_user.id)

    return user_ids


def _grant_current_user_manage_access(report, current_user):
    if not report or not current_user:
        return

    own_share = ReportShare.query.filter_by(report_id=report.id, user_id=current_user.id).first()

    if own_share:
        own_share.access_level = "manage"


def _report_access_denied_json(message="Недостаточно прав для доступа к отчету."):
    return jsonify({"success": False, "error": message}), 403


def _normalize_optional_int(value):
    if value in (None, ""):
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _folder_to_dict(folder):
    return {
        "id": folder.id,
        "name": folder.name,
        "parent_id": folder.parent_id,
        "created_at": folder.created_at.strftime("%d.%m.%Y") if folder.created_at else "",
        "updated_at": folder.updated_at.strftime("%d.%m.%Y") if folder.updated_at else "",
    }


def _folder_report_to_dict(report):
    return {
        "id": report.id,
        "report_title": report.report_title,
        "created_at": report.created_at.strftime("%d.%m.%Y") if report.created_at else "",
        "updated_at": report.updated_at.strftime("%d.%m.%Y") if report.updated_at else "",
        "template_key": report.template_key or "",
        "template_title": _get_template_title(report.template_key),
        "tag": report.tag or "",
        "folder_id": report.folder_id,
    }


def _template_to_dict(template):
    return {
        "id": template.id,
        "title": template.title,
        "tag": template.tag or "",
        "template_type": template.template_type or "Универсальный",
        "source_template_id": template.source_template_id,
        "created_at": template.created_at.strftime("%d.%m.%Y") if template.created_at else "",
        "updated_at": template.updated_at.strftime("%d.%m.%Y") if template.updated_at else "",
        "edit_url": f"/templates/{template.id}/edit",
        "preview_url": f"/templates/{template.id}/edit",
    }


def _link_tree_report_to_dict(report):
    return {
        "id": report.id,
        "title": report.report_title,
        "folder_id": report.folder_id,
        "created_at": report.created_at.strftime("%d.%m.%Y") if report.created_at else "",
        "updated_at": report.updated_at.strftime("%d.%m.%Y") if report.updated_at else "",
        "template_title": _get_template_title(report.template_key),
        "view_url": url_for("reports.view_report", report_id=report.id),
    }


def _build_folder_rows(folders):
    children_by_parent = {}

    for folder in folders:
        children_by_parent.setdefault(folder.parent_id, []).append(folder)

    rows = []

    def append_children(parent_id, level):
        for folder in children_by_parent.get(parent_id, []):
            rows.append(
                {
                    "id": folder.id,
                    "name": folder.name,
                    "parent_id": folder.parent_id,
                    "level": level,
                    "has_children": bool(children_by_parent.get(folder.id)),
                }
            )
            append_children(folder.id, level + 1)

    append_children(None, 0)

    return rows


def _ensure_folder_schema():
    global _folder_schema_ready

    if _folder_schema_ready:
        return

    db.create_all()

    inspector = inspect(db.engine)
    table_names = inspector.get_table_names()
    report_columns = [column["name"] for column in inspector.get_columns("reports")]

    if "folder_id" not in report_columns:
        dialect = db.engine.dialect.name

        if dialect == "mysql":
            statement = "ALTER TABLE reports ADD COLUMN folder_id INT NULL"
        else:
            statement = "ALTER TABLE reports ADD COLUMN folder_id INTEGER"

        with db.engine.begin() as connection:
            connection.execute(text(statement))

    if "linked_report_id" not in report_columns:
        dialect = db.engine.dialect.name

        if dialect == "mysql":
            statement = "ALTER TABLE reports ADD COLUMN linked_report_id INT NULL"
        else:
            statement = "ALTER TABLE reports ADD COLUMN linked_report_id INTEGER"

        with db.engine.begin() as connection:
            connection.execute(text(statement))

    if "templates" in table_names:
        template_columns = {
            column["name"]
            for column in inspector.get_columns("templates")
        }
        template_migrations = []

        if "tag" not in template_columns:
            template_migrations.append("ALTER TABLE templates ADD COLUMN tag VARCHAR(100) NULL")

        if "template_type" not in template_columns:
            template_migrations.append(
                "ALTER TABLE templates ADD COLUMN template_type VARCHAR(100) NOT NULL DEFAULT 'Универсальный'"
            )

        if "source_template_id" not in template_columns:
            template_migrations.append("ALTER TABLE templates ADD COLUMN source_template_id INT NULL")

        if "content_html" not in template_columns:
            template_migrations.append("ALTER TABLE templates ADD COLUMN content_html TEXT NULL")

        if "content_json" not in template_columns:
            template_migrations.append("ALTER TABLE templates ADD COLUMN content_json TEXT NULL")

        if "latex_template" not in template_columns:
            template_migrations.append("ALTER TABLE templates ADD COLUMN latex_template TEXT NULL")

        if "updated_at" not in template_columns:
            template_migrations.append("ALTER TABLE templates ADD COLUMN updated_at DATETIME NULL")

        if template_migrations:
            with db.engine.begin() as connection:
                for statement in template_migrations:
                    connection.execute(text(statement))

    _folder_schema_ready = True


def _find_draft_for_report(report_id):
    return (
        ReportDraft.query.filter_by(linked_report_id=report_id)
        .order_by(ReportDraft.updated_at.desc(), ReportDraft.created_at.desc())
        .first()
    )


def _build_block_views(blocks):
    block_views = []

    for block in blocks:
        content_json = {}

        if block.content_json:
            try:
                content_json = json.loads(block.content_json)
            except ValueError:
                content_json = {}

        rows = content_json.get("rows") or []
        items = content_json.get("items") or []

        block_views.append(
            {
                "id": block.id,
                "block_type": block.block_type,
                "content_text": block.content_text or "",
                "source_file_name": block.source_file_name or "",
                "color_index": block.color_index or 1,
                "rows": rows,
                "items": items,
                "sheet_name": content_json.get("sheet_name") or "",
                "nav_text": _build_block_nav_text(block.content_text or "", rows, items),
                "icon": _get_block_icon(block.block_type),
            }
        )

    return block_views


def _build_block_nav_text(content_text, rows, items):
    if items:
        source_text = " ".join(items)
    elif rows:
        source_text = " ".join(
            " ".join(str(cell) for cell in row if cell)
            for row in rows[:3]
        )
    else:
        source_text = content_text or ""

    words = source_text.split()

    if not words:
        return "Ручной раздел отчёта"

    return " ".join(words[:6])


def _get_block_icon(block_type):
    if block_type in ("paragraph", "text"):
        return "T"

    if block_type == "list":
        return "≡"

    if block_type in ("table", "spreadsheet_table"):
        return "▦"

    return "•"
