from flask import jsonify, request
from flask_login import current_user

from app.api import api_bp, role_required
from app.extensions import db
from app.models import Company, Application
from app.services.applications import ApplicationError, apply_to_company
from app.services.eligibility import eligibility_failures, is_eligible


def _current_student():
    return current_user.student


@api_bp.route('/student/dashboard', methods=['GET'])
@role_required('student')
def student_dashboard():
    student = _current_student()
    if not student:
        return jsonify({'error': 'Student profile not found'}), 404

    applications = Application.query.filter_by(student_id=student.id).all()
    applied_ids = {a.company_id for a in applications}

    # Upcoming drives the student is eligible for
    upcoming_drives = [{
        'id': c.id,
        'name': c.name,
        'role_offered': c.role_offered,
        'package_lpa': float(c.package_lpa),
        'visit_date': c.visit_date.isoformat() if c.visit_date else None,
        'has_applied': c.id in applied_ids
    } for c in Company.query.filter_by(status='Upcoming').all() if is_eligible(student, c)]

    return jsonify({
        'student': {
            'name': student.name,
            'placement_status': student.placement_status,
            'cgpa': float(student.cgpa),
            'branch': student.branch
        },
        'stats': {
            'applications': len(applications),
            'interviews': sum(1 for a in applications if a.status == 'Interview'),
            'offers': sum(1 for a in applications
                          if a.status == 'Offered' or (a.result and a.result.result == 'Selected'))
        },
        'upcoming_drives': upcoming_drives[:3]  # Limit to 3 for dashboard
    })


@api_bp.route('/student/companies', methods=['GET'])
@role_required('student')
def student_companies():
    student = _current_student()
    statuses = {a.company_id: a.status for a in Application.query.filter_by(student_id=student.id).all()}

    result = []
    for c in Company.query.all():
        failures = eligibility_failures(student, c)
        result.append({
            'id': c.id,
            'name': c.name,
            'description': c.description,
            'role_offered': c.role_offered,
            'package_lpa': float(c.package_lpa),
            'min_cgpa': float(c.min_cgpa),
            'max_backlogs': c.max_backlogs,
            'allowed_branches': c.allowed_branches,
            'visit_date': c.visit_date.isoformat() if c.visit_date else None,
            'status': c.status,
            'is_eligible': not failures,
            'ineligibility_reasons': failures,
            'application_status': statuses.get(c.id)
        })
    return jsonify(result)


@api_bp.route('/student/apply/<int:company_id>', methods=['POST'])
@role_required('student')
def student_apply(company_id):
    company = db.get_or_404(Company, company_id)
    try:
        apply_to_company(_current_student(), company)
    except ApplicationError as e:
        return jsonify({'error': e.message, 'reasons': e.reasons}), 400
    return jsonify({'message': f'Successfully applied to {company.name}'})


@api_bp.route('/student/applications', methods=['GET'])
@role_required('student')
def student_applications():
    student = _current_student()
    result = []
    for a in Application.query.filter_by(student_id=student.id).all():
        res = a.result
        result.append({
            'id': a.id,
            'company_name': a.company.name,
            'role_offered': a.company.role_offered,
            'package_lpa': float(a.company.package_lpa),
            'applied_date': a.applied_date.isoformat(),
            'status': a.status,
            'result': res.result if res else None,
            'offer_date': res.offer_date.isoformat() if (res and res.offer_date) else None
        })
    return jsonify(result)


@api_bp.route('/student/profile', methods=['GET', 'POST'])
@role_required('student')
def student_profile():
    student = _current_student()

    if request.method == 'POST':
        data = request.get_json() or {}
        name = data.get('name', '').strip()
        phone = data.get('phone', '').strip()

        if not name:
            return jsonify({'error': 'Name is required.'}), 400

        try:
            cgpa_val = float(data.get('cgpa', ''))
            if cgpa_val < 0 or cgpa_val > 10:
                return jsonify({'error': 'CGPA must be between 0.00 and 10.00'}), 400
            student.cgpa = cgpa_val
        except (TypeError, ValueError):
            pass

        try:
            backlogs_val = int(data.get('backlogs', ''))
            if backlogs_val >= 0:
                student.backlogs = backlogs_val
        except (TypeError, ValueError):
            pass

        student.name = name
        student.phone = phone or None
        db.session.commit()
        return jsonify({'message': 'Profile updated successfully.'})

    return jsonify({
        'roll_no': student.roll_no,
        'name': student.name,
        'email': student.email,
        'phone': student.phone or '',
        'branch': student.branch,
        'cgpa': float(student.cgpa),
        'backlogs': student.backlogs,
        'placement_status': student.placement_status
    })
