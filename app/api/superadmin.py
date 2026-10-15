"""Super admin endpoints: manage colleges across the whole platform."""
from flask import jsonify, request
from sqlalchemy import func

from app.api import api_bp
from app.extensions import db
from app.models import College, Company, Student
from app.security import roles_required
from app.services.accounts import create_college

super_only = roles_required('super_admin')


def _college_json(college, students=0, placed=0, companies=0):
    return {
        'id': college.id,
        'name': college.name,
        'code': college.code,
        'created_at': college.created_at.isoformat() if college.created_at else None,
        'students': students,
        'placed': placed,
        'companies': companies,
    }


@api_bp.route('/super/colleges', methods=['GET'])
@super_only
def super_colleges():
    placed = func.sum(db.case((Student.placement_status == 'Placed', 1), else_=0))
    student_counts = {cid: (total, int(p or 0)) for cid, total, p in db.session.execute(
        db.select(Student.college_id, func.count(Student.id), placed).group_by(Student.college_id))}
    company_counts = dict(db.session.execute(
        db.select(Company.college_id, func.count(Company.id)).group_by(Company.college_id)).all())

    result = []
    for college in College.query.order_by(College.name).all():
        total, placed_count = student_counts.get(college.id, (0, 0))
        result.append(_college_json(college, total, placed_count, company_counts.get(college.id, 0)))
    return jsonify(result)


@api_bp.route('/super/colleges', methods=['POST'])
@super_only
def super_create_college():
    return jsonify(_college_json(create_college(request.get_json() or {}))), 201
