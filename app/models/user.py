from app.extensions import db
from app.models.college import utcnow

ROLES = ('super_admin', 'college_admin', 'student')


class User(db.Model):
    """
    Authentication table for all users. Not tenant-scoped, because login looks
    users up before the college is known; college_id is NULL for super admins.
    """
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    college_id = db.Column(db.Integer, db.ForeignKey('colleges.id', ondelete='CASCADE'), index=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.Enum(*ROLES, name='user_role'), nullable=False, default='student')
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    college = db.relationship('College')
    student = db.relationship('Student', backref='user', uselist=False, cascade='all, delete-orphan')

    __table_args__ = (
        db.CheckConstraint("(role = 'super_admin') = (college_id IS NULL)", name='ck_user_college_by_role'),
    )
