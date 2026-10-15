"""
JSON REST API used by the React frontend, mounted at /api.
"""
from functools import wraps

from flask import Blueprint, jsonify
from flask_login import login_required, current_user

api_bp = Blueprint('api', __name__)


def role_required(role):
    """Require a logged-in user with the given role."""
    def decorator(view):
        @wraps(view)
        @login_required
        def wrapped(*args, **kwargs):
            if current_user.role != role:
                return jsonify({'error': 'Unauthorized'}), 403
            return view(*args, **kwargs)
        return wrapped
    return decorator


# Register routes on api_bp
from app.api import auth, student, admin  # noqa: E402,F401
