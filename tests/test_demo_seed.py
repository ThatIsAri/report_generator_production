from datetime import date

import pytest
from werkzeug.security import check_password_hash, generate_password_hash

from app import create_app
from app.demo_seed import seed_ftnet_demo_data
from app.extensions import db
from app.models import (
    Folder,
    GroupReportAccess,
    Organization,
    Report,
    ReportDraft,
    ReportEditorState,
    ReportVersion,
    Template,
    User,
    UserGroup,
    UserGroupMember,
)


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


def create_legacy_owner():
    organization = Organization(
        name="Тест",
        description="Тестовая организация",
        tariff="Базовый",
    )
    db.session.add(organization)
    db.session.flush()

    password_hash = generate_password_hash("existing-password")
    user = User(
        username="existing.owner",
        email="owner@example.com",
        password_hash=password_hash,
        role="admin",
        organization_id=organization.id,
        is_active=True,
    )
    db.session.add(user)
    db.session.commit()
    return user.id, password_hash


def login_session(client, user):
    token = "seed-test-csrf-token"

    with client.session_transaction() as session:
        session["user_id"] = user.id
        session["username"] = user.username
        session["role"] = user.role
        session["organization_id"] = user.organization_id
        session["_csrf_token"] = token

    return token


def test_seed_renames_legacy_organization_and_preserves_owner_password(app):
    with app.app_context():
        owner_id, password_hash = create_legacy_owner()
        summary = seed_ftnet_demo_data()

        organization = Organization.query.filter_by(name="FT NET").one()
        assert organization.description.startswith("Группа компаний FT NET")
        assert organization.tariff == "Корпоративный"
        assert Organization.query.filter_by(name="Тест").count() == 0
        assert Organization.query.filter_by(name="FT NET").count() == 1

        owner = db.session.get(User, owner_id)
        assert owner.username == "existing.owner"
        assert owner.password_hash == password_hash
        assert owner.name == "Геннадий Кудрявцев"
        assert owner.first_name == "Геннадий"
        assert owner.last_name == "Кудрявцев"
        assert owner.position == "Руководитель проектов"
        assert owner.role == "admin"
        assert owner.organization_id == organization.id

        assert summary["users_created"] == 4
        assert summary["users_updated"] == 1


def test_seed_creates_five_active_ftnet_users_with_roles_positions_and_hashes(app, monkeypatch):
    with app.app_context():
        create_legacy_owner()
        monkeypatch.setenv("DEMO_USER_PASSWORD", "temporary-demo-password")
        seed_ftnet_demo_data()

        organization = Organization.query.filter_by(name="FT NET").one()
        users = User.query.filter_by(organization_id=organization.id, is_active=True).all()
        assert len(users) == 5

        by_username = {user.username: user for user in users}
        expected = {
            "e.gordienko": ("Евгений Гордиенко", "admin", "Технический директор"),
            "a.bespalova": ("Анжела Беспалова", "user", "HRD"),
            "d.agafonova": ("Дарья Агафонова", "user", "Архитектор"),
            "s.leonidov": ("Сергей Леонидов", "user", "CEO"),
        }

        for username, (name, role, position) in expected.items():
            user = by_username[username]
            assert user.name == name
            assert user.role == role
            assert user.position == position
            assert user.password_hash != "temporary-demo-password"
            assert check_password_hash(user.password_hash, "temporary-demo-password")


def test_seed_creates_groups_templates_reports_and_editor_state(app):
    with app.app_context():
        create_legacy_owner()
        seed_ftnet_demo_data()

        organization = Organization.query.filter_by(name="FT NET").one()
        assert UserGroup.query.filter_by(organization_id=organization.id, is_active=True).count() == 2
        assert UserGroupMember.query.count() == 6
        assert Template.query.count() == 5
        assert Report.query.count() == 7
        assert ReportDraft.query.count() == 7
        assert ReportEditorState.query.count() == 7
        assert ReportVersion.query.count() == 7
        assert GroupReportAccess.query.count() >= 7

        report = Report.query.filter(
            Report.report_title == "Итоговый отчёт о готовности демонстрационной версии"
        ).one()
        assert report.report_date == date(2026, 6, 16)
        draft = ReportDraft.query.filter_by(linked_report_id=report.id).one()
        state = ReportEditorState.query.filter_by(draft_id=draft.id).one()
        assert "Демонстрационная версия готова к представлению" in state.document_html
        assert "script" not in state.document_html.lower()
        assert "javascript:" not in state.document_html.lower()

        for report in Report.query.all():
            assert date(2026, 6, 1) <= report.report_date <= date(2026, 6, 16)
            assert report.created_at <= report.updated_at


