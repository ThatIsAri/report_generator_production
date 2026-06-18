import os

import click
from flask import Flask, flash, redirect, session, url_for
from sqlalchemy import inspect, text
from werkzeug.exceptions import RequestEntityTooLarge

from app.access_permission_service import ensure_access_permission_schema
from app.auth import unauthorized_response
from app.document_routes import documents_bp
from app.extensions import db
from app.organization_service import ensure_organization_data
from app.report_share_service import ensure_report_share_schema
from app.report_routes import reports_bp
from app.routes.admin import admin_bp
from app.routes.auth import auth_bp
from app.routes.organization import organization_bp
from app.routes.settings import settings_bp
from app.routes.templates import templates_bp
from app.security import csrf_failure_response, csrf_token, validate_csrf_request
from app.system_settings_service import ensure_system_settings_schema
from app.user_action_log_service import ensure_user_action_log_schema
from app.user_group_service import ensure_user_group_schema
from app.user_settings_service import ensure_user_preferences_schema
from config import Config


def _ensure_development_schema():
    """
    Минимальное обновление схемы для учебного прототипа без Alembic.
    db.create_all() создает новые таблицы, но не добавляет новые колонки
    в уже существующие таблицы.
    """
    ensure_organization_data()
    ensure_report_share_schema()
    ensure_user_group_schema()
    ensure_access_permission_schema()
    ensure_user_action_log_schema()
    ensure_system_settings_schema()
    ensure_user_preferences_schema()
    inspector = inspect(db.engine)

    table_names = inspector.get_table_names()

    migration_queries = []

    if "imported_report_data" in table_names:
        existing_columns = {
            column["name"]
            for column in inspector.get_columns("imported_report_data")
        }

        if "verification_status" not in existing_columns:
            migration_queries.append(
                "ALTER TABLE imported_report_data "
                "ADD COLUMN verification_status VARCHAR(50) NOT NULL DEFAULT 'needs_review'"
            )

        if "verified_at" not in existing_columns:
            migration_queries.append(
                "ALTER TABLE imported_report_data "
                "ADD COLUMN verified_at DATETIME NULL"
            )

    if "imported_documents" in table_names:
        imported_document_columns = {
            column["name"]
            for column in inspector.get_columns("imported_documents")
        }

        if "source_document_id" not in imported_document_columns:
            migration_queries.append(
                "ALTER TABLE imported_documents "
                "ADD COLUMN source_document_id INT NULL"
            )

        if "document_scan_id" not in imported_document_columns:
            migration_queries.append(
                "ALTER TABLE imported_documents "
                "ADD COLUMN document_scan_id INT NULL"
            )

        if "detected_profile_key" not in imported_document_columns:
            migration_queries.append(
                "ALTER TABLE imported_documents "
                "ADD COLUMN detected_profile_key VARCHAR(100) NULL"
            )

        if "detected_profile_title" not in imported_document_columns:
            migration_queries.append(
                "ALTER TABLE imported_documents "
                "ADD COLUMN detected_profile_title VARCHAR(255) NULL"
            )

        if "classification_confidence" not in imported_document_columns:
            migration_queries.append(
                "ALTER TABLE imported_documents "
                "ADD COLUMN classification_confidence FLOAT NULL"
            )

    if "templates" in table_names:
        template_columns = {
            column["name"]
            for column in inspector.get_columns("templates")
        }

        if "tag" not in template_columns:
            migration_queries.append("ALTER TABLE templates ADD COLUMN tag VARCHAR(100) NULL")

        if "template_type" not in template_columns:
            migration_queries.append(
                "ALTER TABLE templates "
                "ADD COLUMN template_type VARCHAR(100) NOT NULL DEFAULT 'Универсальный'"
            )

        if "source_template_id" not in template_columns:
            migration_queries.append("ALTER TABLE templates ADD COLUMN source_template_id INT NULL")

        if "content_html" not in template_columns:
            migration_queries.append("ALTER TABLE templates ADD COLUMN content_html TEXT NULL")

        if "content_json" not in template_columns:
            migration_queries.append("ALTER TABLE templates ADD COLUMN content_json TEXT NULL")

        if "latex_template" not in template_columns:
            migration_queries.append("ALTER TABLE templates ADD COLUMN latex_template TEXT NULL")

        if "updated_at" not in template_columns:
            migration_queries.append("ALTER TABLE templates ADD COLUMN updated_at DATETIME NULL")

    if "users" in table_names:
        user_columns = {
            column["name"]
            for column in inspector.get_columns("users")
        }

        if "username" not in user_columns:
            migration_queries.append("ALTER TABLE users ADD COLUMN username VARCHAR(100) NOT NULL")

        if "email" not in user_columns:
            migration_queries.append("ALTER TABLE users ADD COLUMN email VARCHAR(255) NOT NULL")

        if "password_hash" not in user_columns:
            migration_queries.append("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL")

        if "role" not in user_columns:
            migration_queries.append("ALTER TABLE users ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'user'")

        if "first_name" not in user_columns:
            migration_queries.append("ALTER TABLE users ADD COLUMN first_name VARCHAR(100) NULL")

        if "last_name" not in user_columns:
            migration_queries.append("ALTER TABLE users ADD COLUMN last_name VARCHAR(100) NULL")

        if "position" not in user_columns:
            migration_queries.append("ALTER TABLE users ADD COLUMN position VARCHAR(255) NULL")

        if "created_at" not in user_columns:
            migration_queries.append("ALTER TABLE users ADD COLUMN created_at DATETIME NULL")

        if "updated_at" not in user_columns:
            migration_queries.append("ALTER TABLE users ADD COLUMN updated_at DATETIME NULL")

        if "is_active" not in user_columns:
            migration_queries.append("ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1")

    for query in migration_queries:
        db.session.execute(text(query))

    if migration_queries:
        db.session.commit()


