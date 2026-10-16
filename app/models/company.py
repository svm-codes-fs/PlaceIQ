from app.extensions import db
from app.models.college import TenantScoped, utcnow
from app.models.vector import EmbeddingType

DRIVE_STATUSES = ('Upcoming', 'Ongoing', 'Completed')


class Company(TenantScoped, db.Model):
    """A recruitment drive at one college, with its eligibility criteria."""
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
    status = db.Column(db.Enum(*DRIVE_STATUSES, name='drive_status'), nullable=False, default='Upcoming')
    required_skills = db.Column(db.JSON, nullable=False, default=list)
    embedding = db.deferred(db.Column(EmbeddingType))
    embedding_model = db.Column(db.String(80))
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    applications = db.relationship('Application', backref='company', cascade='all, delete-orphan')

    __table_args__ = (
        db.CheckConstraint('package_lpa >= 0', name='ck_company_package'),
        db.CheckConstraint('min_cgpa >= 0 AND min_cgpa <= 10', name='ck_company_min_cgpa'),
        db.CheckConstraint('max_backlogs >= 0', name='ck_company_max_backlogs'),
        # Upcoming drives for a college, ordered by date
        db.Index('ix_companies_college_status_visit', 'college_id', 'status', 'visit_date'),
    )

    def get_branches_list(self):
        """Return allowed branches as a list."""
        return [b.strip() for b in self.allowed_branches.split(',') if b.strip()]
