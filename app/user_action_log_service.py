import json

from flask import current_app, has_request_context, request
from sqlalchemy import inspect, or_, text
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models import User, UserActionLog
from app.organization_service import ensure_organization_data


ACTION_TYPE_OPTIONS = [
    {"key": "auth.login", "label": "Вход в систему"},
    {"key": "auth.logout", "label": "Выход из системы"},
    {"key": "auth.register", "label": "Регистрация"},
    {"key": "admin.user.deactivate", "label": "Удаление пользователя"},
    {"key": "admin.group.create", "label": "Создание группы"},
    {"key": "admin.group.members.update", "label": "Изменение участников группы"},
    {"key": "admin.group.deactivate", "label": "Удаление группы"},
    {"key": "admin.permissions.update", "label": "Изменение прав доступа"},
    {"key": "admin.taxonomy.create", "label": "Создание значения справочника"},
    {"key": "admin.taxonomy.update", "label": "Изменение значения справочника"},
    {"key": "admin.taxonomy.deactivate", "label": "Скрытие значения справочника"},
    {"key": "admin.template_chips.create", "label": "Создание чипа шаблона"},
    {"key": "admin.template_chips.update", "label": "Изменение чипа шаблона"},
    {"key": "admin.template_chips.deactivate", "label": "Скрытие чипа шаблона"},
    {"key": "admin.template_chip_categories.create", "label": "Создание категории чипов"},
    {"key": "admin.template_chip_categories.update", "label": "Изменение категории чипов"},
    {"key": "admin.template_chip_categories.deactivate", "label": "Скрытие категории чипов"},
    {"key": "admin.system.settings.update", "label": "Изменение системных настроек"},
    {"key": "report.export", "label": "Экспорт отчета"},
    {"key": "user.profile.update", "label": "Изменение личного профиля"},
    {"key": "user.password.update", "label": "Изменение пароля"},
    {"key": "user.preferences.update", "label": "Изменение пользовательских настроек"},
]

_user_action_log_schema_ready = False


def ensure_user_action_log_schema():
    global _user_action_log_schema_ready

    if _user_action_log_schema_ready:
        return

    ensure_organization_data()
    db.create_all()
    ensure_table_columns(
        "user_action_logs",
        {
            "organization_id": "ALTER TABLE user_action_logs ADD COLUMN organization_id INT NULL",
            "user_id": "ALTER TABLE user_action_logs ADD COLUMN user_id INT NULL",
            "action_key": "ALTER TABLE user_action_logs ADD COLUMN action_key VARCHAR(120) NOT NULL",
            "action_label": "ALTER TABLE user_action_logs ADD COLUMN action_label VARCHAR(255) NOT NULL",
            "entity_type": "ALTER TABLE user_action_logs ADD COLUMN entity_type VARCHAR(80) NULL",
            "entity_id": "ALTER TABLE user_action_logs ADD COLUMN entity_id INT NULL",
            "description": "ALTER TABLE user_action_logs ADD COLUMN description TEXT NULL",
            "metadata_json": "ALTER TABLE user_action_logs ADD COLUMN metadata_json TEXT NULL",
            "ip_address": "ALTER TABLE user_action_logs ADD COLUMN ip_address VARCHAR(100) NULL",
            "user_agent": "ALTER TABLE user_action_logs ADD COLUMN user_agent VARCHAR(500) NULL",
            "created_at": "ALTER TABLE user_action_logs ADD COLUMN created_at DATETIME NULL",
        },
    )
    ensure_user_action_log_indexes()
    _user_action_log_schema_ready = True


def ensure_table_columns(table_name, column_queries):
    inspector = inspect(db.engine)

    if table_name not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"]
        for column in inspector.get_columns(table_name)
    }
    migration_queries = []

    for column_name, query in column_queries.items():
        if column_name not in existing_columns:
            migration_queries.append(query)

    for query in migration_queries:
        db.session.execute(text(query))

    if migration_queries:
        db.session.commit()


def ensure_user_action_log_indexes():
    ensure_index("user_action_logs", "idx_user_action_logs_organization_id", "organization_id")
    ensure_index("user_action_logs", "idx_user_action_logs_user_id", "user_id")
    ensure_index("user_action_logs", "idx_user_action_logs_action_key", "action_key")
    ensure_index("user_action_logs", "idx_user_action_logs_created_at", "created_at")
    db.session.commit()


def ensure_index(table_name, index_name, column_expression):
    if index_exists(table_name, index_name):
        return

    db.session.execute(text("CREATE INDEX {0} ON {1} ({2})".format(index_name, table_name, column_expression)))


