"""
`flask seed-large`: realistic bulk data for benchmarks and load tests.

Generates colleges, students (with skills, profiles and embeddings), drives
(with required skills and embeddings) and applications that satisfy every
drive's criteria (the PostgreSQL trigger checks each one). Uses Core bulk
inserts and a single shared password hash, so 5,000 students take seconds.
Meant for an empty database; all accounts use BENCH_PASSWORD.
"""
import random
from datetime import date, timedelta

import click
from flask import current_app
from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models import (Application, ApplicationEvent, College, Company, PlacementPolicy, Student, User)
from app.models.college import utcnow
from app.services import embeddings

BRANCH_SKILLS = {
    'CSE': ['Python', 'Java', 'C++', 'JavaScript', 'React', 'Node.js', 'SQL', 'PostgreSQL', 'Docker', 'AWS',
            'Data Structures', 'System Design', 'Machine Learning', 'Flask', 'Spring Boot', 'Git', 'Kubernetes'],
    'ECE': ['Embedded C', 'Microcontrollers', 'Verilog', 'VHDL', 'FPGA', 'Digital Electronics', 'Analog Circuits',
            'Signal Processing', 'MATLAB', 'PCB Design', 'IoT', 'Python', 'C'],
    'EE': ['Power Systems', 'Control Systems', 'MATLAB', 'PLC', 'Analog Circuits', 'Embedded C', 'Python'],
    'ME': ['SolidWorks', 'AutoCAD', 'CATIA', 'ANSYS', 'CFD', 'Thermodynamics', 'Manufacturing', 'Robotics', 'MATLAB'],
    'CE': ['AutoCAD', 'STAAD Pro', 'Revit', 'Structural Analysis', 'Surveying', 'Project Management', 'Excel'],
    'CHE': ['Aspen Plus', 'Process Engineering', 'MATLAB', 'Thermodynamics', 'Excel', 'Python'],
}
ROLES = {
    'CSE': ['Software Engineer', 'SDE-1', 'Backend Developer', 'Data Analyst', 'ML Engineer', 'Full Stack Developer'],
    'ECE': ['Embedded Engineer', 'VLSI Design Engineer', 'Hardware Engineer', 'Firmware Developer'],
    'EE': ['Electrical Design Engineer', 'Power Systems Engineer', 'Automation Engineer'],
    'ME': ['Design Engineer', 'Production Engineer', 'Graduate Engineer Trainee'],
    'CE': ['Site Engineer', 'Structural Engineer', 'Planning Engineer'],
    'CHE': ['Process Engineer', 'Plant Engineer'],
}
BRANCH_WEIGHTS = {'CSE': 40, 'ECE': 22, 'EE': 12, 'ME': 14, 'CE': 8, 'CHE': 4}


