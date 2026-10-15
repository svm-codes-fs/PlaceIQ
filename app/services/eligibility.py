"""
Eligibility rules for a student applying to a company.

Returns every failed rule rather than a single yes/no, so the UI can
explain *why* a student can't apply (extended into the policy engine in Phase 2).
"""


def eligibility_failures(student, company):
    """Return a list of human-readable reasons the student is not eligible."""
    failures = []
    if student.cgpa < company.min_cgpa:
        failures.append(f'CGPA {student.cgpa} is below the cutoff of {company.min_cgpa}.')
    if student.backlogs > company.max_backlogs:
        failures.append(f'{student.backlogs} backlog(s) exceeds the limit of {company.max_backlogs}.')
    if student.branch not in company.get_branches_list():
        failures.append(f'Branch {student.branch} is not in the allowed branches ({company.allowed_branches}).')
    return failures


def is_eligible(student, company):
    return not eligibility_failures(student, company)
