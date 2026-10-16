"""
Flask Application Configuration

All settings come from environment variables (see .env.example).
Defaults are only suitable for local development.
"""
import os
from datetime import timedelta

from celery.schedules import crontab
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
    BENCH_PASSWORD = os.environ.get('BENCH_PASSWORD', 'benchpass123')

    # Celery / Redis
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    CELERY_EAGER = _bool('CELERY_TASK_ALWAYS_EAGER')
    CELERY = {
        'broker_url': os.environ.get('CELERY_BROKER_URL', REDIS_URL),
        'result_backend': os.environ.get('CELERY_RESULT_BACKEND', REDIS_URL),
        'task_ignore_result': True,
        # Run tasks inline when no broker is available (local dev without Redis)
        'task_always_eager': CELERY_EAGER,
        'beat_schedule': {
            'expire-offers': {'task': 'app.tasks.jobs.expire_offers', 'schedule': crontab(minute=0)},
            'interview-reminders': {'task': 'app.tasks.jobs.interview_reminders',
                                    'schedule': crontab(hour=8, minute=0)},
        },
        'timezone': 'Asia/Kolkata',
    }

    # Real-time push (app/realtime.py). Workers reach browsers through Redis unless tasks run inline.
    SOCKETIO_MESSAGE_QUEUE = os.environ.get('SOCKETIO_MESSAGE_QUEUE') or (None if CELERY_EAGER else REDIS_URL)
    SOCKETIO_CORS_ORIGINS = [o for o in os.environ.get(
        'CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(',') if o]

    # Notifications and email
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    OFFER_EXPIRY_DAYS = int(os.environ.get('OFFER_EXPIRY_DAYS', 7))
    EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'console')  # console | smtp
    MAIL_HOST = os.environ.get('MAIL_HOST', 'localhost')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = _bool('MAIL_USE_TLS', 'true')
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME', '')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', '')
    MAIL_FROM = os.environ.get('MAIL_FROM', 'PlaceIQ <no-reply@placeiq.dev>')

    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # uploads (resumes, CSV imports)
    UPLOAD_DIR = os.environ.get('UPLOAD_DIR', os.path.join(BASE_DIR, 'instance', 'uploads'))

    # AI features (app/services/ai.py). Without a key, offline heuristics are used instead.
    ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
    AI_ENABLED = _bool('AI_ENABLED')  # true to use `ant auth login` credentials instead of a key
    AI_RESUME_MODEL = os.environ.get('AI_RESUME_MODEL', 'claude-opus-5-5')
    AI_INTERVIEW_MODEL = os.environ.get('AI_INTERVIEW_MODEL', 'claude-opus-5-5')
    AI_SCORING_MODEL = os.environ.get('AI_SCORING_MODEL', 'claude-opus-5-5')

    # Embeddings for job matching (app/services/embeddings.py): auto | fastembed | hash
    EMBEDDING_BACKEND = os.environ.get('EMBEDDING_BACKEND', 'auto')
    FASTEMBED_CACHE_DIR = os.environ.get('FASTEMBED_CACHE_DIR') or None


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True


class TestingConfig(Config):
    """Used by pytest. TEST_DATABASE_URL points CI at PostgreSQL."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL', 'sqlite://')
    CELERY = {**Config.CELERY, 'task_always_eager': True, 'task_eager_propagates': True}
    SOCKETIO_MESSAGE_QUEUE = None
    EMAIL_BACKEND = 'console'
    EMBEDDING_BACKEND = 'hash'
    ANTHROPIC_API_KEY = ''
    AI_ENABLED = False


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    # Secure cookies need HTTPS; set JWT_COOKIE_SECURE=false only to try the stack over plain HTTP
    JWT_COOKIE_SECURE = _bool('JWT_COOKIE_SECURE', 'true')


# Config mapping
config_map = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
