"""College admin endpoints. Every query here is limited to the admin's college by app/tenancy.py."""
from flask import jsonify, request
from flask_jwt_extended import current_user

from app.api import api_bp
from app.api.serializers import application_json, company_json, student_json
from app.extensions import db
from app.models import Application, Company, Student
from app.security import roles_required
from app.services import reports
from app.services.accounts import create_student, update_student
from app.services.applications import allowed_transitions, timeline, transition
from app.services.companies import create_company, eligible_students, update_company
from app.services.policies import list_policies, save_policy
from app.tenancy import current_college_id

admin_only = roles_required('college_admin')


@api_bp.route('/admin/dashboard', methods=['GET'])
@admin_only
def admin_dashboard():
    recent_apps = Application.query.order_by(Application.applied_date.desc()).limit(5).all()
    recent = [{
        'id': a.id,
        'student_name': a.student.name,
        'company_name': a.company.name,
        'status': a.status,
        'date': a.applied_date.isoformat()
    } for a in recent_apps]
    return jsonify({'stats': reports.overview_stats(), 'funnel': reports.status_funnel(),
                    'recent_applications': recent})


# ---- Students ---------------------------------------------------------------

@api_bp.route('/admin/students', methods=['GET'])
@admin_only
def admin_students():
    return jsonify([student_json(s) for s in Student.query.order_by(Student.roll_no).all()])


@api_bp.route('/admin/students', methods=['POST'])
@admin_only
def admin_create_student():
    student = create_student(current_college_id(), request.get_json() or {})
    return jsonify(student_json(student)), 201


@api_bp.route('/admin/students/<int:student_id>', methods=['PUT'])
@admin_only
def admin_update_student(student_id):
    student = update_student(db.get_or_404(Student, student_id), request.get_json() or {})
    return jsonify(student_json(student))


@api_bp.route('/admin/students/<int:student_id>', methods=['DELETE'])
@admin_only
def admin_delete_student(student_id):
    student = db.get_or_404(Student, student_id)
    db.session.delete(student.user)  # cascades to the profile and applications
    db.session.commit()
    return jsonify({'message': f'Deleted {student.name}.'})


# ---- Companies --------------------------------------------------------------

@api_bp.route('/admin/companies', methods=['GET'])
@admin_only
def admin_companies():
    return jsonify([company_json(c) for c in Company.query.order_by(Company.visit_date).all()])


@api_bp.route('/admin/companies', methods=['POST'])
@admin_only
def admin_create_company():
    return jsonify(company_json(create_company(request.get_json() or {}))), 201


@api_bp.route('/admin/companies/<int:company_id>', methods=['PUT'])
@admin_only
def admin_update_company(company_id):
    company = update_company(db.get_or_404(Company, company_id), request.get_json() or {})
    return jsonify(company_json(company))


@api_bp.route('/admin/companies/<int:company_id>', methods=['DELETE'])
@admin_only
def admin_delete_company(company_id):
    company = db.get_or_404(Company, company_id)
    db.session.delete(company)
    db.session.commit()
    return jsonify({'message': f'Deleted {company.name}.'})


@api_bp.route('/admin/companies/<int:company_id>/eligible', methods=['GET'])
@admin_only
def admin_company_eligible(company_id):
    company = db.get_or_404(Company, company_id)
    return jsonify({'company': company_json(company),
                    'students': [student_json(s) for s in eligible_students(company)]})


# ---- Applications -----------------------------------------------------------

@api_bp.route('/admin/applications', methods=['GET'])
@admin_only
def admin_applications():
    apps = Application.query.order_by(Application.applied_date.desc()).all()
    return jsonify([application_json(a, allowed_transitions(a, 'admin')) for a in apps])


@api_bp.route('/admin/applications/<int:app_id>/status', methods=['POST'])
@admin_only
def update_application_status(app_id):
    application = db.get_or_404(Application, app_id)
    data = request.get_json() or {}
    transition(application, data.get('status'), actor='admin', user=current_user, note=data.get('note'))
    return jsonify({'message': 'Status updated successfully',
                    'application': application_json(application, allowed_transitions(application, 'admin'))})


@api_bp.route('/admin/applications/<int:app_id>/timeline', methods=['GET'])
@admin_only
def admin_application_timeline(app_id):
    return jsonify(timeline(db.get_or_404(Application, app_id)))


# ---- Placement policies -----------------------------------------------------

@api_bp.route('/admin/policies', methods=['GET'])
@admin_only
def admin_policies():
    return jsonify(list_policies())


@api_bp.route('/admin/policies/<rule_type>', methods=['PUT'])
@admin_only
def admin_save_policy(rule_type):
    save_policy(rule_type, request.get_json() or {})
    return jsonify(list_policies())


@api_bp.route('/admin/results', methods=['GET'])
@admin_only
def admin_results():
    """Offers made: accepted, pending and declined."""
    apps = (Application.query.filter(Application.status.in_(('Offered', 'Accepted', 'Declined', 'Expired')))
            .order_by(Application.offer_date.desc()).all())
    return jsonify([application_json(a) for a in apps])


@api_bp.route('/admin/reports', methods=['GET'])
@admin_only
def admin_reports():
    stats = reports.overview_stats()
    return jsonify({
        'overview': {
            'total_students': stats['total_students'],
            'placed_students': stats['placed_students'],
            'overall_rate': stats['placement_rate']
        },
        'branch_metrics': reports.branch_metrics()
    })
