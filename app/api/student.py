from flask import jsonify, request
from flask_jwt_extended import current_user

from app.api import api_bp
from app.api.serializers import application_json, company_json, student_json
from app.extensions import db
from app.models import Application, Company
from app.security import roles_required
from app.services.accounts import update_student
from app.services.applications import allowed_transitions, apply_to_company, timeline, transition
from app.services.policies import PolicyEvaluator


def _student():
    return current_user.student


@api_bp.route('/student/dashboard', methods=['GET'])
@roles_required('student')
def student_dashboard():
    student = _student()
    applications = student.applications
    applied_ids = {a.company_id for a in applications}
    evaluator = PolicyEvaluator(student)

    # Upcoming drives the student is eligible for and hasn't applied to yet
    upcoming = [
        {**company_json(c), 'branches': ', '.join(c.get_branches_list())}
        for c in Company.query.filter_by(status='Upcoming').order_by(Company.visit_date).all()
        if c.id not in applied_ids and not evaluator.failures(c)
    ]

    return jsonify({
        'student': student_json(student),
        'application_stats': {
            'total': len(applications),
            'interview': sum(1 for a in applications if a.status == 'Interview'),
            'offered': sum(1 for a in applications if a.status in ('Offered', 'Accepted')),
        },
        'upcoming_drives': upcoming[:3],
    })


@api_bp.route('/student/companies', methods=['GET'])
@roles_required('student')
def student_companies():
    student = _student()
    statuses = {a.company_id: a.status for a in student.applications}
    evaluator = PolicyEvaluator(student)

    result = []
    for c in Company.query.order_by(Company.visit_date).all():
        failures = evaluator.failures(c)
        result.append({
            **company_json(c),
            'is_eligible': not failures,
            'ineligibility_reasons': failures,
            'application_status': statuses.get(c.id),
        })
    return jsonify(result)


@api_bp.route('/student/apply/<int:company_id>', methods=['POST'])
@roles_required('student')
def student_apply(company_id):
    company = db.get_or_404(Company, company_id)
    apply_to_company(_student(), company, user=current_user)
    return jsonify({'message': f'Successfully applied to {company.name}'}), 201


@api_bp.route('/student/applications', methods=['GET'])
@roles_required('student')
def student_applications():
    apps = sorted(_student().applications, key=lambda a: a.applied_date, reverse=True)
    return jsonify([application_json(a, allowed_transitions(a, 'student')) for a in apps])


@api_bp.route('/student/applications/<int:app_id>/respond', methods=['POST'])
@roles_required('student')
def respond_to_offer(app_id):
    """Accept or decline an offer."""
    application = db.get_or_404(Application, app_id)
    if application.student_id != _student().id:
        return jsonify({'error': 'Not found'}), 404
    new_status = (request.get_json() or {}).get('status')
    transition(application, new_status, actor='student', user=current_user)
    return jsonify({'message': f'Offer {new_status.lower()}.', 'application': application_json(application)})


@api_bp.route('/student/applications/<int:app_id>/timeline', methods=['GET'])
@roles_required('student')
def student_application_timeline(app_id):
    application = db.get_or_404(Application, app_id)
    if application.student_id != _student().id:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(timeline(application))


@api_bp.route('/student/profile', methods=['GET', 'PUT'])
@roles_required('student')
def student_profile():
    student = _student()
    if request.method == 'PUT':
        # Students may only edit contact details; CGPA and backlogs are set by the college
        update_student(student, request.get_json() or {}, academic=False)
        return jsonify({'message': 'Profile updated successfully.', 'profile': student_json(student)})
    return jsonify(student_json(student))
