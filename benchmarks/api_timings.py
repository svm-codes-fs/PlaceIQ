"""
Single-request latency of the main API endpoints on a `flask seed-large`
database (in-process Flask test client, after one warm-up request).

    DATABASE_URL=postgresql+psycopg://... python benchmarks/api_timings.py
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import create_app  # noqa: E402

ENDPOINTS = {
    'bench_admin1': ['/api/admin/applications', '/api/admin/students', '/api/admin/dashboard', '/api/admin/companies'],
    'bench_s0': ['/api/student/dashboard', '/api/student/companies', '/api/student/matches',
                 '/api/student/applications'],
}


def main():
    app = create_app()
    password = app.config['BENCH_PASSWORD']
    print('| Endpoint | Time (ms) | Response size |')
    print('|---|---|---|')
    for username, urls in ENDPOINTS.items():
        client = app.test_client()
        assert client.post('/api/auth/login', json={'username': username, 'password': password}).status_code == 200
        for url in urls:
            client.get(url)
            start = time.perf_counter()
            response = client.get(url)
            elapsed = (time.perf_counter() - start) * 1000
            print(f'| `{url}` | {elapsed:.1f} | {len(response.data) / 1024:.1f} KB |')


if __name__ == '__main__':
    main()
