"""
Multi-tenancy: every request runs "as" one college, and the ORM enforces it.

- Reads: every SELECT touching a TenantScoped model gets
  `college_id = <current college>` added automatically, including counts,
  joins, relationship loads and session.get().
- Writes: new tenant rows are stamped with the current college, and flushing a
  row that belongs to a different college raises TenantViolation.

The current college comes from the JWT (see app/security.py). Super admins
have no college and see every tenant. Code that runs outside a request
(seed command, Celery tasks) uses `college_context(college_id)`.
"""
from contextlib import contextmanager

from flask import g, has_app_context
from sqlalchemy import event
from sqlalchemy.orm import Session, with_loader_criteria

from app.models import TenantScoped

_UNSET = object()


class TenantViolation(Exception):
    """Attempt to write a row outside the current college."""


def current_college_id():
    if not has_app_context():
        return None
    return g.get('college_id')


@contextmanager
def college_context(college_id):
    """Run a block of code as a given college (None = all colleges)."""
    previous = g.get('college_id', _UNSET)
    g.college_id = college_id
    try:
        yield
    finally:
        if previous is _UNSET:
            g.pop('college_id', None)
        else:
            g.college_id = previous


def _filter_reads(state):
    if not state.is_select or state.execution_options.get('all_colleges'):
        return
    college_id = current_college_id()
    if college_id is None:
        return
    state.statement = state.statement.options(
        with_loader_criteria(
            TenantScoped,
            lambda cls: cls.college_id == college_id,
            include_aliases=True,
        )
    )


def _check_writes(session, flush_context, instances):
    college_id = current_college_id()
    for obj in session.new:
        if not isinstance(obj, TenantScoped):
            continue
        if obj.college_id is None:
            if college_id is None:
                raise TenantViolation(f'{type(obj).__name__} has no college and no college context is set.')
            obj.college_id = college_id
        elif college_id is not None and obj.college_id != college_id:
            raise TenantViolation(f'Cannot create {type(obj).__name__} in another college.')

    if college_id is None:
        return
    for obj in list(session.dirty) + list(session.deleted):
        if isinstance(obj, TenantScoped) and obj.college_id != college_id:
            raise TenantViolation(f'Cannot modify {type(obj).__name__} of another college.')


def init_tenancy():
    """Install the session hooks (idempotent)."""
    if not event.contains(Session, 'do_orm_execute', _filter_reads):
        event.listen(Session, 'do_orm_execute', _filter_reads)
        event.listen(Session, 'before_flush', _check_writes)
