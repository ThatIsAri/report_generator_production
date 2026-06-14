from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models import AccessPermission, User, UserGroup
from app.organization_service import ensure_organization_data
from app.user_group_service import ensure_user_group_schema


ACCESS_PERMISSION_SUBJECT_TYPES = {"user", "group"}

ACCESS_PERMISSION_DEFINITIONS = [
    {
        "key": "reports",
        "title": "Отчеты",
        "description": "Создание, просмотр, редактирование и совместная работа с отчетами.",
        "permissions": [
            {
                "key": "reports.view",
                "title": "Просмотр отчетов",
                "description": "Открывать список, карточки и предпросмотр отчетов.",
            },
            {
                "key": "reports.create",
                "title": "Создание отчетов",
                "description": "Создавать новые отчеты и черновики.",
            },
            {
                "key": "reports.edit",
                "title": "Редактирование отчетов",
                "description": "Открывать редактор отчетов и изменять содержимое.",
            },
            {
                "key": "reports.delete",
                "title": "Удаление отчетов",
                "description": "Удалять или скрывать отчеты из рабочей области.",
            },
            {
                "key": "reports.share",
                "title": "Совместный доступ к отчетам",
                "description": "Открывать доступ пользователям и группам.",
            },
            {
                "key": "reports.export",
                "title": "Экспорт и PDF",
                "description": "Формировать итоговые документы и PDF.",
            },
        ],
    },
    {
        "key": "templates",
        "title": "Шаблоны и чипы",
        "description": "Работа с шаблонами, редактором шаблонов и чипами.",
        "permissions": [
            {
                "key": "templates.view",
                "title": "Просмотр шаблонов",
                "description": "Открывать список шаблонов и предпросмотр.",
            },
            {
                "key": "templates.create",
                "title": "Создание шаблонов",
                "description": "Создавать новые шаблоны отчетов.",
            },
            {
                "key": "templates.edit",
                "title": "Редактирование шаблонов",
                "description": "Открывать редактор шаблонов и менять структуру.",
            },
            {
                "key": "templates.delete",
                "title": "Удаление шаблонов",
                "description": "Удалять или скрывать шаблоны.",
            },
            {
                "key": "chips.manage",
                "title": "Настройка чипов",
                "description": "Создавать, редактировать и добавлять чипы в избранное.",
            },
        ],
    },
    {
        "key": "workspace",
        "title": "Рабочая область",
        "description": "Файлы, папки, связи отчетов и импорт данных.",
        "permissions": [
            {
                "key": "folders.manage",
                "title": "Управление папками",
                "description": "Создавать папки, закреплять их и распределять отчеты.",
            },
            {
                "key": "reports.link",
                "title": "Связь отчетов",
                "description": "Связывать отчеты между собой.",
            },
            {
                "key": "documents.import",
                "title": "Импорт документов",
                "description": "Загружать исходные документы для подготовки отчетов.",
            },
        ],
    },
    {
        "key": "organization",
        "title": "Организация",
        "description": "Участники, группы, сообщения и совместные отчеты.",
        "permissions": [
            {
                "key": "organization.members.view",
                "title": "Просмотр участников",
                "description": "Открывать список участников организации.",
            },
            {
                "key": "organization.groups.manage",
                "title": "Управление группами",
                "description": "Создавать рабочие группы и настраивать участников.",
            },
            {
                "key": "organization.messages",
                "title": "Сообщения",
                "description": "Пользоваться внутренними сообщениями организации.",
            },
            {
                "key": "organization.shared_reports",
                "title": "Совместные отчеты",
                "description": "Открывать раздел совместных отчетов.",
            },
        ],
    },
    {
        "key": "administration",
        "title": "Администрирование",
        "description": "Разделы панели администратора и системные настройки.",
        "permissions": [
            {
                "key": "admin.users.manage",
                "title": "Пользователи",
                "description": "Управлять пользователями и их карточками.",
            },
            {
                "key": "admin.permissions.manage",
                "title": "Права доступа",
                "description": "Назначать права пользователям и группам.",
            },
            {
                "key": "admin.system.view",
                "title": "Система",
                "description": "Открывать системный раздел панели администратора.",
            },
        ],
    },
]

_access_permission_schema_ready = False


def ensure_access_permission_schema():
    global _access_permission_schema_ready

    if _access_permission_schema_ready:
        return

    ensure_organization_data()
    ensure_user_group_schema()
    db.create_all()
    ensure_table_columns(
        "access_permissions",
        {
            "organization_id": "ALTER TABLE access_permissions ADD COLUMN organization_id INT NOT NULL",
            "subject_type": "ALTER TABLE access_permissions ADD COLUMN subject_type VARCHAR(20) NOT NULL",
            "subject_id": "ALTER TABLE access_permissions ADD COLUMN subject_id INT NOT NULL",
            "permission_key": "ALTER TABLE access_permissions ADD COLUMN permission_key VARCHAR(120) NOT NULL",
            "is_allowed": "ALTER TABLE access_permissions ADD COLUMN is_allowed TINYINT(1) NOT NULL DEFAULT 1",
            "created_at": "ALTER TABLE access_permissions ADD COLUMN created_at DATETIME NULL",
            "updated_at": "ALTER TABLE access_permissions ADD COLUMN updated_at DATETIME NULL",
        },
    )
    ensure_access_permission_indexes()
    _access_permission_schema_ready = True


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


