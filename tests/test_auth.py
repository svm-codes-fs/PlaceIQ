from tests.conftest import ApiClient


def test_login_sets_httponly_cookies_and_me_returns_user(make_client):
    client = make_client()
    res = client.login('tiet_admin')
    assert res.status_code == 200
    cookies = res.headers.getlist('Set-Cookie')
    assert any(c.startswith('access_token_cookie=') and 'HttpOnly' in c for c in cookies)
    assert any(c.startswith('refresh_token_cookie=') and 'HttpOnly' in c for c in cookies)

    me = client.get('/api/auth/me').get_json()
    assert me['authenticated'] is True
    assert me['user']['role'] == 'college_admin'
    assert me['user']['college']['code'] == 'TIET'


def test_login_with_email(make_client):
    assert make_client().login('tiet_admin@placeiq.dev').status_code == 200


def test_wrong_password_rejected(make_client):
    res = make_client().login('tiet_admin', 'wrong-password')
    assert res.status_code == 401


def test_protected_endpoint_requires_token(make_client):
    assert make_client().get('/api/admin/students').status_code == 401


def test_state_change_requires_csrf_header(tiet_admin):
    res = tiet_admin.post('/api/admin/companies', json={'name': 'X'}, csrf=False)
    assert res.status_code == 401


def test_refresh_issues_new_access_token(tiet_admin):
    res = tiet_admin.refresh()
    assert res.status_code == 200
    assert any(c.startswith('access_token_cookie=') for c in res.headers.getlist('Set-Cookie'))


def test_logout_clears_session(tiet_admin):
    assert tiet_admin.post('/api/auth/logout').status_code == 200
    assert tiet_admin.get('/api/auth/me').get_json() == {'authenticated': False, 'user': None}


def test_roles_are_enforced(make_client, tiet_admin):
    student = make_client('aarav_tiet')
    assert student.get('/api/admin/students').status_code == 403
    assert tiet_admin.get('/api/student/dashboard').status_code == 403
    assert tiet_admin.get('/api/super/colleges').status_code == 403


def test_register_creates_student_in_chosen_college(app, make_client, dit_admin, tiet_admin):
    colleges = make_client().get('/api/colleges').get_json()
    dit = next(c for c in colleges if c['code'] == 'DIT')

    client = ApiClient(app)
    res = client.post('/api/auth/register', csrf=False, json={
        'college_id': dit['id'], 'username': 'newbie', 'email': 'newbie@example.com',
        'password': 'longenough', 'name': 'New Student', 'roll_no': 'DIT9999',
        'branch': 'CSE', 'cgpa': '8.2', 'backlogs': '0',
    })
    assert res.status_code == 201
    # Registration signs the student in
    assert client.get('/api/student/profile').get_json()['roll_no'] == 'DIT9999'

    assert any(s['roll_no'] == 'DIT9999' for s in dit_admin.get('/api/admin/students').get_json())
    assert not any(s['roll_no'] == 'DIT9999' for s in tiet_admin.get('/api/admin/students').get_json())


def test_register_validates_input(make_client):
    res = make_client().post('/api/auth/register', csrf=False, json={'college_id': 1, 'password': 'short'})
    assert res.status_code == 400
    assert len(res.get_json()['errors']) > 1
