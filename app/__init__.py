"""
PlaceIQ — Flask Application Factory

Layout:
    app/api/       JSON REST API used by the React frontend
    app/services/  business logic (eligibility, application workflow, accounts, reports)
    app/models/    SQLAlchemy models (schema managed by Alembic in migrations/)
    app/tasks/     Celery background tasks
    app/tenancy.py per-college data isolation
    app/security.py JWT authentication
"""
import os

from flask import Flask
from sqlalchemy import event
from sqlalchemy.engine import Engine

from app.extensions import db, jwt, migrate

__all__ = ['create_app', 'db']


def create_app(config_name=None):
    """Create and configure the Flask application."""
    app = Flask(__name__)

    # Load configuration
    from app.config import config_map
    config_name = config_name or os.environ.get('FLASK_CONFIG', 'default')
    app.config.from_object(config_map.get(config_name, config_map['default']))

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db, render_as_batch=True)  # batch mode lets SQLite alter tables
    jwt.init_app(app)

    from app import models, security  # noqa: F401  (register models and JWT callbacks)
    from app.tenancy import init_tenancy
    init_tenancy()

    from app.api import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    # Background jobs
    from app.tasks import celery_init_app
    celery_init_app(app)

    from app.cli import register_cli
    register_cli(app)

    return app


@event.listens_for(Engine, 'connect')
def _sqlite_foreign_keys(dbapi_connection, _record):
    """SQLite ignores foreign keys (and ON DELETE CASCADE) unless switched on per connection."""
    if type(dbapi_connection).__module__.startswith('sqlite3'):
        cursor = dbapi_connection.cursor()
        cursor.execute('PRAGMA foreign_keys=ON')
        cursor.close()
