"""
Placement Management System — Entry Point

Config is chosen by the FLASK_CONFIG env var (default: development).
"""
from app import create_app

app = create_app()

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=app.config['DEBUG'])

#end of program
