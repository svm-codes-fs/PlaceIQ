"""
Aggregate statistics for the admin dashboard and reports.
"""
from app.models import Student, Company, Application


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


def branch_metrics():
    branch_data = {}
    for s in Student.query.all():
        data = branch_data.setdefault(s.branch, {'total': 0, 'placed': 0})
        data['total'] += 1
        if s.placement_status == 'Placed':
            data['placed'] += 1

    return [
        {'branch': branch, 'total': d['total'], 'placed': d['placed'], 'rate': _rate(d['placed'], d['total'])}
        for branch, d in branch_data.items()
    ]
