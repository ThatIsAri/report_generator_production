from flask import Blueprint, current_app, flash, redirect, render_template, request, session, url_for
from sqlalchemy import or_
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db
from app.models import User
from app.organization_service import (
    ensure_organization_data,
    ensure_user_organization_defaults,
    prepare_user_for_default_organization,
)
from app.system_settings_service import get_default_organization_system_setting
from app.user_action_log_service import log_user_action


auth_bp = Blueprint("auth", __name__)
_user_schema_ready = False
SMARTCAPTCHA_VALIDATE_URL = "https://smartcaptcha.cloud.yandex.ru/validate"


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    _ensure_user_schema()

    if session.get("user_id"):
        return redirect(url_for("reports.index"))

    if request.method == "POST":
        login_or_email = (request.form.get("login_or_email") or "").strip()
        password = request.form.get("password") or ""
        smartcaptcha_token = request.form.get("smart-token")
        _log_smartcaptcha_post_state("login", smartcaptcha_token)

        captcha_ok, captcha_error = verify_smartcaptcha(smartcaptcha_token, request.remote_addr)
        _log_smartcaptcha_validation_state("login", captcha_ok, captcha_error)

        if not captcha_ok:
            flash(captcha_error or "Проверка капчи не пройдена. Попробуйте еще раз.", "error")
            return _render_login(login_or_email=login_or_email)

        user = _find_user_by_login_or_email(login_or_email)

        if not user or not check_password_hash(user.password_hash, password):
            flash("Пользователь не найден или пароль указан неверно", "error")
            return _render_login(login_or_email=login_or_email)

        if not user.is_active and _is_active_account_required():
            flash("Аккаунт отключен", "error")
            return _render_login(login_or_email=login_or_email)

        _start_user_session(user)
        if _should_log_auth_events():
            log_user_action(
                "auth.login",
                user=user,
                entity_type="user",
                entity_id=user.id,
                description="Пользователь вошел в систему.",
            )
        return redirect(_get_safe_next_url() or url_for("reports.index"))

    _log_smartcaptcha_page_state("login")
    return _render_login(login_or_email="")


@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    _ensure_user_schema()

    if session.get("user_id"):
        return redirect(url_for("reports.index"))

    if not _is_registration_allowed():
        flash("Самостоятельная регистрация отключена администратором.", "error")
        return redirect(url_for("auth.login"))

    if request.method == "POST":
        username = (request.form.get("username") or "").strip()
        email = (request.form.get("email") or "").strip().lower()
        password = request.form.get("password") or ""
        password_repeat = request.form.get("password_repeat") or ""

        if not username:
            flash("Введите логин", "error")
            return _render_register(username=username, email=email)

        if not email:
            flash("Введите почту", "error")
            return _render_register(username=username, email=email)

        if not password:
            flash("Введите пароль", "error")
            return _render_register(username=username, email=email)

        if password != password_repeat:
            flash("Пароли не совпадают", "error")
            return _render_register(username=username, email=email)

        smartcaptcha_token = request.form.get("smart-token")
        _log_smartcaptcha_post_state("register", smartcaptcha_token)

        captcha_ok, captcha_error = verify_smartcaptcha(smartcaptcha_token, request.remote_addr)
        _log_smartcaptcha_validation_state("register", captcha_ok, captcha_error)

        if not captcha_ok:
            flash(captcha_error or "Проверка капчи не пройдена. Попробуйте еще раз.", "error")
            return _render_register(username=username, email=email)

        if User.query.filter(db.func.lower(User.username) == username.lower()).first():
            flash("Логин уже занят", "error")
            return _render_register(username=username, email=email)

        if User.query.filter(db.func.lower(User.email) == email.lower()).first():
            flash("Email уже занят", "error")
            return _render_register(username=username, email=email)

        user_role = "admin" if User.query.count() == 0 else "user"
        user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password),
            name=username,
            role=user_role,
            is_active=True,
        )
        prepare_user_for_default_organization(user, user_role)
        db.session.add(user)
        db.session.commit()

        _start_user_session(user)
        if _should_log_auth_events():
            log_user_action(
                "auth.register",
                user=user,
                entity_type="user",
                entity_id=user.id,
                description="Пользователь зарегистрировался в системе.",
            )
        flash("Регистрация выполнена успешно", "success")
        return redirect(url_for("reports.index"))

    _log_smartcaptcha_page_state("register")
    return _render_register(username="", email="")


def _is_registration_allowed():
    if User.query.count() == 0:
        return True

    return bool(get_default_organization_system_setting("allow_self_registration"))


def _is_active_account_required():
    return bool(get_default_organization_system_setting("require_active_accounts"))


def _should_log_auth_events():
    return bool(get_default_organization_system_setting("log_auth_events"))


@auth_bp.route("/forgot-password")
def forgot_password():
    return render_template("auth/forgot_password.html")


