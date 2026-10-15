"""
Admin Routes — CRUD for Students, Companies, Applications, Results
"""
from functools import wraps
from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from werkzeug.security import generate_password_hash
from app.extensions import db
from app.models import User, Student, Company, Application, Result
from sqlalchemy import text
from datetime import date

admin_bp = Blueprint('admin', __name__)


def admin_required(f):
    """Decorator: restrict route to admin users only."""
    @wraps(f)
    @login_required
    def decorated(*args, **kwargs):
        if not current_user.is_admin():
            flash('Access denied. Admin privileges required.', 'error')
            return redirect(url_for('auth.index'))
        return f(*args, **kwargs)
    return decorated


# ─── Dashboard ───────────────────────────────────────────────
@admin_bp.route('/dashboard')
@admin_required
def dashboard():
    """Admin dashboard with summary statistics."""
    total_students = Student.query.count()
    placed_students = Student.query.filter_by(placement_status='Placed').count()
    unplaced_students = total_students - placed_students
    total_companies = Company.query.count()
    total_applications = Application.query.count()
    total_offers = Result.query.filter_by(result='Selected').count()

    # Recent applications
    recent_apps = (
        Application.query
        .order_by(Application.created_at.desc())
        .limit(5)
        .all()
    )

    return render_template('admin/dashboard.html',
                           total_students=total_students,
                           placed_students=placed_students,
                           unplaced_students=unplaced_students,
                           total_companies=total_companies,
                           total_applications=total_applications,
                           total_offers=total_offers,
                           recent_apps=recent_apps)


# ─── Student CRUD ────────────────────────────────────────────
@admin_bp.route('/students')
@admin_required
def students():
    """List all students."""
    all_students = Student.query.order_by(Student.name).all()
    return render_template('admin/students.html', students=all_students)


