from datetime import datetime

from app.extensions import db


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
    status = db.Column(db.Enum('Upcoming', 'Ongoing', 'Completed', name='drive_status'),
                       nullable=False, default='Upcoming')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    applications = db.relationship('Application', backref='company', cascade='all, delete-orphan')

    def get_branches_list(self):
        """Return allowed branches as a list."""
        return [b.strip() for b in self.allowed_branches.split(',')]