def test_seeded_templates_are_prefilled_with_live_demo_content(app):
    with app.app_context():
        create_legacy_owner()
        seed_ftnet_demo_data()

        forbidden_phrases = (
            "Укажите",
            "Опишите",
            "Перечислите",
            "Добавьте",
            "Заполните",
            "Сформулируйте",
            "Зафиксируйте",
            "Пустой блок",
        )

        for template in Template.query.all():
            html = template.content_html or ""
            for phrase in forbidden_phrases:
                assert phrase not in html

            assert "<td></td>" not in html
            assert "<p></p>" not in html

        risk_template = Template.query.filter_by(title="Отчёт по рискам проекта").one()
        assert "Несоответствие PDF содержимому редактора" in risk_template.content_html


def test_seed_is_idempotent(app):
    with app.app_context():
        create_legacy_owner()
        seed_ftnet_demo_data()
        counts_before = {
            "organizations": Organization.query.count(),
            "users": User.query.count(),
            "groups": UserGroup.query.count(),
            "members": UserGroupMember.query.count(),
            "folders": Folder.query.count(),
            "templates": Template.query.count(),
            "reports": Report.query.count(),
            "drafts": ReportDraft.query.count(),
            "states": ReportEditorState.query.count(),
            "versions": ReportVersion.query.count(),
        }

        summary = seed_ftnet_demo_data()
        counts_after = {
            "organizations": Organization.query.count(),
            "users": User.query.count(),
            "groups": UserGroup.query.count(),
            "members": UserGroupMember.query.count(),
            "folders": Folder.query.count(),
            "templates": Template.query.count(),
            "reports": Report.query.count(),
            "drafts": ReportDraft.query.count(),
            "states": ReportEditorState.query.count(),
            "versions": ReportVersion.query.count(),
        }

        assert counts_after == counts_before
        assert summary["users_created"] == 0
        assert summary["groups_created"] == 0
        assert summary["templates_created"] == 0
        assert summary["reports_created"] == 0


def test_seed_rolls_back_data_changes_after_failure(app):
    with app.app_context():
        owner_id, _ = create_legacy_owner()

        with pytest.raises(RuntimeError):
            seed_ftnet_demo_data(simulate_failure=True)

        assert User.query.filter_by(username="e.gordienko").count() == 0
        assert Template.query.count() == 0
        assert Report.query.count() == 0
        owner = db.session.get(User, owner_id)
        assert owner.name == "existing.owner"


def test_seeded_report_can_be_previewed_and_exported_as_xml(client, app):
    with app.app_context():
        owner_id, _ = create_legacy_owner()
        seed_ftnet_demo_data()
        owner = db.session.get(User, owner_id)
        report = Report.query.filter(
            Report.report_title == "Итоговый отчёт о готовности демонстрационной версии"
        ).one()
        report_id = report.id

    token = login_session(client, owner)
    preview = client.get(f"/api/reports/{report_id}/dashboard-preview")
    assert preview.status_code == 200
    preview_json = preview.get_json()
    assert preview_json["success"] is True
    assert "Демонстрационная версия готова" in preview_json["document_html"]

    export = client.post(
        f"/reports/{report_id}/export/xml",
        headers={
            "X-CSRFToken": token,
            "X-Requested-With": "XMLHttpRequest",
        },
    )
    assert export.status_code == 200
    assert export.mimetype == "application/xml"
    assert "Итоговый отчёт" in export.data.decode("utf-8")
