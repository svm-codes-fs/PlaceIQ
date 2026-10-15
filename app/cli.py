"""
Flask CLI commands.

    flask db upgrade   apply migrations (Flask-Migrate)
    flask seed         create the super admin and two demo colleges (idempotent)
"""
from datetime import date, timedelta

import click
from flask import current_app
from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models import Application, College, Company, Student, User
from app.tenancy import college_context

DEMO_COLLEGES = [
    {
        'name': 'Thapar Institute of Engineering and Technology', 'code': 'TIET', 'admin': 'tiet_admin',
        'students': [
            ('102203001', 'Aarav Sharma', 'CSE', 9.12, 0),
            ('102203002', 'Diya Verma', 'CSE', 8.45, 0),
            ('102203003', 'Kabir Singh', 'ECE', 7.80, 0),
            ('102203004', 'Ananya Gupta', 'ECE', 8.95, 0),
            ('102203005', 'Rohan Mehta', 'ME', 6.90, 1),
            ('102203006', 'Ishita Kapoor', 'EE', 7.25, 0),
        ],
        'companies': [
            ('Microsoft', 'Software Engineer', 44.0, 8.0, 0, 'CSE,ECE', 'Upcoming', 10),
            ('Amazon', 'SDE-1', 32.0, 7.5, 0, 'CSE,ECE,EE', 'Upcoming', 18),
            ('Texas Instruments', 'Analog Design Engineer', 22.0, 7.5, 0, 'ECE,EE', 'Ongoing', -3),
            ('Tata Motors', 'Graduate Engineer Trainee', 8.5, 6.5, 1, 'ME,EE,CE', 'Upcoming', 25),
            ('Infosys', 'Systems Engineer', 6.5, 6.0, 1, 'CSE,ECE,ME,CE,EE,CHE', 'Completed', -30),
        ],
        # (student index, company index, status)
        'applications': [(0, 2, 'Interview'), (3, 2, 'Offered'), (1, 4, 'Accepted'), (4, 4, 'Rejected')],
    },
    {
        'name': 'Demo Institute of Technology', 'code': 'DIT', 'admin': 'dit_admin',
        'students': [
            ('DIT2201', 'Neha Joshi', 'CSE', 8.10, 0),
            ('DIT2202', 'Arjun Nair', 'ME', 7.40, 0),
            ('DIT2203', 'Sara Khan', 'CE', 6.80, 2),
        ],
        'companies': [
            ('Wipro', 'Project Engineer', 6.0, 6.0, 1, 'CSE,ECE,ME,CE,EE,CHE', 'Upcoming', 12),
            ('L&T', 'Site Engineer', 7.2, 6.5, 0, 'CE,ME', 'Upcoming', 20),
        ],
        'applications': [(0, 0, 'Shortlisted')],
    },
]


def seed_database():
    cfg = current_app.config
    password_hash = generate_password_hash(cfg['SEED_PASSWORD'])

    if User.query.filter_by(role='super_admin').first():
        return False

    db.session.add(User(username=cfg['SUPERADMIN_USERNAME'], email=cfg['SUPERADMIN_EMAIL'],
                        role='super_admin', password_hash=password_hash))

    for spec in DEMO_COLLEGES:
        college = College(name=spec['name'], code=spec['code'])
        db.session.add(college)
        db.session.flush()

        with college_context(college.id):
            db.session.add(User(username=spec['admin'], email=f"{spec['admin']}@placeiq.dev",
                                role='college_admin', college_id=college.id, password_hash=password_hash))

            students = []
            for roll_no, name, branch, cgpa, backlogs in spec['students']:
                username = name.split()[0].lower() + '_' + spec['code'].lower()
                email = f'{username}@placeiq.dev'
                user = User(username=username, email=email, role='student', college_id=college.id,
                            password_hash=password_hash)
                user.student = Student(roll_no=roll_no, name=name, email=email, branch=branch,
                                       cgpa=cgpa, backlogs=backlogs)
                db.session.add(user)
                students.append(user.student)

            companies = []
            for name, role, package, min_cgpa, max_backlogs, branches, status, days in spec['companies']:
                company = Company(name=name, role_offered=role, package_lpa=package, min_cgpa=min_cgpa,
                                  max_backlogs=max_backlogs, allowed_branches=branches, status=status,
                                  visit_date=date.today() + timedelta(days=days))
                db.session.add(company)
                companies.append(company)

            db.session.flush()
            for s_idx, c_idx, status in spec['applications']:
                student = students[s_idx]
                offer_date = date.today() - timedelta(days=2) if status in ('Offered', 'Accepted') else None
                db.session.add(Application(student_id=student.id, company_id=companies[c_idx].id,
                                           status=status, offer_date=offer_date))
                if status == 'Accepted':
                    student.placement_status = 'Placed'

            db.session.commit()
    return True


def register_cli(app):
    @app.cli.command('seed')
    def seed():
        """Create the super admin and demo colleges (skipped if already seeded)."""
        if seed_database():
            click.echo('Seeded: super admin, 2 colleges with admins, students, companies and applications.')
            click.echo('All seeded accounts use the password from SEED_PASSWORD.')
        else:
            click.echo('Database already seeded; nothing to do.')