def index_exists(table_name, index_name):
    inspector = inspect(db.engine)
    indexes = {
        index.get("name")
        for index in inspector.get_indexes(table_name)
    }

    return index_name in indexes


def get_action_type_options():
    return ACTION_TYPE_OPTIONS


def get_action_label(action_key, fallback=None):
    for option in ACTION_TYPE_OPTIONS:
        if option["key"] == action_key:
            return option["label"]

    return fallback or action_key


def log_user_action(
    action_key,
    user=None,
    organization_id=None,
    action_label=None,
    entity_type=None,
    entity_id=None,
    description=None,
    metadata=None,
):
    try:
        ensure_user_action_log_schema()
        resolved_user = user
        resolved_organization_id = organization_id

        if resolved_user and not resolved_organization_id:
            resolved_organization_id = resolved_user.organization_id

        log = UserActionLog(
            organization_id=resolved_organization_id,
            user_id=resolved_user.id if resolved_user else None,
            action_key=action_key,
            action_label=action_label or get_action_label(action_key),
            entity_type=entity_type,
            entity_id=normalize_optional_int(entity_id),
            description=description,
            metadata_json=json.dumps(metadata or {}, ensure_ascii=False) if metadata else None,
            ip_address=get_request_ip(),
            user_agent=get_request_user_agent(),
        )
        db.session.add(log)
        db.session.commit()
        return log
    except SQLAlchemyError as exc:
        db.session.rollback()
        current_app.logger.exception("User action log failed: %s", exc)
        return None


def get_action_logs(organization_id, search="", user_id=None, action_key="", limit=200):
    ensure_user_action_log_schema()
    query = (
        UserActionLog.query
        .outerjoin(User, UserActionLog.user_id == User.id)
        .filter(UserActionLog.organization_id == organization_id)
    )
    normalized_user_id = normalize_optional_int(user_id)
    normalized_action_key = (action_key or "").strip()
    normalized_search = (search or "").strip()

    if normalized_user_id:
        query = query.filter(UserActionLog.user_id == normalized_user_id)

    if normalized_action_key:
        query = query.filter(UserActionLog.action_key == normalized_action_key)

    if normalized_search:
        pattern = "%{0}%".format(normalized_search)
        query = query.filter(
            or_(
                UserActionLog.action_label.ilike(pattern),
                UserActionLog.action_key.ilike(pattern),
                UserActionLog.description.ilike(pattern),
                UserActionLog.entity_type.ilike(pattern),
                User.username.ilike(pattern),
                User.email.ilike(pattern),
                User.name.ilike(pattern),
            )
        )

    return (
        query
        .order_by(UserActionLog.created_at.desc(), UserActionLog.id.desc())
        .limit(max(1, min(normalize_optional_int(limit) or 200, 500)))
        .all()
    )


def serialize_action_log(log):
    user = log.user

    return {
        "id": log.id,
        "organization_id": log.organization_id,
        "user_id": log.user_id,
        "user_display_name": get_user_display_name(user) if user else "Система",
        "user_email": (user.email or "").strip() if user and user.email else "—",
        "action_key": log.action_key,
        "action_label": log.action_label or get_action_label(log.action_key),
        "entity_type": log.entity_type or "—",
        "entity_id": log.entity_id,
        "entity_label": format_entity_label(log.entity_type, log.entity_id),
        "description": log.description or "—",
        "ip_address": log.ip_address or "—",
        "user_agent": log.user_agent or "—",
        "created_at": log.created_at.strftime("%d.%m.%Y %H:%M:%S") if log.created_at else "",
    }


def get_user_display_name(user):
    if not user:
        return "Система"

    full_name = " ".join(
        part
        for part in [
            (user.last_name or "").strip(),
            (user.first_name or "").strip(),
        ]
        if part
    ).strip()

    return full_name or (user.name or "").strip() or (user.username or "").strip() or (user.email or "").strip() or "Пользователь"


def format_entity_label(entity_type, entity_id):
    if not entity_type:
        return "—"

    if entity_id:
        return "{0} #{1}".format(entity_type, entity_id)

    return entity_type


def normalize_optional_int(value):
    try:
        normalized = int(value)
    except (TypeError, ValueError):
        return None

    return normalized if normalized > 0 else None


def get_request_ip():
    if not has_request_context():
        return None

    forwarded_for = request.headers.get("X-Forwarded-For", "")

    if forwarded_for:
        return forwarded_for.split(",")[0].strip()[:100]

    return (request.remote_addr or "")[:100] or None


def get_request_user_agent():
    if not has_request_context():
        return None

    return (request.headers.get("User-Agent") or "")[:500] or None
