# Benchmarks

Every number here was measured, and every script that produced it is in
[`benchmarks/`](benchmarks/) with its raw output in [`benchmarks/results/`](benchmarks/results/).

**Environment.** Laptop: Intel Core i5-11320H (4 cores / 8 threads), 16 GB RAM,
Windows 11. PostgreSQL 16.2 with pgvector 0.6.2 running locally. The API runs as
one Python 3.12 process (waitress, 32 threads). Locust and PostgreSQL ran on the
same machine as the API during load tests, so these are conservative numbers.

**Dataset** (`flask seed-large`, [`app/bulk_seed.py`](app/bulk_seed.py)): 3 colleges, 5,000
students (1,667 per college), 200 drives, 20,000 applications (every one passes
the eligibility trigger) and 20,000 audit events. Students and drives carry real
384-dimension embeddings from `BAAI/bge-small-en-v1.5`. Seeding takes about 3 minutes.

## Headline numbers

| What | Result |
|---|---|
| Admin applications query after composite indexes | **5.3 ms → 0.14 ms** (38× faster) |
| `/api/admin/applications` after pagination + eager loading | **1,081 ms → 26 ms**, response 2.7 MB → 21 KB |
| `/api/admin/students` after pagination + eager loading | **791 ms → 12 ms** |
| Exact per-college vector search (1,667 students) | **1.8 ms** median |
| HNSW index with a per-college filter | returned **13 of 50** rows (recall 0.26) → not used |
| Load test, 100 concurrent users | **47 req/s, p95 250 ms, 0 errors** |
| Throughput ceiling, one API process | **~61–63 req/s**, still 0 errors at 500 users |
| Job matching precision@5 (labelled synthetic set) | **0.95** (random 0.125, skills only 0.89) |
| Test coverage | **89%** of 2,242 statements, 58 tests |

## 1. Query optimisation (EXPLAIN ANALYZE)

[`benchmarks/db_benchmarks.py`](benchmarks/db_benchmarks.py) runs each query 25 times after 3 warm-ups
and reports PostgreSQL's own execution time. "Before" is the schema up to
Phase 5; "after" adds the composite indexes from migration
`7a9cf1d193df_performance_indexes`.

