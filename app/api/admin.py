from flask import jsonify, request

from app.api import api_bp, role_required
from app.extensions import db
from app.models import Student, Company, Application, Result
from app.services import reports
from app.services.applications import ApplicationError, update_status


@api_bp.route('/admin/dashboard', methods=['GET'])
@role_required('admin')
def admin_dashboard():
    recent_apps = Application.query.order_by(Application.applied_date.desc()).limit(5).all()
    recent = [{
        'id': a.id,
        'student_name': a.student.name,
        'company_name': a.company.name,
        'status': a.status,
        'date': a.applied_date.isoformat()
    } for a in recent_apps]

    return jsonify({'stats': reports.overview_stats(), 'recent_applications': recent})


@api_bp.route('/admin/students', methods=['GET'])
@role_required('admin')
def admin_students():
    return jsonify([{
        'id': s.id,
        'roll_no': s.roll_no,
        'name': s.name,
        'email': s.email,
        'branch': s.branch,
        'cgpa': float(s.cgpa),
        'backlogs': s.backlogs,
        'placement_status': s.placement_status
    } for s in Student.query.all()])


@api_bp.route('/admin/companies', methods=['GET'])
@role_required('admin')
def admin_companies():
    return jsonify([{
        'id': c.id,
        'name': c.name,
        'role_offered': c.role_offered,
        'package_lpa': float(c.package_lpa),
        'status': c.status,
        'visit_date': c.visit_date.isoformat() if c.visit_date else None,
        'min_cgpa': float(c.min_cgpa)
    } for c in Company.query.all()])


@api_bp.route('/admin/applications', methods=['GET'])
@role_required('admin')
def admin_applications():
    return jsonify([{
        'id': a.id,
        'student_name': a.student.name,
        'student_roll': a.student.roll_no,
        'company_name': a.company.name,
        'role_offered': a.company.role_offered,
        'status': a.status,
        'applied_date': a.applied_date.isoformat(),
        'result': a.result.result if a.result else None
    } for a in Application.query.all()])


@api_bp.route('/admin/applications/<int:app_id>/status', methods=['POST'])
@role_required('admin')
def update_application_status(app_id):
    data = request.get_json() or {}
    application = db.get_or_404(Application, app_id)
    try:
        update_status(application, data.get('status'))
    except ApplicationError as e:
        return jsonify({'error': e.message}), 400
    return jsonify({'message': 'Status updated successfully'})


@api_bp.route('/admin/results', methods=['GET'])
@role_required('admin')
def admin_results():
    return jsonify([{
        'id': r.id,
        'student_name': r.application.student.name,
        'student_roll': r.application.student.roll_no,
        'branch': r.application.student.branch,
        'company_name': r.application.company.name,
        'role_offered': r.application.company.role_offered,
        'package_lpa': float(r.application.company.package_lpa),
        'offer_date': r.offer_date.isoformat() if r.offer_date else None
    } for r in Result.query.filter_by(result='Selected').all()])


@api_bp.route('/admin/reports', methods=['GET'])
@role_required('admin')
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
