"""
Flask Application Configuration

All settings come from environment variables (see .env.example).
Defaults are only suitable for local development.
"""
import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))


def _bool(name, default='false'):
    return os.environ.get(name, default).lower() == 'true'


class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-only-insecure-secret-change-me-in-env')

    # Database: PostgreSQL in Docker, SQLite fallback for quick local runs.
    #   postgresql+psycopg://placeiq:placeiq@localhost:5432/placeiq
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'sqlite:///' + os.path.join(BASE_DIR, 'placeiq.db')
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 3600,
    }

    # JWT auth (see app/security.py)
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', SECRET_KEY)
    JWT_TOKEN_LOCATION = ['cookies']
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)
    JWT_ACCESS_COOKIE_PATH = '/api/'
    JWT_REFRESH_COOKIE_PATH = '/api/auth/refresh'
    JWT_COOKIE_SECURE = _bool('JWT_COOKIE_SECURE')  # true in production (HTTPS)
    JWT_COOKIE_SAMESITE = 'Lax'
    JWT_COOKIE_CSRF_PROTECT = True

    # Accounts created by `flask seed`
    SUPERADMIN_USERNAME = os.environ.get('SUPERADMIN_USERNAME', 'superadmin')
    SUPERADMIN_EMAIL = os.environ.get('SUPERADMIN_EMAIL', 'superadmin@placeiq.dev')
    SEED_PASSWORD = os.environ.get('SEED_PASSWORD', 'password123')

    # Celery / Redis
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    CELERY = {
        'broker_url': os.environ.get('CELERY_BROKER_URL', REDIS_URL),
        'result_backend': os.environ.get('CELERY_RESULT_BACKEND', REDIS_URL),
        'task_ignore_result': True,
        # Run tasks inline when no broker is available (local dev without Redis)
        'task_always_eager': _bool('CELERY_TASK_ALWAYS_EAGER'),
    }


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True


class TestingConfig(Config):
    """Used by pytest. TEST_DATABASE_URL points CI at PostgreSQL."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL', 'sqlite://')
    CELERY = {**Config.CELERY, 'task_always_eager': True}


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    JWT_COOKIE_SECURE = True


# Config mapping
config_map = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