def seed_large(colleges=3, students=5000, companies=200, applications=20000, seed=42):
    from faker import Faker  # development dependency (requirements-dev.txt)

    rng = random.Random(seed)
    fake = Faker('en_IN')
    Faker.seed(seed)
    password_hash = generate_password_hash(current_app.config['BENCH_PASSWORD'])
    branches = list(BRANCH_WEIGHTS)
    weights = list(BRANCH_WEIGHTS.values())
    today = date.today()

    # Colleges and their admins
    college_ids = []
    for i in range(colleges):
        college = College(name=f'{fake.city()} Institute of Technology', code=f'BENCH{i + 1}')
        db.session.add(college)
        db.session.flush()
        college_ids.append(college.id)
        db.session.add(User(username=f'bench_admin{i + 1}', email=f'bench_admin{i + 1}@bench.placeiq.dev',
                            role='college_admin', college_id=college.id, password_hash=password_hash))
        db.session.add(PlacementPolicy(college_id=college.id, rule_type='max_offers', params={'limit': 2}))
    db.session.commit()

    # Students: users first, then profiles with skills and an embedding
    student_rows = []
    for n in range(students):
        college_id = college_ids[n % colleges]
        branch = rng.choices(branches, weights)[0]
        skills = rng.sample(BRANCH_SKILLS[branch], k=rng.randint(4, min(8, len(BRANCH_SKILLS[branch]))))
        cgpa = round(min(10, max(5, rng.gauss(7.6, 0.9))), 2)
        student_rows.append({
            'n': n, 'college_id': college_id, 'branch': branch, 'skills': skills, 'cgpa': cgpa,
            'backlogs': 0 if rng.random() < 0.8 else rng.randint(1, 3),
            'name': fake.name(),
            'summary': f'{branch} student skilled in {", ".join(skills[:3])}. '
                       f'Built a project on {fake.bs()} using {skills[0]}.',
        })
    db.session.execute(User.__table__.insert(), [{
        'college_id': r['college_id'], 'username': f'bench_s{r["n"]}', 'email': f'bench_s{r["n"]}@bench.placeiq.dev',
        'password_hash': password_hash, 'role': 'student', 'created_at': utcnow(), 'updated_at': utcnow(),
    } for r in student_rows])
    user_ids = dict(db.session.execute(db.select(User.username, User.id).where(User.username.like('bench_s%'))).all())

    model, vectors = embeddings.embed([
        f'{r["branch"]} engineering student. Skills: {", ".join(r["skills"])}. {r["summary"]}' for r in student_rows])
    db.session.execute(Student.__table__.insert(), [{
        'user_id': user_ids[f'bench_s{r["n"]}'], 'college_id': r['college_id'], 'roll_no': f'B{r["n"]:06d}',
        'name': r['name'], 'email': f'bench_s{r["n"]}@bench.placeiq.dev', 'branch': r['branch'],
        'cgpa': r['cgpa'], 'backlogs': r['backlogs'], 'placement_status': 'Unplaced',
        'skills': r['skills'], 'profile_summary': r['summary'], 'embedding': vec, 'embedding_model': model,
        'created_at': utcnow(), 'updated_at': utcnow(),
    } for r, vec in zip(student_rows, vectors)])

    # Drives
    company_rows = []
    for n in range(companies):
        primary = rng.choices(branches, weights)[0]
        allowed = sorted({primary, *rng.sample(branches, k=rng.randint(0, 2))})
        company_rows.append({
            'college_id': college_ids[n % colleges], 'name': fake.company(), 'role_offered': rng.choice(ROLES[primary]),
            'package_lpa': round(rng.uniform(4, 45), 2), 'min_cgpa': rng.choice([6.0, 6.5, 7.0, 7.5, 8.0]),
            'max_backlogs': rng.choice([0, 0, 1, 2]), 'allowed_branches': ','.join(allowed),
            'required_skills': rng.sample(BRANCH_SKILLS[primary], k=rng.randint(3, 5)),
            'visit_date': today + timedelta(days=rng.randint(-60, 60)),
            'status': rng.choices(['Upcoming', 'Ongoing', 'Completed'], [55, 15, 30])[0],
        })
    model, vectors = embeddings.embed([
        f'{c["role_offered"]} at {c["name"]}. Required skills: {", ".join(c["required_skills"])}.' for c in company_rows])
    db.session.execute(Company.__table__.insert(), [{
        **c, 'description': f'{c["role_offered"]} role working with {", ".join(c["required_skills"])}.',
        'embedding': vec, 'embedding_model': model, 'created_at': utcnow(), 'updated_at': utcnow(),
    } for c, vec in zip(company_rows, vectors)])
    db.session.commit()

    # Applications: only eligible (student, drive) pairs within the same college
    students_by_college = {}
    for s in db.session.execute(db.select(Student.id, Student.college_id, Student.branch, Student.cgpa,
                                          Student.backlogs)).all():
        students_by_college.setdefault(s.college_id, []).append(s)
    drives = db.session.execute(db.select(Company.id, Company.college_id, Company.min_cgpa, Company.max_backlogs,
                                          Company.allowed_branches, Company.visit_date)).all()
    statuses = ['Applied', 'Shortlisted', 'Interview', 'Offered', 'Rejected', 'Accepted']
    status_weights = [40, 20, 12, 5, 20, 3]
    pairs, app_rows = set(), []
    attempts = 0
    while len(app_rows) < applications and attempts < applications * 20:
        attempts += 1
        d = rng.choice(drives)
        s = rng.choice(students_by_college[d.college_id])
        if (s.id, d.id) in pairs or s.cgpa < d.min_cgpa or s.backlogs > d.max_backlogs \
                or s.branch not in d.allowed_branches.split(','):
            continue
        pairs.add((s.id, d.id))
        status = rng.choices(statuses, status_weights)[0]
        applied = d.visit_date - timedelta(days=rng.randint(5, 40))
        app_rows.append({
            'student_id': s.id, 'company_id': d.id, 'college_id': d.college_id, 'status': status,
            'applied_date': applied, 'offer_date': applied + timedelta(days=10) if status in ('Offered', 'Accepted')
            else None, 'offer_reminder_sent': False, 'created_at': utcnow(), 'updated_at': utcnow(),
        })
    for start in range(0, len(app_rows), 2000):
        db.session.execute(Application.__table__.insert(), app_rows[start:start + 2000])
    db.session.commit()

    # One "Applied" audit event per application (enough for timeline queries)
    apps = db.session.execute(db.select(Application.id, Application.college_id, Application.status)).all()
    db.session.execute(ApplicationEvent.__table__.insert(), [{
        'application_id': a.id, 'college_id': a.college_id, 'from_status': None, 'to_status': 'Applied',
        'actor_role': 'student', 'created_at': utcnow(),
    } for a in apps])
    placed = {r['student_id'] for r in app_rows if r['status'] == 'Accepted'}
    if placed:
        db.session.execute(Student.__table__.update().where(Student.id.in_(placed)).values(placement_status='Placed'))
    db.session.commit()
    return {'colleges': colleges, 'students': students, 'companies': companies, 'applications': len(app_rows),
            'embedding_model': model}


def register(app):
    @app.cli.command('seed-large')
    @click.option('--colleges', default=3)
    @click.option('--students', default=5000)
    @click.option('--companies', default=200)
    @click.option('--applications', default=20000)
    def seed_large_command(colleges, students, companies, applications):
        """Bulk benchmark data (use an empty database)."""
        result = seed_large(colleges, students, companies, applications)
        click.echo(f'Seeded {result}')
