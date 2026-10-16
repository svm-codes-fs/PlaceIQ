"""JSON shapes shared by the API endpoints."""


def _iso(value):
    return value.isoformat() if value else None


def user_json(user):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': user.role,
        'college': {'id': user.college.id, 'name': user.college.name, 'code': user.college.code}
        if user.college else None,
    }


def student_json(s):
    return {
        'id': s.id,
        'username': s.user.username,
        'roll_no': s.roll_no,
        'name': s.name,
        'email': s.email,
        'phone': s.phone or '',
        'branch': s.branch,
        'cgpa': float(s.cgpa),
        'backlogs': s.backlogs,
        'placement_status': s.placement_status,
        'skills': s.skills or [],
        'profile_summary': s.profile_summary or '',
    }


def company_json(c):
    return {
        'id': c.id,
        'name': c.name,
        'description': c.description,
        'role_offered': c.role_offered,
        'package_lpa': float(c.package_lpa),
        'min_cgpa': float(c.min_cgpa),
        'max_backlogs': c.max_backlogs,
        'allowed_branches': c.get_branches_list(),
        'required_skills': c.required_skills or [],
        'visit_date': _iso(c.visit_date),
        'status': c.status,
        'applicant_count': c.applicant_count,
    }


def application_json(a, allowed=None):
    data = {
        'id': a.id,
        'student_name': a.student.name,
        'student_roll': a.student.roll_no,
        'branch': a.student.branch,
        'company_id': a.company_id,
        'company_name': a.company.name,
        'role_offered': a.company.role_offered,
        'package_lpa': float(a.company.package_lpa),
        'applied_date': _iso(a.applied_date),
        'status': a.status,
        'offer_date': _iso(a.offer_date),
    }
    if allowed is not None:
        data['allowed_transitions'] = allowed
    return data
