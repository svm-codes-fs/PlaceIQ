"""
Database benchmarks on a `flask seed-large` dataset (PostgreSQL + pgvector).

For each query the script runs EXPLAIN (ANALYZE) repeatedly and records the
median and p95 execution time reported by PostgreSQL, first on the schema
without the performance indexes, then with them. It also measures vector
search: exact per-college search vs. the HNSW index, including the recall
of HNSW when a tenant filter is applied.

    DATABASE_URL=postgresql://... python benchmarks/db_benchmarks.py
Writes benchmarks/results/db.json and prints Markdown tables.
"""
import json
import os
import statistics
import sys
import time

import psycopg

RUNS = 25
WARMUP = 3

# Created by migration 7a9cf1d193df "performance indexes" (same definitions as the models);
# dropped here to measure the baseline, which is the schema as it was before that migration
PERF_INDEXES = {
    'ix_applications_college_applied': 'CREATE INDEX ix_applications_college_applied ON applications (college_id, applied_date)',
    'ix_applications_college_status': 'CREATE INDEX ix_applications_college_status ON applications (college_id, status)',
    'ix_students_college_branch_cgpa': 'CREATE INDEX ix_students_college_branch_cgpa ON students (college_id, branch, cgpa)',
    'ix_companies_college_status_visit': 'CREATE INDEX ix_companies_college_status_visit ON companies (college_id, status, visit_date)',
    'ix_application_events_app_created': 'CREATE INDEX ix_application_events_app_created ON application_events (application_id, created_at)',
}
BASELINE_ONLY = 'CREATE INDEX IF NOT EXISTS ix_application_events_application_id ON application_events (application_id)'
HNSW = 'CREATE INDEX ix_students_embedding_hnsw ON students USING hnsw (embedding vector_cosine_ops)'


def connect():
    url = os.environ['DATABASE_URL'].replace('postgresql+psycopg://', 'postgresql://')
    return psycopg.connect(url, autocommit=True)


def params(conn):
    college_id = conn.execute('SELECT college_id FROM applications GROUP BY 1 ORDER BY count(*) DESC LIMIT 1').fetchone()[0]
    company = conn.execute(
        "SELECT id, min_cgpa, max_backlogs, string_to_array(allowed_branches, ','), embedding::text "
        "FROM companies WHERE college_id = %s AND status = 'Upcoming' ORDER BY id LIMIT 1", (college_id,)).fetchone()
    student_id = conn.execute('SELECT student_id FROM applications WHERE college_id = %s GROUP BY 1 '
                              'ORDER BY count(*) DESC LIMIT 1', (college_id,)).fetchone()[0]
    app_id = conn.execute('SELECT id FROM applications WHERE college_id = %s LIMIT 1', (college_id,)).fetchone()[0]
    return {'college_id': college_id, 'company_id': company[0], 'min_cgpa': company[1], 'max_backlogs': company[2],
            'branches': company[3], 'qvec': company[4], 'student_id': student_id, 'app_id': app_id}


QUERIES = [
    ('Admin applications page (newest 50, with names)',
     'SELECT a.id, s.name, c.name, a.status, a.applied_date FROM applications a '
     'JOIN students s ON s.id = a.student_id JOIN companies c ON c.id = a.company_id '
     'WHERE a.college_id = %(college_id)s ORDER BY a.applied_date DESC LIMIT 50'),
    ('Dashboard funnel (applications per status)',
     'SELECT status, count(*) FROM applications WHERE college_id = %(college_id)s GROUP BY status'),
    ('Eligible students for a drive',
     'SELECT id, name, cgpa FROM students WHERE college_id = %(college_id)s AND branch::text = ANY(%(branches)s) '
     'AND cgpa >= %(min_cgpa)s AND backlogs <= %(max_backlogs)s ORDER BY cgpa DESC'),
    ('Upcoming drives for a student',
     "SELECT id, name, package_lpa FROM companies WHERE college_id = %(college_id)s AND status = 'Upcoming' "
     'ORDER BY visit_date'),
    ("A student's applications",
     'SELECT id, status, company_id FROM applications WHERE student_id = %(student_id)s ORDER BY applied_date DESC'),
    ('Application timeline',
     'SELECT to_status, created_at FROM application_events WHERE application_id = %(app_id)s ORDER BY created_at'),
    ('Placement report (placed students per branch)',
     "SELECT branch, count(*), count(*) FILTER (WHERE placement_status = 'Placed') FROM students "
     'WHERE college_id = %(college_id)s GROUP BY branch'),
]

EXACT_VECTOR = (
    'WITH s AS MATERIALIZED (SELECT id, embedding <=> %(qvec)s::vector AS d FROM students '
    'WHERE college_id = %(college_id)s) SELECT id FROM s ORDER BY d LIMIT 50')
FILTERED_ANN = ('SELECT id FROM students WHERE college_id = %(college_id)s '
                'ORDER BY embedding <=> %(qvec)s::vector LIMIT 50')
GLOBAL_ANN = 'SELECT id FROM students ORDER BY embedding <=> %(qvec)s::vector LIMIT 50'


