"""
Aggregate statistics for the admin dashboard and reports.
All queries are scoped to the current college by app/tenancy.py.
"""
from sqlalchemy import func

from app.extensions import db
from app.models import Application, Company, Student


def _rate(part, whole):
    return round((part / whole * 100) if whole > 0 else 0, 1)


def overview_stats():
    total_students = Student.query.count()
    placed_students = Student.query.filter_by(placement_status='Placed').count()
    return {
        'total_students': total_students,
        'placed_students': placed_students,
        'total_companies': Company.query.count(),
        'total_applications': Application.query.count(),
        'placement_rate': _rate(placed_students, total_students),
    }


def status_funnel():
    """Number of applications currently in each status."""
    rows = db.session.execute(
        db.select(Application.status, func.count(Application.id)).group_by(Application.status)
    ).all()
    return {status: count for status, count in rows}


def branch_metrics():
    placed = func.sum(db.case((Student.placement_status == 'Placed', 1), else_=0))
    rows = db.session.execute(
        db.select(Student.branch, func.count(Student.id), placed).group_by(Student.branch).order_by(Student.branch)
    ).all()
    return [
        {'branch': branch, 'total': total, 'placed': int(placed or 0), 'rate': _rate(int(placed or 0), total)}
        for branch, total, placed in rows
    ]
