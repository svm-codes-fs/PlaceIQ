"""
Bulk student import from CSV, run by a background worker.

All-or-nothing: every row is validated first (including duplicates within the
file and against the database); if any row has errors nothing is saved and the
job reports each error with its row number. Otherwise every student is created
in a single transaction.
"""
import csv
import io
import secrets

from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models import Student, User
from app.models.college import utcnow
from app.services.accounts import _check_password, _check_unique_login, validate_student_fields

COLUMNS = ['username', 'email', 'name', 'roll_no', 'branch', 'cgpa', 'backlogs', 'phone', 'password']
REQUIRED = ['username', 'email', 'name', 'roll_no', 'branch', 'cgpa', 'backlogs']
TEMPLATE = ('username,email,name,roll_no,branch,cgpa,backlogs,phone,password\n'
            'jdoe,jdoe@example.com,Jane Doe,102203101,CSE,8.4,0,9876543210,\n')
MAX_ROWS = 5000


def run_import(job):
    """Validate and import a job's CSV; returns the list of (user, temp_password) created."""
    job.status = 'running'
    db.session.commit()

    reader = csv.DictReader(io.StringIO(job.content.lstrip('﻿')))
    header = [h.strip() for h in (reader.fieldnames or [])]
    missing = [c for c in REQUIRED if c not in header]
    if missing:
        return _fail(job, [{'row': 1, 'errors': [f'Missing column(s): {", ".join(missing)}.']}])

    rows = [{k.strip(): (v or '').strip() for k, v in row.items() if k} for row in reader]
    job.total_rows = len(rows)
    if not rows:
        return _fail(job, [{'row': 1, 'errors': ['The file has no data rows.']}])
    if len(rows) > MAX_ROWS:
        return _fail(job, [{'row': 1, 'errors': [f'At most {MAX_ROWS} rows per import.']}])

    seen = {'username': {}, 'email': {}, 'roll_no': {}}
    problems, valid = [], []
    for line, row in enumerate(rows, start=2):  # row 1 is the header
        errors = []
        username, email = row.get('username'), row.get('email', '').lower()
        if not username:
            errors.append('Username is required.')
        if not email or '@' not in email:
            errors.append('A valid email is required.')
        if row.get('password'):
            _check_password(errors, row['password'])
        _check_unique_login(errors, username, email)
        values = validate_student_fields(row, errors)
        if values.get('roll_no') and Student.query.filter_by(roll_no=values['roll_no']).first():
            errors.append('Roll number is already registered.')
        for key, value in (('username', username), ('email', email), ('roll_no', values.get('roll_no'))):
            if value and value in seen[key]:
                errors.append(f'Duplicate {key.replace("_", " ")} (also on row {seen[key][value]}).')
            elif value:
                seen[key][value] = line
        if errors:
            problems.append({'row': line, 'errors': errors})
        else:
            valid.append((username, email, row.get('password'), values))

    if problems:
        return _fail(job, problems)

    created = []
    try:
        for username, email, password, values in valid:
            temp_password = password or secrets.token_urlsafe(9)
            user = User(username=username, email=email, role='student', college_id=job.college_id,
                        password_hash=generate_password_hash(temp_password))
            user.student = Student(college_id=job.college_id, email=email, **values)
            db.session.add(user)
            created.append((user, None if password else temp_password))
        job.status, job.created_count, job.errors, job.finished_at = 'succeeded', len(created), [], utcnow()
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        return _fail(job, [{'row': 0, 'errors': [f'Import failed and was rolled back: {exc}']}])
    return created


def _fail(job, errors):
    job.status, job.errors, job.created_count, job.finished_at = 'failed', errors, 0, utcnow()
    db.session.commit()
    return []