@admin_bp.route('/students/add', methods=['GET', 'POST'])
@admin_required
def add_student():
    """Add a new student (admin creates user + profile)."""
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip()
        password = request.form.get('password', 'student123')
        name = request.form.get('name', '').strip()
        roll_no = request.form.get('roll_no', '').strip()
        phone = request.form.get('phone', '').strip()
        branch = request.form.get('branch', '')
        cgpa = request.form.get('cgpa', '')
        backlogs = request.form.get('backlogs', '0')

        try:
            # Create user
            user = User(
                username=username,
                email=email,
                password_hash=generate_password_hash(password),
                role='student'
            )
            db.session.add(user)
            db.session.flush()

            # Create student profile
            student = Student(
                user_id=user.id,
                roll_no=roll_no,
                name=name,
                email=email,
                phone=phone if phone else None,
                branch=branch,
                cgpa=float(cgpa),
                backlogs=int(backlogs)
            )
            db.session.add(student)
            db.session.commit()
            flash(f'Student "{name}" added successfully.', 'success')
            return redirect(url_for('admin.students'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error adding student: {str(e)}', 'error')

    return render_template('admin/student_form.html', student=None, action='Add')


@admin_bp.route('/students/edit/<int:student_id>', methods=['GET', 'POST'])
@admin_required
def edit_student(student_id):
    """Edit an existing student."""
    student = Student.query.get_or_404(student_id)

    if request.method == 'POST':
        try:
            student.name = request.form.get('name', '').strip()
            student.email = request.form.get('email', '').strip()
            student.phone = request.form.get('phone', '').strip() or None
            student.roll_no = request.form.get('roll_no', '').strip()
            student.branch = request.form.get('branch', '')
            student.cgpa = float(request.form.get('cgpa', 0))
            student.backlogs = int(request.form.get('backlogs', 0))
            student.placement_status = request.form.get('placement_status', 'Unplaced')

            # Also update the linked user's email
            student.user.email = student.email

            db.session.commit()
            flash(f'Student "{student.name}" updated successfully.', 'success')
            return redirect(url_for('admin.students'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error updating student: {str(e)}', 'error')

    return render_template('admin/student_form.html', student=student, action='Edit')


@admin_bp.route('/students/delete/<int:student_id>', methods=['POST'])
@admin_required
def delete_student(student_id):
    """Delete a student and their user account."""
    student = Student.query.get_or_404(student_id)
    name = student.name
    try:
        user = student.user
        db.session.delete(student)
        db.session.delete(user)
        db.session.commit()
        flash(f'Student "{name}" deleted successfully.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error deleting student: {str(e)}', 'error')
    return redirect(url_for('admin.students'))


# ─── Company CRUD ────────────────────────────────────────────
@admin_bp.route('/companies')
@admin_required
def companies():
    """List all companies."""
    all_companies = Company.query.order_by(Company.visit_date.desc()).all()
    return render_template('admin/companies.html', companies=all_companies)


@admin_bp.route('/companies/add', methods=['GET', 'POST'])
@admin_required
def add_company():
    """Add a new company."""
    if request.method == 'POST':
        try:
            branches = request.form.getlist('branches')
            company = Company(
                name=request.form.get('name', '').strip(),
                description=request.form.get('description', '').strip(),
                role_offered=request.form.get('role_offered', '').strip(),
                package_lpa=float(request.form.get('package_lpa', 0)),
                min_cgpa=float(request.form.get('min_cgpa', 0)),
                max_backlogs=int(request.form.get('max_backlogs', 0)),
                allowed_branches=','.join(branches) if branches else 'CSE,ECE,ME,CE,EE,CHE',
                visit_date=request.form.get('visit_date') or None,
                status=request.form.get('status', 'Upcoming')
            )
            db.session.add(company)
            db.session.commit()
            flash(f'Company "{company.name}" added successfully.', 'success')
            return redirect(url_for('admin.companies'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error adding company: {str(e)}', 'error')

    return render_template('admin/company_form.html', company=None, action='Add')


@admin_bp.route('/companies/edit/<int:company_id>', methods=['GET', 'POST'])
@admin_required
def edit_company(company_id):
    """Edit an existing company."""
    company = Company.query.get_or_404(company_id)

    if request.method == 'POST':
        try:
            branches = request.form.getlist('branches')
            company.name = request.form.get('name', '').strip()
            company.description = request.form.get('description', '').strip()
            company.role_offered = request.form.get('role_offered', '').strip()
            company.package_lpa = float(request.form.get('package_lpa', 0))
            company.min_cgpa = float(request.form.get('min_cgpa', 0))
            company.max_backlogs = int(request.form.get('max_backlogs', 0))
            company.allowed_branches = ','.join(branches) if branches else 'CSE,ECE,ME,CE,EE,CHE'
            company.visit_date = request.form.get('visit_date') or None
            company.status = request.form.get('status', 'Upcoming')

            db.session.commit()
            flash(f'Company "{company.name}" updated successfully.', 'success')
            return redirect(url_for('admin.companies'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error updating company: {str(e)}', 'error')

    return render_template('admin/company_form.html', company=company, action='Edit')


@admin_bp.route('/companies/delete/<int:company_id>', methods=['POST'])
@admin_required
def delete_company(company_id):
    """Delete a company."""
    company = Company.query.get_or_404(company_id)
    name = company.name
    try:
        db.session.delete(company)
        db.session.commit()
        flash(f'Company "{name}" deleted successfully.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error deleting company: {str(e)}', 'error')
    return redirect(url_for('admin.companies'))


# ─── Applications ────────────────────────────────────────────
@admin_bp.route('/applications')
@admin_required
def applications():
    """View all applications with student and company details."""
    all_apps = (
        Application.query
        .join(Student)
        .join(Company)
        .order_by(Application.applied_date.desc())
        .all()
    )
    return render_template('admin/applications.html', applications=all_apps)


@admin_bp.route('/applications/update-status/<int:app_id>', methods=['POST'])
@admin_required
def update_application_status(app_id):
    """Update application status (Shortlisted, Interview, etc.)."""
    application = Application.query.get_or_404(app_id)
    new_status = request.form.get('status', '')
    if new_status in ['Applied', 'Shortlisted', 'Interview', 'Offered', 'Rejected']:
        application.status = new_status
        db.session.commit()
        flash(f'Application status updated to "{new_status}".', 'success')
    else:
        flash('Invalid status.', 'error')
    return redirect(url_for('admin.applications'))


# ─── Results ─────────────────────────────────────────────────
@admin_bp.route('/results')
@admin_required
def results():
    """View all results and record new ones."""
    all_results = (
        Result.query
        .join(Application)
        .join(Student)
        .join(Company)
        .order_by(Result.created_at.desc())
        .all()
    )
    # Applications without a result yet
    pending_apps = (
        Application.query
        .filter(~Application.id.in_(
            db.session.query(Result.application_id)
        ))
        .join(Student)
        .join(Company)
        .all()
    )
    return render_template('admin/results.html',
                           results=all_results,
                           pending_apps=pending_apps)


@admin_bp.route('/results/record', methods=['POST'])
@admin_required
def record_result():
    """Record a placement result using the stored procedure."""
    app_id = request.form.get('application_id', type=int)
    result_val = request.form.get('result', '')
    offer_date = request.form.get('offer_date', '')
    remarks = request.form.get('remarks', '').strip()

    if not app_id or result_val not in ['Selected', 'Not Selected']:
        flash('Invalid input. Please select an application and result.', 'error')
        return redirect(url_for('admin.results'))

    try:
        # Try calling the stored procedure first
        try:
            db.session.execute(
                text("CALL record_result(:app_id, :result, :offer_date, :remarks)"),
                {
                    'app_id': app_id,
                    'result': result_val,
                    'offer_date': offer_date if offer_date else None,
                    'remarks': remarks if remarks else None
                }
            )
            db.session.commit()
        except Exception:
            # Fallback: direct insert if stored procedure doesn't exist
            db.session.rollback()

            existing = Result.query.filter_by(application_id=app_id).first()
            if existing:
                flash('A result has already been recorded for this application.', 'error')
                return redirect(url_for('admin.results'))

            new_result = Result(
                application_id=app_id,
                result=result_val,
                offer_date=offer_date if offer_date else None,
                remarks=remarks if remarks else None
            )
            db.session.add(new_result)

            # Manually update statuses (mimicking the trigger)
            application = Application.query.get(app_id)
            if result_val == 'Selected':
                application.status = 'Offered'
                application.student.placement_status = 'Placed'
            else:
                application.status = 'Rejected'

            db.session.commit()

        flash(f'Result recorded: {result_val}', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error recording result: {str(e)}', 'error')

    return redirect(url_for('admin.results'))
