"""
Load test for the REST API against a `flask seed-large` database.

    locust -f benchmarks/locustfile.py --host http://127.0.0.1:5050 \
           --headless -u 300 -r 10 -t 90s --csv benchmarks/results/load_300

Students (80% of users) and college admins (20%) sign in once, then browse the
pages they use most, with 1-3 s of think time between requests.
"""
import random

from locust import HttpUser, between, task

BENCH_PASSWORD = 'benchpass123'
STUDENTS = 5000
ADMINS = 3


class StudentUser(HttpUser):
    weight = 4
    wait_time = between(1, 3)

    def on_start(self):
        n = random.randrange(STUDENTS)
        self.client.post('/api/auth/login', json={'username': f'bench_s{n}', 'password': BENCH_PASSWORD},
                         name='POST /api/auth/login')

    @task(3)
    def dashboard(self):
        self.client.get('/api/student/dashboard')

    @task(2)
    def drives(self):
        self.client.get('/api/student/companies')

    @task(2)
    def matches(self):
        self.client.get('/api/student/matches')

    @task(2)
    def applications(self):
        self.client.get('/api/student/applications')

    @task(1)
    def notifications(self):
        self.client.get('/api/notifications')


class AdminUser(HttpUser):
    weight = 1
    wait_time = between(1, 3)

    def on_start(self):
        n = random.randint(1, ADMINS)
        self.client.post('/api/auth/login', json={'username': f'bench_admin{n}', 'password': BENCH_PASSWORD},
                         name='POST /api/auth/login')

    @task(2)
    def dashboard(self):
        self.client.get('/api/admin/dashboard')

    @task(2)
    def applications(self):
        page = random.randint(1, 20)
        self.client.get(f'/api/admin/applications?page={page}&per_page=25', name='/api/admin/applications?page=N')

    @task(1)
    def search(self):
        self.client.get(f'/api/admin/applications?q={random.choice("aeiou")}', name='/api/admin/applications?q=X')

    @task(1)
    def students(self):
        self.client.get(f'/api/admin/students?page={random.randint(1, 30)}&per_page=25', name='/api/admin/students?page=N')

    @task(1)
    def drives(self):
        self.client.get('/api/admin/companies')
