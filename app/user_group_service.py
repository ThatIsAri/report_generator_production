from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models import (
    GroupReportAccess,
    GroupTemplateAccess,
    User,
    UserGroup,
    UserGroupMember,
)
from app.organization_service import (
    ensure_organization_data,
    get_role_label,
    normalize_user_role,
)


_user_group_schema_ready = False


def ensure_user_group_schema():
    global _user_group_schema_ready

    if _user_group_schema_ready:
        return

    ensure_organization_data()
    db.create_all()
    ensure_table_columns(
        "user_groups",
        {
            "organization_id": "ALTER TABLE user_groups ADD COLUMN organization_id INT NOT NULL",
            "name": "ALTER TABLE user_groups ADD COLUMN name VARCHAR(255) NOT NULL",
            "description": "ALTER TABLE user_groups ADD COLUMN description TEXT NULL",
            "avatar": "ALTER TABLE user_groups ADD COLUMN avatar VARCHAR(500) NULL",
            "created_by": "ALTER TABLE user_groups ADD COLUMN created_by INT NULL",
            "created_at": "ALTER TABLE user_groups ADD COLUMN created_at DATETIME NULL",
            "updated_at": "ALTER TABLE user_groups ADD COLUMN updated_at DATETIME NULL",
            "is_active": "ALTER TABLE user_groups ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1",
        },
    )
    ensure_table_columns(
        "user_group_members",
        {
            "group_id": "ALTER TABLE user_group_members ADD COLUMN group_id INT NOT NULL",
            "user_id": "ALTER TABLE user_group_members ADD COLUMN user_id INT NOT NULL",
            "role": "ALTER TABLE user_group_members ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'member'",
            "created_at": "ALTER TABLE user_group_members ADD COLUMN created_at DATETIME NULL",
        },
    )
    ensure_table_columns(
        "group_report_access",
        {
            "group_id": "ALTER TABLE group_report_access ADD COLUMN group_id INT NOT NULL",
            "report_id": "ALTER TABLE group_report_access ADD COLUMN report_id INT NOT NULL",
            "access_level": "ALTER TABLE group_report_access ADD COLUMN access_level VARCHAR(50) NOT NULL DEFAULT 'view'",
            "created_at": "ALTER TABLE group_report_access ADD COLUMN created_at DATETIME NULL",
        },
    )
    ensure_table_columns(
        "group_template_access",
        {
            "group_id": "ALTER TABLE group_template_access ADD COLUMN group_id INT NOT NULL",
            "template_id": "ALTER TABLE group_template_access ADD COLUMN template_id INT NOT NULL",
            "access_level": "ALTER TABLE group_template_access ADD COLUMN access_level VARCHAR(50) NOT NULL DEFAULT 'view'",
            "created_at": "ALTER TABLE group_template_access ADD COLUMN created_at DATETIME NULL",
        },
    )
    ensure_user_group_indexes()
    _user_group_schema_ready = True


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


def ensure_user_group_indexes():
    ensure_index("user_groups", "idx_user_groups_organization_id", "organization_id")
    ensure_index("user_groups", "idx_user_groups_is_active", "is_active")
    ensure_index("user_group_members", "idx_user_group_members_group_id", "group_id")
    ensure_index("user_group_members", "idx_user_group_members_user_id", "user_id")
    ensure_unique_index(
        "user_group_members",
        "unique_group_user",
        ["group_id", "user_id"],
        "DELETE FROM user_group_members "
        "WHERE id NOT IN ("
        "SELECT keep_id FROM ("
        "SELECT MIN(id) AS keep_id FROM user_group_members GROUP BY group_id, user_id"
        ") AS user_group_member_keepers"
        ")",
    )
    ensure_index("group_report_access", "idx_group_report_access_group_id", "group_id")
    ensure_index("group_report_access", "idx_group_report_access_report_id", "report_id")
    ensure_unique_index(
        "group_report_access",
        "unique_group_report",
        ["group_id", "report_id"],
        "DELETE FROM group_report_access "
        "WHERE id NOT IN ("
        "SELECT keep_id FROM ("
        "SELECT MIN(id) AS keep_id FROM group_report_access GROUP BY group_id, report_id"
        ") AS group_report_access_keepers"
        ")",
    )
    ensure_index("group_template_access", "idx_group_template_access_group_id", "group_id")
    ensure_index("group_template_access", "idx_group_template_access_template_id", "template_id")
    ensure_unique_index(
        "group_template_access",
        "unique_group_template",
        ["group_id", "template_id"],
        "DELETE FROM group_template_access "
        "WHERE id NOT IN ("
        "SELECT keep_id FROM ("
        "SELECT MIN(id) AS keep_id FROM group_template_access GROUP BY group_id, template_id"
        ") AS group_template_access_keepers"
        ")",
    )
    db.session.commit()


