"""
Test fixtures. Each test gets a fresh database seeded with the demo data from
`flask seed`: two colleges (TIET, DIT), their admins, students and drives.

Set TEST_DATABASE_URL to run against PostgreSQL (CI does); default is in-memory SQLite.
"""
import pytest

from app import create_app, db, db_rules
from app.cli import seed_database

PASSWORD = 'password123'


@pytest.fixture
def app():
    app = create_app('testing')
    app.config['SEED_PASSWORD'] = PASSWORD
    with app.app_context():
        if db.engine.dialect.name == 'postgresql':
            with db.engine.begin() as conn:
                conn.exec_driver_sql('CREATE EXTENSION IF NOT EXISTS vector')
        db.create_all()
        with db.engine.begin() as conn:
            db_rules.install(conn)  # PostgreSQL trigger; no-op on SQLite
        seed_database()
    # No app context is held open during requests, so each request gets its own `g`
    yield app
    with app.app_context():
        db.session.remove()
        db.drop_all()


class ApiClient:
    """Test client that logs in and sends the CSRF header like the React app does."""

    def __init__(self, app):
        self.client = app.test_client()

    def login(self, username, password=PASSWORD):
        return self.client.post('/api/auth/login', json={'username': username, 'password': password})

    def _csrf(self, name='csrf_access_token'):
        cookie = self.client.get_cookie(name)
        return {'X-CSRF-TOKEN': cookie.value} if cookie else {}

    def get(self, url):
        return self.client.get(url)

    def post(self, url, json=None, csrf=True):
        return self.client.post(url, json=json, headers=self._csrf() if csrf else {})

    def put(self, url, json=None):
        return self.client.put(url, json=json, headers=self._csrf())

    def delete(self, url):
        return self.client.delete(url, headers=self._csrf())

    def refresh(self):
        return self.client.post('/api/auth/refresh', headers=self._csrf('csrf_refresh_token'))


@pytest.fixture
def make_client(app):
    def _make(username=None):
        client = ApiClient(app)
        if username:
            assert client.login(username).status_code == 200
        return client
    return _make


@pytest.fixture
def tiet_admin(make_client):
    return make_client('tiet_admin')


@pytest.fixture
def dit_admin(make_client):
    return make_client('dit_admin')


@pytest.fixture
def superadmin(make_client):
    return make_client('superadmin')


def find(items, **match):
    """First item in a JSON list whose fields match."""
    return next(i for i in items if all(i.get(k) == v for k, v in match.items()))
