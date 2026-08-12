"""
Placement Management System — Entry Point
"""
from app import create_app

app = create_app('development')

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)

#end of program
