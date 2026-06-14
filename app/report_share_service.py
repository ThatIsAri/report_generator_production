from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models import GroupReportAccess, Report, ReportShare, User, UserGroup
from app.organization_service import (
    ensure_organization_data,
    ensure_user_organization_defaults,
    get_role_label,
    normalize_user_role,
)
from app.user_group_service import ensure_user_group_schema


_report_share_schema_ready = False


def ensure_report_share_schema():
    global _report_share_schema_ready

    if _report_share_schema_ready:
        return

    ensure_user_group_schema()
    db.create_all()
    inspector = inspect(db.engine)
    table_names = inspector.get_table_names()

    if "report_shares" in table_names:
        ensure_report_share_columns()
        ensure_report_share_indexes()

    _report_share_schema_ready = True


def ensure_report_share_columns():
    inspector = inspect(db.engine)
    existing_columns = {
        column["name"]
        for column in inspector.get_columns("report_shares")
    }
    migration_queries = []

    column_queries = {
        "report_id": "ALTER TABLE report_shares ADD COLUMN report_id INT NOT NULL",
        "user_id": "ALTER TABLE report_shares ADD COLUMN user_id INT NOT NULL",
        "created_by": "ALTER TABLE report_shares ADD COLUMN created_by INT NULL",
        "access_level": "ALTER TABLE report_shares ADD COLUMN access_level VARCHAR(50) NOT NULL DEFAULT 'view'",
        "created_at": "ALTER TABLE report_shares ADD COLUMN created_at DATETIME NULL",
    }

    for column_name, query in column_queries.items():
        if column_name not in existing_columns:
            migration_queries.append(query)

    for query in migration_queries:
        db.session.execute(text(query))

    if migration_queries:
        db.session.commit()


def ensure_report_share_indexes():
    inspector = inspect(db.engine)
    indexes = {
        index.get("name")
        for index in inspector.get_indexes("report_shares")
    }
    unique_constraints = {
        constraint.get("name")
        for constraint in inspector.get_unique_constraints("report_shares")
    }

    if "idx_report_shares_report_id" not in indexes:
        db.session.execute(text("CREATE INDEX idx_report_shares_report_id ON report_shares (report_id)"))

    if "idx_report_shares_user_id" not in indexes:
        db.session.execute(text("CREATE INDEX idx_report_shares_user_id ON report_shares (user_id)"))

    if "unique_report_user" not in indexes and "unique_report_user" not in unique_constraints:
        try:
            db.session.execute(
                text(
                    "DELETE FROM report_shares "
                    "WHERE id NOT IN ("
                    "SELECT keep_id FROM ("
                    "SELECT MIN(id) AS keep_id FROM report_shares GROUP BY report_id, user_id"
                    ") AS report_share_keepers"
                    ")"
                )
            )
            db.session.execute(text("CREATE UNIQUE INDEX unique_report_user ON report_shares (report_id, user_id)"))
        except SQLAlchemyError:
            db.session.rollback()
            return

    db.session.commit()


def get_current_user_with_organization(user_id):
    ensure_organization_data()
    user = User.query.get(user_id)

    if not user:
        return None

    ensure_user_organization_defaults(user)
    return user


def can_manage_report_shares(report, user):
    if not report or not user:
        return False

    if normalize_user_role(user.role) == "admin":
        return True

    # У отчетов пока нет owner_id, поэтому на этом этапе любой авторизованный
    # участник организации может менять доступ. При появлении владельца отчета
    # проверку нужно сузить до owner/admin.
    return True


def get_report_shares(report_id):
    ensure_report_share_schema()
    shares = (
        ReportShare.query
        .join(User, ReportShare.user_id == User.id)
        .filter(ReportShare.report_id == report_id)
        .order_by(User.name.asc(), User.username.asc(), User.email.asc())
        .all()
    )

    user_shares = [
        serialize_report_share(share)
        for share in shares
        if share.user
    ]
    group_shares = get_report_group_shares(report_id)

    return user_shares + group_shares


def get_report_user_shares(report_id):
    return [
        share
        for share in get_report_shares(report_id)
        if share.get("subject_type") == "user"
    ]


def get_report_group_shares(report_id):
    ensure_report_share_schema()
    group_shares = (
        GroupReportAccess.query
        .join(UserGroup, GroupReportAccess.group_id == UserGroup.id)
        .filter(GroupReportAccess.report_id == report_id)
        .filter(UserGroup.is_active == 1)
        .order_by(UserGroup.name.asc(), UserGroup.id.asc())
        .all()
    )

    return [
        serialize_report_group_share(share)
        for share in group_shares
        if share.group
    ]


def replace_report_shares(report, user_ids, current_user):
    return replace_report_access(report, user_ids, [], current_user)


