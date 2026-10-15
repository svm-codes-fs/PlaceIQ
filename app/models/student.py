from app.extensions import db
from app.models.college import TenantScoped, utcnow

BRANCHES = ('CSE', 'ECE', 'ME', 'CE', 'EE', 'CHE')


class Student(TenantScoped, db.Model):
    """Student academic profile."""
    __tablename__ = 'students'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    roll_no = db.Column(db.String(20), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(15))
    branch = db.Column(db.Enum(*BRANCHES, name='branch'), nullable=False)
    cgpa = db.Column(db.Numeric(4, 2), nullable=False)
    backlogs = db.Column(db.Integer, nullable=False, default=0)
    placement_status = db.Column(db.Enum('Unplaced', 'Placed', name='placement_status'),
                                 nullable=False, default='Unplaced')
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    applications = db.relationship('Application', backref='student', cascade='all, delete-orphan')

    __table_args__ = (
        # Roll numbers only need to be unique within a college
        db.UniqueConstraint('college_id', 'roll_no', name='uq_student_college_roll'),
        db.CheckConstraint('cgpa >= 0 AND cgpa <= 10', name='ck_student_cgpa'),
        db.CheckConstraint('backlogs >= 0', name='ck_student_backlogs'),
    )
