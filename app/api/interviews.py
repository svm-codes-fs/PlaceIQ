"""AI mock interviews for students."""
from flask import jsonify, request
from flask_jwt_extended import current_user

from app.api import api_bp
from app.extensions import db
from app.models import InterviewSession
from app.security import roles_required
from app.services.interviews import create_session, save_answer, session_json, submit

student_only = roles_required('student')


def _own_session(session_id):
    session = db.get_or_404(InterviewSession, session_id)
    if session.student_id != current_user.student.id:
        return None
    return session


@api_bp.route('/student/interviews', methods=['GET'])
@student_only
def list_interviews():
    sessions = InterviewSession.query.filter_by(student_id=current_user.student.id) \
        .order_by(InterviewSession.created_at.desc()).all()
    completed = sorted((s for s in sessions if s.status == 'completed'), key=lambda s: s.completed_at)
    return jsonify({
        'sessions': [session_json(s, with_questions=False) for s in sessions],
        # Oldest first, for the progress chart
        'progress': [{'id': s.id, 'date': s.completed_at.isoformat(), 'score': s.overall_score,
                      'round_type': s.round_type} for s in completed],
    })


@api_bp.route('/student/interviews', methods=['POST'])
@student_only
def start_interview():
    session = create_session(current_user.student, request.get_json() or {})
    db.session.refresh(session)
    return jsonify(session_json(session)), 202


@api_bp.route('/student/interviews/<int:session_id>', methods=['GET'])
@student_only
def get_interview(session_id):
    session = _own_session(session_id)
    if not session:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(session_json(session))


@api_bp.route('/student/interviews/<int:session_id>/answers/<int:question_id>', methods=['PUT'])
@student_only
def answer_question(session_id, question_id):
    session = _own_session(session_id)
    if not session:
        return jsonify({'error': 'Not found'}), 404
    save_answer(session, question_id, request.get_json() or {})
    return jsonify({'message': 'Saved'})


@api_bp.route('/student/interviews/<int:session_id>/submit', methods=['POST'])
@student_only
def submit_interview(session_id):
    session = _own_session(session_id)
    if not session:
        return jsonify({'error': 'Not found'}), 404
    submit(session)
    db.session.refresh(session)
    return jsonify(session_json(session)), 202
