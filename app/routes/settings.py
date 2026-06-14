from pathlib import Path
from uuid import uuid4

from flask import Blueprint, current_app, flash, jsonify, redirect, render_template, request, session, url_for
from sqlalchemy import func
from werkzeug.security import check_password_hash, generate_password_hash

from app.auth import login_required
from app.extensions import db
from app.file_security import validate_uploaded_file
from app.models import User
from app.user_action_log_service import log_user_action
from app.user_settings_service import (
    ensure_user_preferences_schema,
    get_user_settings,
    save_user_settings,
    serialize_setting_groups,
)


settings_bp = Blueprint("settings", __name__)
ALLOWED_AVATAR_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}
ALLOWED_AVATAR_MIME_TYPES_BY_EXTENSION = {
    ".png": {"image/png"},
    ".jpg": {"image/jpeg"},
    ".jpeg": {"image/jpeg"},
    ".webp": {"image/webp"},
    ".gif": {"image/gif"},
}
MAX_AVATAR_BYTES = 3 * 1024 * 1024


@settings_bp.route("/settings", methods=["GET"])
@login_required
def index():
    user = get_current_user()
    settings_payload = build_settings_payload(user)

    return render_template(
        "settings/index.html",
        user=user,
        settings_payload=settings_payload,
    )


@settings_bp.route("/settings/profile", methods=["POST"])
@login_required
def update_profile():
    user = get_current_user()
    username = (request.form.get("username") or "").strip()
    email = (request.form.get("email") or "").strip().lower()
    first_name = (request.form.get("first_name") or "").strip()
    last_name = (request.form.get("last_name") or "").strip()
    position = (request.form.get("position") or "").strip()
    avatar = (request.form.get("avatar") or "").strip()
    avatar_file = request.files.get("avatar_file")

    if not username:
        flash("Введите логин.", "error")
        return redirect(url_for("settings.index"))

    if not email:
        flash("Введите почту.", "error")
        return redirect(url_for("settings.index"))

    username_exists = (
        User.query
        .filter(func.lower(User.username) == username.lower())
        .filter(User.id != user.id)
        .first()
    )

    if username_exists:
        flash("Логин уже занят.", "error")
        return redirect(url_for("settings.index"))

    email_exists = (
        User.query
        .filter(func.lower(User.email) == email.lower())
        .filter(User.id != user.id)
        .first()
    )

    if email_exists:
        flash("Email уже занят.", "error")
        return redirect(url_for("settings.index"))

    try:
        uploaded_avatar = save_avatar_file(user, avatar_file)
    except ValueError as exc:
        flash(str(exc), "error")
        return redirect(url_for("settings.index"))

    user.username = username
    user.email = email
    user.first_name = first_name or None
    user.last_name = last_name or None
    user.position = position or None
    user.avatar = uploaded_avatar or avatar or None
    user.name = build_display_name(user)
    db.session.commit()

    session["username"] = user.username
    session["avatar"] = user.avatar
    log_user_action(
        "user.profile.update",
        user=user,
        entity_type="user",
        entity_id=user.id,
        description="Пользователь обновил личный профиль.",
    )
    flash("Профиль обновлен.", "success")
    return redirect(url_for("settings.index"))


@settings_bp.route("/settings/password", methods=["POST"])
@login_required
def update_password():
    user = get_current_user()
    current_password = request.form.get("current_password") or ""
    new_password = request.form.get("new_password") or ""
    password_repeat = request.form.get("password_repeat") or ""

    if not current_password or not check_password_hash(user.password_hash, current_password):
        flash("Текущий пароль указан неверно.", "error")
        return redirect(url_for("settings.index"))

    if len(new_password) < 6:
        flash("Новый пароль должен быть не короче 6 символов.", "error")
        return redirect(url_for("settings.index"))

    if new_password != password_repeat:
        flash("Новые пароли не совпадают.", "error")
        return redirect(url_for("settings.index"))

    user.password_hash = generate_password_hash(new_password)
    db.session.commit()
    log_user_action(
        "user.password.update",
        user=user,
        entity_type="user",
        entity_id=user.id,
        description="Пользователь изменил пароль.",
    )
    flash("Пароль обновлен.", "success")
    return redirect(url_for("settings.index"))


@settings_bp.route("/api/user/settings", methods=["GET"])
@login_required
def api_user_settings():
    user = get_current_user()
    return jsonify(build_settings_payload(user))


@settings_bp.route("/api/user/settings", methods=["POST"])
@login_required
def api_update_user_settings():
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    values = save_user_settings(user.id, payload.get("settings") or {})
    log_user_action(
        "user.preferences.update",
        user=user,
        entity_type="user",
        entity_id=user.id,
        description="Пользователь обновил персональные настройки приложения.",
    )

    return jsonify({
        "success": True,
        "values": values,
        "groups": serialize_setting_groups(values),
    })


def get_current_user():
    return User.query.get_or_404(session.get("user_id"))


def build_settings_payload(user):
    ensure_user_preferences_schema()
    values = get_user_settings(user.id)

    return {
        "profile": serialize_profile(user),
        "values": values,
        "groups": serialize_setting_groups(values),
    }


def serialize_profile(user):
    return {
        "id": user.id,
        "username": user.username or "",
        "email": user.email or "",
        "name": build_display_name(user),
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
        "position": user.position or "",
        "avatar": user.avatar or "",
        "role": user.role or "user",
        "organization_id": user.organization_id,
    }


def build_display_name(user):
    full_name = " ".join(
        part
        for part in [
            (user.last_name or "").strip(),
            (user.first_name or "").strip(),
        ]
        if part
    ).strip()

    return full_name or (user.name or "").strip() or (user.username or "").strip()


def save_avatar_file(user, avatar_file):
    if not avatar_file or not avatar_file.filename:
        return None

    try:
        original_filename, extension, _, _ = validate_uploaded_file(
            avatar_file,
            {"." + extension for extension in ALLOWED_AVATAR_EXTENSIONS},
            ALLOWED_AVATAR_MIME_TYPES_BY_EXTENSION,
            MAX_AVATAR_BYTES,
        )
    except ValueError:
        raise ValueError("Загрузите изображение в формате PNG, JPG, WEBP или GIF.")

    upload_dir = Path(current_app.root_path) / "static" / "uploads" / "avatars"
    upload_dir.mkdir(parents=True, exist_ok=True)

    safe_stem = Path(original_filename).stem or "avatar"
    filename = "user_{0}_{1}_{2}.{3}".format(
        user.id,
        uuid4().hex[:12],
        safe_stem[:40],
        extension.lstrip("."),
    )
    avatar_file.save(upload_dir / filename)

    return url_for("static", filename="uploads/avatars/{0}".format(filename))
