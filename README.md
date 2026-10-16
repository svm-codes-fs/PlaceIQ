# PlaceIQ — Campus Placement Platform

A multi-college placement platform: students register and apply to recruitment drives, college placement cells run the hiring pipeline, and a platform admin onboards colleges. Each college's data is isolated from every other college's.

Started as the UCS310 Database Management Systems project at Thapar Institute of Engineering and Technology, and being upgraded step by step into a production-style application.

## Features

**Students**
- Self-registration into their college
- See every drive at their college and, for drives they can't apply to, exactly why (e.g. "CGPA 6.90 is below the cutoff of 7.50")
- Apply, track each application through the pipeline, and accept or decline offers

**College admins (placement cell)**
- Dashboard with placement statistics and a live recruitment funnel
- Add, edit and delete students and drives; set eligibility rules (minimum CGPA, maximum backlogs, allowed branches)
- See which students are eligible for a drive
- Move applications through the pipeline; export results as CSV
- Branch-wise placement report

**Super admin**
- Add colleges with their first admin; platform-wide statistics per college

## How it works

**Multi-tenancy.** Students, drives and applications carry a `college_id`. SQLAlchemy session hooks in [`app/tenancy.py`](app/tenancy.py) add the current user's college to every query and refuse writes to another college's rows, so an endpoint can't leak data even if it forgets a filter. Tests prove two colleges can't read or modify each other's records.

**Application pipeline.** Status moves through a fixed state machine ([`app/services/applications.py`](app/services/applications.py)):

```
Applied → Shortlisted → Interview → Offered → Accepted   (student)
                                          └─→ Declined   (student)
Any stage before Accepted ───────────────────→ Rejected   (admin)
```

Accepting an offer marks the student as placed.

**Authentication.** JWT access (15 min) and refresh (7 day) tokens in httpOnly cookies, with CSRF protection on state-changing requests. Roles: `super_admin`, `college_admin`, `student`.

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| API | Flask (REST), SQLAlchemy, Flask-JWT-Extended |
| Database | PostgreSQL 16 with pgvector (SQLite for quick local runs), Alembic migrations |
| Background jobs | Celery + Redis |
| Tooling | Docker Compose, pytest, ruff, GitHub Actions |

## Getting started

### With Docker (full stack)

```bash
docker compose up --build
```

Starts PostgreSQL, Redis, the API, a Celery worker and scheduler, and the frontend. Migrations and demo data are applied automatically. Open http://localhost:3000.

### Without Docker (SQLite)

Requires Python 3.12 and Node 20.

```bash
pip install -r requirements-dev.txt
```

```bash
flask --app run.py db upgrade
```

```bash
flask --app run.py seed
```

```bash
python run.py
```

In a second terminal:

```bash
npm --prefix frontend install
```

```bash
npm --prefix frontend run dev
```

Open http://localhost:3000. Settings are read from a `.env` file; see [`.env.example`](.env.example).

### Demo accounts

`flask seed` creates two colleges with demo data. Every demo account uses the password set in `SEED_PASSWORD` (default `password123`; change it for anything other than local use).

| Role | Username |
|---|---|
| Super admin | `superadmin` |
| College admin | `tiet_admin`, `dit_admin` |
| Student | `aarav_tiet`, `diya_tiet`, `rohan_tiet`, `neha_dit`, … |

## Tests

```bash
pytest --cov=app
```

CI runs lint, the migrations (upgrade, seed, downgrade) and the test suite against PostgreSQL, and builds the frontend.

## Project structure

```
├── app/
│   ├── api/          REST endpoints (auth, student, admin, super admin)
│   ├── services/     Business logic: eligibility, applications, accounts, companies, reports
│   ├── models/       SQLAlchemy models
│   ├── tasks/        Celery tasks
│   ├── tenancy.py    Per-college data isolation
│   ├── security.py   JWT authentication and role checks
│   └── cli.py        `flask seed`
├── migrations/       Alembic migrations
├── frontend/         React app
├── tests/            pytest suite
├── sql/              Original MySQL course scripts (procedures and triggers; superseded by migrations)
├── docker-compose.yml
└── PROJECT_REPORT.md Original DBMS course report
```
