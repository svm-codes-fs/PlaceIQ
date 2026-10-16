"""Two colleges on one deployment must never see or change each other's data."""
import pytest

from app import db
from app.models import College, Student
from app.tenancy import TenantViolation, college_context
from tests.conftest import find


def _ids(client, url):
    data = client.get(url).get_json()
    return [item['id'] for item in (data['items'] if isinstance(data, dict) else data)]


def test_admins_only_list_their_own_college(tiet_admin, dit_admin):
    tiet_rolls = {s['roll_no'] for s in tiet_admin.get('/api/admin/students').get_json()['items']}
    dit_rolls = {s['roll_no'] for s in dit_admin.get('/api/admin/students').get_json()['items']}
    assert tiet_rolls and dit_rolls
    assert all(r.startswith('1022') for r in tiet_rolls)
    assert all(r.startswith('DIT') for r in dit_rolls)

    assert set(_ids(tiet_admin, '/api/admin/companies')).isdisjoint(_ids(dit_admin, '/api/admin/companies'))
    assert set(_ids(tiet_admin, '/api/admin/applications')).isdisjoint(_ids(dit_admin, '/api/admin/applications'))


def test_dashboard_counts_are_per_college(tiet_admin, dit_admin):
    assert tiet_admin.get('/api/admin/dashboard').get_json()['stats']['total_students'] == 6
    assert dit_admin.get('/api/admin/dashboard').get_json()['stats']['total_students'] == 3


def test_admin_cannot_touch_other_college_records(tiet_admin, dit_admin):
    dit_student = _ids(dit_admin, '/api/admin/students')[0]
    dit_company = _ids(dit_admin, '/api/admin/companies')[0]
    dit_application = _ids(dit_admin, '/api/admin/applications')[0]

    assert tiet_admin.put(f'/api/admin/students/{dit_student}', json={'name': 'Hacked'}).status_code == 404
    assert tiet_admin.delete(f'/api/admin/students/{dit_student}').status_code == 404
    assert tiet_admin.put(f'/api/admin/companies/{dit_company}', json={'name': 'Hacked'}).status_code == 404
    assert tiet_admin.delete(f'/api/admin/companies/{dit_company}').status_code == 404
    assert tiet_admin.get(f'/api/admin/companies/{dit_company}/eligible').status_code == 404
    res = tiet_admin.post(f'/api/admin/applications/{dit_application}/status', json={'status': 'Rejected'})
    assert res.status_code == 404

    # Nothing changed
    assert find(dit_admin.get('/api/admin/students').get_json()['items'], id=dit_student)['name'] != 'Hacked'


def test_student_only_sees_and_applies_to_own_college_drives(make_client, tiet_admin):
    student = make_client('neha_dit')
    names = {c['name'] for c in student.get('/api/student/companies').get_json()}
    assert names == {'Wipro', 'L&T'}

    tiet_company = find(tiet_admin.get('/api/admin/companies').get_json(), name='Amazon')
    assert student.post(f'/api/student/apply/{tiet_company["id"]}').status_code == 404


def test_super_admin_sees_all_colleges(superadmin):
    colleges = superadmin.get('/api/super/colleges').get_json()
    by_code = {c['code']: c for c in colleges}
    assert by_code['TIET']['students'] == 6
    assert by_code['DIT']['students'] == 3
    assert by_code['TIET']['placed'] == 1


def test_super_admin_creates_college_with_admin(superadmin, make_client):
    res = superadmin.post('/api/super/colleges', json={
        'name': 'New College', 'code': 'new', 'admin_username': 'new_admin',
        'admin_email': 'new_admin@example.com', 'admin_password': 'longenough'})
    assert res.status_code == 201
    assert res.get_json()['code'] == 'NEW'

    new_admin = make_client()
    assert new_admin.login('new_admin', 'longenough').status_code == 200
    assert new_admin.get('/api/admin/students').get_json()['items'] == []


def test_orm_refuses_cross_college_writes(app):
    with app.app_context():
        tiet = College.query.filter_by(code='TIET').one()
        dit = College.query.filter_by(code='DIT').one()
        with college_context(tiet.id):
            assert {s.college_id for s in Student.query.all()} == {tiet.id}
            dit_student = db.session.execute(
                db.select(Student).where(Student.college_id == dit.id).execution_options(all_colleges=True)
            ).scalars().first()
            dit_student.name = 'Changed'
            with pytest.raises(TenantViolation):
                db.session.flush()
            db.session.rollback()
