from sqlalchemy import inspect, text

from app.extensions import db
from app.models import AdminSystemSetting
from app.organization_service import ensure_organization_data


SYSTEM_SETTING_GROUPS = [
    {
        "key": "general",
        "title": "Общие настройки",
        "description": "Поведение главной страницы, меню и пользовательских уведомлений.",
        "settings": [
            {
                "key": "dashboard_default_mode",
                "title": "Стартовый раздел",
                "description": "Какой модуль считать основным при открытии приложения.",
                "type": "select",
                "default": "reports",
                "options": [
                    {"value": "reports", "label": "Отчеты"},
                    {"value": "templates", "label": "Шаблоны"},
                ],
            },
            {
                "key": "show_organization_menu",
                "title": "Показывать меню организации",
                "description": "Оставить доступ к сообщениям, участникам и совместным отчетам из левого меню.",
                "type": "boolean",
                "default": True,
            },
            {
                "key": "enable_interface_toasts",
                "title": "Показывать уведомления интерфейса",
                "description": "Показывать короткие сообщения после сохранения, ошибок и действий пользователя.",
                "type": "boolean",
                "default": True,
            },
        ],
    },
    {
        "key": "security",
        "title": "Безопасность",
        "description": "Правила входа, регистрации и контроля активных учетных записей.",
        "settings": [
            {
                "key": "allow_self_registration",
                "title": "Разрешить самостоятельную регистрацию",
                "description": "Новые пользователи смогут открыть страницу регистрации и создать учетную запись.",
                "type": "boolean",
                "default": True,
            },
            {
                "key": "require_active_accounts",
                "title": "Пускать только активные аккаунты",
                "description": "Отключенные пользователи не смогут войти в систему.",
                "type": "boolean",
                "default": True,
            },
            {
                "key": "log_auth_events",
                "title": "Логировать входы и выходы",
                "description": "Записывать события авторизации в журнал действий пользователей.",
                "type": "boolean",
                "default": True,
            },
        ],
    },
    {
        "key": "maintenance",
        "title": "Обслуживание данных",
        "description": "Параметры хранения временных файлов, журналов и служебных данных.",
        "settings": [
            {
                "key": "action_log_retention_days",
                "title": "Хранить журнал действий, дней",
                "description": "Срок, на который ориентируется администратор при обслуживании журнала.",
                "type": "number",
                "default": 90,
                "min": 7,
                "max": 3650,
            },
            {
                "key": "temp_import_retention_days",
                "title": "Хранить временные импорты, дней",
                "description": "Срок хранения временных файлов, загруженных при создании отчетов.",
                "type": "number",
                "default": 7,
                "min": 1,
                "max": 365,
            },
            {
                "key": "max_preview_items",
                "title": "Элементов в административных списках",
                "description": "Ориентир для количества строк в таблицах панели администратора.",
                "type": "number",
                "default": 50,
                "min": 10,
                "max": 500,
            },
        ],
    },
]


def ensure_system_settings_schema():
    db.create_all()
    inspector = inspect(db.engine)

    if "admin_system_settings" not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("admin_system_settings")
    }
    migration_queries = {
        "organization_id": "ALTER TABLE admin_system_settings ADD COLUMN organization_id INT NULL",
        "setting_key": "ALTER TABLE admin_system_settings ADD COLUMN setting_key VARCHAR(120) NOT NULL",
        "value": "ALTER TABLE admin_system_settings ADD COLUMN value VARCHAR(255) NOT NULL",
        "created_at": "ALTER TABLE admin_system_settings ADD COLUMN created_at DATETIME NULL",
        "updated_at": "ALTER TABLE admin_system_settings ADD COLUMN updated_at DATETIME NULL",
    }
    changed = False

    for column_name, query in migration_queries.items():
        if column_name not in existing_columns:
            db.session.execute(text(query))
            changed = True

    if changed:
        db.session.commit()