def create_app(config_overrides=None):
    app = Flask(__name__)
    app.config.from_object(Config)

    if config_overrides:
        app.config.update(config_overrides)

    db.init_app(app)

    app.register_blueprint(admin_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(documents_bp)
    app.register_blueprint(templates_bp)
    app.register_blueprint(organization_bp)
    app.register_blueprint(settings_bp)

    @app.before_request
    def require_authenticated_user():
        if _is_public_endpoint():
            return None

        if session.get("user_id"):
            return None

        return unauthorized_response()

    @app.before_request
    def protect_mutating_requests():
        if not validate_csrf_request():
            return csrf_failure_response()

        return None

    @app.context_processor
    def inject_current_user():
        return {
            "csrf_token": csrf_token,
            "current_session_user": {
                "id": session.get("user_id"),
                "username": session.get("username"),
                "role": session.get("role"),
                "organization_id": session.get("organization_id"),
                "avatar": session.get("avatar"),
            }
        }

    @app.errorhandler(RequestEntityTooLarge)
    def handle_file_too_large(error):
        flash("Размер файла превышает 10 MB.", "error")
        return redirect(url_for("documents.upload_document"))

    @app.cli.command("init-db")
    def init_db():
        """Создание таблиц базы данных."""
        with app.app_context():
            db.create_all()
            _ensure_development_schema()
            ensure_organization_data()
            ensure_report_share_schema()
            ensure_user_group_schema()
            ensure_access_permission_schema()
            ensure_user_action_log_schema()
            ensure_user_preferences_schema()
            click.echo("База данных и таблицы успешно созданы.")

    @app.cli.command("seed-ftnet-demo")
    @click.option(
        "--force-production",
        is_flag=True,
        help="Разрешить запуск seed в production-окружении.",
    )
    def seed_ftnet_demo(force_production):
        """Идемпотентное заполнение демонстрационных данных FT NET."""
        from app.demo_seed import seed_ftnet_demo_data

        allow_production = force_production or (
            str(os.getenv("ALLOW_DEMO_SEED") or "").strip().lower()
            in {"1", "true", "yes", "on"}
        )

        with app.app_context():
            summary = seed_ftnet_demo_data(allow_production=allow_production)
            click.echo("Организация: {0}".format(summary["organization"]))
            click.echo("Пользователей создано: {0}".format(summary["users_created"]))
            click.echo("Пользователей обновлено: {0}".format(summary["users_updated"]))
            click.echo("Групп создано: {0}".format(summary["groups_created"]))
            click.echo("Групп обновлено: {0}".format(summary["groups_updated"]))
            click.echo("Папок создано: {0}".format(summary["folders_created"]))
            click.echo("Шаблонов создано: {0}".format(summary["templates_created"]))
            click.echo("Шаблонов обновлено: {0}".format(summary["templates_updated"]))
            click.echo("Отчётов создано: {0}".format(summary["reports_created"]))
            click.echo("Отчётов обновлено: {0}".format(summary["reports_updated"]))
            click.echo("Старых demo-пользователей деактивировано: {0}".format(summary["legacy_users_deactivated"]))
            click.echo("Старых demo-шаблонов удалено: {0}".format(summary["legacy_templates_removed"]))
            click.echo("Старых demo-отчётов удалено: {0}".format(summary["legacy_reports_removed"]))

            if summary.get("temporary_password"):
                click.echo(
                    "Временный пароль для новых пользователей {0}: {1}".format(
                        ", ".join(summary.get("created_usernames") or []),
                        summary["temporary_password"],
                    )
                )

            click.echo("Демонстрационные данные подготовлены успешно.")

    return app


def _is_public_endpoint():
    from flask import request

    if request.endpoint is None:
        return False

    return request.endpoint == "static" or request.endpoint.startswith("auth.")
