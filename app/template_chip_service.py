from sqlalchemy import inspect, text

from app.extensions import db
from app.models import TemplateChipCategory, TemplateChipDefinition


DEFAULT_CHIP_CATEGORIES = [
    {"key": "basic", "name": "Основные", "description": "Базовые поля отчета.", "sort_order": 10},
    {"key": "imported", "name": "Импортированные", "description": "Данные, полученные из файлов.", "sort_order": 20},
    {"key": "system", "name": "Системные", "description": "Служебные поля формирования.", "sort_order": 30},
    {"key": "graphics", "name": "Графика", "description": "Изображения, схемы и диаграммы.", "sort_order": 40},
    {"key": "data", "name": "Данные", "description": "Таблицы, списки и значения.", "sort_order": 50},
    {"key": "utils", "name": "Утилиты", "description": "Вспомогательные элементы верстки.", "sort_order": 60},
    {"key": "custom", "name": "Пользовательские", "description": "Пользовательские чипы организации.", "sort_order": 100},
]


def ensure_template_chip_schema():
    db.create_all()
    inspector = inspect(db.engine)

    ensure_columns(
        inspector,
        "template_chip_categories",
        {
            "organization_id": "ALTER TABLE template_chip_categories ADD COLUMN organization_id INT NULL",
            "category_key": "ALTER TABLE template_chip_categories ADD COLUMN category_key VARCHAR(100) NOT NULL DEFAULT 'custom'",
            "name": "ALTER TABLE template_chip_categories ADD COLUMN name VARCHAR(255) NOT NULL",
            "description": "ALTER TABLE template_chip_categories ADD COLUMN description TEXT NULL",
            "sort_order": "ALTER TABLE template_chip_categories ADD COLUMN sort_order INT NOT NULL DEFAULT 0",
            "is_active": "ALTER TABLE template_chip_categories ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1",
            "created_at": "ALTER TABLE template_chip_categories ADD COLUMN created_at DATETIME NULL",
            "updated_at": "ALTER TABLE template_chip_categories ADD COLUMN updated_at DATETIME NULL",
        },
    )
    ensure_columns(
        inspector,
        "template_chip_definitions",
        {
            "organization_id": "ALTER TABLE template_chip_definitions ADD COLUMN organization_id INT NULL",
            "field": "ALTER TABLE template_chip_definitions ADD COLUMN field VARCHAR(120) NOT NULL",
            "label": "ALTER TABLE template_chip_definitions ADD COLUMN label VARCHAR(255) NOT NULL",
            "category_key": "ALTER TABLE template_chip_definitions ADD COLUMN category_key VARCHAR(100) NOT NULL DEFAULT 'custom'",
            "kind": "ALTER TABLE template_chip_definitions ADD COLUMN kind VARCHAR(50) NOT NULL DEFAULT 'text'",
            "based_on": "ALTER TABLE template_chip_definitions ADD COLUMN based_on VARCHAR(120) NULL",
            "latex_markup": "ALTER TABLE template_chip_definitions ADD COLUMN latex_markup TEXT NULL",
            "sort_order": "ALTER TABLE template_chip_definitions ADD COLUMN sort_order INT NOT NULL DEFAULT 0",
            "is_favorite": "ALTER TABLE template_chip_definitions ADD COLUMN is_favorite TINYINT(1) NOT NULL DEFAULT 0",
            "is_active": "ALTER TABLE template_chip_definitions ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1",
            "created_at": "ALTER TABLE template_chip_definitions ADD COLUMN created_at DATETIME NULL",
            "updated_at": "ALTER TABLE template_chip_definitions ADD COLUMN updated_at DATETIME NULL",
        },
    )


def ensure_columns(inspector, table_name, migration_queries):
    if table_name not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"]
        for column in inspector.get_columns(table_name)
    }

    for column_name, query in migration_queries.items():
        if column_name not in existing_columns:
            db.session.execute(text(query))

    db.session.commit()


def serialize_template_chip_settings(organization_id, include_inactive=False):
    return {
        "categories": serialize_chip_categories(organization_id, include_inactive=include_inactive),
        "chips": serialize_chip_definitions(organization_id, include_inactive=include_inactive),
    }


def serialize_chip_categories(organization_id, include_inactive=False):
    configured = (
        TemplateChipCategory.query
        .filter(TemplateChipCategory.organization_id == organization_id)
        .order_by(TemplateChipCategory.sort_order.asc(), TemplateChipCategory.name.asc())
        .all()
    )
    configured_by_key = {
        normalize_chip_key(category.category_key): category
        for category in configured
        if category.category_key
    }
    result = []
    seen = set()

    for item in DEFAULT_CHIP_CATEGORIES:
        configured_category = configured_by_key.get(item["key"])
        if configured_category:
            if configured_category.is_active or include_inactive:
                result.append(serialize_chip_category(configured_category, is_system=True))
            seen.add(item["key"])
            continue

        result.append({
            "id": None,
            "key": item["key"],
            "name": item["name"],
            "description": item["description"],
            "sort_order": item["sort_order"],
            "is_active": True,
            "is_system": True,
        })
        seen.add(item["key"])

    for category in configured:
        key = normalize_chip_key(category.category_key)
        if key in seen:
            continue
        if not category.is_active and not include_inactive:
            continue
        result.append(serialize_chip_category(category, is_system=False))

    return sorted(result, key=lambda item: (item["sort_order"], item["name"].lower()))


def serialize_chip_definitions(organization_id, include_inactive=False):
    query = TemplateChipDefinition.query.filter(TemplateChipDefinition.organization_id == organization_id)

    if not include_inactive:
        query = query.filter(TemplateChipDefinition.is_active == 1)

    return [
        serialize_chip_definition(chip)
        for chip in query.order_by(
            TemplateChipDefinition.sort_order.asc(),
            TemplateChipDefinition.label.asc(),
        ).all()
    ]


def serialize_chip_category(category, is_system=False):
    return {
        "id": category.id,
        "key": normalize_chip_key(category.category_key),
        "name": category.name or category.category_key,
        "description": category.description or "",
        "sort_order": category.sort_order or 0,
        "is_active": bool(category.is_active),
        "is_system": bool(is_system),
    }


def serialize_chip_definition(chip):
    return {
        "id": chip.id,
        "field": chip.field,
        "label": chip.label,
        "category_key": normalize_chip_key(chip.category_key) or "custom",
        "group": normalize_chip_key(chip.category_key) or "custom",
        "kind": chip.kind or "text",
        "based_on": chip.based_on or "",
        "basedOn": chip.based_on or "",
        "latex_markup": chip.latex_markup or "",
        "latex": chip.latex_markup or "",
        "sort_order": chip.sort_order or 0,
        "is_favorite": bool(chip.is_favorite),
        "isFavorite": bool(chip.is_favorite),
        "is_active": bool(chip.is_active),
        "isCustom": True,
        "source": "organization",
    }


def normalize_chip_name(value):
    return " ".join((value or "").strip().split())


def normalize_chip_key(value):
    return str(value or "").strip().lower().replace(" ", "_")[:100]


def create_chip_key_from_name(name):
    key = normalize_chip_key(
        "".join(
            char if char.isalnum() else "_"
            for char in str(name or "")
        )
    )
    return key.strip("_") or "custom"


def create_chip_field_from_label(label):
    field = create_chip_key_from_name(label)
    if not field.startswith("admin_chip_"):
        field = "admin_chip_" + field
    return field[:120]


def parse_sort_order(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0

