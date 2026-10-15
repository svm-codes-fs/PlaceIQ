"""
JWT authentication.

Tokens live in httpOnly cookies (not readable by JavaScript, so XSS can't steal
them), with double-submit CSRF protection: state-changing requests must echo
the csrf_access_token cookie in an X-CSRF-TOKEN header.

- access token: 15 minutes, carries the user's role and college_id
- refresh token: 7 days, only sent to /api/auth/refresh
"""
from functools import wraps

from flask import g, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token, get_jwt, set_access_cookies,
    set_refresh_cookies, verify_jwt_in_request,
)

from app.extensions import db, jwt
from app.models import User


def token_claims(user):
    return {'role': user.role, 'college_id': user.college_id}


def set_auth_cookies(response, user, refresh=True):
    access = create_access_token(identity=str(user.id), additional_claims=token_claims(user))
    set_access_cookies(response, access)
    if refresh:
        set_refresh_cookies(response, create_refresh_token(identity=str(user.id)))
    return response


def roles_required(*roles):
    """Require a valid access token with one of the given roles, and scope the request to its college."""
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get('role') not in roles:
                return jsonify({'error': 'Unauthorized'}), 403
            # Super admins have no college and therefore see all tenants
            g.college_id = claims.get('college_id')
            return view(*args, **kwargs)
        return wrapped
    return decorator


@jwt.user_lookup_loader
def _load_user(_jwt_header, jwt_data):
    return db.session.get(User, int(jwt_data['sub']))


@jwt.user_lookup_error_loader
def _user_gone(_jwt_header, _jwt_data):
    return jsonify({'error': 'Account no longer exists.'}), 401


@jwt.unauthorized_loader
def _missing_token(reason):
    return jsonify({'error': 'Authentication required.', 'detail': reason}), 401


@jwt.invalid_token_loader
def _invalid_token(reason):
    return jsonify({'error': 'Invalid token.', 'detail': reason}), 401


@jwt.expired_token_loader
def _expired_token(_jwt_header, _jwt_data):
    # The frontend refreshes and retries when it sees this code
    return jsonify({'error': 'Session expired.', 'code': 'token_expired'}), 401
