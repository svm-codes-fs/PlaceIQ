from flask import Blueprint, jsonify, request
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash, generate_password_hash
from app import db
from app.models import User, Student, Company, Application, Result

api_bp = Blueprint('api', __name__)

@api_bp.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': 'Please enter both username and password.'}), 400

    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password_hash, password):
        login_user(user)
        return jsonify({
            'message': f'Welcome back, {username}!',
            'user': {
                'id': user.id,
                'username': user.username,
                'role': user.role
            }
        })
    else:
        return jsonify({'error': 'Invalid username or password.'}), 401

@api_bp.route('/auth/me', methods=['GET'])
def get_me():
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'role': current_user.role
            }
        })
    return jsonify({'authenticated': False}), 401

@api_bp.route('/auth/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully.'})

@api_bp.route('/student/dashboard', methods=['GET'])
@login_required
def student_dashboard():
    if current_user.role != 'student':
        return jsonify({'error': 'Unauthorized'}), 403
    
    student = current_user.student
    if not student:
        return jsonify({'error': 'Student profile not found'}), 404

    applications = Application.query.filter_by(student_id=student.id).all()
    
    apps_count = len(applications)
    interviews_count = sum(1 for a in applications if a.status == 'Interview')
    offers_count = sum(1 for a in applications if a.status == 'Offered' or (a.result and a.result.result == 'Selected'))
    
    # Upcoming drives (eligible companies)
    companies = Company.query.filter_by(status='Upcoming').all()
    upcoming_drives = []
    
    for c in companies:
        is_eligible = (
            student.cgpa >= c.min_cgpa and 
            student.backlogs <= c.max_backlogs and 
            student.branch in c.get_branches_list()
        )
        if is_eligible:
            has_applied = any(a.company_id == c.id for a in applications)
            upcoming_drives.append({
                'id': c.id,
                'name': c.name,
                'role_offered': c.role_offered,
                'package_lpa': float(c.package_lpa),
                'visit_date': c.visit_date.isoformat() if c.visit_date else None,
                'has_applied': has_applied
            })

    return jsonify({
        'student': {
            'name': student.name,
            'placement_status': student.placement_status,
            'cgpa': float(student.cgpa),
            'branch': student.branch
        },
        'stats': {
            'applications': apps_count,
            'interviews': interviews_count,
            'offers': offers_count
        },
        'upcoming_drives': upcoming_drives[:3] # Limit to 3 for dashboard
    })

@api_bp.route('/student/companies', methods=['GET'])
@login_required
def student_companies():
    if current_user.role != 'student':
        return jsonify({'error': 'Unauthorized'}), 403
        
    student = current_user.student
    companies = Company.query.all()
    applications = {app.company_id: app.status for app in Application.query.filter_by(student_id=student.id).all()}
    
    result = []
    for c in companies:
        is_eligible = (
            student.cgpa >= c.min_cgpa and 
            student.backlogs <= c.max_backlogs and 
            student.branch in c.get_branches_list()
        )
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
            'is_eligible': is_eligible,
            'application_status': applications.get(c.id)
        })
        
    return jsonify(result)

@api_bp.route('/student/apply/<int:company_id>', methods=['POST'])
@login_required
def student_apply(company_id):
    if current_user.role != 'student':
        return jsonify({'error': 'Unauthorized'}), 403
        
    student = current_user.student
    company = Company.query.get_or_404(company_id)
    
    if company.status != 'Upcoming':
        return jsonify({'error': 'Drive is not accepting applications.'}), 400
        
    is_eligible = (
        student.cgpa >= company.min_cgpa and 
        student.backlogs <= company.max_backlogs and 
        student.branch in company.get_branches_list()
    )
    if not is_eligible:
        return jsonify({'error': 'You do not meet the eligibility criteria.'}), 400
        
    existing_app = Application.query.filter_by(student_id=student.id, company_id=company.id).first()
    if existing_app:
        return jsonify({'error': 'You have already applied.'}), 400
        
    new_app = Application(student_id=student.id, company_id=company.id)
    db.session.add(new_app)
    db.session.commit()
    
    return jsonify({'message': f'Successfully applied to {company.name}'})

@api_bp.route('/student/applications', methods=['GET'])
@login_required
def student_applications():
    if current_user.role != 'student':
        return jsonify({'error': 'Unauthorized'}), 403
        
    student = current_user.student
    applications = Application.query.filter_by(student_id=student.id).all()
    
    result = []
    for app in applications:
        res = app.result
        result.append({
            'id': app.id,
            'company_name': app.company.name,
            'role_offered': app.company.role_offered,
            'package_lpa': float(app.company.package_lpa),
            'applied_date': app.applied_date.isoformat(),
            'status': app.status,
            'result': res.result if res else None,
            'offer_date': res.offer_date.isoformat() if (res and res.offer_date) else None
        })
        
    return jsonify(result)

@api_bp.route('/student/profile', methods=['GET', 'POST'])
@login_required
def student_profile():
    if current_user.role != 'student':
        return jsonify({'error': 'Unauthorized'}), 403
        
    student = current_user.student
    
    if request.method == 'POST':
        data = request.get_json() or {}
        
        name = data.get('name', '').strip()
        phone = data.get('phone', '').strip()
        cgpa = data.get('cgpa', '')
        backlogs = data.get('backlogs', '')
        
        if not name:
            return jsonify({'error': 'Name is required.'}), 400
            
        try:
            cgpa_val = float(cgpa)
            if cgpa_val < 0 or cgpa_val > 10:
                return jsonify({'error': 'CGPA must be between 0.00 and 10.00'}), 400
            student.cgpa = cgpa_val
        except ValueError:
            pass
            
        try:
            backlogs_val = int(backlogs)
            if backlogs_val >= 0:
                student.backlogs = backlogs_val
        except ValueError:
            pass
            
        student.name = name
        student.phone = phone if phone else None
        
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

