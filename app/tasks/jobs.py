"""
Background jobs. Request handlers queue these with `enqueue(...)`; the Celery
worker runs them (inline when CELERY_TASK_ALWAYS_EAGER is set). Scheduled jobs
are run by Celery Beat (see CELERY['beat_schedule'] in app/config.py).

Tasks run outside any request, so each one sets the college context of the
records it touches (app/tenancy.py).
"""
from datetime import date, timedelta

from celery import shared_task
from flask import current_app

from app.extensions import db
from app.models import Application, Company, ImportJob, Student
from app.realtime import push_to_user
from app.services.notifications import college_admins, notify, send_email
from app.tenancy import college_context

STATUS_MESSAGES = {
    'Shortlisted': ('You have been shortlisted by {company}',
                    'Your application for {role} moved to the shortlist.'),
    'Interview': ('Interview stage: {company}',
                  'You are through to the interview stage for {role}.{when}'),
    'Offered': ('Offer from {company}!',
                '{company} has offered you the {role} role. Respond within {days} days in PlaceIQ.'),
    'Rejected': ('Update on your {company} application',
                 'Your application for {role} was not taken forward.'),
    'Expired': ('Your {company} offer has expired',
                'The offer for {role} expired because it was not answered in time.'),
}


@shared_task
def notify_status_change(application_id):
    """Tell the student (or, for an offer response, the college admins) about a status change."""
    app = db.session.get(Application, application_id)
    if not app:
        return
    with college_context(app.college_id):
        company, student = app.company, app.student
        if app.status in ('Accepted', 'Declined'):
            verb = 'accepted' if app.status == 'Accepted' else 'declined'
            notify(college_admins(app.college_id), 'offer_response',
                   f'{student.name} {verb} the {company.name} offer', f'{company.role_offered}, ₹{company.package_lpa} LPA',
                   link='/admin/results')
            return
        if app.status not in STATUS_MESSAGES:
            return
        title, body = STATUS_MESSAGES[app.status]
        when = f' Drive date: {company.visit_date:%d %b %Y}.' if company.visit_date else ''
        fmt = {'company': company.name, 'role': company.role_offered, 'when': when,
               'days': current_app.config['OFFER_EXPIRY_DAYS']}
        notify([student.user], 'status_change', title.format(**fmt), body.format(**fmt),
               link='/student/applications', email=True)


@shared_task
def notify_new_drive(company_id):
    """Tell every student who can apply that a new drive has been posted."""
    from app.services.policies import PolicyEvaluator

    company = db.session.get(Company, company_id)
    if not company or company.status != 'Upcoming':
        return 0
    with college_context(company.college_id):
        users = [s.user for s in Student.query.all() if not PolicyEvaluator(s).failures(company)]
        notify(users, 'new_drive', f'New drive: {company.name}',
               f'{company.role_offered}, ₹{company.package_lpa} LPA — you are eligible to apply.',
               link='/student/companies')
    return len(users)


@shared_task
def import_students(job_id):
    from app.services.imports import run_import

    job = db.session.get(ImportJob, job_id)
    if not job:
        return
    with college_context(job.college_id):
        created = run_import(job)
        for user, temp_password in created:
            if temp_password:
                send_email(user.email, 'Your PlaceIQ account',
                           f'Hi {user.student.name}, your placement office created your PlaceIQ account.\n'
                           f'Username: {user.username}\nTemporary password: {temp_password}\n'
                           f'Sign in at {current_app.config["FRONTEND_URL"]}/login')
        if job.created_by:
            push_to_user(job.created_by, 'import_finished', job.to_json())
        return job.status


@shared_task
def expire_offers():
    """Hourly: expire offers not answered within OFFER_EXPIRY_DAYS; remind a day before."""
    from app.services.applications import transition

    days = current_app.config['OFFER_EXPIRY_DAYS']
    today = date.today()
    expired = reminded = 0
    for app in Application.query.filter_by(status='Offered').all():
        if not app.offer_date:
            continue
        with college_context(app.college_id):
            if app.offer_date <= today - timedelta(days=days):
                # transition() queues the student's notification
                transition(app, 'Expired', actor='system', note=f'No response within {days} days')
                expired += 1
            elif app.offer_date <= today - timedelta(days=days - 1) and not app.offer_reminder_sent:
                app.offer_reminder_sent = True
                notify([app.student.user], 'offer_expiring', f'Your {app.company.name} offer expires tomorrow',
                       'Accept or decline it in PlaceIQ before it expires.', link='/student/applications',
                       email=True)
                reminded += 1
    return {'expired': expired, 'reminded': reminded}


@shared_task
def interview_reminders():
    """Daily: remind shortlisted students about drives happening tomorrow."""
    tomorrow = date.today() + timedelta(days=1)
    apps = Application.query.join(Company).filter(
        Company.visit_date == tomorrow, Application.status.in_(('Shortlisted', 'Interview'))).all()
    for app in apps:
        with college_context(app.college_id):
            notify([app.student.user], 'interview_reminder', f'{app.company.name} drive is tomorrow',
                   f'Your {app.status.lower()} round for {app.company.role_offered} is on {tomorrow:%d %b}.',
                   link='/student/applications', email=True)
    return len(apps)


@shared_task
def parse_resume(resume_id):
    """Extract a profile from an uploaded resume and tell the student it's ready to review."""
    from app.models import Resume
    from app.services.resumes import parse

    resume = db.session.get(Resume, resume_id)
    if not resume:
        return None
    with college_context(resume.college_id):
        parse(resume)
        push_to_user(resume.student.user_id, 'resume_parsed', resume.to_json())
        return resume.status


@shared_task
def embed_company(company_id):
    """Recompute a drive's embedding after it is created or edited."""
    from app.services.matching import refresh_company

    company = db.session.get(Company, company_id)
    if company:
        with college_context(company.college_id):
            refresh_company(company)
