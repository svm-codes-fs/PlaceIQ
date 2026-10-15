"""
Flask extension instances, created once and bound to the app in create_app().
Kept in their own module so models, services and tasks can import them
without importing the app factory.
"""
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
