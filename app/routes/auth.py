"""
Authentication Routes — Login, Register, Logout
"""
from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from app import db
from app.models import User, Student

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/')
def index():
    """Redirect to appropriate dashboard based on role."""
    if current_user.is_authenticated:
        if current_user.is_admin():
            return redirect(url_for('admin.dashboard'))
        else:
            return redirect(url_for('student.dashboard'))
    return redirect(url_for('auth.login'))


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """User login page."""
    if current_user.is_authenticated:
        return redirect(url_for('auth.index'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')

        if not username or not password:
            flash('Please enter both username and password.', 'error')
            return render_template('auth/login.html')

        user = User.query.filter_by(username=username).first()

        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            flash(f'Welcome back, {username}!', 'success')

            # Redirect to the page they were trying to access
            next_page = request.args.get('next')
            if next_page:
                return redirect(next_page)

            if user.is_admin():
                return redirect(url_for('admin.dashboard'))
            else:
                return redirect(url_for('student.dashboard'))
        else:
            flash('Invalid username or password.', 'error')

    return render_template('auth/login.html')


@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """Student self-registration."""
    if current_user.is_authenticated:
        return redirect(url_for('auth.index'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        confirm = request.form.get('confirm_password', '')
        name = request.form.get('name', '').strip()
        roll_no = request.form.get('roll_no', '').strip()
        phone = request.form.get('phone', '').strip()
        branch = request.form.get('branch', '')
        cgpa = request.form.get('cgpa', '')
        backlogs = request.form.get('backlogs', '0')

        # Validation
        errors = []
        if not all([username, email, password, name, roll_no, branch, cgpa]):
            errors.append('All required fields must be filled.')
        if password != confirm:
            errors.append('Passwords do not match.')
        if len(password) < 6:
            errors.append('Password must be at least 6 characters.')
        if User.query.filter_by(username=username).first():
            errors.append('Username already exists.')
        if User.query.filter_by(email=email).first():
            errors.append('Email already registered.')
        if Student.query.filter_by(roll_no=roll_no).first():
            errors.append('Roll number already registered.')

        try:
            cgpa_val = float(cgpa)
            if cgpa_val < 0 or cgpa_val > 10:
                errors.append('CGPA must be between 0.00 and 10.00.')
        except ValueError:
            errors.append('Invalid CGPA value.')
            cgpa_val = 0

        try:
            backlogs_val = int(backlogs)
            if backlogs_val < 0:
                errors.append('Backlogs cannot be negative.')
        except ValueError:
            errors.append('Invalid backlogs value.')
            backlogs_val = 0

        if errors:
            for error in errors:
                flash(error, 'error')
            return render_template('auth/register.html')

        # Create user and student profile
        user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password),
            role='student'
        )
        db.session.add(user)
        db.session.flush()  # Get the user.id

        student = Student(
            user_id=user.id,
            roll_no=roll_no,
            name=name,
            email=email,
            phone=phone if phone else None,
            branch=branch,
            cgpa=cgpa_val,
            backlogs=backlogs_val
        )
        db.session.add(student)
        db.session.commit()

        flash('Registration successful! Please log in.', 'success')
        return redirect(url_for('auth.login'))

    return render_template('auth/register.html')


@auth_bp.route('/logout')
@login_required
def logout():
    """Log out the current user."""
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('auth.login'))
