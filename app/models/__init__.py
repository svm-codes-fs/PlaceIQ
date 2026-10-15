"""
SQLAlchemy Models — mirrors the SQL schema in sql/01_schema.sql.
"""
from app.models.user import User
from app.models.student import Student, BRANCHES
from app.models.company import Company
from app.models.application import Application, Result, APPLICATION_STATUSES

__all__ = ['User', 'Student', 'Company', 'Application', 'Result', 'BRANCHES', 'APPLICATION_STATUSES']