| Query | Before: median / p95 (ms) | After: median / p95 (ms) | Speed-up | Plan after |
|---|---|---|---|---|
| Admin applications page (newest 50, with names) | 5.284 / 5.987 | 0.137 / 0.163 | 38.6× | Index Scan using `ix_applications_college_applied` |
| Dashboard funnel (applications per status) | 1.168 / 1.303 | 0.571 / 0.900 | 2.0× | Index Only Scan using `ix_applications_college_status` |
| Eligible students for a drive | 1.386 / 1.622 | 0.664 / 1.011 | 2.1× | Bitmap Index Scan using `ix_students_college_branch_cgpa` |
| Upcoming drives for a student | 0.041 / 0.045 | 0.041 / 0.049 | 1.0× | Seq Scan (200 rows; an index doesn't help) |
| A student's applications | 0.021 / 0.036 | 0.020 / 0.026 | 1.1× | existing `ix_applications_student_id` |
| Application timeline | 0.009 / 0.014 | 0.008 / 0.014 | 1.1× | `ix_application_events_app_created` (replaces single-column index) |
| Placement report (placed students per branch) | 1.054 / 1.306 | 0.995 / 1.192 | 1.1× | Seq Scan (aggregates a third of the table) |

Indexes were only kept where they changed the plan; the last four rows show
queries that were already fast.

## 2. Vector search: exact vs HNSW

Candidate ranking ("Top candidates" for a drive) needs the nearest students
**within one college**. Measured on the same dataset:

| Approach | Median (ms) | Correct? |
|---|---|---|
| Exact scan of one college (1,667 students), `MATERIALIZED` CTE | 1.774 | Yes (exact) |
| Exact scan of all 5,000 students | 2.703 | Yes |
| HNSW, all students (`ef_search` 40) | 0.307 | Recall@50 = 0.80 |
| HNSW **plus the college filter** | 0.230 | **Only 13 of 50 rows returned, recall 0.26** |

The HNSW index is approximate: it gathers about 40 nearest neighbours across
all colleges and the college filter is applied afterwards, so most results are
discarded. The app therefore uses an exact per-college scan (2 ms is cheap at
this scale) and migration `7a9cf1d193df` drops the HNSW indexes. On pgvector 0.8+,
iterative index scans would make a filtered HNSW search viable for much larger
colleges.

## 3. Endpoint latency before and after

[`benchmarks/api_timings.py`](benchmarks/api_timings.py), one request after a warm-up, same dataset. The
admin lists used to return every row and loaded each row's student and drive
separately (N+1 queries); they now paginate (50 a page, server-side search) and
load related rows in the same query. Applicant counts moved into a SQL subquery.

| Endpoint | Before (ms) | After (ms) |
|---|---|---|
| `GET /api/admin/applications` | 1,081 (2.7 MB) | 26 (21 KB, one page) |
| `GET /api/admin/students` | 791 (881 KB) | 12 (29 KB) |
| `GET /api/admin/companies` | 178 | 21 |
| `GET /api/student/companies` | 106 | 24 |
| `GET /api/student/matches` | 75 | 37 |
| `GET /api/admin/dashboard` | 15 | 11 |
| `GET /api/student/dashboard` | 14 | 10 |

## 4. Load test

[`benchmarks/locustfile.py`](benchmarks/locustfile.py): 80% students (dashboard, drives, job matches,
applications, notifications) and 20% college admins (dashboard, paged and
searched applications, students, drives). Each user signs in once, then waits
1–3 s between requests. Users ramp up at 10 per second; each run lasts 90 s.

| Concurrent users | Requests | Failures | Throughput (req/s) | Median (ms) | p95 (ms) | p99 (ms) |
|---|---|---|---|---|---|---|
| 100 | 4,198 | 0 | 47.4 | 29 | 250 | 410 |
| 300 | 5,595 | 0 | 63.2 | 2,200 | 3,500 | 4,000 |
| 500 | 5,428 | 0 | 61.1 | 3,700 | 8,300 | 9,000 |

At 100 users the API keeps up with demand. Beyond that a single Python process
on this laptop (sharing its 4 cores with Locust and PostgreSQL) saturates at
about 60 requests per second: throughput stays flat while latency grows, and
no request fails. Sign-in is the most expensive call (median 320 ms at 100 users)
because passwords are hashed with scrypt on purpose.

Scaling beyond this means more API processes. The REST API is stateless (JWT
cookies) and Socket.IO already fans out through Redis, so several processes
behind a load balancer with sticky sessions for `/api/socket.io` scale this
horizontally.

## 5. Matching quality

[`benchmarks/matching_eval.py`](benchmarks/matching_eval.py) builds a labelled synthetic set with a
fixed seed: 8 role families (backend, frontend, data/ML, DevOps, embedded, VLSI,
mechanical, civil), 5 jobs each (40 jobs) and 7 students each (56 students).
Families overlap on purpose (backend and DevOps share Docker and AWS; embedded
and VLSI share Verilog and digital electronics), and every student lists 1–2
skills from other families and describes a project in plain language. A job is
relevant when it is in the student's family, so the best possible precision@5 is 1.0.

| Ranking method | Precision@5 |
|---|---|
| Random (expected) | 0.125 |
| Required-skill coverage only | 0.893 |
| Semantic similarity only, hash embedder | 0.861 |
| Combined score, hash embedder (offline fallback) | 0.889 |
| Semantic similarity only, `bge-small-en-v1.5` | 0.843 |
| **Combined score, `bge-small-en-v1.5` (app default)** | **0.950** |

Neither signal alone matches the combination used by the app
(0.55 × semantic similarity + 0.45 × required-skill coverage). The set is
synthetic and generated by a script, so treat it as a regression check and a
relative comparison, not as a claim about real-world accuracy.

## 6. Tests

58 tests (`pytest`, including tenant isolation, the policy engine, the
PostgreSQL trigger, live Socket.IO delivery, CSV import, offer expiry, resume
parsing, matching and mock interviews), run on both SQLite and PostgreSQL.
Line coverage is 89% (`pytest --cov=app`); the least-covered module is the bulk
seeding tool used only for these benchmarks.

## Reproducing

```bash
pip install -r requirements-dev.txt
```

```bash
flask --app run.py db upgrade
```

```bash
flask --app run.py seed-large
```

```bash
python benchmarks/db_benchmarks.py
```

```bash
python benchmarks/api_timings.py
```

```bash
waitress-serve --listen=127.0.0.1:5050 --threads=32 run:app
```

```bash
locust -f benchmarks/locustfile.py --host http://127.0.0.1:5050 --headless -u 100 -r 10 -t 90s --csv benchmarks/results/load_100
```

```bash
python benchmarks/matching_eval.py
```

Point `DATABASE_URL` at an empty PostgreSQL database with the `vector` extension available.