def serialize_system_setting_groups(organization_id):
    values = get_system_setting_values(organization_id)
    serialized_groups = []

    for group in SYSTEM_SETTING_GROUPS:
        serialized_settings = []

        for setting in group["settings"]:
            serialized_setting = dict(setting)
            serialized_setting["value"] = values[setting["key"]]
            serialized_settings.append(serialized_setting)

        serialized_groups.append({
            "key": group["key"],
            "title": group["title"],
            "description": group["description"],
            "settings": serialized_settings,
        })

    return serialized_groups


def get_system_setting_values(organization_id):
    ensure_system_settings_schema()
    rows = (
        AdminSystemSetting.query
        .filter(AdminSystemSetting.organization_id == organization_id)
        .all()
    )
    raw_values = {row.setting_key: row.value for row in rows}
    values = {}

    for setting in iter_system_setting_definitions():
        values[setting["key"]] = deserialize_system_setting_value(
            setting,
            raw_values.get(setting["key"], serialize_system_setting_value(setting, setting["default"])),
        )

    return values


def get_system_setting_value(organization_id, setting_key):
    values = get_system_setting_values(organization_id)

    if setting_key in values:
        return values[setting_key]

    setting = find_system_setting_definition(setting_key)
    return setting["default"] if setting else None


def get_default_organization_system_setting(setting_key):
    organization = ensure_organization_data()
    return get_system_setting_value(organization.id, setting_key)


def save_system_settings(organization_id, raw_settings):
    ensure_system_settings_schema()
    raw_settings = raw_settings or {}

    for setting in iter_system_setting_definitions():
        setting_key = setting["key"]

        if setting_key not in raw_settings:
            continue

        value = coerce_system_setting_value(setting, raw_settings.get(setting_key))
        serialized_value = serialize_system_setting_value(setting, value)
        row = (
            AdminSystemSetting.query
            .filter(AdminSystemSetting.organization_id == organization_id)
            .filter(AdminSystemSetting.setting_key == setting_key)
            .first()
        )

        if row:
            row.value = serialized_value
        else:
            db.session.add(AdminSystemSetting(
                organization_id=organization_id,
                setting_key=setting_key,
                value=serialized_value,
            ))

    db.session.commit()


def iter_system_setting_definitions():
    for group in SYSTEM_SETTING_GROUPS:
        for setting in group["settings"]:
            yield setting


def find_system_setting_definition(setting_key):
    for setting in iter_system_setting_definitions():
        if setting["key"] == setting_key:
            return setting

    return None


def coerce_system_setting_value(setting, raw_value):
    setting_type = setting.get("type")

    if setting_type == "boolean":
        if isinstance(raw_value, str):
            return raw_value.strip().lower() in {"1", "true", "yes", "on"}
        return bool(raw_value)

    if setting_type == "number":
        try:
            number_value = int(raw_value)
        except (TypeError, ValueError):
            number_value = int(setting.get("default", 0))

        if "min" in setting:
            number_value = max(int(setting["min"]), number_value)
        if "max" in setting:
            number_value = min(int(setting["max"]), number_value)

        return number_value

    if setting_type == "select":
        allowed_values = {
            str(option["value"])
            for option in setting.get("options", [])
        }
        value = str(raw_value or setting.get("default", "")).strip()
        return value if value in allowed_values else setting.get("default", "")

    return str(raw_value or setting.get("default", "")).strip()


def serialize_system_setting_value(setting, value):
    if setting.get("type") == "boolean":
        return "1" if bool(value) else "0"

    return str(value)


def deserialize_system_setting_value(setting, raw_value):
    if setting.get("type") == "boolean":
        return str(raw_value).strip().lower() in {"1", "true", "yes", "on"}

    if setting.get("type") == "number":
        return coerce_system_setting_value(setting, raw_value)

    if setting.get("type") == "select":
        return coerce_system_setting_value(setting, raw_value)

    return str(raw_value or "")
