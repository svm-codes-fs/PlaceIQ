from app.extensions import db
from app.models.college import TenantScoped, utcnow

RESUME_STATUSES = ('uploaded', 'parsing', 'parsed', 'failed')


class Resume(TenantScoped, db.Model):
    """A student's uploaded resume and what was extracted from it (one per student)."""
    __tablename__ = 'resumes'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), unique=True, nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    storage_path = db.Column(db.String(500), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='uploaded')
    parser = db.Column(db.String(20))  # 'claude' or 'heuristic'
    raw_text = db.Column(db.Text)
    parsed = db.Column(db.JSON)
    error = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    student = db.relationship('Student', backref=db.backref('resume', uselist=False, cascade='all, delete-orphan',
                                                            passive_deletes=True))

    def to_json(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'status': self.status,
            'parser': self.parser,
            'parsed': self.parsed,
            'error': self.error,
            'updated_at': (self.updated_at or self.created_at).isoformat(),
        }
