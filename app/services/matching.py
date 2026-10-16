"""
Resume-to-job matching.

score = 100 × (0.55 × semantic similarity + 0.45 × required-skill coverage)
(semantic similarity alone when a drive lists no required skills).

Eligibility is reported alongside the score, never hidden: a student sees the
best matches *and* which of them they can't apply to and why.

On PostgreSQL, candidate search for a drive narrows the college's students to
the CANDIDATE_POOL nearest by cosine distance (pgvector) and re-ranks those in
Python. The distance scan is deliberately *exact*: benchmarks showed an HNSW
index combined with the per-college filter returned only 13 of 50 requested
rows (recall 0.26), while an exact scan of a 1,667-student college takes
~2 ms (see BENCHMARKS.md).
"""
from app.extensions import db
from app.models import Company, Student
from app.services import embeddings
from app.services.skills import normalize_skills

SEMANTIC_WEIGHT = 0.55
SKILL_WEIGHT = 0.45
CANDIDATE_POOL = 200


def student_text(s):
    parts = [f'{s.branch} engineering student.']
    if s.skills:
        parts.append('Skills: ' + ', '.join(s.skills) + '.')
    if s.profile_summary:
        parts.append(s.profile_summary)
    return ' '.join(parts)


def company_text(c):
    parts = [f'{c.role_offered} at {c.name}.']
    if c.required_skills:
        parts.append('Required skills: ' + ', '.join(c.required_skills) + '.')
    if c.description:
        parts.append(c.description)
    return ' '.join(parts)


def _embed_objects(objects, text_fn):
    model, vectors = embeddings.embed([text_fn(o) for o in objects])
    for obj, vector in zip(objects, vectors):
        obj.embedding, obj.embedding_model = vector, model


def ensure_embeddings(objects, text_fn):
    """(Re-)embed objects that have no vector or one from a different model."""
    model = embeddings.model_name()
    stale = [o for o in objects if o.embedding is None or o.embedding_model != model]
    if stale:
        _embed_objects(stale, text_fn)
        db.session.commit()
    return objects


def refresh_student(student):
    _embed_objects([student], student_text)
    db.session.commit()


def refresh_company(company):
    _embed_objects([company], company_text)
    db.session.commit()


def score_pair(student, company):
    semantic = max(0.0, embeddings.cosine(_vec(student.embedding), _vec(company.embedding)))
    required = normalize_skills(company.required_skills)
    have = {s.lower() for s in normalize_skills(student.skills)}
    matched = [s for s in required if s.lower() in have]
    missing = [s for s in required if s.lower() not in have]
    if required:
        coverage = len(matched) / len(required)
        score = SEMANTIC_WEIGHT * semantic + SKILL_WEIGHT * coverage
    else:
        coverage, score = None, semantic
    return {
        'score': round(100 * score),
        'semantic': round(semantic, 3),
        'skill_coverage': None if coverage is None else round(coverage, 3),
        'matched_skills': matched,
        'missing_skills': missing,
    }


def _vec(value):
    return None if value is None else [float(x) for x in value]


def matches_for_student(student):
    """Every upcoming drive in the student's college, best match first."""
    from app.services.policies import PolicyEvaluator

    companies = Company.query.filter_by(status='Upcoming').all()
    ensure_embeddings(companies, company_text)
    ensure_embeddings([student], student_text)
    evaluator = PolicyEvaluator(student)
    statuses = {a.company_id: a.status for a in student.applications}

    results = []
    for c in companies:
        failures = evaluator.failures(c)
        results.append({'company': c, **score_pair(student, c), 'is_eligible': not failures,
                        'ineligibility_reasons': failures, 'application_status': statuses.get(c.id)})
    results.sort(key=lambda r: r['score'], reverse=True)
    return results


def candidates_for_company(company, limit=25):
    """The college's best-matching students for a drive, with eligibility."""
    from app.services.policies import PolicyEvaluator

    ensure_embeddings([company], company_text)
    query = Student.query
    if db.engine.dialect.name == 'postgresql':
        # Make sure every student has a vector from the current model
        model = embeddings.model_name()
        stale = Student.query.filter((Student.embedding.is_(None)) | (Student.embedding_model != model)).all()
        if stale:
            _embed_objects(stale, student_text)
            db.session.commit()
        # Exact nearest students in this college; MATERIALIZED stops the planner from
        # swapping in an approximate index that would drop filtered-out neighbours
        ranked = (db.select(Student.id, Student.embedding.cosine_distance(_vec(company.embedding)).label('distance'))
                  .where(Student.college_id == company.college_id)
                  .cte('ranked').prefix_with('MATERIALIZED'))
        ids = db.session.execute(
            db.select(ranked.c.id).order_by(ranked.c.distance).limit(CANDIDATE_POOL)).scalars().all()
        students = query.filter(Student.id.in_(ids)).all() if ids else []
    else:
        students = ensure_embeddings(query.all(), student_text)

    applied = {a.student_id: a.status for a in company.applications}
    results = []
    for s in students:
        failures = PolicyEvaluator(s).failures(company)
        results.append({'student': s, **score_pair(s, company), 'is_eligible': not failures,
                        'ineligibility_reasons': failures, 'application_status': applied.get(s.id)})
    results.sort(key=lambda r: (r['is_eligible'], r['score']), reverse=True)
    return results[:limit]
