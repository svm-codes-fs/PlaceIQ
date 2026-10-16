from app.extensions import db
from app.models.college import TenantScoped, utcnow

ROUND_TYPES = ('technical', 'hr', 'behavioral')
SESSION_STATUSES = ('generating', 'ready', 'scoring', 'completed', 'failed')


class InterviewSession(TenantScoped, db.Model):
    """A mock interview: questions generated for a student (optionally for one drive), then scored."""
    __tablename__ = 'interview_sessions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False, index=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id', ondelete='SET NULL'))
    round_type = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='generating')
    generator = db.Column(db.String(20))  # 'claude' or 'question_bank'
    scorer = db.Column(db.String(20))     # 'claude' or 'rubric'
    overall_score = db.Column(db.Float)   # 0-10
    overall_feedback = db.Column(db.Text)
    error = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    completed_at = db.Column(db.DateTime)

    student = db.relationship('Student', backref=db.backref('interviews', cascade='all, delete-orphan',
                                                            passive_deletes=True))
    company = db.relationship('Company')
    questions = db.relationship('InterviewQuestion', backref='session', cascade='all, delete-orphan',
                                order_by='InterviewQuestion.position', passive_deletes=True)


class InterviewQuestion(TenantScoped, db.Model):
    __tablename__ = 'interview_questions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    session_id = db.Column(db.Integer, db.ForeignKey('interview_sessions.id', ondelete='CASCADE'),
                           nullable=False, index=True)
    position = db.Column(db.Integer, nullable=False)
    question = db.Column(db.Text, nullable=False)
    focus = db.Column(db.String(120))
    ideal_points = db.Column(db.JSON, nullable=False, default=list)
    answer = db.Column(db.Text)
    time_taken_s = db.Column(db.Integer)
    correctness = db.Column(db.Integer)
    clarity = db.Column(db.Integer)
    depth = db.Column(db.Integer)
    feedback = db.Column(db.Text)

    @property
    def score(self):
        parts = [self.correctness, self.clarity, self.depth]
        return None if None in parts else round(sum(parts) / 3, 1)
