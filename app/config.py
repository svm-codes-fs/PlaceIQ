"""
Flask Application Configuration

All settings come from environment variables (see .env.example).
Defaults are only suitable for local development.
"""
import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))


class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-only-insecure-secret')

    # Database: PostgreSQL in Docker, SQLite fallback for quick local runs.
    #   postgresql+psycopg://placeiq:placeiq@localhost:5432/placeiq
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'sqlite:///' + os.path.join(BASE_DIR, 'placement.db')
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 3600,
    }

    # Session config
    PERMANENT_SESSION_LIFETIME = 3600  # 1 hour

    # Default admin account created on first start
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
    ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@thapar.edu')
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

    # Celery / Redis
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    CELERY = {
        'broker_url': os.environ.get('CELERY_BROKER_URL', REDIS_URL),
        'result_backend': os.environ.get('CELERY_RESULT_BACKEND', REDIS_URL),
        'task_ignore_result': True,
        # Run tasks inline when no broker is available (local dev without Redis)
        'task_always_eager': os.environ.get('CELERY_TASK_ALWAYS_EAGER', 'false').lower() == 'true',
    }


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False


# Config mapping
config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
