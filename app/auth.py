from functools import wraps

from flask import abort, jsonify, redirect, request, session, url_for


def is_authenticated():
    return bool(session.get("user_id"))


def is_api_request():
    return (
        request.path.startswith("/api/")
        or request.headers.get("X-Requested-With") == "XMLHttpRequest"
        or "application/json" in request.headers.get("Accept", "")
    )


def unauthorized_response():
    if is_api_request():
        return jsonify({"error": "unauthorized"}), 401

    return redirect(url_for("auth.login", next=request.full_path if request.query_string else request.path))


def login_required(view_func):
    @wraps(view_func)
    def wrapped_view(*args, **kwargs):
        if not is_authenticated():
            return unauthorized_response()

        return view_func(*args, **kwargs)

    return wrapped_view


def role_required(*roles):
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(*args, **kwargs):
            if not is_authenticated():
                return unauthorized_response()

            if session.get("role") not in roles:
                abort(403)

            return view_func(*args, **kwargs)

        return wrapped_view

    return decorator
