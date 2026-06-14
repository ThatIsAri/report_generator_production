from flask import Blueprint, jsonify, session

from app.auth import login_required
from app.models import Organization, User, UserGroup
from app.organization_service import (
    ensure_default_test_organization,
    ensure_organization_data,
    ensure_user_organization_defaults,
    get_role_label,
    normalize_user_role,
)
from app.report_share_service import (
    ensure_report_share_schema,
    get_current_user_with_organization,
    get_reports_shared_with_user,
    get_reports_shared_with_user_groups,
    serialize_shared_report,
)
from app.user_group_service import ensure_user_group_schema, serialize_user_group


organization_bp = Blueprint("organization", __name__)


@organization_bp.route("/api/organization/members", methods=["GET"])
@login_required
def api_organization_members():
    organization_id = get_current_user_organization_id()
    users = (
        User.query
        .filter(User.organization_id == organization_id)
        .order_by(User.id.asc())
        .all()
    )

    return jsonify({
        "members": [
            serialize_organization_member(user)
            for user in users
        ]
    })


@organization_bp.route("/api/organization/current", methods=["GET"])
@login_required
def api_current_organization():
    organization_id = get_current_user_organization_id()
    organization = Organization.query.get(organization_id)

    if not organization:
        organization = ensure_default_test_organization()

    return jsonify({
        "organization": serialize_organization(organization)
    })


@organization_bp.route("/api/organization/groups", methods=["GET"])
@login_required
def api_organization_groups():
    ensure_user_group_schema()
    organization_id = get_current_user_organization_id()
    groups = (
        UserGroup.query
        .filter(UserGroup.organization_id == organization_id)
        .filter(UserGroup.is_active == 1)
        .order_by(UserGroup.name.asc(), UserGroup.id.asc())
        .all()
    )

    return jsonify({
        "groups": [
            serialize_user_group(group)
            for group in groups
        ]
    })


@organization_bp.route("/api/organization/shared-reports", methods=["GET"])
@login_required
def api_organization_shared_reports():
    ensure_report_share_schema()
    current_user = get_current_user_with_organization(session.get("user_id"))

    if not current_user:
        return jsonify({"error": "unauthorized"}), 401

    shares = list(get_reports_shared_with_user(current_user))
    shares.extend(get_reports_shared_with_user_groups(current_user))
    seen_report_ids = set()
    reports = []

    for share in shares:
        if not share.report or share.report.id in seen_report_ids:
            continue

        seen_report_ids.add(share.report.id)
        reports.append(serialize_shared_report(share))

    return jsonify({"reports": reports})



def get_current_user_organization_id():
    ensure_organization_data()

    current_user = User.query.get(session.get("user_id"))

    if not current_user:
        return ensure_default_test_organization().id

    ensure_user_organization_defaults(current_user)
    session["organization_id"] = current_user.organization_id

    return current_user.organization_id or ensure_default_test_organization().id


def serialize_organization(organization):
    return {
        "id": organization.id,
        "name": organization.name,
        "avatar": organization.avatar,
        "description": organization.description,
        "tariff": organization.tariff or "Базовый",
    }


def serialize_organization_member(user):
    role = normalize_user_role(user.role)
    display_name = get_user_display_name(user)
    email = (user.email or "").strip() or "—"
    avatar = (user.avatar or "").strip() or None

    return {
        "id": user.id,
        "avatar": avatar,
        "name": (user.name or "").strip() or None,
        "display_name": display_name,
        "role": role,
        "role_label": get_role_label(role),
        "position": (user.position or "").strip() or "—",
        "email": email,
        "organization_id": user.organization_id,
    }


def get_user_display_name(user):
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
