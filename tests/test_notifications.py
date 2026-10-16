"""Background jobs, notifications, live push and CSV import."""
import io
from datetime import date, timedelta

from app import db
from app.models import Application, Company
from app.realtime import socketio
from app.tasks.jobs import expire_offers, interview_reminders
from app.tenancy import college_context
from tests.conftest import find


def _advance(admin, app_id, *statuses):
    for status in statuses:
        res = admin.post(f'/api/admin/applications/{app_id}/status', json={'status': status})
        assert res.status_code == 200, res.get_json()


def test_status_change_notifies_student_and_can_be_marked_read(make_client, tiet_admin, caplog):
    caplog.set_level('INFO')
    student = make_client('kabir_tiet')  # in the Interview stage at Texas Instruments
    app_id = find(tiet_admin.get('/api/admin/applications').get_json(), student_name='Kabir Singh')['id']
    _advance(tiet_admin, app_id, 'Offered')

    data = student.get('/api/notifications').get_json()
    assert data['unread'] == 1
    assert data['items'][0]['title'] == 'Offer from Texas Instruments!'
    assert 'EMAIL to=kabir_tiet@placeiq.dev' in caplog.text  # console email backend

    assert student.post('/api/notifications/read', json={}).get_json()['unread'] == 0


def test_offer_response_notifies_admins(make_client, tiet_admin):
    ananya = make_client('ananya_tiet')  # holds an offer from Texas Instruments
    app_id = find(ananya.get('/api/student/applications').get_json(), status='Offered')['id']
    ananya.post(f'/api/student/applications/{app_id}/respond', json={'status': 'Accepted'})
    titles = [n['title'] for n in tiet_admin.get('/api/notifications').get_json()['items']]
    assert 'Ananya Gupta accepted the Texas Instruments offer' in titles


def test_live_push_reaches_the_students_socket(app, make_client, tiet_admin):
    student = make_client('kabir_tiet')
    socket = socketio.test_client(app, headers=student.socket_headers())
    assert socket.is_connected()

    app_id = find(tiet_admin.get('/api/admin/applications').get_json(), student_name='Kabir Singh')['id']
    _advance(tiet_admin, app_id, 'Rejected')

    events = [e for e in socket.get_received() if e['name'] == 'notification']
    assert [e['args'][0]['title'] for e in events] == ['Update on your Texas Instruments application']
    socket.disconnect()


def test_socket_without_login_is_refused(app):
    socket = socketio.test_client(app)
    assert not socket.is_connected()


def test_new_drive_notifies_only_eligible_students(make_client, tiet_admin):
    tiet_admin.post('/api/admin/companies', json={
        'name': 'Qualcomm', 'role_offered': 'Hardware Engineer', 'package_lpa': 28, 'min_cgpa': 8,
        'max_backlogs': 0, 'allowed_branches': ['ECE', 'EE']})
    ananya = make_client('ananya_tiet')   # ECE, 8.95
    kabir = make_client('kabir_tiet')     # ECE, 7.80 -> below cutoff
    assert any(n['title'] == 'New drive: Qualcomm' for n in ananya.get('/api/notifications').get_json()['items'])
    assert not any(n['title'] == 'New drive: Qualcomm' for n in kabir.get('/api/notifications').get_json()['items'])


def _upload(admin, text, name='students.csv'):
    return admin.client.post('/api/admin/students/import', data={'file': (io.BytesIO(text.encode()), name)},
                             headers=admin._csrf(), content_type='multipart/form-data')


GOOD_CSV = """username,email,name,roll_no,branch,cgpa,backlogs,phone,password
asha,asha@example.com,Asha Rao,102203201,CSE,8.7,0,,longpassword
vikram,vikram@example.com,Vikram Das,102203202,ME,7.1,1,9876500000,
"""


def test_csv_import_creates_students(make_client, tiet_admin, caplog):
    caplog.set_level('INFO')
    res = _upload(tiet_admin, GOOD_CSV)
    assert res.status_code == 202
    job = tiet_admin.get(f'/api/admin/imports/{res.get_json()["id"]}').get_json()
    assert job['status'] == 'succeeded' and job['created_count'] == 2

    rolls = {s['roll_no'] for s in tiet_admin.get('/api/admin/students').get_json()}
    assert {'102203201', '102203202'} <= rolls
    assert make_client().login('asha', 'longpassword').status_code == 200
    # Vikram had no password column value: he gets a temporary password by email
    assert 'Temporary password' in caplog.text and 'vikram@example.com' in caplog.text


def test_csv_import_is_all_or_nothing_with_row_errors(tiet_admin):
    bad = GOOD_CSV + (
        'asha2,asha@example.com,Dup Email,102203203,CSE,8,0,,\n'      # duplicate email in file
        'bad,bad@example.com,Bad Data,102203001,XYZ,12,0,,\n'          # existing roll, bad branch, bad cgpa
    )
    job = _upload(tiet_admin, bad).get_json()
    assert job['status'] == 'failed' and job['created_count'] == 0
    rows = {e['row']: e['errors'] for e in job['errors']}
    assert set(rows) == {4, 5}
    assert any('Duplicate email' in e for e in rows[4])
    assert len(rows[5]) == 3
    rolls = {s['roll_no'] for s in tiet_admin.get('/api/admin/students').get_json()}
    assert '102203201' not in rolls  # the valid rows were not saved either


def test_csv_import_rejects_missing_columns(tiet_admin):
    job = _upload(tiet_admin, 'username,email\nx,x@example.com\n').get_json()
    assert job['status'] == 'failed' and 'Missing column' in job['errors'][0]['errors'][0]
    assert _upload(tiet_admin, 'x', name='students.txt').status_code == 400
    assert tiet_admin.get('/api/admin/students/import-template').data.startswith(b'username,email')


def test_expire_offers_and_reminders(app, make_client):
    with app.app_context():
        offered = Application.query.filter_by(status='Offered').one()  # Ananya / Texas Instruments
        offered.offer_date = date.today() - timedelta(days=app.config['OFFER_EXPIRY_DAYS'] - 1)
        db.session.commit()
        assert expire_offers() == {'expired': 0, 'reminded': 1}
        assert expire_offers() == {'expired': 0, 'reminded': 0}  # reminder sent only once

        offered = Application.query.filter_by(status='Offered').one()
        offered.offer_date = date.today() - timedelta(days=app.config['OFFER_EXPIRY_DAYS'])
        db.session.commit()
        assert expire_offers()['expired'] == 1
        app_id = offered.id

    ananya = make_client('ananya_tiet')
    mine = find(ananya.get('/api/student/applications').get_json(), id=app_id)
    assert mine['status'] == 'Expired'
    titles = [n['title'] for n in ananya.get('/api/notifications').get_json()['items']]
    assert 'Your Texas Instruments offer has expired' in titles
    assert 'Your Texas Instruments offer expires tomorrow' in titles
    events = ananya.get(f'/api/student/applications/{app_id}/timeline').get_json()
    assert events[-1]['actor'] == 'system' and events[-1]['to_status'] == 'Expired'


def test_interview_reminders(app, make_client):
    with app.app_context():
        with college_context(None):
            ti = Company.query.filter_by(name='Texas Instruments').one()
            ti.visit_date = date.today() + timedelta(days=1)
            db.session.commit()
        assert interview_reminders() == 1  # Kabir is in the Interview stage
    kabir = make_client('kabir_tiet')
    assert kabir.get('/api/notifications').get_json()['items'][0]['title'] == 'Texas Instruments drive is tomorrow'
