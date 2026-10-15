"""
Application workflow: applying to a drive and moving an application
through its state machine.

    Applied ─► Shortlisted ─► Interview ─► Offered ─► Accepted   (student)
       │            │             │           ├─────► Declined   (student)
       └────────────┴─────────────┴───────────┴─────► Rejected   (admin)
"""
from datetime import date

from app.extensions import db
from app.models import APPLICATION_STATUSES, Application
from app.services.eligibility import eligibility_failures

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
TERMINAL_STATUSES = {'Accepted', 'Declined', 'Rejected'}


class ApplicationError(Exception):
    """A business-rule violation, safe to show to the user."""

    def __init__(self, message, reasons=None):
        super().__init__(message)
        self.message = message
        self.reasons = reasons or []


def allowed_transitions(application, actor):
    table = ADMIN_TRANSITIONS if actor == 'admin' else STUDENT_TRANSITIONS
    # Pipeline order, so "next stage" comes before "Rejected"
    return sorted(table.get(application.status, set()), key=APPLICATION_STATUSES.index)


def apply_to_company(student, company):
    """Create an application, or raise ApplicationError explaining why not."""
    if company.status != 'Upcoming':
        raise ApplicationError('Drive is not accepting applications.')

    failures = eligibility_failures(student, company)
    if failures:
        raise ApplicationError('You do not meet the eligibility criteria.', failures)

    existing = Application.query.filter_by(student_id=student.id, company_id=company.id).first()
    if existing:
        raise ApplicationError('You have already applied.')

    application = Application(student_id=student.id, company_id=company.id, college_id=student.college_id)
    db.session.add(application)
    db.session.commit()
    return application


def transition(application, new_status, actor):
    """
    Move an application to new_status on behalf of actor ('admin' or 'student'),
    keeping offer dates and the student's placement status in sync.
    """
    if new_status not in allowed_transitions(application, actor):
        raise ApplicationError(f'Cannot move an application from {application.status} to {new_status}.')

    application.status = new_status
    if new_status == 'Offered':
        application.offer_date = date.today()
    elif new_status == 'Accepted':
        application.student.placement_status = 'Placed'

    db.session.commit()
    return application
