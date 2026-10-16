"""
Offline evaluation of job matching: precision@5 on a labelled synthetic set.

8 role families, 5 jobs each (40 jobs) and 7 students per family (56 students).
Families deliberately overlap (backend vs DevOps share Docker/AWS; embedded vs
VLSI share Verilog/Digital Electronics); students carry 1-2 skills from other
families and describe projects in plain language, not just skill names.
A job is relevant to a student when it belongs to the student's family, so
each student has exactly 5 relevant jobs and the best possible precision@5 is 1.0.

Compares: random ranking, required-skill coverage only, semantic similarity
only, and the app's combined score (app/services/matching.py), with both the
fastembed model and the offline hash embedder.

    python benchmarks/matching_eval.py      -> benchmarks/results/matching.json
"""
import json
import os
import random
import sys
from types import SimpleNamespace

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

FAMILIES = {
    'backend': {
        'skills': ['Java', 'Spring Boot', 'SQL', 'PostgreSQL', 'Microservices', 'REST APIs', 'Docker', 'System Design'],
        'roles': ['Backend Engineer', 'Java Developer', 'API Platform Engineer', 'SDE - Payments', 'Server Engineer'],
        'jd': 'Design and build scalable server-side services, APIs and databases for high-traffic products.',
        'projects': ['built a payments service that processes refunds through a queue',
                     'wrote APIs for a library management system with role-based access',
                     'designed the database schema for a food delivery backend'],
    },
    'frontend': {
        'skills': ['JavaScript', 'TypeScript', 'React', 'Next.js', 'HTML', 'CSS', 'Tailwind CSS'],
        'roles': ['Frontend Engineer', 'UI Developer', 'React Developer', 'Web Developer', 'Frontend SDE'],
        'jd': 'Build fast, accessible web interfaces and reusable component libraries for customers.',
        'projects': ['made a responsive portfolio site with animations', 'built a drag-and-drop kanban board in the browser',
                     'created an accessible design system of UI components'],
    },
    'data_ml': {
        'skills': ['Python', 'Machine Learning', 'Deep Learning', 'PyTorch', 'Pandas', 'NLP', 'Statistics', 'scikit-learn'],
        'roles': ['ML Engineer', 'Data Scientist', 'Applied Scientist', 'AI Engineer', 'Data Science Intern'],
        'jd': 'Train and evaluate models on large datasets and ship predictions into production.',
        'projects': ['trained a model to predict crop yield from satellite data', 'built a sentiment classifier for reviews',
                     'forecasted electricity demand with time-series models'],
    },
    'devops': {
        'skills': ['Docker', 'Kubernetes', 'AWS', 'Linux', 'CI/CD', 'Bash', 'Git'],
        'roles': ['DevOps Engineer', 'Site Reliability Engineer', 'Cloud Engineer', 'Platform Engineer', 'Infra Engineer'],
        'jd': 'Automate deployments, run reliable cloud infrastructure and keep services observable and secure.',
        'projects': ['automated deployments with pipelines and containers', 'set up monitoring and alerting for a cluster',
                     'migrated a college lab server to the cloud'],
    },
    'embedded': {
        'skills': ['Embedded C', 'Microcontrollers', 'C', 'IoT', 'PCB Design', 'Digital Electronics'],
        'roles': ['Embedded Engineer', 'Firmware Developer', 'IoT Engineer', 'Embedded Software Engineer', 'Device Engineer'],
        'jd': 'Write firmware for low-power devices and bring up new hardware boards with sensors.',
        'projects': ['programmed a sensor node that reports soil moisture over LoRa', 'built a smart energy meter board',
                     'wrote a driver for a temperature sensor on a microcontroller'],
    },
    'vlsi': {
        'skills': ['Verilog', 'VHDL', 'FPGA', 'Digital Electronics', 'Analog Circuits', 'MATLAB'],
        'roles': ['VLSI Design Engineer', 'ASIC Verification Engineer', 'FPGA Engineer', 'Chip Design Engineer',
                  'Physical Design Engineer'],
        'jd': 'Design and verify digital logic for chips, from RTL to timing closure.',
        'projects': ['implemented a pipelined processor in RTL', 'designed a low-power adder and verified its timing',
                     'built an image filter on programmable logic'],
    },
    'mechanical': {
        'skills': ['SolidWorks', 'AutoCAD', 'CATIA', 'ANSYS', 'CFD', 'Manufacturing', 'Thermodynamics'],
        'roles': ['Design Engineer', 'Product Design Engineer', 'Production Engineer', 'CAE Analyst', 'Mechanical Engineer'],
        'jd': 'Design mechanical components, run simulations and support manufacturing on the shop floor.',
        'projects': ['designed a lightweight chassis for a student racing car', 'optimised airflow over a heat sink',
                     'reduced scrap on a machining line during an internship'],
    },
    'civil': {
        'skills': ['AutoCAD', 'STAAD Pro', 'Revit', 'Structural Analysis', 'Surveying', 'Project Management'],
        'roles': ['Site Engineer', 'Structural Engineer', 'Planning Engineer', 'Civil Design Engineer', 'Quantity Surveyor'],
        'jd': 'Plan and supervise construction of buildings and infrastructure, from drawings to site execution.',
        'projects': ['designed a G+4 residential building', 'surveyed a campus road widening project',
                     'estimated materials for a bridge rehabilitation'],
    },
}
JOBS_PER_FAMILY, STUDENTS_PER_FAMILY, K = 5, 7, 5