def timed(conn, sql, p):
    """Median and p95 of PostgreSQL's reported execution time (ms), plus the top plan node."""
    plan_sql = 'EXPLAIN (ANALYZE, FORMAT JSON) ' + sql
    samples, node = [], None
    for i in range(WARMUP + RUNS):
        plan = conn.execute(plan_sql, p).fetchone()[0][0]
        if i >= WARMUP:
            samples.append(plan['Execution Time'])
        node = _main_scan(plan['Plan'])
    samples.sort()
    return {'median_ms': round(statistics.median(samples), 3),
            'p95_ms': round(samples[int(len(samples) * 0.95) - 1], 3), 'plan': node}


def _main_scan(plan):
    """The most informative scan node in a plan (index name if one is used)."""
    if 'Index Name' in plan:
        return f'{plan["Node Type"]} using {plan["Index Name"]}'
    for child in plan.get('Plans', []):
        found = _main_scan(child)
        if found and 'Index' in found:
            return found
    if plan.get('Plans'):
        return _main_scan(plan['Plans'][0])
    return plan['Node Type']


def drop_perf_indexes(conn):
    for name in [*PERF_INDEXES, 'ix_students_embedding_hnsw', 'ix_companies_embedding_hnsw']:
        conn.execute(f'DROP INDEX IF EXISTS {name}')
    conn.execute(BASELINE_ONLY)
    conn.execute('ANALYZE')


def create_perf_indexes(conn):
    conn.execute('DROP INDEX IF EXISTS ix_application_events_application_id')
    for sql in PERF_INDEXES.values():
        conn.execute(sql)
    conn.execute('ANALYZE')


def main():
    conn = connect()
    p = params(conn)
    counts = {t: conn.execute(f'SELECT count(*) FROM {t}').fetchone()[0]
              for t in ('colleges', 'students', 'companies', 'applications', 'application_events')}
    college_students = conn.execute('SELECT count(*) FROM students WHERE college_id = %s', (p['college_id'],)).fetchone()[0]
    print('Dataset:', counts, f'(benchmark college has {college_students} students)', file=sys.stderr)

    drop_perf_indexes(conn)
    before = {name: timed(conn, sql, p) for name, sql in QUERIES}
    create_perf_indexes(conn)
    after = {name: timed(conn, sql, p) for name, sql in QUERIES}

    # Vector search
    exact_ids = [r[0] for r in conn.execute(EXACT_VECTOR, p).fetchall()]
    vector = {'exact_per_college': timed(conn, EXACT_VECTOR, p),
              'global_no_index': timed(conn, GLOBAL_ANN, p)}
    t = time.perf_counter()
    conn.execute(HNSW)
    vector['hnsw_build_s'] = round(time.perf_counter() - t, 2)
    conn.execute('ANALYZE students')
    vector['global_hnsw'] = timed(conn, GLOBAL_ANN, p)
    global_exact = [r[0] for r in conn.execute(
        'WITH s AS MATERIALIZED (SELECT id, embedding <=> %(qvec)s::vector AS d FROM students) '
        'SELECT id FROM s ORDER BY d LIMIT 50', p).fetchall()]
    global_hnsw = [r[0] for r in conn.execute(GLOBAL_ANN, p).fetchall()]
    vector['global_hnsw_recall_at_50'] = round(len(set(global_hnsw) & set(global_exact)) / 50, 3)
    filtered = [r[0] for r in conn.execute(FILTERED_ANN, p).fetchall()]
    vector['filtered_hnsw'] = timed(conn, FILTERED_ANN, p)
    vector['filtered_hnsw_rows_returned'] = len(filtered)
    vector['filtered_hnsw_recall_at_50'] = round(len(set(filtered) & set(exact_ids)) / 50, 3)

    result = {'dataset': counts, 'college_students': college_students, 'runs': RUNS,
              'postgres': conn.execute('SHOW server_version').fetchone()[0],
              'pgvector': conn.execute("SELECT extversion FROM pg_extension WHERE extname = 'vector'").fetchone()[0],
              'queries': {name: {'before': before[name], 'after': after[name]} for name, _ in QUERIES},
              'vector': vector}
    conn.execute('DROP INDEX ix_students_embedding_hnsw')  # leave the schema as the migrations define it
    os.makedirs(os.path.join(os.path.dirname(__file__), 'results'), exist_ok=True)
    with open(os.path.join(os.path.dirname(__file__), 'results', 'db.json'), 'w') as f:
        json.dump(result, f, indent=2, default=str)

    print('| Query | Before: median / p95 (ms) | After: median / p95 (ms) | Speed-up | Plan after |')
    print('|---|---|---|---|---|')
    for name, _ in QUERIES:
        b, a = before[name], after[name]
        print(f'| {name} | {b["median_ms"]} / {b["p95_ms"]} | {a["median_ms"]} / {a["p95_ms"]} | '
              f'{b["median_ms"] / max(a["median_ms"], 0.001):.1f}x | {a["plan"]} |')
    print()
    print(json.dumps(vector, indent=2))


if __name__ == '__main__':
    main()