@api_bp.route('/admin/dashboard', methods=['GET'])
@login_required
def admin_dashboard():
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    total_students = Student.query.count()
    placed_students = Student.query.filter_by(placement_status='Placed').count()
    total_companies = Company.query.count()
    total_applications = Application.query.count()
    
    placement_rate = round((placed_students / total_students * 100) if total_students > 0 else 0, 1)
    
    # Recent Applications
    recent_apps = Application.query.order_by(Application.applied_date.desc()).limit(5).all()
    recent = [{
        'id': a.id,
        'student_name': a.student.name,
        'company_name': a.company.name,
        'status': a.status,
        'date': a.applied_date.isoformat()
    } for a in recent_apps]
    
    return jsonify({
        'stats': {
            'total_students': total_students,
            'placed_students': placed_students,
            'total_companies': total_companies,
            'total_applications': total_applications,
            'placement_rate': placement_rate
        },
        'recent_applications': recent
    })

@api_bp.route('/admin/students', methods=['GET'])
@login_required
def admin_students():
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    students = Student.query.all()
    result = [{
        'id': s.id,
        'roll_no': s.roll_no,
        'name': s.name,
        'email': s.email,
        'branch': s.branch,
        'cgpa': float(s.cgpa),
        'backlogs': s.backlogs,
        'placement_status': s.placement_status
    } for s in students]
    return jsonify(result)

@api_bp.route('/admin/companies', methods=['GET'])
@login_required
def admin_companies():
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    companies = Company.query.all()
    result = [{
        'id': c.id,
        'name': c.name,
        'role_offered': c.role_offered,
        'package_lpa': float(c.package_lpa),
        'status': c.status,
        'visit_date': c.visit_date.isoformat() if c.visit_date else None,
        'min_cgpa': float(c.min_cgpa)
    } for c in companies]
    return jsonify(result)

@api_bp.route('/admin/applications', methods=['GET'])
@login_required
def admin_applications():
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    applications = Application.query.all()
    result = [{
        'id': a.id,
        'student_name': a.student.name,
        'student_roll': a.student.roll_no,
        'company_name': a.company.name,
        'role_offered': a.company.role_offered,
        'status': a.status,
        'applied_date': a.applied_date.isoformat(),
        'result': a.result.result if a.result else None
    } for a in applications]
    return jsonify(result)

@api_bp.route('/admin/applications/<int:app_id>/status', methods=['POST'])
@login_required
def update_application_status(app_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.get_json() or {}
    new_status = data.get('status')
    
    if new_status not in ['Applied', 'Shortlisted', 'Interview', 'Offered', 'Rejected']:
        return jsonify({'error': 'Invalid status'}), 400
        
    application = Application.query.get_or_404(app_id)
    application.status = new_status
    
    # Auto-handle Placement Result if Offered
    if new_status == 'Offered':
        if not application.result:
            from datetime import date
            res = Result(application_id=application.id, result='Selected', offer_date=date.today())
            db.session.add(res)
        else:
            application.result.result = 'Selected'
            
        application.student.placement_status = 'Placed'
    elif application.result:
        # If moving backwards from offered
        application.result.result = 'Not Selected'
        
    db.session.commit()
    return jsonify({'message': 'Status updated successfully'})

@api_bp.route('/admin/results', methods=['GET'])
@login_required
def admin_results():
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    results = Result.query.filter_by(result='Selected').all()
    res_list = [{
        'id': r.id,
        'student_name': r.application.student.name,
        'student_roll': r.application.student.roll_no,
        'branch': r.application.student.branch,
        'company_name': r.application.company.name,
        'role_offered': r.application.company.role_offered,
        'package_lpa': float(r.application.company.package_lpa),
        'offer_date': r.offer_date.isoformat() if r.offer_date else None
    } for r in results]
    
    return jsonify(res_list)

@api_bp.route('/admin/reports', methods=['GET'])
@login_required
def admin_reports():
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    students = Student.query.all()
    results = Result.query.filter_by(result='Selected').all()
    
    total_students = len(students)
    placed_students = len([s for s in students if s.placement_status == 'Placed'])
    
    branch_data = {}
    for s in students:
        if s.branch not in branch_data:
            branch_data[s.branch] = {'total': 0, 'placed': 0}
        branch_data[s.branch]['total'] += 1
        if s.placement_status == 'Placed':
            branch_data[s.branch]['placed'] += 1
            
    branch_metrics = []
    for branch, data in branch_data.items():
        rate = (data['placed'] / data['total'] * 100) if data['total'] > 0 else 0
        branch_metrics.append({
            'branch': branch,
            'total': data['total'],
            'placed': data['placed'],
            'rate': round(rate, 1)
        })
        
    return jsonify({
        'overview': {
            'total_students': total_students,
            'placed_students': placed_students,
            'overall_rate': round((placed_students / total_students * 100) if total_students > 0 else 0, 1)
        },
        'branch_metrics': branch_metrics
    })