def build(seed=7):
    rng = random.Random(seed)
    jobs, students = [], []
    for family, f in FAMILIES.items():
        for role in f['roles']:
            jobs.append(SimpleNamespace(family=family, name=f'{role} Co', role_offered=role,
                                        required_skills=rng.sample(f['skills'], k=rng.randint(4, 5)),
                                        description=f['jd'], embedding=None))
        others = [s for fam, g in FAMILIES.items() if fam != family for s in g['skills']]
        for _ in range(STUDENTS_PER_FAMILY):
            skills = rng.sample(f['skills'], k=rng.randint(3, 5)) + rng.sample(others, k=rng.randint(1, 2))
            rng.shuffle(skills)
            students.append(SimpleNamespace(family=family, branch='CSE', skills=skills, embedding=None,
                                            profile_summary=f'Final-year student who {rng.choice(f["projects"])}.'))
    return jobs, students


def precision_at_k(students, jobs, score):
    total = 0.0
    for s in students:
        ranked = sorted(jobs, key=lambda j: score(s, j), reverse=True)[:K]
        total += sum(j.family == s.family for j in ranked) / K
    return round(total / len(students), 3)


def evaluate(backend):
    from app import create_app
    from app.services import embeddings, matching

    app = create_app('testing')
    app.config['EMBEDDING_BACKEND'] = backend
    with app.app_context():
        jobs, students = build()
        _, job_vecs = embeddings.embed([matching.company_text(j) for j in jobs])
        _, stu_vecs = embeddings.embed([matching.student_text(s) for s in students])
        for j, v in zip(jobs, job_vecs):
            j.embedding = v
        for s, v in zip(students, stu_vecs):
            s.embedding = v
        model = embeddings.model_name()
        results = {
            'semantic_only': precision_at_k(students, jobs, lambda s, j: embeddings.cosine(s.embedding, j.embedding)),
            'combined': precision_at_k(students, jobs, lambda s, j: matching.score_pair(s, j)['score']
                                       + 1e-6 * matching.score_pair(s, j)['semantic']),
        }
        return model, results, jobs, students


def main():
    rng = random.Random(0)
    fe_model, fe, jobs, students = evaluate('fastembed')
    hash_model, hs, _, _ = evaluate('hash')
    from app.services import matching

    def coverage(s, j):
        return matching.score_pair(SimpleNamespace(skills=s.skills, embedding=None),
                                   SimpleNamespace(required_skills=j.required_skills, embedding=None))['skill_coverage']

    result = {
        'jobs': len(jobs), 'students': len(students), 'families': len(FAMILIES), 'k': K,
        'precision_at_5': {
            'random (expected)': round(JOBS_PER_FAMILY / len(jobs), 3),
            'random (one draw)': precision_at_k(students, jobs, lambda s, j: rng.random()),
            'skill coverage only': precision_at_k(students, jobs, coverage),
            f'semantic only ({hash_model})': hs['semantic_only'],
            f'combined ({hash_model})': hs['combined'],
            f'semantic only ({fe_model})': fe['semantic_only'],
            f'combined ({fe_model}) [app default]': fe['combined'],
        },
    }
    os.makedirs(os.path.join(os.path.dirname(__file__), 'results'), exist_ok=True)
    with open(os.path.join(os.path.dirname(__file__), 'results', 'matching.json'), 'w') as f:
        json.dump(result, f, indent=2)
    print('| Ranking method | Precision@5 |')
    print('|---|---|')
    for name, value in result['precision_at_5'].items():
        print(f'| {name} | {value} |')


if __name__ == '__main__':
    main()