@auth_bp.route("/logout", methods=["POST"])
def logout():
    user = User.query.get(session.get("user_id")) if session.get("user_id") else None

    if user and _should_log_auth_events():
        log_user_action(
            "auth.logout",
            user=user,
            entity_type="user",
            entity_id=user.id,
            description="Пользователь вышел из системы.",
        )

    session.clear()
    flash("Вы вышли из аккаунта", "success")
    return redirect(url_for("auth.login"))


def _start_user_session(user):
    ensure_user_organization_defaults(user)

    session.clear()
    session["user_id"] = user.id
    session["username"] = user.username
    session["role"] = user.role
    session["organization_id"] = user.organization_id
    session["avatar"] = user.avatar


def verify_smartcaptcha(token, user_ip=None):
    if not current_app.config.get("YANDEX_SMARTCAPTCHA_ENABLED"):
        return True, None

    if not token:
        return False, "Подтвердите, что вы не робот."

    secret_key = current_app.config.get("YANDEX_SMARTCAPTCHA_SECRET_KEY") or ""

    if not secret_key:
        current_app.logger.error("YANDEX_SMARTCAPTCHA_SECRET_KEY is empty")
        return False, "Капча не настроена. Обратитесь к администратору."

    try:
        import requests as http_requests
    except ImportError as exc:
        current_app.logger.exception("Python package requests is required for SmartCaptcha validation: %s", exc)
        return False, "Капча не настроена. Обратитесь к администратору."

    try:
        response = http_requests.post(
            SMARTCAPTCHA_VALIDATE_URL,
            data={
                "secret": secret_key,
                "token": token,
                "ip": user_ip or request.remote_addr or "",
            },
            timeout=5,
        )
    except http_requests.RequestException as exc:
        current_app.logger.exception("SmartCaptcha request failed: %s", exc)
        return False, "Не удалось проверить капчу. Попробуйте еще раз."

    try:
        data = response.json()
    except ValueError:
        current_app.logger.error("SmartCaptcha returned non-json: %s", response.text)
        return False, "Не удалось проверить капчу. Попробуйте еще раз."

    if not isinstance(data, dict):
        current_app.logger.error("SmartCaptcha returned unexpected json: %s", data)
        return False, "Не удалось проверить капчу. Попробуйте еще раз."

    current_app.logger.debug(
        "SmartCaptcha response status=%s message=%s",
        data.get("status"),
        data.get("message") or data.get("error") or "",
    )

    if data.get("status") == "ok":
        return True, None

    current_app.logger.warning("SmartCaptcha failed: %s", data)
    return False, "Проверка капчи не пройдена."


def _smartcaptcha_template_context():
    enabled = bool(current_app.config.get("YANDEX_SMARTCAPTCHA_ENABLED"))
    site_key = current_app.config.get("YANDEX_SMARTCAPTCHA_SITE_KEY") or ""

    if enabled and not site_key:
        current_app.logger.error("YANDEX_SMARTCAPTCHA_SITE_KEY is empty")

    return {
        "smartcaptcha_enabled": enabled,
        "smartcaptcha_site_key": site_key,
    }


def _log_smartcaptcha_page_state(page_name):
    current_app.logger.debug(
        "SmartCaptcha %s page: enabled=%s site_key_exists=%s",
        page_name,
        bool(current_app.config.get("YANDEX_SMARTCAPTCHA_ENABLED")),
        bool(current_app.config.get("YANDEX_SMARTCAPTCHA_SITE_KEY")),
    )


def _log_smartcaptcha_post_state(page_name, token):
    current_app.logger.debug(
        "SmartCaptcha %s POST: token_exists=%s token_length=%s",
        page_name,
        bool(token),
        len(token or ""),
    )


def _log_smartcaptcha_validation_state(page_name, captcha_ok, captcha_error):
    current_app.logger.debug(
        "SmartCaptcha %s validate status=%s message=%s",
        page_name,
        "ok" if captcha_ok else "failed",
        captcha_error or "",
    )


def _render_login(login_or_email=""):
    return render_template(
        "auth/login.html",
        login_or_email=login_or_email,
        **_smartcaptcha_template_context()
    )


def _render_register(username="", email=""):
    return render_template(
        "auth/register.html",
        username=username,
        email=email,
        **_smartcaptcha_template_context()
    )


def _find_user_by_login_or_email(login_or_email):
    normalized = (login_or_email or "").strip().lower()

    if not normalized:
        return None

    return User.query.filter(
        or_(
            db.func.lower(User.username) == normalized,
            db.func.lower(User.email) == normalized,
        )
    ).first()


def _get_safe_next_url():
    next_url = request.args.get("next") or ""

    if next_url.startswith("/") and not next_url.startswith("//"):
        return next_url

    return ""


def _ensure_user_schema():
    global _user_schema_ready

    if _user_schema_ready:
        return

    ensure_organization_data()
    _user_schema_ready = True
