"""
Creating, listing and delivering notifications (in-app, live push and email).
"""
import logging
import smtplib
from email.message import EmailMessage

from flask import current_app

from app.extensions import db
from app.models import Notification, User
from app.models.college import utcnow
from app.realtime import push_to_user

log = logging.getLogger(__name__)


def notify(users, kind, title, body=None, link=None, email=False):
    """Store a notification for each user, push it live, and optionally email it."""
    created = []
    for user in users:
        n = Notification(user_id=user.id, college_id=user.college_id, kind=kind, title=title, body=body, link=link)
        db.session.add(n)
        created.append((user, n))
    db.session.commit()

    for user, n in created:
        push_to_user(user.id, 'notification', n.to_json())
        if email:
            send_email(user.email, title, body or title)
    return [n for _, n in created]


def college_admins(college_id):
    return User.query.filter_by(role='college_admin', college_id=college_id).all()


def list_for(user, limit=30):
    items = Notification.query.filter_by(user_id=user.id) \
        .order_by(Notification.created_at.desc(), Notification.id.desc()).limit(limit).all()
    unread = Notification.query.filter_by(user_id=user.id, read_at=None).count()
    return {'items': [n.to_json() for n in items], 'unread': unread}


def mark_read(user, ids=None):
    query = Notification.query.filter_by(user_id=user.id, read_at=None)
    if ids:
        query = query.filter(Notification.id.in_(ids))
    for n in query.all():
        n.read_at = utcnow()
    db.session.commit()


def send_email(to, subject, body):
    """Console backend logs the email (development); smtp backend sends it."""
    cfg = current_app.config
    if cfg['EMAIL_BACKEND'] != 'smtp':
        log.info('EMAIL to=%s subject=%s\n%s', to, subject, body)
        return
    msg = EmailMessage()
    msg['From'] = cfg['MAIL_FROM']
    msg['To'] = to
    msg['Subject'] = subject
    msg.set_content(body)
    with smtplib.SMTP(cfg['MAIL_HOST'], cfg['MAIL_PORT'], timeout=15) as smtp:
        if cfg['MAIL_USE_TLS']:
            smtp.starttls()
        if cfg['MAIL_USERNAME']:
            smtp.login(cfg['MAIL_USERNAME'], cfg['MAIL_PASSWORD'])
        smtp.send_message(msg)
