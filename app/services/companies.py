"""
Creating and updating recruitment drives.
"""
from datetime import date
from decimal import Decimal, InvalidOperation

from app.extensions import db
from app.models import BRANCHES, DRIVE_STATUSES, Company, Student
from app.services.accounts import ValidationError
from app.services.eligibility import is_eligible


def _decimal(errors, data, key, label, low, high=None):
    try:
        value = Decimal(str(data.get(key)))
        if value < low or (high is not None and value > high):
            raise InvalidOperation
        return value.quantize(Decimal('0.01'))
    except (InvalidOperation, ValueError):
        bounds = f'between {low} and {high}' if high is not None else f'{low} or more'
        errors.append(f'{label} must be a number {bounds}.')


def _validate(data, partial):
    errors, values = [], {}

    def supplied(key):
        return not partial or key in data

    for key, label in (('name', 'Company name'), ('role_offered', 'Role')):
        if supplied(key):
            value = (data.get(key) or '').strip()
            if value:
                values[key] = value
            else:
                errors.append(f'{label} is required.')

    if supplied('description'):
        values['description'] = (data.get('description') or '').strip() or None
    if supplied('package_lpa'):
        values['package_lpa'] = _decimal(errors, data, 'package_lpa', 'Package', 0)
    if supplied('min_cgpa'):
        values['min_cgpa'] = _decimal(errors, data, 'min_cgpa', 'Minimum CGPA', 0, 10)
    if supplied('max_backlogs'):
        try:
            values['max_backlogs'] = int(data.get('max_backlogs', 0))
            if values['max_backlogs'] < 0:
                raise ValueError
        except (TypeError, ValueError):
            errors.append('Maximum backlogs must be a whole number of 0 or more.')

    if supplied('allowed_branches'):
        branches = data.get('allowed_branches') or []
        if isinstance(branches, str):
            branches = branches.split(',')
        branches = [b.strip() for b in branches if b.strip()]
        invalid = [b for b in branches if b not in BRANCHES]
        if not branches or invalid:
            errors.append(f'Allowed branches must be chosen from {", ".join(BRANCHES)}.')
        else:
            values['allowed_branches'] = ','.join(b for b in BRANCHES if b in branches)

    if supplied('visit_date'):
        raw = data.get('visit_date')
        try:
            values['visit_date'] = date.fromisoformat(raw) if raw else None
        except ValueError:
            errors.append('Visit date must be in YYYY-MM-DD format.')

    if supplied('status'):
        status = data.get('status') or 'Upcoming'
        if status in DRIVE_STATUSES:
            values['status'] = status
        else:
            errors.append(f'Status must be one of {", ".join(DRIVE_STATUSES)}.')

    if errors:
        raise ValidationError(errors)
    return values


def create_company(data):
    company = Company(**_validate(data, partial=False))
    db.session.add(company)
    db.session.commit()
    return company


def update_company(company, data):
    for key, value in _validate(data, partial=True).items():
        setattr(company, key, value)
    db.session.commit()
    return company


def eligible_students(company):
    """Students in this college who meet the drive's criteria."""
    return [s for s in Student.query.order_by(Student.name).all() if is_eligible(s, company)]
