"""Entry point for the Celery worker and beat processes."""
from app import create_app

flask_app = create_app()
celery_app = flask_app.extensions['celery']
