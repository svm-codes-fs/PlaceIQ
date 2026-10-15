from tests.conftest import find

NEW_STUDENT = {
    'username': 'fresh', 'email': 'fresh@example.com', 'password': 'longenough',
    'name': 'Fresh Student', 'roll_no': 'DIT2201',  # same roll number as a DIT student
    'branch': 'CSE', 'cgpa': '8.5', 'backlogs': 0,
}


def test_create_student_validates_and_allows_same_roll_in_other_college(tiet_admin, dit_admin):
    res = tiet_admin.post('/api/admin/students', json={**NEW_STUDENT, 'cgpa': '11'})
    assert res.status_code == 400

    res = tiet_admin.post('/api/admin/students', json=NEW_STUDENT)
    assert res.status_code == 201, res.get_json()

    res = dit_admin.post('/api/admin/students', json={**NEW_STUDENT, 'username': 'x', 'email': 'x@example.com'})
    assert res.status_code == 400
    assert 'Roll number' in res.get_json()['error']


def test_update_and_delete_student(tiet_admin):
    student = find(tiet_admin.get('/api/admin/students').get_json(), name='Rohan Mehta')
    res = tiet_admin.put(f'/api/admin/students/{student["id"]}', json={'cgpa': 7.6, 'backlogs': 0})
    assert res.get_json()['cgpa'] == 7.6

    assert tiet_admin.delete(f'/api/admin/students/{student["id"]}').status_code == 200
    assert not any(s['id'] == student['id'] for s in tiet_admin.get('/api/admin/students').get_json())


def test_company_crud_and_eligibility_report(tiet_admin):
    res = tiet_admin.post('/api/admin/companies', json={
        'name': 'Google', 'role_offered': 'SWE', 'package_lpa': 50, 'min_cgpa': 8.5,
        'max_backlogs': 0, 'allowed_branches': ['CSE', 'ECE'], 'visit_date': '2026-12-01'})
    assert res.status_code == 201, res.get_json()
    company = res.get_json()

    eligible = tiet_admin.get(f'/api/admin/companies/{company["id"]}/eligible').get_json()['students']
    assert {s['name'] for s in eligible} == {'Aarav Sharma', 'Ananya Gupta'}

    res = tiet_admin.put(f'/api/admin/companies/{company["id"]}', json={'min_cgpa': 9.5})
    assert res.get_json()['min_cgpa'] == 9.5
    assert tiet_admin.put(f'/api/admin/companies/{company["id"]}', json={'allowed_branches': ['XYZ']}).status_code == 400

    assert tiet_admin.delete(f'/api/admin/companies/{company["id"]}').status_code == 200


def test_reports_and_funnel(tiet_admin):
    dashboard = tiet_admin.get('/api/admin/dashboard').get_json()
    assert dashboard['funnel'] == {'Interview': 1, 'Offered': 1, 'Accepted': 1, 'Rejected': 1}
    report = tiet_admin.get('/api/admin/reports').get_json()
    assert find(report['branch_metrics'], branch='CSE') == {'branch': 'CSE', 'total': 2, 'placed': 1, 'rate': 50.0}
