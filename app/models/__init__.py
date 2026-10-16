"""
SQLAlchemy Models. Schema changes go through Alembic migrations (migrations/).
"""
from app.extensions import db
from app.models.application import APPLICATION_STATUSES, Application
from app.models.college import College, TenantScoped
from app.models.company import DRIVE_STATUSES, Company
from app.models.interview import ROUND_TYPES, InterviewQuestion, InterviewSession
from app.models.notification import ImportJob, Notification
from app.models.policy import RULE_TYPES, ApplicationEvent, PlacementPolicy
from app.models.resume import Resume
from app.models.student import BRANCHES, Student
from app.models.user import ROLES, User

# Number of applications per drive, computed in SQL (avoids loading every application)
Company.applicant_count = db.column_property(
    db.select(db.func.count(Application.id)).where(Application.company_id == Company.id)
    .correlate_except(Application).scalar_subquery()
)

__all__ = ['College', 'TenantScoped', 'User', 'ROLES', 'Student', 'BRANCHES',
           'Company', 'DRIVE_STATUSES', 'Application', 'APPLICATION_STATUSES',
           'PlacementPolicy', 'ApplicationEvent', 'RULE_TYPES', 'Notification', 'ImportJob', 'Resume',
           'InterviewSession', 'InterviewQuestion', 'ROUND_TYPES']
