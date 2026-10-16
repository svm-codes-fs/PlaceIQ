"""
Application workflow: applying to a drive and moving an application
through its state machine. Every change is written to application_events.

    Applied ─► Shortlisted ─► Interview ─► Offered ─► Accepted   (student)
       │            │             │           ├─────► Declined   (student)
       │            │             │           └─────► Expired    (system, offer not answered in time)
       └────────────┴─────────────┴───────────┴─────► Rejected   (admin)
"""
from datetime import date

from app.extensions import db
from app.models import APPLICATION_STATUSES, Application, ApplicationEvent

# Who may move an application from one status to the next
ADMIN_TRANSITIONS = {
    'Applied': {'Shortlisted', 'Rejected'},
    'Shortlisted': {'Interview', 'Rejected'},
    'Interview': {'Offered', 'Rejected'},
    'Offered': {'Rejected'},  # revoke an offer
}
STUDENT_TRANSITIONS = {
    'Offered': {'Accepted', 'Declined'},
}
SYSTEM_TRANSITIONS = {
    'Offered': {'Expired'},
}
TERMINAL_STATUSES = {'Accepted', 'Declined', 'Rejected', 'Expired'}
_TABLES = {'admin': ADMIN_TRANSITIONS, 'student': STUDENT_TRANSITIONS, 'system': SYSTEM_TRANSITIONS}


class ApplicationError(Exception):
    """A business-rule violation, safe to show to the user."""

    def __init__(self, message, reasons=None):
        super().__init__(message)
        self.message = message
        self.reasons = reasons or []


def allowed_transitions(application, actor):
    # Pipeline order, so "next stage" comes before "Rejected"
    return sorted(_TABLES[actor].get(application.status, set()), key=APPLICATION_STATUSES.index)


def record_event(application, from_status, to_status, user=None, actor_role=None, note=None):
    db.session.add(ApplicationEvent(
        application=application, college_id=application.college_id,
        from_status=from_status, to_status=to_status,
        actor_id=user.id if user else None, actor_role=actor_role or (user.role if user else 'system'),
        note=note,
    ))


def apply_to_company(student, company, user=None):
    """Create an application, or raise ApplicationError with every reason it isn't allowed."""
    from app.services.policies import PolicyEvaluator

    if company.status != 'Upcoming':
        raise ApplicationError('Drive is not accepting applications.')

    existing = Application.query.filter_by(student_id=student.id, company_id=company.id).first()
    if existing:
        raise ApplicationError('You have already applied.')

    failures = PolicyEvaluator(student).failures(company)
    if failures:
        raise ApplicationError('You cannot apply to this drive.', failures)

    application = Application(student=student, company=company, college_id=student.college_id)
    db.session.add(application)
    record_event(application, None, 'Applied', user=user, actor_role='student')
    db.session.commit()
    return application


def transition(application, new_status, actor, user=None, note=None):
    """
    Move an application to new_status on behalf of actor ('admin', 'student' or
    'system'), keeping offer dates and the student's placement status in sync.
    """
    from app.services.policies import PolicyEvaluator

    if new_status not in allowed_transitions(application, actor):
        raise ApplicationError(f'Cannot move an application from {application.status} to {new_status}.')

    if new_status == 'Offered':
        blocked = PolicyEvaluator(application.student).offer_blocked()
        if blocked:
            raise ApplicationError(blocked)

    old_status = application.status
    application.status = new_status
    if new_status == 'Offered':
        application.offer_date = date.today()
    elif new_status == 'Accepted':
        application.student.placement_status = 'Placed'

    record_event(application, old_status, new_status, user=user,
                 actor_role='system' if actor == 'system' else None, note=note)
    db.session.commit()
    return application


def timeline(application):
    events = ApplicationEvent.query.filter_by(application_id=application.id) \
        .order_by(ApplicationEvent.created_at, ApplicationEvent.id).all()
    return [{
        'id': e.id,
        'from_status': e.from_status,
        'to_status': e.to_status,
        'actor': e.actor.username if e.actor else 'system',
        'actor_role': e.actor_role,
        'note': e.note,
        'at': e.created_at.isoformat(),
    } for e in events]
