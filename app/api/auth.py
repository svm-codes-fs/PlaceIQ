from flask import jsonify, request
from flask_jwt_extended import current_user, jwt_required, unset_jwt_cookies, verify_jwt_in_request
from werkzeug.security import check_password_hash

from app.api import api_bp
from app.api.serializers import user_json
from app.extensions import db
from app.models import College, User
from app.security import set_auth_cookies
from app.services.accounts import create_student
from app.tenancy import college_context


@api_bp.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    login_id = (data.get('username') or '').strip()
    password = data.get('password') or ''

    if not login_id or not password:
        return jsonify({'error': 'Please enter both username and password.'}), 400

    # Users can sign in with their username or email
    user = User.query.filter((User.username == login_id) | (User.email == login_id)).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid username or password.'}), 401

    response = jsonify({'message': f'Welcome back, {user.username}!', 'user': user_json(user)})
    return set_auth_cookies(response, user)


@api_bp.route('/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Issue a new access token (with fresh role/college claims) from the refresh cookie."""
    response = jsonify({'user': user_json(current_user)})
    return set_auth_cookies(response, current_user, refresh=False)


@api_bp.route('/auth/me', methods=['GET'])
def get_me():
    # No token: a normal "signed out" answer. An expired token still returns 401 so the client refreshes it.
    verify_jwt_in_request(optional=True)
    if current_user:
        return jsonify({'authenticated': True, 'user': user_json(current_user)})
    return jsonify({'authenticated': False, 'user': None})


@api_bp.route('/auth/logout', methods=['POST'])
def logout():
    response = jsonify({'message': 'Logged out successfully.'})
    unset_jwt_cookies(response)
    return response


@api_bp.route('/colleges', methods=['GET'])
def list_colleges():
    """Public list used by the registration form."""
    colleges = College.query.order_by(College.name).all()
    return jsonify([{'id': c.id, 'name': c.name, 'code': c.code} for c in colleges])


@api_bp.route('/auth/register', methods=['POST'])
def register():
    """Student self-registration into a chosen college."""
    data = request.get_json() or {}
    college = db.session.get(College, data.get('college_id') or 0)
    if not college:
        return jsonify({'error': 'Please choose your college.'}), 400

    with college_context(college.id):
        student = create_student(college.id, data)
    response = jsonify({'message': 'Registration successful.', 'user': user_json(student.user)})
    return set_auth_cookies(response, student.user), 201
