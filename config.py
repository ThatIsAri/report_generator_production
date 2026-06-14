import os
from datetime import timedelta
from urllib.parse import quote_plus

from dotenv import load_dotenv

load_dotenv()


def _env_bool(name, default=False):
    value = os.getenv(name)

    if value is None:
        return default

    return value.strip().lower() in {"1", "true", "yes", "on"}


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-before-production")

    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_NAME = os.getenv("DB_NAME", "ft_reports_db")
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")

    password = quote_plus(DB_PASSWORD)

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        "?charset=utf8mb4"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
    SESSION_COOKIE_SECURE = _env_bool("SESSION_COOKIE_SECURE", False)
    PERMANENT_SESSION_LIFETIME = timedelta(
        seconds=int(os.getenv("SESSION_LIFETIME_SECONDS") or 8 * 60 * 60)
    )

    LATEX_COMPILER = os.getenv("LATEX_COMPILER", "xelatex")

    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH") or 10 * 1024 * 1024)

    YANDEX_SMARTCAPTCHA_ENABLED = _env_bool("YANDEX_SMARTCAPTCHA_ENABLED", False)
    YANDEX_SMARTCAPTCHA_SITE_KEY = os.getenv("YANDEX_SMARTCAPTCHA_SITE_KEY", "")
    YANDEX_SMARTCAPTCHA_SECRET_KEY = os.getenv("YANDEX_SMARTCAPTCHA_SECRET_KEY", "")
