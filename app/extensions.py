"""
Flask extension instances, created once and bound to the app in create_app().
Kept in their own module so models, services and tasks can import them
without importing the app factory.
"""
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_migrate import Migrate

db = SQLAlchemy()
login_manager = LoginManager()
migrate = Migrate()
