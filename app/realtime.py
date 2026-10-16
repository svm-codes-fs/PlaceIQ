"""
Real-time push over Socket.IO.

Served under /api/socket.io so the JWT access cookie (scoped to /api/) is sent
with the handshake. Browsers connect with that cookie and join a private room
`user:<id>`. Anything that calls `push_to_user` — a request handler or a
Celery worker in another process — reaches that browser: with REDIS_URL
configured, emits go through Redis (the Socket.IO message queue), so workers
can push to clients connected to the API server.
"""
import logging

from flask import request
from flask_jwt_extended import decode_token
from flask_socketio import SocketIO, join_room

log = logging.getLogger(__name__)

socketio = SocketIO()


def init_realtime(app):
    socketio.init_app(
        app,
        path='api/socket.io',
        async_mode='threading',
        message_queue=app.config.get('SOCKETIO_MESSAGE_QUEUE'),
        cors_allowed_origins=app.config.get('SOCKETIO_CORS_ORIGINS') or [],
        logger=False,
        engineio_logger=False,
    )


def user_room(user_id):
    return f'user:{user_id}'


@socketio.on('connect')
def _connect(auth=None):
    """Authenticate the socket with the same httpOnly JWT cookie the REST API uses."""
    token = request.cookies.get('access_token_cookie')
    if not token:
        return False
    try:
        claims = decode_token(token)
    except Exception:  # expired or invalid; the client refreshes and reconnects
        return False
    join_room(user_room(claims['sub']))
    if claims.get('college_id'):
        join_room(f'college:{claims["college_id"]}')
    return True


def push_to_user(user_id, event, data):
    try:
        socketio.emit(event, data, to=user_room(user_id))
    except Exception:  # never let a push failure break the caller
        log.exception('Socket.IO push failed')
