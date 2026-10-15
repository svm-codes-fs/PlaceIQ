"""
JSON REST API used by the React frontend, mounted at /api.

    /api/auth/*     login, refresh, logout, register (public)
    /api/student/*  student role
    /api/admin/*    college_admin role, scoped to their college
    /api/super/*    super_admin role, manages colleges
"""
from flask import Blueprint, jsonify

from app.services.accounts import ValidationError
from app.services.applications import ApplicationError
from app.tenancy import TenantViolation

api_bp = Blueprint('api', __name__)


@api_bp.errorhandler(ValidationError)
def _validation_error(e):
    return jsonify({'error': e.errors[0], 'errors': e.errors}), 400


@api_bp.errorhandler(ApplicationError)
def _application_error(e):
    return jsonify({'error': e.message, 'reasons': e.reasons}), 400


@api_bp.errorhandler(TenantViolation)
def _tenant_violation(_e):
    return jsonify({'error': 'Not found'}), 404


@api_bp.errorhandler(404)
def _not_found(_e):
    return jsonify({'error': 'Not found'}), 404


# Register routes on api_bp
from app.api import auth, student, admin, superadmin  # noqa: E402,F401
