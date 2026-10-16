"""
SQLAlchemy Models. Schema changes go through Alembic migrations (migrations/).
"""
from app.models.college import College, TenantScoped
from app.models.user import User, ROLES
from app.models.student import Student, BRANCHES
from app.models.company import Company, DRIVE_STATUSES
from app.models.application import Application, APPLICATION_STATUSES
from app.models.policy import PlacementPolicy, ApplicationEvent, RULE_TYPES

__all__ = ['College', 'TenantScoped', 'User', 'ROLES', 'Student', 'BRANCHES',
           'Company', 'DRIVE_STATUSES', 'Application', 'APPLICATION_STATUSES',
           'PlacementPolicy', 'ApplicationEvent', 'RULE_TYPES']
