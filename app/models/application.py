from app.extensions import db
from app.models.college import TenantScoped, utcnow

APPLICATION_STATUSES = ('Applied', 'Shortlisted', 'Interview', 'Offered', 'Accepted', 'Declined', 'Rejected')


class Application(TenantScoped, db.Model):
    """
    A student's application to a company (resolves the Students ↔ Companies M:N).
    Status moves through a fixed state machine; see app/services/applications.py.
    """
    __tablename__ = 'applications'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False, index=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    applied_date = db.Column(db.DateTime, default=utcnow)
    status = db.Column(db.Enum(*APPLICATION_STATUSES, name='application_status'),
                       nullable=False, default='Applied')
    offer_date = db.Column(db.Date)
    remarks = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    __table_args__ = (
        # One application per student per company
        db.UniqueConstraint('student_id', 'company_id', name='uq_student_company'),
    )
