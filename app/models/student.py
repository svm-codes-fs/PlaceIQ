from datetime import datetime

from app.extensions import db

BRANCHES = ('CSE', 'ECE', 'ME', 'CE', 'EE', 'CHE')


class Student(db.Model):
    """Student academic profile."""
    __tablename__ = 'students'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    roll_no = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(15))
    branch = db.Column(db.Enum(*BRANCHES, name='branch'), nullable=False)
    cgpa = db.Column(db.Numeric(4, 2), nullable=False)
    backlogs = db.Column(db.Integer, nullable=False, default=0)
    placement_status = db.Column(db.Enum('Unplaced', 'Placed', name='placement_status'),
                                 nullable=False, default='Unplaced')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    applications = db.relationship('Application', backref='student', cascade='all, delete-orphan')
