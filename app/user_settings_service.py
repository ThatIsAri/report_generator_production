from sqlalchemy import inspect, text

from app.extensions import db
from app.models import UserPreference


USER_SETTING_GROUPS = [
    {
        "key": "interface",
        "title": "Интерфейс",
        "description": "Как открывать рабочую область отчетов и шаблонов.",
        "settings": [
            {
                "key": "default_workspace",
                "type": "select",
                "title": "Стартовый раздел",
                "description": "Какой модуль открывать первым после входа.",
                "default": "reports",
                "options": [
                    {"value": "reports", "label": "Отчеты"},
                    {"value": "templates", "label": "Шаблоны"},
                ],
            },
            {
                "key": "compact_cards",
                "type": "boolean",
                "title": "Компактные карточки",
                "description": "Уменьшить визуальную плотность карточек отчетов и шаблонов.",
                "default": False,
            },
            {
                "key": "open_preview_on_card_click",
                "type": "boolean",
                "title": "Открывать предпросмотр по клику",
                "description": "Клик по карточке сразу открывает окно предпросмотра.",
                "default": True,
            },
        ],
    },
    {
        "key": "notifications",
        "title": "Уведомления",
        "description": "Какие события показывать в меню пользователя.",
        "settings": [
            {
                "key": "notify_report_created",
                "type": "boolean",
                "title": "Создание отчета",
                "description": "Показывать уведомление после успешного создания отчета.",
                "default": True,
            },
            {
                "key": "notify_template_ready",
                "type": "boolean",
                "title": "Готовность шаблонов",
                "description": "Сообщать, когда шаблоны готовы к использованию.",
                "default": True,
            },
            {
                "key": "notify_local_save",
                "type": "boolean",
                "title": "Локальное сохранение",
                "description": "Показывать уведомления о локальном и автоматическом сохранении.",
                "default": True,
            },
            {
                "key": "notify_shared_access",
                "type": "boolean",
                "title": "Совместный доступ",
                "description": "Показывать уведомления об изменениях доступа к отчетам.",
                "default": True,
            },
        ],
    },
    {
        "key": "editor",
        "title": "Редактор",
        "description": "Личные подсказки и поведение редакторов отчетов и шаблонов.",
        "settings": [
            {
                "key": "show_autosave_toasts",
                "type": "boolean",
                "title": "Уведомления автосохранения",
                "description": "Показывать подтверждение после автоматического сохранения черновика.",
                "default": True,
            },
            {
                "key": "confirm_before_leave_editor",
                "type": "boolean",
                "title": "Предупреждать перед выходом",
                "description": "Предупреждать при попытке покинуть редактор с несохраненными изменениями.",
                "default": True,
            },
            {
                "key": "expand_chip_categories",
                "type": "boolean",
                "title": "Раскрывать категории чипов",
                "description": "По умолчанию показывать категории чипов развернутыми в редакторе шаблонов.",
                "default": False,
            },
        ],
    },
]

_user_preferences_schema_ready = False


def ensure_user_preferences_schema():
    global _user_preferences_schema_ready

    if _user_preferences_schema_ready:
        return

    db.create_all()
    inspector = inspect(db.engine)

    if "user_preferences" in inspector.get_table_names():
        existing_columns = {
            column["name"]
            for column in inspector.get_columns("user_preferences")
        }
        migration_queries = []

        if "user_id" not in existing_columns:
            migration_queries.append("ALTER TABLE user_preferences ADD COLUMN user_id INT NOT NULL")

        if "setting_key" not in existing_columns:
            migration_queries.append("ALTER TABLE user_preferences ADD COLUMN setting_key VARCHAR(120) NOT NULL")

        if "value" not in existing_columns:
            migration_queries.append("ALTER TABLE user_preferences ADD COLUMN value VARCHAR(255) NOT NULL")

        if "created_at" not in existing_columns:
            migration_queries.append("ALTER TABLE user_preferences ADD COLUMN created_at DATETIME NULL")

        if "updated_at" not in existing_columns:
            migration_queries.append("ALTER TABLE user_preferences ADD COLUMN updated_at DATETIME NULL")

        for query in migration_queries:
            db.session.execute(text(query))

        if migration_queries:
            db.session.commit()

    ensure_index("user_preferences", "idx_user_preferences_user_id", "user_id")
    ensure_index("user_preferences", "idx_user_preferences_key", "setting_key")
    db.session.commit()
    _user_preferences_schema_ready = True


def ensure_index(table_name, index_name, column_expression):
    inspector = inspect(db.engine)
    indexes = {
        index.get("name")
        for index in inspector.get_indexes(table_name)
    }

    if index_name in indexes:
        return

    db.session.execute(text("CREATE INDEX {0} ON {1} ({2})".format(index_name, table_name, column_expression)))


def get_setting_defaults():
    defaults = {}

    for group in USER_SETTING_GROUPS:
        for setting in group["settings"]:
            defaults[setting["key"]] = setting["default"]

    return defaults


def get_setting_definitions():
    definitions = {}

    for group in USER_SETTING_GROUPS:
        for setting in group["settings"]:
            definitions[setting["key"]] = setting

    return definitions


def get_user_settings(user_id):
    ensure_user_preferences_schema()
    defaults = get_setting_defaults()
    values = dict(defaults)
    preferences = UserPreference.query.filter(UserPreference.user_id == user_id).all()

    for preference in preferences:
        if preference.setting_key not in defaults:
            continue

        values[preference.setting_key] = parse_setting_value(
            preference.value,
            get_setting_definitions()[preference.setting_key],
        )

    return values


def save_user_settings(user_id, payload):
    ensure_user_preferences_schema()
    definitions = get_setting_definitions()
    normalized_values = {}

    for key, raw_value in (payload or {}).items():
        if key not in definitions:
            continue

        normalized_values[key] = normalize_setting_value(raw_value, definitions[key])

    existing_preferences = {
        preference.setting_key: preference
        for preference in UserPreference.query.filter(UserPreference.user_id == user_id).all()
    }

    for key, value in normalized_values.items():
        stored_value = serialize_setting_value(value, definitions[key])
        preference = existing_preferences.get(key)

        if preference:
            preference.value = stored_value
        else:
            db.session.add(UserPreference(
                user_id=user_id,
                setting_key=key,
                value=stored_value,
            ))

    db.session.commit()
    return get_user_settings(user_id)


def serialize_setting_groups(values=None):
    current_values = values or get_setting_defaults()
    groups = []

    for group in USER_SETTING_GROUPS:
        settings = []

        for setting in group["settings"]:
            serialized = dict(setting)
            serialized["value"] = current_values.get(setting["key"], setting["default"])
            settings.append(serialized)

        groups.append({
            "key": group["key"],
            "title": group["title"],
            "description": group["description"],
            "settings": settings,
        })

    return groups


def parse_setting_value(value, definition):
    if definition["type"] == "boolean":
        return str(value).lower() in {"1", "true", "yes", "on"}

    return str(value)


def normalize_setting_value(value, definition):
    if definition["type"] == "boolean":
        return bool(value)

    if definition["type"] == "select":
        available_values = {
            option["value"]
            for option in definition.get("options", [])
        }
        normalized = str(value or "")

        if normalized in available_values:
            return normalized

        return definition["default"]

    return str(value or "").strip()


def serialize_setting_value(value, definition):
    if definition["type"] == "boolean":
        return "true" if bool(value) else "false"

    return str(value or "")
