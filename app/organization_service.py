from sqlalchemy import inspect, text

from app.extensions import db
from app.models import Organization, User


DEFAULT_ORGANIZATION_NAME = "Тест"
DEFAULT_ORGANIZATION_DESCRIPTION = "Тестовая организация"
DEFAULT_ORGANIZATION_TARIFF = "Базовый"

_organization_schema_ready = False


def ensure_organization_data():
    ensure_organization_schema()
    organization = ensure_default_test_organization()
    ensure_existing_users_in_default_organization(organization)
    return organization


def ensure_organization_schema():
    global _organization_schema_ready

    if _organization_schema_ready:
        return

    db.create_all()
    inspector = inspect(db.engine)
    table_names = inspector.get_table_names()

    if "organizations" in table_names:
        ensure_table_columns(
            "organizations",
            {
                "name": "ALTER TABLE organizations ADD COLUMN name VARCHAR(255) NULL",
                "avatar": "ALTER TABLE organizations ADD COLUMN avatar VARCHAR(500) NULL",
                "description": "ALTER TABLE organizations ADD COLUMN description TEXT NULL",
                "tariff": (
                    "ALTER TABLE organizations "
                    "ADD COLUMN tariff VARCHAR(100) NOT NULL DEFAULT 'Базовый'"
                ),
                "created_at": "ALTER TABLE organizations ADD COLUMN created_at DATETIME NULL",
                "updated_at": "ALTER TABLE organizations ADD COLUMN updated_at DATETIME NULL",
            },
        )

    inspector = inspect(db.engine)
    table_names = inspector.get_table_names()

    if "users" in table_names:
        ensure_table_columns(
            "users",
            {
                "username": "ALTER TABLE users ADD COLUMN username VARCHAR(100) NULL",
                "email": "ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL",
                "password_hash": "ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL",
                "name": "ALTER TABLE users ADD COLUMN name VARCHAR(255) NULL",
                "role": "ALTER TABLE users ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'user'",
                "first_name": "ALTER TABLE users ADD COLUMN first_name VARCHAR(100) NULL",
                "last_name": "ALTER TABLE users ADD COLUMN last_name VARCHAR(100) NULL",
                "position": "ALTER TABLE users ADD COLUMN position VARCHAR(255) NULL",
                "avatar": "ALTER TABLE users ADD COLUMN avatar VARCHAR(500) NULL",
                "organization_id": "ALTER TABLE users ADD COLUMN organization_id INT NULL",
                "created_at": "ALTER TABLE users ADD COLUMN created_at DATETIME NULL",
                "updated_at": "ALTER TABLE users ADD COLUMN updated_at DATETIME NULL",
                "is_active": "ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1",
            },
        )
        ensure_users_organization_index()

    _organization_schema_ready = True


def ensure_table_columns(table_name, column_queries):
    inspector = inspect(db.engine)
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


def ensure_users_organization_index():
    inspector = inspect(db.engine)
    indexes = inspector.get_indexes("users")

    for index in indexes:
        if index.get("name") == "idx_users_organization_id":
            return

    db.session.execute(text("CREATE INDEX idx_users_organization_id ON users (organization_id)"))
    db.session.commit()


def ensure_default_test_organization():
    organization = Organization.query.filter(
        db.func.lower(Organization.name) == DEFAULT_ORGANIZATION_NAME.lower()
    ).first()

    if organization:
        changed = False

        if not organization.description:
            organization.description = DEFAULT_ORGANIZATION_DESCRIPTION
            changed = True

        if not organization.tariff:
            organization.tariff = DEFAULT_ORGANIZATION_TARIFF
            changed = True

        if changed:
            db.session.commit()

        return organization

    organization = Organization(
        name=DEFAULT_ORGANIZATION_NAME,
        avatar=None,
        description=DEFAULT_ORGANIZATION_DESCRIPTION,
        tariff=DEFAULT_ORGANIZATION_TARIFF,
    )
    db.session.add(organization)
    db.session.commit()

    return organization


def ensure_existing_users_in_default_organization(organization):
    db.session.execute(
        text(
            "UPDATE users "
            "SET organization_id = :organization_id "
            "WHERE organization_id IS NULL"
        ),
        {"organization_id": organization.id},
    )
    db.session.execute(
        text(
            "UPDATE users "
            "SET name = username "
            "WHERE (name IS NULL OR name = '') AND username IS NOT NULL"
        )
    )
    db.session.execute(
        text(
            "UPDATE users "
            "SET role = 'user' "
            "WHERE role IS NULL OR role NOT IN ('admin', 'user')"
        )
    )
    db.session.execute(
        text(
            "UPDATE users "
            "SET position = CASE WHEN role = 'admin' THEN 'Администратор' ELSE 'Участник' END "
            "WHERE position IS NULL OR position = ''"
        )
    )
    db.session.execute(
        text(
            "UPDATE users "
            "SET is_active = 1 "
            "WHERE is_active IS NULL"
        )
    )

    for user in User.query.all():
        fill_user_name_parts(user)

    db.session.commit()


def prepare_user_for_default_organization(user, role=None):
    organization = ensure_organization_data()
    normalized_role = normalize_user_role(role or user.role)

    user.role = normalized_role
    user.organization_id = organization.id

    if not (user.name or "").strip():
        user.name = (user.username or "").strip() or None

    if not (user.position or "").strip():
        user.position = get_default_position(normalized_role)

    return user


def ensure_user_organization_defaults(user, commit=True):
    if not user:
        return None

    organization = ensure_organization_data()
    changed = False
    normalized_role = normalize_user_role(user.role)

    if user.role != normalized_role:
        user.role = normalized_role
        changed = True

    if not user.organization_id:
        user.organization_id = organization.id
        changed = True

    if not (user.name or "").strip():
        user.name = (user.username or "").strip() or None
        changed = True

    if not (user.position or "").strip():
        user.position = get_default_position(user.role)
        changed = True

    if fill_user_name_parts(user):
        changed = True

    if changed and commit:
        db.session.commit()

    return user


def normalize_user_role(role):
    if role == "admin":
        return "admin"

    return "user"


def get_role_label(role):
    if role == "admin":
        return "Администратор"

    return "Участник"


def get_default_position(role):
    if role == "admin":
        return "Администратор"

    return "Участник"


def fill_user_name_parts(user):
    if not user:
        return False

    changed = False
    source_name = (user.name or "").strip() or (user.username or "").strip() or (user.email or "").strip()
    parts = source_name.split()

    if not (user.last_name or "").strip() and len(parts) >= 2:
        user.last_name = parts[0]
        changed = True

    if not (user.first_name or "").strip():
        if len(parts) >= 2:
            user.first_name = " ".join(parts[1:])
        elif source_name:
            user.first_name = source_name
        changed = bool(user.first_name) or changed

    return changed
