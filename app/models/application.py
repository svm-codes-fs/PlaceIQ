from datetime import datetime

from app.extensions import db

APPLICATION_STATUSES = ('Applied', 'Shortlisted', 'Interview', 'Offered', 'Rejected')


class Application(db.Model):
    """Bridge entity resolving Students ↔ Companies (M:N)."""
    __tablename__ = 'applications'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False)
    applied_date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.Enum(*APPLICATION_STATUSES, name='application_status'),
                       nullable=False, default='Applied')
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
    application_id = db.Column(db.Integer, db.ForeignKey('applications.id', ondelete='CASCADE'),
                               unique=True, nullable=False)
    result = db.Column(db.Enum('Selected', 'Not Selected', name='result_outcome'), nullable=False)
    offer_date = db.Column(db.Date)
    remarks = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
