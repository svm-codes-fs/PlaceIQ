# Placement Management System

A web application that runs a college's campus placement process end to end: student registration and profiles, recruiting companies with eligibility rules, applications, results and placement reports. Built as the UCS310 Database Management Systems project at Thapar Institute of Engineering and Technology.

The project shows core DBMS concepts working inside a real application: a schema in third normal form, stored procedures, triggers, multi-table joins and aggregate reports.

## Features

**Students**
- Register and maintain a profile (roll number, branch, CGPA, backlogs)
- See only the companies they are eligible for, and apply in one click
- Track the status of every application

**Administrators (placement cell)**
- Dashboard with placement statistics
- Add, edit and delete students and companies
- Set each company's eligibility: minimum CGPA, maximum backlogs, allowed branches
- Move applications through the funnel: Applied → Shortlisted → Interview → Offered / Rejected
- Record final results; a selected student is marked Placed automatically

**Reports**
- Company-wise placement report (applications, selected, rejected)
- Eligibility list for any company

## How eligibility works

A student can apply to a company only if they are **unplaced**, their **CGPA ≥ the company's minimum**, their **backlogs ≤ the company's maximum**, and their **branch** is in the allowed list. The check is enforced twice:

1. In the `apply_to_company` stored procedure (and in Python as a fallback), and
2. In the `trg_before_application_insert` trigger, so an ineligible application is rejected by the database even if the application code is bypassed.

When a result is recorded, the `trg_after_result_insert` trigger updates the application status and, for a selection, sets the student's status to Placed.

## Tech stack

| Layer | Tools |
|---|---|
| Backend | Python, Flask, Flask-Login, Flask-SQLAlchemy, Flask-Migrate |
| Database | MySQL 8 (stored procedures and triggers) or SQLite for quick local runs |
| Frontend | Jinja2 templates, HTML, CSS, JavaScript |
| Security | Hashed passwords (Werkzeug), role-based access for admin and student |

## Getting started

Requires Python 3.10 or newer.

```bash
pip install -r requirements.txt
```

```bash
python run.py
```

Then open http://127.0.0.1:5000.

By default the app uses a local SQLite file (`placement.db`), so it runs with no database setup. Stored procedures and triggers are MySQL features; on SQLite the app falls back to equivalent Python logic.

### Using MySQL (full DBMS features)

1. Run the scripts in order in MySQL 8:

    ```bash
    mysql -u root -p < sql/01_schema.sql
    ```

    ```bash
    mysql -u root -p < sql/02_procedures.sql
    ```

    ```bash
    mysql -u root -p < sql/03_triggers.sql
    ```

    ```bash
    mysql -u root -p < sql/04_seed.sql
    ```

2. Create a `.env` file in the project root:

    ```
    DATABASE_URL=mysql+pymysql://root:<your-password>@localhost:3306/placement_db
    SECRET_KEY=<a long random string>
    ```

3. Start the app with `python run.py`.

### Default login

An admin account is created on first run: username `admin`, password `admin123`. **Change this password before using the app anywhere other than your own machine.** Students create their own accounts from the Register page.

## Database design

| Table | Holds |
|---|---|
| `users` | Login accounts with a role (admin or student) |
| `students` | Academic profile: roll number, branch, CGPA, backlogs, placement status |
| `companies` | Recruiters, role, package (LPA), eligibility rules, visit date, status |
| `applications` | Student ↔ company link (many-to-many) with the application status |
| `results` | Final outcome for an application (Selected / Not Selected) |

| Stored procedure | Purpose |
|---|---|
| `check_eligibility` | Is this student eligible for this company? |
| `apply_to_company` | Validate and create an application |
| `get_eligible_companies` | Companies a student may apply to |
| `get_placement_report` | Company-wise report with joins and aggregates |
| `get_eligibility_list` | Eligible students for a company |
| `record_result` | Record a final result |

The full design, ER diagram and testing are in [`PROJECT_REPORT.md`](PROJECT_REPORT.md) (also available as PDF).

## Project structure

```
├── run.py                 Entry point
├── requirements.txt
├── app/
│   ├── __init__.py        App factory, login manager, default admin
│   ├── config.py          Settings (database URL, secret key)
│   ├── models.py          SQLAlchemy models for the five tables
│   ├── routes/            auth, admin, student and reports blueprints
│   ├── templates/         Pages for each role
│   └── static/            CSS and JavaScript
├── sql/                   MySQL schema, procedures, triggers and seed data
└── PROJECT_REPORT.md      Project report
```
