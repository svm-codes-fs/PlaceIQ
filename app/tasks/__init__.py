"""
Celery background tasks.

Every task runs inside the Flask app context, so it can use db and models.
Start a worker with:
    celery -A app.tasks.worker worker --loglevel=info
"""
from celery import Celery, Task, shared_task


def celery_init_app(app):
    """Create the Celery app from Flask config and attach it to app.extensions."""

    class FlaskTask(Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery_app = Celery(app.name, task_cls=FlaskTask)
    celery_app.config_from_object(app.config['CELERY'])
    celery_app.set_default()
    app.extensions['celery'] = celery_app
    return celery_app


@shared_task(ignore_result=False)
def ping():
    """Health-check task: `ping.delay().get()` returns 'pong' when a worker is up."""
    return 'pong'
