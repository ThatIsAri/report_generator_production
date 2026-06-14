import json
from datetime import datetime

from flask import Blueprint, jsonify, render_template, request, session, url_for
from sqlalchemy import inspect, text

from app.extensions import db
from app.html_sanitizer import sanitize_editor_html
from app.models import Template, User
from app.organization_service import ensure_user_organization_defaults
from app.template_chip_service import ensure_template_chip_schema, serialize_template_chip_settings
from app.template_taxonomy_service import (
    get_template_taxonomy_payload,
    get_template_type_names,
    normalize_template_type,
)


templates_bp = Blueprint("templates", __name__)
_template_schema_ready = False

DEFAULT_TEMPLATE_HTML = (
    '<h1><span class="template-placeholder" contenteditable="false" '
    'data-field="report_title">Название отчета</span></h1>'
    '<p><strong>Дата отчета:</strong> <span class="template-placeholder" '
    'contenteditable="false" data-field="report_date">Дата отчета</span></p>'
    '<p><strong>Автор:</strong> <span class="template-placeholder" '
    'contenteditable="false" data-field="author">Автор</span></p>'
)


@templates_bp.before_request
def prepare_template_schema():
    _ensure_template_schema()
    ensure_template_chip_schema()


@templates_bp.route("/api/templates", methods=["GET"])
def api_list_templates():
    templates = Template.query.order_by(Template.updated_at.desc(), Template.created_at.desc()).all()
    organization_id = _get_session_organization_id()

    return jsonify(
        {
            "success": True,
            "templates": [_template_to_dict(template) for template in templates],
            "taxonomy": get_template_taxonomy_payload(organization_id),
        }
    )


@templates_bp.route("/api/template-taxonomy-options", methods=["GET"])
def api_template_taxonomy_options():
    organization_id = _get_session_organization_id()

    return jsonify({
        "success": True,
        "taxonomy": get_template_taxonomy_payload(organization_id),
    })


@templates_bp.route("/api/template-chip-settings", methods=["GET"])
def api_template_chip_settings():
    organization_id = session.get("organization_id")

    if not organization_id and session.get("user_id"):
        current_user = User.query.get(session.get("user_id"))

        if current_user:
            ensure_user_organization_defaults(current_user)
            organization_id = current_user.organization_id
            session["organization_id"] = organization_id

    ensure_template_chip_schema()

    return jsonify({
        "success": True,
        "settings": serialize_template_chip_settings(organization_id),
    })


@templates_bp.route("/api/templates", methods=["POST"])
def api_create_template():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    tag = (data.get("tag") or "").strip()
    template_type = normalize_template_type(data.get("template_type"))
    source_template_id = _normalize_optional_int(data.get("source_template_id"))
    source_template = None

    if not title:
        return jsonify({"success": False, "error": "Введите название шаблона"}), 400

    if source_template_id:
        source_template = Template.query.get(source_template_id)

        if not source_template:
            return jsonify({"success": False, "error": "Шаблон-основа не найден"}), 404

    template = Template(
        title=title,
        tag=tag or None,
        template_type=template_type,
        source_template_id=source_template.id if source_template else None,
        content_html=source_template.content_html if source_template else None,
        content_json=source_template.content_json if source_template else None,
        latex_template=source_template.latex_template if source_template else None,
    )

    db.session.add(template)
    db.session.commit()

    return jsonify({"success": True, "template": _template_to_dict(template)}), 201


@templates_bp.route("/api/templates/<int:template_id>", methods=["GET"])
def api_get_template(template_id):
    template = Template.query.get_or_404(template_id)

    return jsonify({"success": True, "template": _template_to_dict(template, include_content=True)})


@templates_bp.route("/api/templates/<int:template_id>", methods=["PATCH"])
def api_update_template(template_id):
    template = Template.query.get_or_404(template_id)
    data = request.get_json(silent=True) or {}

    if "title" in data:
        title = (data.get("title") or "").strip()
        if not title:
            return jsonify({"success": False, "error": "Введите название шаблона"}), 400
        template.title = title

    if "tag" in data:
        template.tag = (data.get("tag") or "").strip() or None

    if "template_type" in data:
        template.template_type = normalize_template_type(data.get("template_type"))

    if "content_html" in data:
        template.content_html = sanitize_editor_html(data.get("content_html") or "")

    if "document_html" in data:
        template.content_html = sanitize_editor_html(data.get("document_html") or "")

    if "content_json" in data:
        template.content_json = _serialize_json_payload(data.get("content_json"))

    if "document_json" in data:
        template.content_json = _serialize_json_payload(data.get("document_json"))

    if "latex_template" in data:
        template.latex_template = data.get("latex_template") or None

    template.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify(
        {
            "success": True,
            "template": {
                "id": template.id,
                "title": template.title,
                "tag": template.tag or "",
                "template_type": template.template_type or "Универсальный",
                "updated_at": _format_date(template.updated_at),
            },
        }
    )


