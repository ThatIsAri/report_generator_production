from sqlalchemy import inspect, text

from app.extensions import db
from app.models import AdminTaxonomyOption, Template


DEFAULT_TEMPLATE_TYPES = [
    "Универсальный",
    "Учебный",
    "Практика",
    "Аналитика",
    "Табличный",
    "Импортированный",
]

DEFAULT_TEMPLATE_TAGS = [
    "Без тега",
]

DEFAULT_TEMPLATE_FILTERS = [
    {"name": "Базовый", "color": "#8b5cf6", "source": "default"},
    {"name": "Учебный", "color": "#38bdf8", "source": "default"},
    {"name": "Практика", "color": "#22c55e", "source": "default"},
    {"name": "Аналитика", "color": "#f59e0b", "source": "default"},
]


def ensure_template_taxonomy_schema():
    db.create_all()
    inspector = inspect(db.engine)

    if "admin_taxonomy_options" not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("admin_taxonomy_options")
    }
    migration_queries = {
        "organization_id": "ALTER TABLE admin_taxonomy_options ADD COLUMN organization_id INT NULL",
        "scope": "ALTER TABLE admin_taxonomy_options ADD COLUMN scope VARCHAR(50) NOT NULL DEFAULT 'template'",
        "option_type": "ALTER TABLE admin_taxonomy_options ADD COLUMN option_type VARCHAR(50) NOT NULL DEFAULT 'type'",
        "name": "ALTER TABLE admin_taxonomy_options ADD COLUMN name VARCHAR(255) NOT NULL",
        "color": "ALTER TABLE admin_taxonomy_options ADD COLUMN color VARCHAR(32) NULL",
        "sort_order": "ALTER TABLE admin_taxonomy_options ADD COLUMN sort_order INT NOT NULL DEFAULT 0",
        "is_active": "ALTER TABLE admin_taxonomy_options ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1",
        "created_at": "ALTER TABLE admin_taxonomy_options ADD COLUMN created_at DATETIME NULL",
        "updated_at": "ALTER TABLE admin_taxonomy_options ADD COLUMN updated_at DATETIME NULL",
    }

    changed = False

    for column_name, query in migration_queries.items():
        if column_name not in existing_columns:
            db.session.execute(text(query))
            changed = True

    if changed:
        db.session.commit()


def normalize_taxonomy_name(value):
    return " ".join((value or "").strip().split())


def normalize_template_type(value):
    normalized_value = normalize_taxonomy_name(value) or "Универсальный"
    return normalized_value[:100]


def get_template_taxonomy_payload(organization_id=None):
    ensure_template_taxonomy_schema()
    types = _collect_template_options(organization_id, "type")
    tags = _collect_template_options(organization_id, "tag")
    filters = _collect_dashboard_filters(types, tags)

    return {
        "types": types,
        "tags": tags,
        "filters": filters,
    }


def get_template_type_names(organization_id=None, current_value=None):
    taxonomy = get_template_taxonomy_payload(organization_id)
    names = [option["name"] for option in taxonomy["types"]]
    current_name = normalize_taxonomy_name(current_value)

    if current_name and current_name.lower() not in {name.lower() for name in names}:
        names.insert(0, current_name)

    return names or DEFAULT_TEMPLATE_TYPES[:]


def _collect_template_options(organization_id, option_type):
    configured_options = []
    defaults = DEFAULT_TEMPLATE_TYPES if option_type == "type" else DEFAULT_TEMPLATE_TAGS
    detected_names = _get_detected_template_type_names() if option_type == "type" else _get_detected_template_tag_names()
    seen = set()
    options = []

    query = (
        AdminTaxonomyOption.query
        .filter(AdminTaxonomyOption.scope == "template")
        .filter(AdminTaxonomyOption.option_type == option_type)
        .filter(AdminTaxonomyOption.is_active == 1)
    )

    if organization_id is None:
        query = query.filter(AdminTaxonomyOption.organization_id.is_(None))
    else:
        query = query.filter(AdminTaxonomyOption.organization_id == organization_id)

    configured_options = query.order_by(
        AdminTaxonomyOption.sort_order.asc(),
        AdminTaxonomyOption.name.asc(),
    ).all()

    for option in configured_options:
        _append_taxonomy_option(options, seen, option.name, option.color, "configured")

    for name in defaults:
        _append_taxonomy_option(options, seen, name, "", "default")

    for name in detected_names:
        _append_taxonomy_option(options, seen, name, "", "detected")

    return options


def _collect_dashboard_filters(type_options, tag_options):
    seen = set()
    filters = []

    for option in DEFAULT_TEMPLATE_FILTERS:
        _append_taxonomy_option(filters, seen, option["name"], option["color"], option["source"])

    for option in type_options:
        _append_taxonomy_option(filters, seen, option["name"], option.get("color"), option.get("source"))

    for option in tag_options:
        if option["name"].lower() == "без тега":
            continue
        _append_taxonomy_option(filters, seen, option["name"], option.get("color"), option.get("source"))

    return filters


def _append_taxonomy_option(options, seen, name, color=None, source="configured"):
    normalized_name = normalize_taxonomy_name(name)

    if not normalized_name:
        return

    lowered_name = normalized_name.lower()

    if lowered_name in seen:
        return

    seen.add(lowered_name)
    options.append({
        "name": normalized_name,
        "color": color or "",
        "source": source or "configured",
    })


def _get_detected_template_type_names():
    return [
        name
        for name, in (
            Template.query
            .with_entities(Template.template_type)
            .filter(Template.template_type.isnot(None))
            .filter(Template.template_type != "")
            .group_by(Template.template_type)
            .order_by(Template.template_type.asc())
            .all()
        )
        if normalize_taxonomy_name(name)
    ]


def _get_detected_template_tag_names():
    return [
        name
        for name, in (
            Template.query
            .with_entities(Template.tag)
            .filter(Template.tag.isnot(None))
            .filter(Template.tag != "")
            .group_by(Template.tag)
            .order_by(Template.tag.asc())
            .all()
        )
        if normalize_taxonomy_name(name)
    ]
