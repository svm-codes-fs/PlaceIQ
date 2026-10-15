"""
Student Routes — Dashboard, Eligible Companies, Apply, My Applications
"""
from functools import wraps
from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from app.extensions import db
from app.models import Student, Company, Application, Result
from sqlalchemy import text

student_bp = Blueprint('student', __name__)


def student_required(f):
    @wraps(f)
    @login_required
    def decorated(*args, **kwargs):
        if current_user.is_admin():
            flash('This page is for students only.', 'warning')
            return redirect(url_for('admin.dashboard'))
        if not current_user.student:
            flash('No student profile found.', 'error')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated


@student_bp.route('/dashboard')
@student_required
def dashboard():
    student = current_user.student
    my_apps = Application.query.filter_by(student_id=student.id).join(Company).order_by(Application.applied_date.desc()).all()
    total_apps = len(my_apps)
    offers = sum(1 for a in my_apps if a.status == 'Offered')
    pending = sum(1 for a in my_apps if a.status in ('Applied', 'Shortlisted', 'Interview'))
    return render_template('student/dashboard.html', student=student, applications=my_apps, total_apps=total_apps, offers=offers, pending=pending)


@student_bp.route('/companies')
@student_required
def companies():
    student = current_user.student
    eligible_companies = []
    try:
        result = db.session.execute(text("CALL get_eligible_companies(:sid)"), {'sid': student.id})
        rows = result.fetchall()
        columns = result.keys()
        eligible_companies = [dict(zip(columns, row)) for row in rows]
    except Exception:
        all_companies = Company.query.all()
        applied_ids = {a.company_id for a in student.applications}
        for c in all_companies:
            if (student.placement_status == 'Unplaced'
                    and float(student.cgpa) >= float(c.min_cgpa)
                    and student.backlogs <= c.max_backlogs
                    and student.branch in c.get_branches_list()
                    and c.id not in applied_ids):
                eligible_companies.append(c)

    applied_companies = Application.query.filter_by(student_id=student.id).join(Company).all()
    return render_template('student/companies.html', student=student, eligible_companies=eligible_companies, applied_companies=applied_companies)


@student_bp.route('/apply/<int:company_id>', methods=['POST'])
@student_required
def apply(company_id):
    student = current_user.student
    try:
        try:
            db.session.execute(text("CALL apply_to_company(:sid, :cid)"), {'sid': student.id, 'cid': company_id})
            db.session.commit()
        except Exception as sp_error:
            db.session.rollback()
            error_msg = str(sp_error)
            if 'does not exist' in error_msg.lower() or '1305' in error_msg:
                company = Company.query.get_or_404(company_id)
                existing = Application.query.filter_by(student_id=student.id, company_id=company_id).first()
                if existing:
                    flash('You have already applied to this company.', 'warning')
                    return redirect(url_for('student.companies'))
                if student.placement_status == 'Placed':
                    flash('You are already placed.', 'warning')
                    return redirect(url_for('student.companies'))
                if float(student.cgpa) < float(company.min_cgpa):
                    flash('Your CGPA does not meet the minimum requirement.', 'error')
                    return redirect(url_for('student.companies'))
                if student.backlogs > company.max_backlogs:
                    flash('You have too many backlogs.', 'error')
                    return redirect(url_for('student.companies'))
                if student.branch not in company.get_branches_list():
                    flash('Your branch is not eligible.', 'error')
                    return redirect(url_for('student.companies'))
                app_record = Application(student_id=student.id, company_id=company_id, status='Applied')
                db.session.add(app_record)
                db.session.commit()
            else:
                flash('You are not eligible for this company.', 'error')
                return redirect(url_for('student.companies'))
        flash('Application submitted successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error: {str(e)}', 'error')
    return redirect(url_for('student.companies'))


@student_bp.route('/applications')
@student_required
def my_applications():
    student = current_user.student
    apps = Application.query.filter_by(student_id=student.id).join(Company).order_by(Application.applied_date.desc()).all()
    return render_template('student/my_applications.html', student=student, applications=apps)


@student_bp.route('/profile', methods=['GET', 'POST'])
@student_required
def profile():
    student = current_user.student
    if request.method == 'POST':
        try:
            student.phone = request.form.get('phone', '').strip() or None
            db.session.commit()
            flash('Profile updated.', 'success')
        except Exception as e:
            db.session.rollback()
            flash(f'Error: {str(e)}', 'error')
    return render_template('student/profile.html', student=student)