def ensure_access_permission_indexes():
    ensure_index("access_permissions", "idx_access_permissions_organization_id", "organization_id")
    ensure_index("access_permissions", "idx_access_permissions_subject", "subject_type, subject_id")
    ensure_unique_index(
        "access_permissions",
        "unique_access_permission_subject",
        ["organization_id", "subject_type", "subject_id", "permission_key"],
        "DELETE FROM access_permissions "
        "WHERE id NOT IN ("
        "SELECT keep_id FROM ("
        "SELECT MIN(id) AS keep_id "
        "FROM access_permissions "
        "GROUP BY organization_id, subject_type, subject_id, permission_key"
        ") AS access_permission_keepers"
        ")",
    )
    db.session.commit()


def ensure_index(table_name, index_name, column_expression):
    if index_exists(table_name, index_name):
        return

    db.session.execute(text("CREATE INDEX {0} ON {1} ({2})".format(index_name, table_name, column_expression)))


def ensure_unique_index(table_name, index_name, column_names, dedupe_query):
    if index_exists(table_name, index_name):
        return

    try:
        db.session.execute(text(dedupe_query))
        db.session.execute(
            text(
                "CREATE UNIQUE INDEX {0} ON {1} ({2})".format(
                    index_name,
                    table_name,
                    ", ".join(column_names),
                )
            )
        )
    except SQLAlchemyError:
        db.session.rollback()


def index_exists(table_name, index_name):
    inspector = inspect(db.engine)
    indexes = {
        index.get("name")
        for index in inspector.get_indexes(table_name)
    }
    unique_constraints = {
        constraint.get("name")
        for constraint in inspector.get_unique_constraints(table_name)
    }

    return index_name in indexes or index_name in unique_constraints


def get_permission_definitions():
    return ACCESS_PERMISSION_DEFINITIONS


def get_known_permission_keys():
    keys = set()

    for category in ACCESS_PERMISSION_DEFINITIONS:
        for permission in category["permissions"]:
            keys.add(permission["key"])

    return keys


def normalize_subject_type(subject_type):
    if subject_type == "group":
        return "group"

    return "user"


def normalize_permission_keys(raw_permission_keys):
    known_keys = get_known_permission_keys()
    normalized = []
    seen = set()

    for raw_key in raw_permission_keys or []:
        key = str(raw_key or "").strip()

        if not key or key not in known_keys or key in seen:
            continue

        seen.add(key)
        normalized.append(key)

    return normalized


def get_access_subject(subject_type, subject_id, organization_id):
    normalized_subject_type = normalize_subject_type(subject_type)

    try:
        normalized_subject_id = int(subject_id)
    except (TypeError, ValueError):
        return None

    if normalized_subject_type == "group":
        return (
            UserGroup.query
            .filter(UserGroup.id == normalized_subject_id)
            .filter(UserGroup.organization_id == organization_id)
            .filter(UserGroup.is_active == 1)
            .first()
        )

    return (
        User.query
        .filter(User.id == normalized_subject_id)
        .filter(User.organization_id == organization_id)
        .filter(User.is_active == 1)
        .first()
    )


def get_subject_permission_keys(subject_type, subject_id, organization_id):
    ensure_access_permission_schema()
    normalized_subject_type = normalize_subject_type(subject_type)

    return [
        permission.permission_key
        for permission in (
            AccessPermission.query
            .filter(AccessPermission.organization_id == organization_id)
            .filter(AccessPermission.subject_type == normalized_subject_type)
            .filter(AccessPermission.subject_id == subject_id)
            .filter(AccessPermission.is_allowed == 1)
            .order_by(AccessPermission.permission_key.asc())
            .all()
        )
    ]


def replace_subject_permissions(subject_type, subject_id, organization_id, permission_keys):
    ensure_access_permission_schema()
    normalized_subject_type = normalize_subject_type(subject_type)
    normalized_permission_keys = normalize_permission_keys(permission_keys)

    AccessPermission.query.filter(
        AccessPermission.organization_id == organization_id,
        AccessPermission.subject_type == normalized_subject_type,
        AccessPermission.subject_id == subject_id,
    ).delete(synchronize_session=False)

    for permission_key in normalized_permission_keys:
        db.session.add(
            AccessPermission(
                organization_id=organization_id,
                subject_type=normalized_subject_type,
                subject_id=subject_id,
                permission_key=permission_key,
                is_allowed=True,
            )
        )

    db.session.commit()
    return get_subject_permission_keys(normalized_subject_type, subject_id, organization_id)
