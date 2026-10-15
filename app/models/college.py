from datetime import datetime, timezone

from app.extensions import db


def utcnow():
    """Naive UTC timestamp (columns are TIMESTAMP WITHOUT TIME ZONE)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class College(db.Model):
    """A tenant. Every student, company and application belongs to one college."""
    __tablename__ = 'colleges'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(150), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)


class TenantScoped:
    """
    Mixin for per-college tables. Queries on these models are filtered to the
    current request's college automatically (see app/tenancy.py).
    """

    @db.declared_attr
    def college_id(cls):
        return db.Column(db.Integer, db.ForeignKey('colleges.id', ondelete='CASCADE'),
                         nullable=False, index=True)
