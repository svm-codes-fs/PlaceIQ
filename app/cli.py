"""
Flask CLI commands.

    flask db upgrade   apply migrations (Flask-Migrate)
    flask seed         create the super admin and two demo colleges (idempotent)
    flask seed-large   bulk benchmark data (app/bulk_seed.py)
"""
from datetime import date, timedelta

import click
from flask import current_app
from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models import Application, College, Company, PlacementPolicy, Student, User
from app.services.applications import record_event
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
        'applications': [(2, 2, 'Interview'), (3, 2, 'Offered'), (1, 4, 'Accepted'), (4, 4, 'Rejected')],
        # rule type -> params; seeded enabled
        'policies': {'max_offers': {'limit': 2}, 'dream_lock': {'dream_min_lpa': 20}},
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
        'policies': {'block_after_placement': {}},
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
                skills, summary = STUDENT_PROFILES.get(name, ([], None))
                user.student = Student(roll_no=roll_no, name=name, email=email, branch=branch,
                                       cgpa=cgpa, backlogs=backlogs, skills=skills, profile_summary=summary)
                db.session.add(user)
                students.append(user.student)

            companies = []
            for name, role, package, min_cgpa, max_backlogs, branches, status, days in spec['companies']:
                required, description = DRIVE_DETAILS.get(name, ([], None))
                company = Company(name=name, role_offered=role, package_lpa=package, min_cgpa=min_cgpa,
                                  max_backlogs=max_backlogs, allowed_branches=branches, status=status,
                                  visit_date=date.today() + timedelta(days=days),
                                  required_skills=required, description=description)
                db.session.add(company)
                companies.append(company)

            for rule_type, params in spec['policies'].items():
                db.session.add(PlacementPolicy(rule_type=rule_type, params=params, enabled=True))

            db.session.flush()
            for s_idx, c_idx, status in spec['applications']:
                student = students[s_idx]
                offer_date = date.today() - timedelta(days=2) if status in ('Offered', 'Accepted') else None
                application = Application(student_id=student.id, company_id=companies[c_idx].id,
                                          status=status, offer_date=offer_date)
                db.session.add(application)
                _seed_history(application, status)
            db.session.flush()
            for s_idx, c_idx, status in spec['applications']:
                if status == 'Accepted':
                    students[s_idx].placement_status = 'Placed'

            db.session.commit()
    return True


# Required skills and descriptions for the seeded drives (used by job matching)
DRIVE_DETAILS = {
    'Microsoft': (['Data Structures', 'System Design', 'C++', 'Python', 'Azure'],
                  'Build large-scale cloud services. Strong problem solving, algorithms and distributed systems.'),
    'Amazon': (['Java', 'Data Structures', 'System Design', 'AWS', 'SQL'],
               'Design and ship backend services for retail and AWS products; ownership of microservices.'),
    'Texas Instruments': (['Analog Circuits', 'Digital Electronics', 'Verilog', 'MATLAB', 'Embedded C'],
                          'Analog and mixed-signal IC design: circuit simulation, layout reviews, silicon validation.'),
    'Tata Motors': (['SolidWorks', 'AutoCAD', 'Manufacturing', 'Thermodynamics', 'ANSYS'],
                    'Vehicle design and production engineering: CAD modelling, simulation and plant processes.'),
    'Infosys': (['Java', 'SQL', 'OOP', 'Communication'],
                'Develop and maintain enterprise applications for global clients after a training programme.'),
    'Wipro': (['Java', 'SQL', 'OOP', 'Communication'],
              'Project engineer for application development and support on client engagements.'),
    'L&T': (['AutoCAD', 'STAAD Pro', 'Structural Analysis', 'Project Management'],
            'Site engineering for infrastructure projects: structural drawings, quantities and site execution.'),
}

# Confirmed matching profiles for the seeded students
STUDENT_PROFILES = {
    'Aarav Sharma': (['Python', 'C++', 'Data Structures', 'System Design', 'React', 'PostgreSQL', 'Docker'],
                     'Backend-focused developer. Built a distributed URL shortener with caching and a React '
                     'dashboard; ICPC regionalist.'),
    'Diya Verma': (['Java', 'Spring Boot', 'SQL', 'AWS', 'Data Structures', 'Microservices'],
                   'Java developer; interned on payment microservices deployed on AWS.'),
    'Kabir Singh': (['Verilog', 'Digital Electronics', 'FPGA', 'MATLAB', 'C'],
                    'Digital design enthusiast; implemented a RISC-V core on an FPGA.'),
    'Ananya Gupta': (['Analog Circuits', 'Embedded C', 'Microcontrollers', 'PCB Design', 'MATLAB', 'Python'],
                     'Designed a low-noise amplifier and an STM32-based data logger with a custom PCB.'),
    'Rohan Mehta': (['SolidWorks', 'AutoCAD', 'ANSYS', 'Manufacturing'],
                    'Designed a go-kart chassis in SolidWorks and validated it with ANSYS simulations.'),
    'Ishita Kapoor': (['Power Systems', 'MATLAB', 'Control Systems', 'PLC'],
                      'Modelled a grid-tied solar inverter in Simulink; PLC automation internship.'),
    'Neha Joshi': (['Java', 'Python', 'SQL', 'React', 'OOP'], 'Full-stack projects with React and Java backends.'),
    'Arjun Nair': (['AutoCAD', 'SolidWorks', 'Thermodynamics'], 'Heat-exchanger design project; CAD modelling.'),
    'Sara Khan': (['AutoCAD', 'STAAD Pro', 'Surveying', 'Revit'], 'Structural design of a G+3 building in STAAD Pro.'),
}

PIPELINE = ['Applied', 'Shortlisted', 'Interview', 'Offered']


def _seed_history(application, final_status):
    """Audit events leading up to a seeded application's status."""
    path = PIPELINE[:PIPELINE.index(final_status) + 1] if final_status in PIPELINE else         (PIPELINE if final_status in ('Accepted', 'Declined') else ['Applied']) + [final_status]
    previous = None
    for status in path:
        role = 'student' if status in ('Applied', 'Accepted', 'Declined') else 'college_admin'
        record_event(application, previous, status, actor_role=role, note='Seeded history')
        previous = status


def register_cli(app):
    from app import bulk_seed
    bulk_seed.register(app)

    @app.cli.command('seed')
    def seed():
        """Create the super admin and demo colleges (skipped if already seeded)."""
        if seed_database():
            click.echo('Seeded: super admin, 2 colleges with admins, students, companies and applications.')
            click.echo('All seeded accounts use the password from SEED_PASSWORD.')
        else:
            click.echo('Database already seeded; nothing to do.')
