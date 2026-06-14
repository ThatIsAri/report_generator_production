from datetime import date
from io import BytesIO
import xml.etree.ElementTree as ET

import pytest
from docx import Document
from pypdf import PdfReader
from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.models import Report, ReportDraft, ReportEditorState, User


@pytest.fixture()
def app():
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SERVER_NAME": "localhost",
            "YANDEX_SMARTCAPTCHA_ENABLED": False,
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
        name=username,
        first_name=username,
        position="Администратор" if role == "admin" else "Участник",
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


def create_report_with_editor_state():
    report = Report(
        report_title='Ежемесячный отчет <опасный> & "проверка"',
        report_author="Администратор",
        report_date=date(2026, 6, 6),
        tag="Финансы & план",
        template_key="generic_report_default",
        source_type="manual",
    )
    db.session.add(report)
    db.session.flush()

    draft = ReportDraft(
        report_title=report.report_title,
        report_date=report.report_date,
        tag=report.tag,
        template_key=report.template_key,
        template_title="Универсальный отчет",
        linked_report_id=report.id,
        status="editing",
    )
    db.session.add(draft)
    db.session.flush()

    db.session.add(
        ReportEditorState(
            draft_id=draft.id,
            document_html=(
                '<div class="editor-page-wrapper">'
                '<section class="editable-page">'
                "<h1>Раздел отчета</h1>"
                '<p style="font-size: 18px; text-align: center;">'
                "<strong>Жирный текст</strong>, <em>курсив</em> и <u>подчеркивание</u>."
                "</p>"
                "<ul><li>Первый пункт</li><li>Второй пункт</li></ul>"
                "<table><tr><th>Колонка</th><th>Значение</th></tr><tr><td>План</td><td>100%</td></tr></table>"
                '<script>alert("xss")</script>'
                '<img src="javascript:alert(1)" onerror="alert(2)">'
                "</section>"
                "</div>"
            ),
            document_json="{}",
        )
    )
    db.session.commit()
    return report


def export_report(client, report_id, export_format, token):
    return client.post(
        "/reports/{0}/export/{1}".format(report_id, export_format),
        headers={
            "X-CSRFToken": token,
            "X-Requested-With": "XMLHttpRequest",
        },
    )


def test_successful_docx_export_is_readable(client, app):
    with app.app_context():
        admin = create_user("exportadmin", "admin")
        report = create_report_with_editor_state()
        report_id = report.id

    token = login_session(client, admin)
    response = export_report(client, report_id, "docx", token)

    assert response.status_code == 200
    assert response.mimetype == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    assert "attachment" in response.headers["Content-Disposition"]
    assert "report_{0}_".format(report_id) in response.headers["Content-Disposition"]
    assert "<опасный>" not in response.headers["Content-Disposition"]

    document = Document(BytesIO(response.data))
    text = "\n".join(paragraph.text for paragraph in document.paragraphs)
    assert "Ежемесячный отчет" in text
    assert "Раздел отчета" in text
    assert "Жирный текст" in text
    assert "<script" not in text.lower()
    assert "<p>" not in text.lower()


def test_successful_pdf_export_is_readable(client, app):
    with app.app_context():
        admin = create_user("pdfadmin", "admin")
        report = create_report_with_editor_state()
        report_id = report.id

    token = login_session(client, admin)
    response = export_report(client, report_id, "pdf", token)

    assert response.status_code == 200
    assert response.mimetype == "application/pdf"
    assert response.data.startswith(b"%PDF")

    reader = PdfReader(BytesIO(response.data))
    assert len(reader.pages) >= 1


def test_successful_xml_export_is_valid_utf8(client, app):
    with app.app_context():
        admin = create_user("xmladmin", "admin")
        report = create_report_with_editor_state()
        report_id = report.id

    token = login_session(client, admin)
    response = export_report(client, report_id, "xml", token)

    assert response.status_code == 200
    assert response.mimetype == "application/xml"
    assert "charset=utf-8" in response.content_type.lower()

    root = ET.fromstring(response.data)
    assert root.tag == "report"
    assert root.attrib["id"] == str(report_id)
    assert root.findtext("./metadata/title").startswith("Ежемесячный отчет")
    assert root.findtext("./metadata/report_date") == "2026-06-06"
    content_html = root.findtext("./content") or ""
    assert "Раздел отчета" in content_html
    assert "script" not in content_html.lower()
    assert "javascript:" not in content_html.lower()


def test_export_rejects_unknown_format(client, app):
    with app.app_context():
        admin = create_user("formatadmin", "admin")
        report = create_report_with_editor_state()
        report_id = report.id

    token = login_session(client, admin)
    response = export_report(client, report_id, "zip", token)

    assert response.status_code == 400
    assert response.get_json()["error"] == "Неизвестный формат экспорта."


def test_export_returns_404_for_missing_report(client, app):
    with app.app_context():
        admin = create_user("missingadmin", "admin")

    token = login_session(client, admin)
    response = export_report(client, 9999, "docx", token)

    assert response.status_code == 404


def test_export_requires_authentication(client):
    response = client.post(
        "/reports/1/export/docx",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )

    assert response.status_code == 401
    assert response.get_json()["error"] == "unauthorized"


def test_regular_user_cannot_export_unshared_report(client, app):
    with app.app_context():
        user = create_user("regular_export", "user")
        report = create_report_with_editor_state()
        report_id = report.id

    token = login_session(client, user)
    response = export_report(client, report_id, "docx", token)

    assert response.status_code == 403
    assert response.get_json()["error"] == "Недостаточно прав для экспорта отчета."
