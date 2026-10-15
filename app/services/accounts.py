"""
Creating and updating accounts: students (self-registration or added by a
college admin) and colleges with their first admin.
"""
from decimal import Decimal, InvalidOperation

from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models import BRANCHES, College, Student, User

MIN_PASSWORD_LENGTH = 8


class ValidationError(Exception):
    def __init__(self, errors):
        super().__init__('; '.join(errors))
        self.errors = errors


def _clean(data, key):
    value = data.get(key)
    return value.strip() if isinstance(value, str) else value


def _check_unique_login(errors, username, email, exclude_user_id=None):
    for field, value in (('username', username), ('email', email)):
        if not value:
            continue
        query = User.query.filter(getattr(User, field) == value)
        if exclude_user_id:
            query = query.filter(User.id != exclude_user_id)
        if query.first():
            errors.append(f'{field.capitalize()} is already taken.')


def _check_password(errors, password):
    if not password or len(password) < MIN_PASSWORD_LENGTH:
        errors.append(f'Password must be at least {MIN_PASSWORD_LENGTH} characters.')


def validate_student_fields(data, errors, partial=False):
    """Validate academic fields; returns the cleaned values that were supplied."""
    values = {}

    for key in ('name', 'roll_no'):
        value = _clean(data, key)
        if value:
            values[key] = value
        elif not partial or key in data:
            errors.append(f'{key.replace("_", " ").capitalize()} is required.')

    if 'phone' in data or not partial:
        values['phone'] = _clean(data, 'phone') or None

    branch = _clean(data, 'branch')
    if branch in BRANCHES:
        values['branch'] = branch
    elif not partial or 'branch' in data:
        errors.append(f'Branch must be one of {", ".join(BRANCHES)}.')

    if 'cgpa' in data or not partial:
        try:
            cgpa = Decimal(str(data.get('cgpa')))
            if not Decimal(0) <= cgpa <= Decimal(10):
                raise InvalidOperation
            values['cgpa'] = cgpa.quantize(Decimal('0.01'))
        except (InvalidOperation, ValueError):
            errors.append('CGPA must be a number between 0 and 10.')

    if 'backlogs' in data or not partial:
        try:
            backlogs = int(data.get('backlogs', 0))
            if backlogs < 0:
                raise ValueError
            values['backlogs'] = backlogs
        except (TypeError, ValueError):
            errors.append('Backlogs must be a whole number of 0 or more.')

    return values


def create_student(college_id, data):
    """Create a student login and profile in the given college."""
    errors = []
    username = _clean(data, 'username')
    email = _clean(data, 'email')
    if not username:
        errors.append('Username is required.')
    if not email or '@' not in email:
        errors.append('A valid email is required.')
    _check_password(errors, data.get('password'))
    _check_unique_login(errors, username, email)
    values = validate_student_fields(data, errors)
    if values.get('roll_no') and Student.query.filter_by(college_id=college_id, roll_no=values['roll_no']).first():
        errors.append('Roll number is already registered.')
    if errors:
        raise ValidationError(errors)

    user = User(username=username, email=email, role='student', college_id=college_id,
                password_hash=generate_password_hash(data['password']))
    user.student = Student(college_id=college_id, email=email, **values)
    db.session.add(user)
    db.session.commit()
    return user.student


def update_student(student, data, academic=True):
    """Update a profile. Students may not change their own academic record (academic=False)."""
    errors = []
    if not academic:
        data = {k: v for k, v in data.items() if k in ('name', 'phone')}
    values = validate_student_fields(data, errors, partial=True)
    roll_no = values.get('roll_no')
    if roll_no and roll_no != student.roll_no and Student.query.filter_by(roll_no=roll_no).first():
        errors.append('Roll number is already registered.')
    if errors:
        raise ValidationError(errors)

    for key, value in values.items():
        setattr(student, key, value)
    db.session.commit()
    return student


def create_college(data):
    """Create a college together with its first college admin."""
    errors = []
    name = _clean(data, 'name')
    code = (_clean(data, 'code') or '').upper()
    username = _clean(data, 'admin_username')
    email = _clean(data, 'admin_email')
    if not name:
        errors.append('College name is required.')
    if not code:
        errors.append('College code is required.')
    elif College.query.filter_by(code=code).first():
        errors.append('College code is already taken.')
    if not username:
        errors.append('Admin username is required.')
    if not email or '@' not in email:
        errors.append('A valid admin email is required.')
    _check_password(errors, data.get('admin_password'))
    _check_unique_login(errors, username, email)
    if errors:
        raise ValidationError(errors)

    college = College(name=name, code=code)
    db.session.add(college)
    db.session.flush()
    db.session.add(User(username=username, email=email, role='college_admin', college_id=college.id,
                        password_hash=generate_password_hash(data['admin_password'])))
    db.session.commit()
    return college