def ensure_index(table_name, index_name, column_name):
    if index_exists(table_name, index_name):
        return

    db.session.execute(text("CREATE INDEX {0} ON {1} ({2})".format(index_name, table_name, column_name)))


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


def normalize_member_ids(raw_member_ids):
    normalized = []
    seen = set()

    for raw_member_id in raw_member_ids or []:
        try:
            member_id = int(raw_member_id)
        except (TypeError, ValueError):
            continue

        if member_id <= 0 or member_id in seen:
            continue

        seen.add(member_id)
        normalized.append(member_id)

    return normalized


def replace_group_members(group, member_ids, organization_id):
    normalized_ids = normalize_member_ids(member_ids)
    users = []

    if normalized_ids:
        users = (
            User.query
            .filter(User.id.in_(normalized_ids))
            .filter(User.organization_id == organization_id)
            .filter(User.is_active == 1)
            .all()
        )

    users_by_id = {
        user.id: user
        for user in users
    }

    UserGroupMember.query.filter_by(group_id=group.id).delete(synchronize_session=False)

    for member_id in normalized_ids:
        user = users_by_id.get(member_id)

        if not user:
            continue

        db.session.add(
            UserGroupMember(
                group_id=group.id,
                user_id=user.id,
                role="member",
            )
        )


def get_group_for_admin(group_id, organization_id, active_only=True):
    query = (
        UserGroup.query
        .filter(UserGroup.id == group_id)
        .filter(UserGroup.organization_id == organization_id)
    )

    if active_only:
        query = query.filter(UserGroup.is_active == 1)

    return query.first()


def serialize_user_group(group, include_members=False):
    members_count = UserGroupMember.query.filter_by(group_id=group.id).count()
    reports_count = GroupReportAccess.query.filter_by(group_id=group.id).count()
    templates_count = GroupTemplateAccess.query.filter_by(group_id=group.id).count()
    data = {
        "id": group.id,
        "organization_id": group.organization_id,
        "name": group.name,
        "description": group.description or "",
        "avatar": (group.avatar or "").strip() or None,
        "members_count": members_count,
        "reports_count": reports_count,
        "templates_count": templates_count,
        "created_at": group.created_at.strftime("%Y-%m-%d %H:%M:%S") if group.created_at else "",
    }

    if include_members:
        data["members"] = [
            serialize_group_member(member)
            for member in UserGroupMember.query.filter_by(group_id=group.id).order_by(UserGroupMember.id.asc()).all()
            if member.user and member.user.is_active
        ]
        data["reports"] = []
        data["templates"] = []

    return data


def serialize_group_member(member):
    user = member.user
    role = normalize_user_role(user.role)

    return {
        "id": user.id,
        "avatar": (user.avatar or "").strip() or None,
        "name": (user.name or "").strip() or None,
        "first_name": (user.first_name or "").strip() or None,
        "last_name": (user.last_name or "").strip() or None,
        "display_name": get_user_display_name(user),
        "email": (user.email or "").strip() or "—",
        "position": (user.position or "").strip() or "—",
        "role": role,
        "role_label": get_role_label(role),
        "group_role": member.role or "member",
    }


def get_user_display_name(user):
    if not user:
        return "Пользователь"

    full_name = " ".join(
        part
        for part in [
            (user.last_name or "").strip(),
            (user.first_name or "").strip(),
        ]
        if part
    ).strip()

    if full_name:
        return full_name

    if (user.name or "").strip():
        return user.name.strip()

    if (user.username or "").strip():
        return user.username.strip()

    if (user.email or "").strip():
        return user.email.strip()

    return "Пользователь"
