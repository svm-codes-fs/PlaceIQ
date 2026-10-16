"""
Placement Management System — Entry Point

Config is chosen by the FLASK_CONFIG env var (default: development).
"""
from app import create_app
from app.realtime import socketio

app = create_app()

if __name__ == '__main__':
    # socketio.run serves both the REST API and the Socket.IO endpoint
    socketio.run(app, host='127.0.0.1', port=5000, debug=app.config['DEBUG'],
                 allow_unsafe_werkzeug=True)

#end of program
