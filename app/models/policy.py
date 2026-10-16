from app.extensions import db
from app.models.college import TenantScoped, utcnow

# Rule types a college can switch on. Parameters live in `params` (JSON);
# their meaning and defaults are defined in app/services/policies.py.
RULE_TYPES = ('max_offers', 'dream_lock', 'min_cgpa', 'max_backlogs', 'block_after_placement')


class PlacementPolicy(TenantScoped, db.Model):
    """A placement rule configured by a college (stored as data, not code)."""
    __tablename__ = 'placement_policies'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    rule_type = db.Column(db.String(40), nullable=False)
    enabled = db.Column(db.Boolean, nullable=False, default=True)
    params = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    __table_args__ = (
        db.UniqueConstraint('college_id', 'rule_type', name='uq_policy_college_rule'),
    )


class ApplicationEvent(TenantScoped, db.Model):
    """Audit trail: one row per status change of an application."""
    __tablename__ = 'application_events'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    application_id = db.Column(db.Integer, db.ForeignKey('applications.id', ondelete='CASCADE'), nullable=False)
    from_status = db.Column(db.String(20))
    to_status = db.Column(db.String(20), nullable=False)
    actor_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'))
    actor_role = db.Column(db.String(20))
    note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    __table_args__ = (
        # An application's timeline in order
        db.Index('ix_application_events_app_created', 'application_id', 'created_at'),
    )

    actor = db.relationship('User')
    application = db.relationship('Application', backref=db.backref(
        'events', cascade='all, delete-orphan', passive_deletes=True, order_by='ApplicationEvent.id'))
