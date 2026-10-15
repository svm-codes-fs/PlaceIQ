from tests.conftest import find


def _company(client, name):
    return find(client.get('/api/student/companies').get_json(), name=name)


def test_ineligible_student_gets_every_reason(make_client):
    student = make_client('rohan_tiet')  # ME, CGPA 6.90, 1 backlog
    microsoft = _company(student, 'Microsoft')
    assert microsoft['is_eligible'] is False
    assert len(microsoft['ineligibility_reasons']) == 3

    res = student.post(f'/api/student/apply/{microsoft["id"]}')
    assert res.status_code == 400
    assert len(res.get_json()['reasons']) == 3


def test_full_pipeline_to_placement(make_client, tiet_admin):
    student = make_client('diya_tiet')
    amazon = _company(student, 'Amazon')
    assert student.post(f'/api/student/apply/{amazon["id"]}').status_code == 201
    assert student.post(f'/api/student/apply/{amazon["id"]}').status_code == 400  # duplicate

    app = find(tiet_admin.get('/api/admin/applications').get_json(), student_name='Diya Verma', company_name='Amazon')
    assert app['allowed_transitions'] == ['Shortlisted', 'Rejected']

    for status in ('Shortlisted', 'Interview', 'Offered'):
        res = tiet_admin.post(f'/api/admin/applications/{app["id"]}/status', json={'status': status})
        assert res.status_code == 200, res.get_json()

    mine = find(student.get('/api/student/applications').get_json(), id=app['id'])
    assert mine['status'] == 'Offered' and mine['offer_date']
    assert mine['allowed_transitions'] == ['Accepted', 'Declined']

    assert student.post(f'/api/student/applications/{app["id"]}/respond', json={'status': 'Accepted'}).status_code == 200
    assert student.get('/api/student/profile').get_json()['placement_status'] == 'Placed'
    assert any(r['id'] == app['id'] for r in tiet_admin.get('/api/admin/results').get_json())


def test_invalid_transitions_are_rejected(make_client, tiet_admin):
    apps = tiet_admin.get('/api/admin/applications').get_json()
    interview = find(apps, status='Interview')
    offered = find(apps, status='Offered')
    accepted = find(apps, status='Accepted')

    def set_status(application, status):
        return tiet_admin.post(f'/api/admin/applications/{application["id"]}/status', json={'status': status})

    assert set_status(interview, 'Accepted').status_code == 400  # only the student can accept
    assert set_status(interview, 'Applied').status_code == 400   # no going backwards
    assert set_status(accepted, 'Rejected').status_code == 400   # terminal
    assert set_status(offered, 'Bogus').status_code == 400

    # Students can only respond to their own offers
    other = make_client('aarav_tiet')
    res = other.post(f'/api/student/applications/{offered["id"]}/respond', json={'status': 'Accepted'})
    assert res.status_code == 404


def test_student_cannot_edit_own_academic_record(make_client):
    student = make_client('rohan_tiet')
    res = student.put('/api/student/profile', json={'name': 'Rohan M', 'cgpa': 9.9, 'backlogs': 0})
    assert res.status_code == 200
    profile = student.get('/api/student/profile').get_json()
    assert profile['name'] == 'Rohan M'
    assert profile['cgpa'] == 6.9 and profile['backlogs'] == 1