def replace_report_access(report, user_ids, group_ids, current_user):
    ensure_report_share_schema()
    organization_id = current_user.organization_id
    normalized_user_ids = normalize_user_ids(user_ids)
    normalized_group_ids = normalize_user_ids(group_ids)

    users = []
    if normalized_user_ids:
        users = (
            User.query
            .filter(User.id.in_(normalized_user_ids))
            .filter(User.organization_id == organization_id)
            .all()
        )

    groups = []
    if normalized_group_ids:
        groups = (
            UserGroup.query
            .filter(UserGroup.id.in_(normalized_group_ids))
            .filter(UserGroup.organization_id == organization_id)
            .filter(UserGroup.is_active == 1)
            .all()
        )

    users_by_id = {
        user.id: user
        for user in users
    }
    groups_by_id = {
        group.id: group
        for group in groups
    }

    ReportShare.query.filter_by(report_id=report.id).delete(synchronize_session=False)
    GroupReportAccess.query.filter_by(report_id=report.id).delete(synchronize_session=False)

    for user_id in normalized_user_ids:
        user = users_by_id.get(user_id)

        if not user:
            continue

        db.session.add(
            ReportShare(
                report_id=report.id,
                user_id=user.id,
                created_by=current_user.id,
                access_level="view",
            )
        )

    for group_id in normalized_group_ids:
        group = groups_by_id.get(group_id)

        if not group:
            continue

        db.session.add(
            GroupReportAccess(
                report_id=report.id,
                group_id=group.id,
                access_level="view",
            )
        )

    db.session.commit()
    return get_report_shares(report.id)


def normalize_user_ids(raw_user_ids):
    normalized = []
    seen = set()

    for raw_user_id in raw_user_ids or []:
        try:
            user_id = int(raw_user_id)
        except (TypeError, ValueError):
            continue

        if user_id <= 0 or user_id in seen:
            continue

        seen.add(user_id)
        normalized.append(user_id)

    return normalized


def serialize_report_share(share):
    user = share.user
    role = normalize_user_role(user.role)

    return {
        "id": share.id,
        "subject_type": "user",
        "user_id": user.id,
        "group_id": None,
        "avatar": (user.avatar or "").strip() or None,
        "name": (user.name or "").strip() or None,
        "display_name": get_user_display_name(user),
        "role": role,
        "role_label": get_role_label(role),
        "position": (user.position or "").strip() or "—",
        "email": (user.email or "").strip() or "—",
        "access_level": share.access_level or "view",
    }


def serialize_report_group_share(share):
    group = share.group

    return {
        "id": share.id,
        "subject_type": "group",
        "user_id": None,
        "group_id": group.id,
        "avatar": (group.avatar or "").strip() or None,
        "name": group.name,
        "display_name": group.name,
        "role": "group",
        "role_label": "Группа",
        "position": "Группа пользователей",
        "email": "—",
        "members_count": len([member for member in group.members if member.user and member.user.is_active]),
        "access_level": share.access_level or "view",
    }


def serialize_shared_report(share):
    report = share.report
    creator = getattr(share, "creator", None)
    group = getattr(share, "group", None)

    return {
        "id": report.id,
        "title": report.report_title,
        "template": report.template_key or "Не выбран",
        "date": report.report_date.strftime("%d.%m.%Y") if report.report_date else "",
        "owner_name": get_user_display_name(creator) if creator else (group.name if group else "—"),
        "access_level": share.access_level or "view",
    }


def get_reports_shared_with_user(user):
    ensure_report_share_schema()

    if not user:
        return []

    return (
        ReportShare.query
        .join(Report, ReportShare.report_id == Report.id)
        .filter(ReportShare.user_id == user.id)
        .order_by(Report.updated_at.desc(), Report.created_at.desc())
        .all()
    )


def get_reports_shared_with_user_groups(user):
    ensure_report_share_schema()

    if not user:
        return []

    group_ids = [
        member.group_id
        for member in getattr(user, "group_memberships", [])
        if member.group and member.group.is_active
    ]

    if not group_ids:
        return []

    return (
        GroupReportAccess.query
        .join(Report, GroupReportAccess.report_id == Report.id)
        .filter(GroupReportAccess.group_id.in_(group_ids))
        .order_by(Report.updated_at.desc(), Report.created_at.desc())
        .all()
    )


def get_user_display_name(user):
    if not user:
        return "Пользователь"

    name = (user.name or "").strip()

    if name:
        return name

    legacy_name = " ".join(
        part
        for part in [
            (user.last_name or "").strip(),
            (user.first_name or "").strip(),
        ]
        if part
    ).strip()

    if legacy_name:
        return legacy_name

    if (user.username or "").strip():
        return user.username.strip()

    if (user.email or "").strip():
        return user.email.strip()

    return "Пользователь"