@templates_bp.route("/api/templates/<int:template_id>", methods=["DELETE"])
def api_delete_template(template_id):
    template = Template.query.get_or_404(template_id)

    Template.query.filter_by(source_template_id=template.id).update({"source_template_id": None})
    db.session.delete(template)
    db.session.commit()

    return jsonify({"success": True})


@templates_bp.route("/api/templates/<int:template_id>/duplicate", methods=["POST"])
def api_duplicate_template(template_id):
    template = Template.query.get_or_404(template_id)
    duplicate = Template(
        title="Копия " + template.title,
        tag=template.tag,
        template_type=template.template_type or "Универсальный",
        source_template_id=template.id,
        content_html=template.content_html,
        content_json=template.content_json,
        latex_template=template.latex_template,
    )

    db.session.add(duplicate)
    db.session.commit()

    return jsonify({"success": True, "template": _template_to_dict(duplicate)})


@templates_bp.route("/templates/<int:template_id>/edit")
def edit_template(template_id):
    template = Template.query.get_or_404(template_id)
    organization_id = _get_session_organization_id()
    template_content = sanitize_editor_html(template.content_html or DEFAULT_TEMPLATE_HTML)

    return render_template(
        "templates/editor.html",
        template=template,
        template_content=template_content,
        template_types=get_template_type_names(organization_id, template.template_type),
    )


def _ensure_template_schema():
    global _template_schema_ready

    if _template_schema_ready:
        return

    db.create_all()
    inspector = inspect(db.engine)

    if "templates" not in inspector.get_table_names():
        _template_schema_ready = True
        return

    columns = {
        column["name"]
        for column in inspector.get_columns("templates")
    }
    migration_queries = []

    if "tag" not in columns:
        migration_queries.append("ALTER TABLE templates ADD COLUMN tag VARCHAR(100) NULL")

    if "template_type" not in columns:
        migration_queries.append(
            "ALTER TABLE templates ADD COLUMN template_type VARCHAR(100) NOT NULL DEFAULT 'Универсальный'"
        )

    if "source_template_id" not in columns:
        migration_queries.append("ALTER TABLE templates ADD COLUMN source_template_id INT NULL")

    if "content_html" not in columns:
        migration_queries.append("ALTER TABLE templates ADD COLUMN content_html TEXT NULL")

    if "content_json" not in columns:
        migration_queries.append("ALTER TABLE templates ADD COLUMN content_json TEXT NULL")

    if "latex_template" not in columns:
        migration_queries.append("ALTER TABLE templates ADD COLUMN latex_template TEXT NULL")

    if "updated_at" not in columns:
        migration_queries.append("ALTER TABLE templates ADD COLUMN updated_at DATETIME NULL")

    for query in migration_queries:
        db.session.execute(text(query))

    if migration_queries:
        db.session.commit()

    _template_schema_ready = True


def _template_to_dict(template, include_content=False):
    data = {
        "id": template.id,
        "title": template.title,
        "tag": template.tag or "",
        "template_type": template.template_type or "Универсальный",
        "source_template_id": template.source_template_id,
        "created_at": _format_date(template.created_at),
        "updated_at": _format_date(template.updated_at),
        "edit_url": url_for("templates.edit_template", template_id=template.id),
        "preview_url": url_for("templates.edit_template", template_id=template.id),
    }

    if include_content:
        data.update(
            {
                "content_html": sanitize_editor_html(template.content_html or ""),
                "content_json": template.content_json or "",
                "latex_template": template.latex_template or "",
            }
        )

    return data


def _format_date(value):
    return value.strftime("%d.%m.%Y") if value else ""


def _normalize_optional_int(value):
    if value in (None, ""):
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _serialize_json_payload(value):
    if value in (None, ""):
        return None

    if isinstance(value, str):
        return value

    return json.dumps(value, ensure_ascii=False)


def _get_session_organization_id():
    organization_id = session.get("organization_id")

    if organization_id:
        return organization_id

    if not session.get("user_id"):
        return None

    current_user = User.query.get(session.get("user_id"))

    if not current_user:
        return None

    ensure_user_organization_defaults(current_user)
    session["organization_id"] = current_user.organization_id

    return current_user.organization_id
