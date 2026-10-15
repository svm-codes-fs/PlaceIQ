from flask import jsonify, request
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash

from app.api import api_bp
from app.models import User


def _user_json(user):
    return {'id': user.id, 'username': user.username, 'role': user.role}


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
        return jsonify({'message': f'Welcome back, {username}!', 'user': _user_json(user)})
    return jsonify({'error': 'Invalid username or password.'}), 401


@api_bp.route('/auth/me', methods=['GET'])
def get_me():
    if current_user.is_authenticated:
        return jsonify({'authenticated': True, 'user': _user_json(current_user)})
    return jsonify({'authenticated': False}), 401


@api_bp.route('/auth/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully.'})
