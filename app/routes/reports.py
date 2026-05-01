"""
Reports Routes — Placement Reports & Eligibility Lists
"""
from flask import Blueprint, render_template, request
from flask_login import login_required
from app import db
from app.models import Student, Company, Application, Result
from sqlalchemy import text, func

reports_bp = Blueprint('reports', __name__)


@reports_bp.route('/placement')
@login_required
def placement_report():
    """Company-wise placement report using JOINs and aggregates."""
    report_data = []
    try:
        result = db.session.execute(text("CALL get_placement_report()"))
        rows = result.fetchall()
        columns = result.keys()
        report_data = [dict(zip(columns, row)) for row in rows]
    except Exception:
        # Fallback: ORM-based report
        companies = Company.query.all()
        for c in companies:
            apps = Application.query.filter_by(company_id=c.id).all()
            app_ids = [a.id for a in apps]
            selected = Result.query.filter(Result.application_id.in_(app_ids), Result.result == 'Selected').count() if app_ids else 0
            rejected = Result.query.filter(Result.application_id.in_(app_ids), Result.result == 'Not Selected').count() if app_ids else 0
            report_data.append({
                'company_id': c.id,
                'company_name': c.name,
                'role_offered': c.role_offered,
                'package_lpa': float(c.package_lpa),
                'total_applications': len(apps),
                'selected_count': selected,
                'rejected_count': rejected,
                'pending_count': len(apps) - selected - rejected
            })

    # Summary stats
    total_placed = Student.query.filter_by(placement_status='Placed').count()
    total_students = Student.query.count()
    total_companies = Company.query.count()

    return render_template('reports/placement_report.html',
                           report_data=report_data,
                           total_placed=total_placed,
                           total_students=total_students,
                           total_companies=total_companies)


@reports_bp.route('/eligibility/<int:company_id>')
@login_required
def eligibility_list(company_id):
    """List of eligible students for a specific company."""
    company = Company.query.get_or_404(company_id)
    eligible = []
    try:
        result = db.session.execute(text("CALL get_eligibility_list(:cid)"), {'cid': company_id})
        rows = result.fetchall()
        columns = result.keys()
        eligible = [dict(zip(columns, row)) for row in rows]
    except Exception:
        branches = company.get_branches_list()
        eligible = Student.query.filter(
            Student.cgpa >= company.min_cgpa,
            Student.backlogs <= company.max_backlogs,
            Student.branch.in_(branches),
            Student.placement_status == 'Unplaced'
        ).order_by(Student.cgpa.desc()).all()

    return render_template('reports/eligibility_list.html',
                           company=company, eligible=eligible)
