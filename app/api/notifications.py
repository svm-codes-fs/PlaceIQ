from flask import jsonify, request
from flask_jwt_extended import current_user

from app.api import api_bp
from app.security import roles_required
from app.services.notifications import list_for, mark_read

signed_in = roles_required('student', 'college_admin')


@api_bp.route('/notifications', methods=['GET'])
@signed_in
def notifications():
    return jsonify(list_for(current_user))


@api_bp.route('/notifications/read', methods=['POST'])
@signed_in
def notifications_read():
    """Mark the given notification ids (or all of them) as read."""
    ids = (request.get_json() or {}).get('ids')
    mark_read(current_user, ids)
    return jsonify(list_for(current_user))
