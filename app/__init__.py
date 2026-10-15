"""
Placement Management System — Flask Application Factory

Layout:
    app/api/       JSON REST API used by the React frontend
    app/services/  business logic (eligibility, application workflow, reports)
    app/models/    SQLAlchemy models
    app/tasks/     Celery background tasks
    app/web/       legacy server-rendered Jinja pages (removed in Phase 1)
"""
import os

from flask import Flask

from app.extensions import db, login_manager, migrate

__all__ = ['create_app', 'db', 'login_manager', 'migrate']


def create_app(config_name=None):
    """Create and configure the Flask application."""
    app = Flask(__name__)

    # Load configuration
    from app.config import config_map
    config_name = config_name or os.environ.get('FLASK_CONFIG', 'default')
    app.config.from_object(config_map.get(config_name, config_map['default']))

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)

    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'warning'

    # Import models (so they are registered with SQLAlchemy)
    from app import models

    # User loader for Flask-Login
    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(models.User, int(user_id))

    # Register blueprints
    from app.web.auth import auth_bp
    from app.web.admin import admin_bp
    from app.web.student import student_bp
    from app.web.reports import reports_bp
    from app.api import api_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(student_bp, url_prefix='/student')
    app.register_blueprint(reports_bp, url_prefix='/reports')
    app.register_blueprint(api_bp, url_prefix='/api')

    # Background jobs
    from app.tasks import celery_init_app
    celery_init_app(app)

    # Create tables and seed admin if not exists
    # (replaced by Alembic migrations in Phase 1)
    with app.app_context():
        db.create_all()
        _seed_admin(app)

    return app


def _seed_admin(app):
    """Create the default admin user if it doesn't exist."""
    from app.models import User
    from werkzeug.security import generate_password_hash

    username = app.config['ADMIN_USERNAME']
    admin = User.query.filter_by(username=username).first()
    if not admin:
        admin = User(
            username=username,
            email=app.config['ADMIN_EMAIL'],
            password_hash=generate_password_hash(app.config['ADMIN_PASSWORD']),
            role='admin'
        )
        db.session.add(admin)
        db.session.commit()
