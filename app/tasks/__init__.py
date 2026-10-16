"""
Celery background tasks.

Every task runs inside the Flask app context, so it can use db and models.
Start a worker and the scheduler with:
    celery -A app.tasks.worker worker --loglevel=info
    celery -A app.tasks.worker beat --loglevel=info
"""
import logging

from celery import Celery, Task, shared_task

log = logging.getLogger(__name__)


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

    from app.tasks import jobs  # noqa: F401  (register tasks)
    return celery_app


def enqueue(task, *args):
    """Queue a task without ever failing the request that triggered it (e.g. Redis is down)."""
    try:
        return task.delay(*args)
    except Exception:
        log.exception('Could not queue %s', task.name)
        return None


@shared_task(ignore_result=False)
def ping():
    """Health-check task: `ping.delay().get()` returns 'pong' when a worker is up."""
    return 'pong'
