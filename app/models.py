"""
SQLAlchemy Models — mirrors the MySQL schema exactly.
"""
from datetime import datetime, date
from flask_login import UserMixin
from app import db


class User(UserMixin, db.Model):
    """Authentication table for all users."""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.Enum('admin', 'student'), nullable=False, default='student')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    student = db.relationship('Student', backref='user', uselist=False, cascade='all, delete-orphan')

    def is_admin(self):
        return self.role == 'admin'


class Student(db.Model):
    """Student academic profile."""
    __tablename__ = 'students'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    roll_no = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(15))
    branch = db.Column(db.Enum('CSE', 'ECE', 'ME', 'CE', 'EE', 'CHE'), nullable=False)
    cgpa = db.Column(db.Numeric(4, 2), nullable=False)
    backlogs = db.Column(db.Integer, nullable=False, default=0)
    placement_status = db.Column(db.Enum('Unplaced', 'Placed'), nullable=False, default='Unplaced')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    applications = db.relationship('Application', backref='student', cascade='all, delete-orphan')


class Company(db.Model):
    """Recruiter information and eligibility criteria."""
    __tablename__ = 'companies'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    role_offered = db.Column(db.String(100), nullable=False)
    package_lpa = db.Column(db.Numeric(6, 2), nullable=False)
    min_cgpa = db.Column(db.Numeric(4, 2), nullable=False, default=0.00)
    max_backlogs = db.Column(db.Integer, nullable=False, default=0)
    allowed_branches = db.Column(db.String(100), nullable=False, default='CSE,ECE,ME,CE,EE,CHE')
    visit_date = db.Column(db.Date)
    status = db.Column(db.Enum('Upcoming', 'Ongoing', 'Completed'), nullable=False, default='Upcoming')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    applications = db.relationship('Application', backref='company', cascade='all, delete-orphan')

    def get_branches_list(self):
        """Return allowed branches as a list."""
        return [b.strip() for b in self.allowed_branches.split(',')]


class Application(db.Model):
    """Bridge entity resolving Students ↔ Companies (M:N)."""
    __tablename__ = 'applications'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False)
    applied_date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(
        db.Enum('Applied', 'Shortlisted', 'Interview', 'Offered', 'Rejected'),
        nullable=False, default='Applied'
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Unique constraint — one application per student per company
    __table_args__ = (
        db.UniqueConstraint('student_id', 'company_id', name='uq_student_company'),
    )

    # Relationships
    result = db.relationship('Result', backref='application', uselist=False, cascade='all, delete-orphan')


class Result(db.Model):
    """Final placement outcome."""
    __tablename__ = 'results'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    application_id = db.Column(db.Integer, db.ForeignKey('applications.id', ondelete='CASCADE'), unique=True, nullable=False)
    result = db.Column(db.Enum('Selected', 'Not Selected'), nullable=False)
    offer_date = db.Column(db.Date)
    remarks = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
