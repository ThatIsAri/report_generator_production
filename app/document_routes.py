import json
from pathlib import Path
from uuid import uuid4

from flask import (
    Blueprint,
    current_app,
    flash,
    redirect,
    render_template,
    request,
    send_from_directory,
    url_for,
)
from werkzeug.utils import secure_filename

from app.document_scanner import scan_document
from app.extensions import db
from app.file_security import validate_uploaded_file
from app.extraction_engine import extract_report_data
from app.extraction_profiles import BASE_FIELD_KEYS, DOCUMENT_PROFILES, GENERIC_REPORT_PROFILE_KEY
from app.latex_service import generate_imported_report_pdf
from app.models import (
    DocumentScan,
    ExtractedField,
    GeneratedDocument,
    ImportedDocument,
    ImportedReportData,
    NormalizationChange,
    SourceDocument,
    UserCorrection,
)
from app.template_registry import REPORT_TEMPLATES
from app.time_utils import utc_now


documents_bp = Blueprint("documents", __name__, url_prefix="/documents")

ALLOWED_EXTENSIONS = {".docx", ".xlsx", ".xlsm", ".xltx", ".xltm", ".csv", ".pdf"}
ALLOWED_MIME_TYPES = {
    ".docx": {"application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
    ".xlsx": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
    ".xlsm": {"application/vnd.ms-excel.sheet.macroenabled.12"},
    ".xltx": {"application/vnd.openxmlformats-officedocument.spreadsheetml.template"},
    ".xltm": {"application/vnd.ms-excel.template.macroenabled.12"},
    ".csv": {"text/csv", "application/csv", "text/plain", "application/vnd.ms-excel"},
    ".pdf": {"application/pdf"},
}
SOURCE_TYPE_IMPORTED_REPORT = "imported_report"


def _get_storage_dir(folder_name):
    base_dir = Path(current_app.root_path).parent
    storage_dir = base_dir / "storage" / folder_name
    storage_dir.mkdir(parents=True, exist_ok=True)
    return storage_dir


def _get_file_extension(filename):
    safe_name = secure_filename(filename or "")
    extension = Path(safe_name).suffix.lower()

    if not extension:
        extension = Path(filename or "").suffix.lower()

    return extension


def _build_stored_filename(original_filename, extension):
    safe_name = secure_filename(original_filename or "")
    safe_stem = Path(safe_name).stem if safe_name else "document"

    if not safe_stem:
        safe_stem = "document"

    return f"{uuid4().hex}_{safe_stem}{extension}"


def _get_extracted_fields(imported_data):
    imported_document = imported_data.imported_document

    if not imported_document or not imported_document.document_scan:
        return []

    return list(imported_document.document_scan.extracted_fields)


def _get_field_config(imported_data, field_key):
    imported_document = imported_data.imported_document
    profile_key = imported_document.detected_profile_key if imported_document else None
    profile = DOCUMENT_PROFILES.get(profile_key) or DOCUMENT_PROFILES[GENERIC_REPORT_PROFILE_KEY]
    return profile.get("fields", {}).get(field_key, {})


def _get_corrections_by_field(imported_data):
    corrections = {}

    for correction in imported_data.user_corrections:
        field_name = correction.field_name
        if field_name not in corrections:
            corrections[field_name] = {
                "first": correction,
                "latest": correction,
            }
        else:
            corrections[field_name]["latest"] = correction

    return corrections


def _get_missing_required_fields(imported_data):
    missing_fields = []

    for field in _get_extracted_fields(imported_data):
        if field.is_required and not (field.final_value or "").strip():
            missing_fields.append(field.field_label)

    return missing_fields


def _build_field_rows(imported_data):
    corrections_by_field = _get_corrections_by_field(imported_data)
    rows = []

    for field in _sort_extracted_fields(_get_extracted_fields(imported_data)):
        correction_data = corrections_by_field.get(field.field_key)
        field_config = _get_field_config(imported_data, field.field_key)
        final_value = field.final_value or ""
        original_value = field.original_value or ""
        normalized_value = field.normalized_value or ""
        has_error = field.is_required and not final_value.strip()
        has_change = normalized_value != original_value
        was_corrected = correction_data is not None

        if has_error:
            row_class = "field-review error"
            badge_class = "badge error"
            badge_text = "требуется заполнить"
            comment = "Поле не найдено или итоговое значение пустое."
        elif has_change:
            row_class = "field-review changed"
            badge_class = "badge warning"
            badge_text = "изменено автоматически"
            comment = "Значение было нормализовано автоматически."
        else:
            row_class = "field-review"
            badge_class = "badge success"
            badge_text = "без изменений"
            comment = _build_extraction_comment(field)

        if was_corrected:
            if comment:
                comment += " "
            comment += "Есть ручная правка пользователя."

        rows.append(
            {
                "field_id": field.id,
                "field_name": field.field_key,
                "label": field.field_label,
                "required": field.is_required,
                "original_value": original_value,
                "normalized_value": normalized_value,
                "final_value": final_value,
                "comment": comment,
                "confidence": field.confidence,
                "source_type": field.source_type or "",
                "source_location": field.source_location or "",
                "row_class": row_class,
                "badge_class": badge_class,
                "badge_text": badge_text,
                "input_type": "textarea" if field_config.get("multiline") else "input",
                "is_base": field.field_key in BASE_FIELD_KEYS,
            }
        )

    return rows


def _sort_extracted_fields(fields):
    base_order = {field_key: index for index, field_key in enumerate(BASE_FIELD_KEYS)}

    return sorted(
        fields,
        key=lambda field: (
            0 if field.field_key in base_order else 1,
            base_order.get(field.field_key, 99),
            field.created_at,
        ),
    )


def _build_extraction_comment(field):
    if field.source_type == "missing":
        return "Поле не найдено автоматически."

    if field.source_type == "calculated":
        return "Значение рассчитано автоматически на основе структуры документа."

    confidence = field.confidence or 0
    percent = int(round(confidence * 100))

    return (
        "Найдено автоматически: "
        + _translate_source_type(field.source_type)
        + f", уверенность {percent}%."
    )


def _translate_source_type(source_type):
    translations = {
        "text": "текст",
        "table": "таблица",
        "section": "раздел",
        "text_marker": "маркер в тексте",
        "key_value": "пара ключ-значение",
        "plain_text": "основной текст",
        "calculated": "расчет",
        "missing": "не найдено",
    }
    return translations.get(source_type or "", source_type or "не указано")


def _is_ready_for_template_selection(imported_data):
    return (
        imported_data.verification_status == "verified"
        and not _get_missing_required_fields(imported_data)
    )


def _save_user_updates(imported_data):
    changed_fields = 0

    for field in _get_extracted_fields(imported_data):
        previous_value = field.final_value or ""
        new_value = request.form.get(f"field_{field.id}", "")
        new_value = new_value.replace("\r\n", "\n").replace("\r", "\n").strip()
        field.final_value = new_value
        field.is_missing = field.is_required and not new_value.strip()

        if previous_value != new_value:
            correction = UserCorrection(
                imported_report_data_id=imported_data.id,
                field_name=field.field_key,
                previous_value=previous_value,
                new_value=new_value,
                correction_description="Значение изменено пользователем на этапе проверки данных.",
            )
            db.session.add(correction)
            changed_fields += 1

    missing_fields = _get_missing_required_fields(imported_data)

    if missing_fields:
        imported_data.verification_status = "needs_review"
        imported_data.verified_at = None
    else:
        imported_data.verification_status = "verified"
        imported_data.verified_at = utc_now()

    return changed_fields, missing_fields


def _build_scan_json(scan_result):
    details = {
        "paragraphs": scan_result.get("paragraphs") or [],
        "tables": scan_result.get("tables") or [],
        "key_values": scan_result.get("key_values") or {},
        "sections": scan_result.get("sections") or [],
        "classification_profiles": scan_result.get("classification_profiles") or [],
    }
    return json.dumps(details, ensure_ascii=False)


def _create_document_scan(source_document, scan_result):
    scan = DocumentScan(
        source_document_id=source_document.id,
        plain_text=scan_result.get("plain_text") or "",
        detected_format=scan_result.get("detected_format") or source_document.file_extension.lstrip("."),
        pages_count=scan_result.get("pages_count") or 0,
        sheets_count=scan_result.get("sheets_count") or 0,
        paragraphs_count=scan_result.get("paragraphs_count") or 0,
        tables_count=scan_result.get("tables_count") or 0,
        key_values_count=scan_result.get("key_values_count") or 0,
        sections_count=scan_result.get("sections_count") or 0,
        scan_json=_build_scan_json(scan_result),
        warnings_text="\n".join(scan_result.get("warnings") or []),
    )
    db.session.add(scan)
    db.session.flush()
    return scan


def _create_extracted_fields(scan, extracted_fields):
    for field in extracted_fields:
        extracted_field = ExtractedField(
            document_scan_id=scan.id,
            field_key=field["field_key"],
            field_label=field["field_label"],
            original_value=field["original_value"],
            normalized_value=field["normalized_value"],
            final_value=field["final_value"],
            confidence=field["confidence"],
            is_required=field["is_required"],
            is_missing=field["is_missing"],
            source_type=field["source_type"],
            source_location=field["source_location"],
        )
        db.session.add(extracted_field)


def _get_latest_generated_document(imported_data_id, template_key):
    return (
        GeneratedDocument.query.filter_by(
            source_type=SOURCE_TYPE_IMPORTED_REPORT,
            source_id=imported_data_id,
            template_key=template_key,
        )
        .order_by(GeneratedDocument.created_at.desc())
        .first()
    )


def _get_template_options(imported_data):
    imported_document = imported_data.imported_document
    document_type = imported_document.detected_profile_key if imported_document else GENERIC_REPORT_PROFILE_KEY
    templates = {}

    for template_key, template in REPORT_TEMPLATES.items():
        if template.get("document_type") == document_type:
            templates[template_key] = template

    for template_key, template in REPORT_TEMPLATES.items():
        if template.get("document_type") == GENERIC_REPORT_PROFILE_KEY:
            templates[template_key] = template

    if not templates:
        templates["generic_report_default"] = REPORT_TEMPLATES["generic_report_default"]

    return templates


def _split_field_rows(field_rows):
    standard_rows = []
    additional_rows = []

    for row in field_rows:
        if row["is_base"]:
            standard_rows.append(row)
        else:
            additional_rows.append(row)

    return standard_rows, additional_rows


@documents_bp.route("/upload", methods=["GET"])
def upload_document():
    return render_template("documents/upload.html")


@documents_bp.route("/upload", methods=["POST"])
def handle_upload_document():
    uploaded_file = request.files.get("document")

    if not uploaded_file or not uploaded_file.filename:
        flash("Выберите DOCX, XLSX, CSV или PDF-файл для импорта.", "error")
        return redirect(url_for("documents.upload_document"))

    original_filename = uploaded_file.filename
    try:
        safe_name, file_extension, file_size, mime_type = validate_uploaded_file(
            uploaded_file,
            ALLOWED_EXTENSIONS,
            ALLOWED_MIME_TYPES,
            current_app.config.get("MAX_CONTENT_LENGTH"),
        )
    except ValueError as error:
        flash("Поддерживаются только файлы DOCX, XLSX, CSV и PDF.", "error")
        return redirect(url_for("documents.upload_document"))

    upload_dir = _get_storage_dir("uploads")
    stored_filename = _build_stored_filename(safe_name, file_extension)
    file_path = upload_dir / stored_filename
    uploaded_file.save(file_path)

    raw_text = ""
    source_document = SourceDocument(
        original_filename=original_filename,
        stored_filename=stored_filename,
        file_extension=file_extension,
        mime_type=mime_type or uploaded_file.mimetype,
        file_size=file_size or file_path.stat().st_size,
        scan_status="processing",
    )
    db.session.add(source_document)
    db.session.flush()

    try:
        scan_result = scan_document(file_path)
        extraction_result = extract_report_data(scan_result)
        scan_result["classification_profiles"] = extraction_result["classification"]["profiles"]
        raw_text = scan_result.get("plain_text") or ""

        source_document.scan_status = "success"
        scan = _create_document_scan(source_document, scan_result)

        classification = extraction_result["classification"]

        imported_document = ImportedDocument(
            original_filename=original_filename,
            stored_filename=stored_filename,
            file_extension=file_extension,
            raw_text=raw_text,
            import_status="success",
            source_document_id=source_document.id,
            document_scan_id=scan.id,
            detected_profile_key=classification["profile_key"],
            detected_profile_title=classification["profile_title"],
            classification_confidence=classification["confidence"],
        )
        db.session.add(imported_document)
        db.session.flush()

        imported_data = ImportedReportData(imported_document_id=imported_document.id)
        db.session.add(imported_data)
        db.session.flush()

        missing_fields = [
            field["field_label"]
            for field in extraction_result["extracted_fields"]
            if field["is_required"] and not (field["final_value"] or "").strip()
        ]

        if missing_fields:
            imported_document.import_status = "warning"
            imported_document.error_message = (
                "Не найдены обязательные поля: "
                + ", ".join(missing_fields)
                + "."
            )

        _create_extracted_fields(scan, extraction_result["extracted_fields"])

        for change in extraction_result["normalization_changes"]:
            normalization_change = NormalizationChange(
                imported_report_data_id=imported_data.id,
                field_name=change["field_name"],
                original_value=change["original_value"],
                normalized_value=change["normalized_value"],
                change_description=change["change_description"],
            )
            db.session.add(normalization_change)

        db.session.commit()

        if missing_fields:
            flash("Документ импортирован. Заполните недостающие базовые поля на этапе проверки.", "error")
        else:
            flash("Документ импортирован. Проверьте и сохраните итоговые данные.", "success")

        return redirect(url_for("documents.view_imported_document", import_id=imported_data.id))

    except Exception as error:
        db.session.rollback()
        db.session.add(source_document)
        source_document.scan_status = "error"
        source_document.error_message = str(error)
        db.session.flush()

        imported_document = ImportedDocument(
            original_filename=original_filename,
            stored_filename=stored_filename,
            file_extension=file_extension,
            raw_text=raw_text,
            import_status="error",
            error_message=str(error),
            source_document_id=source_document.id,
        )
        db.session.add(imported_document)
        db.session.flush()

        imported_data = ImportedReportData(imported_document_id=imported_document.id)
        db.session.add(imported_data)
        db.session.commit()

        flash(f"Не удалось импортировать документ: {error}", "error")
        return redirect(url_for("documents.view_imported_document", import_id=imported_data.id))


@documents_bp.route("/imported/<int:import_id>")
def view_imported_document(import_id):
    imported_data = ImportedReportData.query.get_or_404(import_id)
    field_rows = _build_field_rows(imported_data)
    standard_rows, additional_rows = _split_field_rows(field_rows)

    return render_template(
        "documents/imported_view.html",
        imported_data=imported_data,
        imported_document=imported_data.imported_document,
        standard_rows=standard_rows,
        additional_rows=additional_rows,
    )


@documents_bp.route("/imported/<int:import_id>/update", methods=["POST"])
def update_imported_document(import_id):
    imported_data = ImportedReportData.query.get_or_404(import_id)
    action = request.form.get("action", "save")

    changed_fields, missing_fields = _save_user_updates(imported_data)
    db.session.commit()

    if missing_fields:
        flash(
            "Заполните обязательные поля перед выбором шаблона: "
            + ", ".join(missing_fields)
            + ".",
            "error",
        )
        return redirect(url_for("documents.view_imported_document", import_id=imported_data.id))

    if changed_fields:
        flash("Итоговые данные сохранены. Ручные правки записаны в историю.", "success")
    else:
        flash("Итоговые данные проверены и сохранены без изменений.", "success")

    if action == "save_and_continue":
        return redirect(url_for("documents.select_template", import_id=imported_data.id))

    return redirect(url_for("documents.view_imported_document", import_id=imported_data.id))


@documents_bp.route("/imported/<int:import_id>/select-template")
def select_template(import_id):
    imported_data = ImportedReportData.query.get_or_404(import_id)

    if not _is_ready_for_template_selection(imported_data):
        flash("Сначала проверьте и сохраните обязательные итоговые данные.", "error")
        return redirect(url_for("documents.view_imported_document", import_id=imported_data.id))

    return render_template(
        "documents/template_select.html",
        imported_data=imported_data,
        imported_document=imported_data.imported_document,
        templates=_get_template_options(imported_data),
    )


@documents_bp.route("/imported/<int:import_id>/preview/<template_key>")
def preview_template(import_id, template_key):
    imported_data = ImportedReportData.query.get_or_404(import_id)
    template_info = REPORT_TEMPLATES.get(template_key)

    if not template_info:
        flash("Выбран неизвестный шаблон отчета.", "error")
        return redirect(url_for("documents.select_template", import_id=imported_data.id))

    if not _is_ready_for_template_selection(imported_data):
        flash("Сначала проверьте и сохраните обязательные итоговые данные.", "error")
        return redirect(url_for("documents.view_imported_document", import_id=imported_data.id))

    latest_document = _get_latest_generated_document(imported_data.id, template_key)
    field_rows = _build_field_rows(imported_data)
    standard_rows, additional_rows = _split_field_rows(field_rows)

    return render_template(
        "documents/template_preview.html",
        imported_data=imported_data,
        imported_document=imported_data.imported_document,
        template_key=template_key,
        template_info=template_info,
        standard_rows=standard_rows,
        additional_rows=additional_rows,
        latest_document=latest_document,
    )


@documents_bp.route("/imported/<int:import_id>/generate/<template_key>", methods=["POST"])
def generate_imported_document(import_id, template_key):
    imported_data = ImportedReportData.query.get_or_404(import_id)

    if template_key not in REPORT_TEMPLATES:
        flash("Выбран неизвестный шаблон отчета.", "error")
        return redirect(url_for("documents.select_template", import_id=imported_data.id))

    if not _is_ready_for_template_selection(imported_data):
        flash(
            "Нельзя сформировать PDF: сначала сохраните проверенные обязательные данные.",
            "error",
        )
        return redirect(url_for("documents.view_imported_document", import_id=imported_data.id))

    try:
        tex_filename, pdf_filename = generate_imported_report_pdf(imported_data, template_key)

        generated_document = GeneratedDocument(
            source_type=SOURCE_TYPE_IMPORTED_REPORT,
            source_id=imported_data.id,
            template_key=template_key,
            tex_filename=tex_filename,
            pdf_filename=pdf_filename,
        )
        db.session.add(generated_document)
        db.session.commit()

        flash("PDF-документ успешно сформирован.", "success")

    except Exception as error:
        db.session.rollback()
        flash(f"Ошибка при формировании PDF: {error}", "error")

    return redirect(
        url_for(
            "documents.preview_template",
            import_id=imported_data.id,
            template_key=template_key,
        )
    )


@documents_bp.route("/generated/<int:document_id>/pdf")
def open_generated_pdf(document_id):
    generated_document = GeneratedDocument.query.get_or_404(document_id)
    pdf_dir = _get_storage_dir("generated")

    return send_from_directory(
        pdf_dir,
        generated_document.pdf_filename,
        as_attachment=False,
    )
