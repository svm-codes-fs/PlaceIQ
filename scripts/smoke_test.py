"""
End-to-end smoke test against a running stack (used by CI on docker compose).

Checks the API is up and seeded, auth and tenancy work over real HTTP, the
Socket.IO endpoint answers, and a background job (CSV import) is picked up by
the Celery worker through Redis and finishes.

    python scripts/smoke_test.py http://localhost:5000
"""
import sys
import time

import requests

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5000').rstrip('/')
PASSWORD = 'password123'


def check(condition, message):
    if not condition:
        print(f'FAIL: {message}')
        sys.exit(1)
    print(f'ok   {message}')


def login(username):
    s = requests.Session()
    r = s.post(f'{BASE}/api/auth/login', json={'username': username, 'password': PASSWORD}, timeout=30)
    check(r.status_code == 200, f'{username} can sign in')
    s.headers['X-CSRF-TOKEN'] = s.cookies.get('csrf_access_token')
    return s


def main():
    for _ in range(60):
        try:
            if requests.get(f'{BASE}/api/health', timeout=5).ok:
                break
        except requests.RequestException:
            pass
        time.sleep(2)
    check(requests.get(f'{BASE}/api/health', timeout=5).json() == {'status': 'ok'}, 'health check')

    admin = login('tiet_admin')
    students = admin.get(f'{BASE}/api/admin/students', timeout=30).json()
    check(students['total'] == 6, 'seeded TIET students visible to their admin')
    dit = login('dit_admin')
    check(dit.get(f'{BASE}/api/admin/students', timeout=30).json()['total'] == 3, 'DIT admin sees only DIT students')

    r = requests.get(f'{BASE}/api/socket.io/?EIO=4&transport=polling', timeout=10)
    check(r.status_code == 200 and r.text[1:2] == '0', 'Socket.IO handshake answers')

    csv = 'username,email,name,roll_no,branch,cgpa,backlogs,password\nsmoke1,smoke1@example.com,Smoke Test,SMOKE01,CSE,8.0,0,smokepass123\n'
    r = admin.post(f'{BASE}/api/admin/students/import', files={'file': ('smoke.csv', csv, 'text/csv')}, timeout=30)
    check(r.status_code == 202, 'CSV import queued')
    job_id = r.json()['id']
    status = None
    for _ in range(60):
        status = admin.get(f'{BASE}/api/admin/imports/{job_id}', timeout=10).json()['status']
        if status in ('succeeded', 'failed'):
            break
        time.sleep(1)
    check(status == 'succeeded', f'Celery worker processed the import (status={status})')

    student = requests.Session()
    r = student.post(f'{BASE}/api/auth/login', json={'username': 'smoke1', 'password': 'smokepass123'}, timeout=30)
    check(r.status_code == 200, 'imported student can sign in')
    print('Smoke test passed.')


if __name__ == '__main__':
    main()
