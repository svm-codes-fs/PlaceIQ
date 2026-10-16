from app.extensions import db
from app.models.college import TenantScoped, utcnow


class Notification(TenantScoped, db.Model):
    """An in-app notification for one user; also pushed live over Socket.IO."""
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    kind = db.Column(db.String(40), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text)
    link = db.Column(db.String(200))
    read_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    __table_args__ = (
        # Bell icon: a user's newest notifications and unread count
        db.Index('ix_notifications_user_created', 'user_id', 'created_at'),
    )

    def to_json(self):
        return {
            'id': self.id,
            'kind': self.kind,
            'title': self.title,
            'body': self.body,
            'link': self.link,
            'read': self.read_at is not None,
            'created_at': self.created_at.isoformat(),
        }


class ImportJob(TenantScoped, db.Model):
    """A bulk student CSV import, processed by a background worker."""
    __tablename__ = 'import_jobs'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'))
    filename = db.Column(db.String(255))
    content = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending/running/succeeded/failed
    total_rows = db.Column(db.Integer, nullable=False, default=0)
    created_count = db.Column(db.Integer, nullable=False, default=0)
    errors = db.Column(db.JSON, nullable=False, default=list)  # [{"row": 3, "errors": [...]}, ...]
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    finished_at = db.Column(db.DateTime)

    def to_json(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'status': self.status,
            'total_rows': self.total_rows,
            'created_count': self.created_count,
            'errors': self.errors,
            'created_at': self.created_at.isoformat(),
            'finished_at': self.finished_at.isoformat() if self.finished_at else None,
        }
