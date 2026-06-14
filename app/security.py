import hmac
import secrets

from flask import jsonify, redirect, request, session, url_for, flash

from app.auth import is_api_request


CSRF_SESSION_KEY = "_csrf_token"
MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def csrf_token():
    token = session.get(CSRF_SESSION_KEY)

    if not token:
        token = secrets.token_urlsafe(32)
        session[CSRF_SESSION_KEY] = token

    return token


def validate_csrf_request():
    if request.method not in MUTATING_METHODS:
        return True

    expected_token = session.get(CSRF_SESSION_KEY)
    submitted_token = _get_submitted_csrf_token()

    return bool(
        expected_token
        and submitted_token
        and hmac.compare_digest(str(expected_token), str(submitted_token))
    )


def csrf_failure_response():
    message = "Срок действия формы истек. Обновите страницу и повторите действие."

    if is_api_request():
        return jsonify({"error": "csrf_failed", "message": message}), 400

    flash(message, "error")
    return redirect(request.referrer or url_for("auth.login"))


def _get_submitted_csrf_token():
    token = (
        request.headers.get("X-CSRFToken")
        or request.headers.get("X-CSRF-Token")
        or request.form.get("_csrf_token")
    )

    if token:
        return token

    data = request.get_json(silent=True) if request.is_json else None

    if isinstance(data, dict):
        return data.get("_csrf_token")

    return None
