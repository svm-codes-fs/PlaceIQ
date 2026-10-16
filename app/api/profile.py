"""Resume upload, the matching profile, AI job matches and candidate ranking."""
from flask import jsonify, request
from flask_jwt_extended import current_user

from app.api import api_bp
from app.api.serializers import company_json, student_json
from app.extensions import db
from app.models import Company
from app.security import roles_required
from app.services import ai, embeddings
from app.services.accounts import ValidationError
from app.services.matching import candidates_for_company, matches_for_student, refresh_student
from app.services.resumes import profile_text_from, save_upload
from app.services.skills import parse_skill_list
from app.tasks import enqueue
from app.tasks.jobs import parse_resume


@api_bp.route('/ai/status', methods=['GET'])
@roles_required('student', 'college_admin', 'super_admin')
def ai_status():
    """Which AI features are live, so the UI can label offline fallbacks honestly."""
    from flask import current_app
    return jsonify({
        'claude_enabled': ai.ai_enabled(),
        'resume_model': current_app.config['AI_RESUME_MODEL'],
        'interview_model': current_app.config['AI_INTERVIEW_MODEL'],
        'scoring_model': current_app.config['AI_SCORING_MODEL'],
        'embedding_model': embeddings.model_name(),
    })


def _student():
    return current_user.student


@api_bp.route('/student/resume', methods=['GET'])
@roles_required('student')
def get_resume():
    resume = _student().resume
    return jsonify({'resume': resume.to_json() if resume else None, 'profile': student_json(_student())})


@api_bp.route('/student/resume', methods=['POST'])
@roles_required('student')
def upload_resume():
    upload = request.files.get('file')
    if not upload:
        raise ValidationError(['Choose a PDF to upload.'])
    resume = save_upload(_student(), upload)
    enqueue(parse_resume, resume.id)
    db.session.refresh(resume)
    return jsonify({'resume': resume.to_json()}), 202


@api_bp.route('/student/resume/suggested-profile', methods=['GET'])
@roles_required('student')
def suggested_profile():
    """Profile fields pre-filled from the parsed resume, for the student to review."""
    resume = _student().resume
    if not resume or resume.status != 'parsed':
        return jsonify({'error': 'No parsed resume yet.'}), 404
    return jsonify({'skills': resume.parsed.get('skills', []), 'profile_summary': profile_text_from(resume.parsed)})


@api_bp.route('/student/skills', methods=['PUT'])
@roles_required('student')
def save_skills():
    """Save the reviewed skills and summary; they drive job matching."""
    data = request.get_json() or {}
    student = _student()
    skills = parse_skill_list(data.get('skills'))
    if len(skills) > 60:
        raise ValidationError(['List at most 60 skills.'])
    student.skills = skills
    student.profile_summary = (data.get('profile_summary') or '').strip()[:4000] or None
    refresh_student(student)
    return jsonify({'message': 'Profile saved. Your job matches are updated.', 'profile': student_json(student)})


@api_bp.route('/student/matches', methods=['GET'])
@roles_required('student')
def student_matches():
    student = _student()
    return jsonify({
        'has_profile': bool(student.skills or student.profile_summary),
        'matches': [{**company_json(r.pop('company')), **r} for r in matches_for_student(student)],
    })


@api_bp.route('/admin/companies/<int:company_id>/candidates', methods=['GET'])
@roles_required('college_admin')
def company_candidates(company_id):
    company = db.get_or_404(Company, company_id)
    results = [{**student_json(r.pop('student')), **r} for r in candidates_for_company(company)]
    return jsonify({'company': company_json(company), 'candidates': results})
