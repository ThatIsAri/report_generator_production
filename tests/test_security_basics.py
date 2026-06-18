from datetime import date
from io import BytesIO

import pytest
from werkzeug.datastructures import FileStorage
from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.file_security import validate_uploaded_file
from app.html_sanitizer import sanitize_editor_html
from app.models import ReportDraft, ReportEditorState, User


@pytest.fixture()
def app():
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SERVER_NAME": "localhost",
            "YANDEX_SMARTCAPTCHA_ENABLED": False,
            "WTF_CSRF_ENABLED": False,
        }
    )

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def create_user(username="admin", role="admin"):
    user = User(
        username=username,
        email="{0}@example.com".format(username),
        password_hash=generate_password_hash("password"),
        role=role,
        is_active=True,
    )
    db.session.add(user)
    db.session.commit()
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "organization_id": user.organization_id,
    }


def login_session(client, user):
    token = "test-csrf-token"

    with client.session_transaction() as session:
        session["user_id"] = user["id"]
        session["username"] = user["username"]
        session["role"] = user["role"]
        session["organization_id"] = user["organization_id"]
        session["_csrf_token"] = token

    return token


def test_editor_html_sanitizer_removes_active_content():
    dirty_html = (
        '<p onclick="alert(1)">Text</p>'
        '<script>alert(2)</script>'
        '<img src="javascript:alert(3)" onerror="alert(4)">'
        '<a href="javascript:alert(5)">bad</a>'
        "<strong>ok</strong>"
    )

    clean_html = sanitize_editor_html(dirty_html)

    assert "script" not in clean_html.lower()
    assert "onclick" not in clean_html.lower()
    assert "onerror" not in clean_html.lower()
    assert "javascript:" not in clean_html.lower()
    assert "<strong>ok</strong>" in clean_html


def test_file_validator_rejects_fake_pdf():
    fake_pdf = FileStorage(
        stream=BytesIO(b"<html>not a pdf</html>"),
        filename="report.pdf",
        content_type="application/pdf",
    )

    with pytest.raises(ValueError):
        validate_uploaded_file(fake_pdf, {".pdf"}, {".pdf": {"application/pdf"}}, 10 * 1024 * 1024)


def test_csrf_required_for_mutating_api(client, app):
    with app.app_context():
        user = create_user("admin", "admin")

    login_session(client, user)

    response = client.post("/api/admin/users/999/deactivate")

    assert response.status_code == 400
    assert response.get_json()["error"] == "csrf_failed"


def test_non_admin_cannot_open_admin_page(client, app):
    with app.app_context():
        user = create_user("regular", "user")

    login_session(client, user)

    response = client.get("/admin")

    assert response.status_code == 403


def test_registration_rejects_short_password(client, app):
    token = "registration-test-csrf-token"

    with client.session_transaction() as session:
        session["_csrf_token"] = token

    response = client.post(
        "/register",
        data={
            "_csrf_token": token,
            "username": "shortpass",
            "email": "shortpass@example.com",
            "password": "123",
            "password_repeat": "123",
        },
    )

    assert response.status_code == 200
    assert "Пароль должен содержать не менее 6 символов".encode("utf-8") in response.data

    with app.app_context():
        assert User.query.filter_by(username="shortpass").count() == 0


def test_admin_cannot_deactivate_self(client, app):
    with app.app_context():
        user = create_user("selfadmin", "admin")

    token = login_session(client, user)

    response = client.post(
        "/api/admin/users/{0}/deactivate".format(user["id"]),
        headers={"X-CSRFToken": token},
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "self_deactivate_forbidden"


def test_report_editor_state_is_sanitized_on_save(client, app):
    with app.app_context():
        user = create_user("editoradmin", "admin")
        draft = ReportDraft(
            report_title="Audit draft",
            report_date=date.today(),
            template_key="generic_report_default",
            template_title="Универсальный отчет",
            status="draft",
        )
        db.session.add(draft)
        db.session.flush()
        db.session.add(ReportEditorState(draft_id=draft.id, document_html="", document_json="{}"))
        db.session.commit()
        draft_id = draft.id

    token = login_session(client, user)
    response = client.patch(
        "/api/reports/{0}/autosave".format(draft_id),
        json={
            "document_html": '<div onclick="alert(1)">Safe<script>alert(2)</script></div>',
            "document_json": {
                "pages": [
                    {"html": '<img src="javascript:alert(1)" onerror="alert(2)">'}
                ]
            },
        },
        headers={"X-CSRFToken": token},
    )

    assert response.status_code == 200

    with app.app_context():
        state = ReportEditorState.query.filter_by(draft_id=draft_id).first()
        assert "script" not in (state.document_html or "").lower()
        assert "onclick" not in (state.document_html or "").lower()
        assert "javascript:" not in (state.document_json or "").lower()
