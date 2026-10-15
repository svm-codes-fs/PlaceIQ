"""
Application workflow: applying to a drive and moving an application
through its statuses.
"""
from datetime import date

from app.extensions import db
from app.models import Application, Result, APPLICATION_STATUSES
from app.services.eligibility import eligibility_failures


class ApplicationError(Exception):
    """A business-rule violation, safe to show to the user."""

    def __init__(self, message, reasons=None):
        super().__init__(message)
        self.message = message
        self.reasons = reasons or []


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

    application = Application(student_id=student.id, company_id=company.id)
    db.session.add(application)
    db.session.commit()
    return application


def update_status(application, new_status):
    """Change an application's status, keeping the result and placement status in sync."""
    if new_status not in APPLICATION_STATUSES:
        raise ApplicationError('Invalid status')

    application.status = new_status

    if new_status == 'Offered':
        if not application.result:
            db.session.add(Result(application_id=application.id, result='Selected', offer_date=date.today()))
        else:
            application.result.result = 'Selected'
        application.student.placement_status = 'Placed'
    elif application.result:
        # Moving backwards from Offered
        application.result.result = 'Not Selected'

    db.session.commit()
    return application
