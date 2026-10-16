"""Placement policy engine, audit timeline and the database trigger."""
import pytest
from sqlalchemy.exc import DBAPIError

from app import db
from app.models import Application, College, Company, Student
from app.tenancy import college_context
from tests.conftest import find


def _policy(admin, rule_type):
    return find(admin.get('/api/admin/policies').get_json(), rule_type=rule_type)


def _set_policy(admin, rule_type, enabled, **params):
    return admin.put(f'/api/admin/policies/{rule_type}', json={'enabled': enabled, 'params': params})


def test_policies_listed_with_seeded_settings(tiet_admin, dit_admin):
    assert _policy(tiet_admin, 'max_offers')['enabled'] is True
    assert _policy(tiet_admin, 'max_offers')['params'] == {'limit': 2}
    assert _policy(tiet_admin, 'block_after_placement')['enabled'] is False
    # Each college has its own rules
    assert _policy(dit_admin, 'block_after_placement')['enabled'] is True
    assert _policy(dit_admin, 'max_offers')['enabled'] is False


def test_policy_params_are_validated(tiet_admin):
    res = _set_policy(tiet_admin, 'min_cgpa', True, value=11)
    assert res.status_code == 400
    assert _set_policy(tiet_admin, 'nonsense', True).status_code == 400


def test_college_cgpa_floor_blocks_and_explains(make_client, tiet_admin):
    assert _set_policy(tiet_admin, 'min_cgpa', True, value=7).status_code == 200
    student = make_client('rohan_tiet')  # CGPA 6.90
    tata = find(student.get('/api/student/companies').get_json(), name='Tata Motors')
    assert tata['is_eligible'] is False
    assert tata['ineligibility_reasons'] == ['College policy: CGPA must be at least 7.']
    res = student.post(f'/api/student/apply/{tata["id"]}')
    assert res.status_code == 400 and res.get_json()['reasons'] == tata['ineligibility_reasons']


def test_dream_lock_limits_placed_students_to_dream_drives(make_client, tiet_admin):
    # Diya is placed at Infosys (6.5 LPA); dream tier starts at 20 LPA
    tiet_admin.post('/api/admin/companies', json={
        'name': 'Zoho', 'role_offered': 'Developer', 'package_lpa': 9, 'min_cgpa': 6,
        'max_backlogs': 0, 'allowed_branches': ['CSE']})
    student = make_client('diya_tiet')
    companies = student.get('/api/student/companies').get_json()
    assert find(companies, name='Amazon')['is_eligible'] is True  # 32 LPA, dream tier
    zoho = find(companies, name='Zoho')
    assert zoho['is_eligible'] is False
    assert 'dream-tier' in zoho['ineligibility_reasons'][0]


def test_block_after_placement(make_client, dit_admin):
    # Place Neha via the pipeline, then she can't apply anywhere else in DIT
    app_id = find(dit_admin.get('/api/admin/applications').get_json()['items'], student_name='Neha Joshi')['id']
    for status in ('Interview', 'Offered'):
        assert dit_admin.post(f'/api/admin/applications/{app_id}/status', json={'status': status}).status_code == 200
    neha = make_client('neha_dit')
    assert neha.post(f'/api/student/applications/{app_id}/respond', json={'status': 'Accepted'}).status_code == 200

    lt = find(neha.get('/api/student/companies').get_json(), name='L&T')
    assert 'College policy: placed students cannot apply to further drives.' in lt['ineligibility_reasons']


def test_max_offers_blocks_new_offer(make_client, tiet_admin):
    assert _set_policy(tiet_admin, 'max_offers', True, limit=1).status_code == 200
    # Ananya already holds an offer from Texas Instruments
    student = make_client('ananya_tiet')
    amazon = find(student.get('/api/student/companies').get_json(), name='Amazon')
    assert any('limit is 1' in r for r in amazon['ineligibility_reasons'])

    # Raise the limit so she can apply, then lower it: the admin can't make a second offer
    _set_policy(tiet_admin, 'max_offers', True, limit=3)
    assert student.post(f'/api/student/apply/{amazon["id"]}').status_code == 201
    app_id = find(tiet_admin.get('/api/admin/applications').get_json()['items'],
                  student_name='Ananya Gupta', company_name='Amazon')['id']
    for status in ('Shortlisted', 'Interview'):
        tiet_admin.post(f'/api/admin/applications/{app_id}/status', json={'status': status})
    _set_policy(tiet_admin, 'max_offers', True, limit=1)
    res = tiet_admin.post(f'/api/admin/applications/{app_id}/status', json={'status': 'Offered'})
    assert res.status_code == 400 and 'limit is 1' in res.get_json()['error']


def test_timeline_records_every_change_with_actor(make_client, tiet_admin):
    student = make_client('diya_tiet')
    amazon = find(student.get('/api/student/companies').get_json(), name='Amazon')
    student.post(f'/api/student/apply/{amazon["id"]}')
    app_id = find(tiet_admin.get('/api/admin/applications').get_json()['items'],
                  student_name='Diya Verma', company_name='Amazon')['id']
    tiet_admin.post(f'/api/admin/applications/{app_id}/status', json={'status': 'Shortlisted', 'note': 'Strong resume'})

    events = student.get(f'/api/student/applications/{app_id}/timeline').get_json()
    assert [(e['from_status'], e['to_status'], e['actor']) for e in events] == [
        (None, 'Applied', 'diya_tiet'), ('Applied', 'Shortlisted', 'tiet_admin')]
    assert events[1]['note'] == 'Strong resume'
    assert tiet_admin.get(f'/api/admin/applications/{app_id}/timeline').get_json() == events

    # Other students can't read it
    assert make_client('aarav_tiet').get(f'/api/student/applications/{app_id}/timeline').status_code == 404


def test_seeded_applications_have_history(tiet_admin):
    accepted = find(tiet_admin.get('/api/admin/applications').get_json()['items'], status='Accepted')
    events = tiet_admin.get(f'/api/admin/applications/{accepted["id"]}/timeline').get_json()
    assert [e['to_status'] for e in events] == ['Applied', 'Shortlisted', 'Interview', 'Offered', 'Accepted']


def test_database_trigger_rejects_ineligible_insert(app):
    """The PostgreSQL trigger blocks an ineligible row even when the service layer is bypassed."""
    with app.app_context():
        if db.engine.dialect.name != 'postgresql':
            pytest.skip('database trigger is PostgreSQL-only')
        tiet = College.query.filter_by(code='TIET').one()
        dit = College.query.filter_by(code='DIT').one()
        with college_context(tiet.id):
            rohan = Student.query.filter_by(name='Rohan Mehta').one()
            microsoft = Company.query.filter_by(name='Microsoft').one()
            db.session.add(Application(student_id=rohan.id, company_id=microsoft.id))
            with pytest.raises(DBAPIError, match='application rejected'):
                db.session.flush()
            db.session.rollback()

        # A row claiming one college but pointing at another college's student
        with college_context(dit.id):
            wipro = Company.query.filter_by(name='Wipro').one()
        db.session.add(Application(student_id=rohan.id, company_id=wipro.id, college_id=dit.id))
        with pytest.raises(DBAPIError, match='crosses colleges'):
            db.session.flush()
        db.session.rollback()
