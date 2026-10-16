"""
AI mock interviews.

Questions are generated in a background task from the drive's job description
and the student's own profile; answers are scored in another task on
correctness, clarity and depth (0-10 each) with written feedback.

With a Claude API key both steps use Claude (app/services/ai.py). Without one,
a built-in question bank and a transparent keyword rubric are used, and the
session records which ran (generator / scorer) so the UI can say so.
"""
import random
import re

from app.extensions import db
from app.models import Company, InterviewQuestion, InterviewSession, ROUND_TYPES
from app.models.college import utcnow
from app.services.accounts import ValidationError

MIN_QUESTIONS, MAX_QUESTIONS = 3, 8
ROUND_LABELS = {'technical': 'technical', 'hr': 'HR', 'behavioral': 'behavioural'}


# ---- Creating and answering ----------------------------------------------------

def create_session(student, data):
    round_type = data.get('round_type') or 'technical'
    if round_type not in ROUND_TYPES:
        raise ValidationError([f'Round must be one of {", ".join(ROUND_TYPES)}.'])
    try:
        count = int(data.get('count') or 5)
    except (TypeError, ValueError):
        count = 5
    count = max(MIN_QUESTIONS, min(MAX_QUESTIONS, count))
    company = None
    if data.get('company_id'):
        company = db.session.get(Company, int(data['company_id']))
        if not company:
            raise ValidationError(['That drive does not exist.'])

    session = InterviewSession(student=student, college_id=student.college_id, company=company,
                               round_type=round_type, status='generating')
    db.session.add(session)
    db.session.commit()

    from app.tasks import enqueue
    from app.tasks.jobs import generate_interview
    enqueue(generate_interview, session.id, count)
    return session


def save_answer(session, question_id, data):
    if session.status != 'ready':
        raise ValidationError(['This interview is no longer accepting answers.'])
    question = next((q for q in session.questions if q.id == question_id), None)
    if not question:
        raise ValidationError(['Unknown question.'])
    question.answer = (data.get('answer') or '').strip()[:6000]
    try:
        question.time_taken_s = max(0, int(data.get('time_taken_s') or 0))
    except (TypeError, ValueError):
        question.time_taken_s = None
    db.session.commit()
    return question


def submit(session):
    if session.status != 'ready':
        raise ValidationError(['This interview has already been submitted.'])
    if not any((q.answer or '').strip() for q in session.questions):
        raise ValidationError(['Answer at least one question before submitting.'])
    session.status = 'scoring'
    db.session.commit()

    from app.tasks import enqueue
    from app.tasks.jobs import score_interview
    enqueue(score_interview, session.id)
    return session


# ---- Generation ------------------------------------------------------------------

def context_for(session):
    s, c = session.student, session.company
    lines = [f'Candidate: final-year {s.branch} student, CGPA {s.cgpa}.']
    if s.skills:
        lines.append('Candidate skills: ' + ', '.join(s.skills) + '.')
    if s.profile_summary:
        lines.append('Candidate background: ' + s.profile_summary)
    if c:
        lines.append(f'Role: {c.role_offered} at {c.name} (₹{c.package_lpa} LPA).')
        if c.required_skills:
            lines.append('Required skills: ' + ', '.join(c.required_skills) + '.')
        if c.description:
            lines.append('Job description: ' + c.description)
    else:
        lines.append('Role: general campus placement interview for their branch.')
    return '\n'.join(lines)


def generate(session, count):
    from app.services import ai

    questions, generator, error = None, None, None
    if ai.ai_enabled():
        try:
            generated = ai.generate_questions(context_for(session), ROUND_LABELS[session.round_type], count)
            questions = [(q.question, q.focus, q.ideal_answer_points) for q in generated]
            generator = 'claude'
        except ai.AIError as e:
            error = f'AI question generation failed ({e}); used the question bank instead.'
    if not questions:
        questions, generator = bank_questions(session, count), 'question_bank'

    for position, (question, focus, points) in enumerate(questions):
        db.session.add(InterviewQuestion(session=session, college_id=session.college_id, position=position,
                                         question=question, focus=focus[:120], ideal_points=list(points)[:6]))
    session.status, session.generator, session.error = 'ready', generator, error
    db.session.commit()
    return session


TECHNICAL_TEMPLATES = [
    ('Explain how you have used {skill} in a project. What problem did it solve and what would you do differently?',
     ['Concrete project and your role', 'Why {skill} fit the problem', 'A specific challenge and how you solved it',
      'Measurable outcome', 'What you would improve']),
    ('What are the core concepts of {skill} that an engineer must understand well? Give an example of each.',
     ['Names the key concepts of {skill}', 'Explains each correctly', 'Gives a concrete example',
      'Mentions common pitfalls or trade-offs']),
    ('Describe a bug or failure you hit while working with {skill}. How did you debug it?',
     ['Clear description of the symptom', 'Systematic debugging steps', 'Root cause', 'Fix and how you verified it',
      'What you learned']),
    ('How would you explain {skill} to a first-year student, and when would you NOT use it?',
     ['Simple, accurate explanation', 'Analogy or example', 'Limitations of {skill}', 'Alternatives and when to prefer them']),
]
GENERIC_TECHNICAL = {
    'CSE': [('Design a URL shortener. Walk through the API, data model and how it scales.',
             ['API endpoints', 'Data model and ID generation', 'Caching for reads', 'Scaling and replication',
              'Handling collisions and expiry'], 'System Design'),
            ('Explain the difference between a process and a thread, with an example of when to use each.',
             ['Memory isolation vs shared memory', 'Cost of creation and context switch', 'Example use cases',
              'Synchronisation concerns'], 'Operating Systems')],
    'ECE': [('Explain how you would debounce a mechanical button on a microcontroller.',
             ['Why bouncing happens', 'Hardware RC filter option', 'Software timing approach',
              'Interrupt vs polling trade-off'], 'Embedded Systems')],
    'EE': [('Explain the working of a PID controller and how you would tune it.',
            ['Role of P, I and D terms', 'Effect on rise time, overshoot, steady-state error',
             'A tuning method such as Ziegler-Nichols', 'Practical issues like integral windup'], 'Control Systems')],
    'ME': [('How would you select a material for a load-bearing bracket? Walk through your reasoning.',
            ['Loads and failure modes', 'Strength, stiffness and fatigue', 'Cost and manufacturability',
             'Validation via FEA or testing'], 'Design')],
    'CE': [('Walk through how you would design a reinforced concrete beam.',
            ['Loads and load combinations', 'Bending moment and shear', 'Reinforcement and code checks',
             'Serviceability: deflection and cracking'], 'Structural Design')],
    'CHE': [('Explain how you would scale up a reaction from lab to pilot plant.',
             ['Heat and mass transfer changes', 'Mixing', 'Safety and hazard analysis', 'Process control'],
             'Process Engineering')],
}
HR_QUESTIONS = [
    ('Tell me about yourself and why you are interested in this role.',
     ['Concise background', 'Relevant skills and projects', 'Clear link to the role', 'Genuine motivation'], 'Introduction'),
    ('Where do you see yourself in five years?',
     ['Realistic growth path', 'Connection to the company', 'Skills you plan to build'], 'Career goals'),
    ('What is your biggest weakness and what are you doing about it?',
     ['Honest, real weakness', 'Its impact', 'Concrete steps to improve', 'Evidence of progress'], 'Self-awareness'),
    ('Why should we hire you over other candidates?',
     ['Specific strengths', 'Evidence from projects or internships', 'Fit with the role', 'Confident but not arrogant'],
     'Value proposition'),
    ('How do you handle pressure and tight deadlines?',
     ['Concrete example', 'Prioritisation approach', 'Communication', 'Outcome'], 'Stress management'),
]
BEHAVIORAL_QUESTIONS = [
    ('Tell me about a time you disagreed with a teammate. How did you resolve it?',
     ['Situation and stakes', 'Your perspective and theirs', 'Actions to resolve it', 'Result and what you learned'],
     'Teamwork'),
    ('Describe a time you failed. What happened and what did you learn?',
     ['Real failure, owned', 'Cause analysis', 'Recovery actions', 'Lasting lesson'], 'Resilience'),
    ('Tell me about a time you took the lead without being asked.',
     ['Situation', 'Initiative you took', 'How you brought others along', 'Measurable result'], 'Leadership'),
    ('Describe a situation where you had to learn something new quickly.',
     ['Context and deadline', 'Learning strategy', 'How you applied it', 'Outcome'], 'Learning agility'),
    ('Tell me about a time you had to explain a complex idea to a non-technical person.',
     ['Audience and goal', 'How you simplified it', 'Checking understanding', 'Result'], 'Communication'),
]


def bank_questions(session, count):
    """Questions from the built-in bank as (question, focus, ideal_points)."""
    rng = random.Random(session.id)

    def shuffled(bank):
        pool = [(q, focus, points) for q, points, focus in bank]
        rng.shuffle(pool)
        return pool

    if session.round_type == 'hr':
        return shuffled(HR_QUESTIONS)[:count]
    if session.round_type == 'behavioral':
        return shuffled(BEHAVIORAL_QUESTIONS)[:count]

    skills = list(dict.fromkeys((session.company.required_skills if session.company else [])
                                + (session.student.skills or [])))
    questions = []
    for skill in skills[:count - 1]:
        template, points = rng.choice(TECHNICAL_TEMPLATES)
        questions.append((template.format(skill=skill), skill, [p.format(skill=skill) for p in points]))
    generic = GENERIC_TECHNICAL.get(session.student.branch, GENERIC_TECHNICAL['CSE'])
    questions += [(q, focus, points) for q, points, focus in generic]
    questions += shuffled(BEHAVIORAL_QUESTIONS)
    return questions[:count]


# ---- Scoring --------------------------------------------------------------------

def score(session):
    from app.services import ai

    questions = session.questions
    scorer, error, overall_feedback = None, None, None
    if ai.ai_enabled():
        try:
            scores = ai.score_answers(context_for(session), ROUND_LABELS[session.round_type],
                                      [(q.question, q.ideal_points, q.answer) for q in questions])
            by_index = {a.question_index: a for a in scores.answers}
            if any(i not in by_index for i in range(len(questions))):
                raise ai.AIError('the model skipped some answers')
            for i, q in enumerate(questions):
                a = by_index[i]
                q.correctness, q.clarity, q.depth = (_clamp(a.correctness), _clamp(a.clarity), _clamp(a.depth))
                q.feedback = a.feedback
            overall_feedback, scorer = scores.overall_feedback, 'claude'
        except ai.AIError as e:
            error = f'AI scoring failed ({e}); used the offline rubric instead.'
    if scorer is None:
        for q in questions:
            q.correctness, q.clarity, q.depth, q.feedback = rubric_score(q)
        overall_feedback, scorer = rubric_overall(questions), 'rubric'

    scored = [q.score for q in questions if q.score is not None]
    session.overall_score = round(sum(scored) / len(scored), 1) if scored else 0
    session.overall_feedback, session.scorer, session.error = overall_feedback, scorer, error
    session.status, session.completed_at = 'completed', utcnow()
    db.session.commit()
    return session


def _clamp(value):
    return max(0, min(10, int(value)))


_WORD = re.compile(r'[a-z0-9+#]+')
_STOP = set('a an the and or of to in on for with by is are be as at it its this that how what why when you your '
            'from into about over than then their they them was were will would can could should'.split())
_DEPTH_MARKERS = ('because', 'for example', 'for instance', 'trade-off', 'tradeoff', 'which meant', 'so that',
                  'measured', 'result', 'instead', 'however', '%')


def _keywords(text):
    return {w for w in _WORD.findall(text.lower()) if w not in _STOP and len(w) > 2}


def rubric_score(question):
    """Transparent offline rubric: coverage of the ideal points, structure and evidence of depth."""
    answer = (question.answer or '').strip()
    if len(answer.split()) < 12:
        return 0, 0, 0, 'No real answer was given. Even a partial answer earns credit — structure your thoughts and try.'

    words = answer.split()
    answer_kw = _keywords(answer)
    covered, missed = [], []
    for point in question.ideal_points:
        kw = _keywords(point)
        hit = len(kw & answer_kw) / len(kw) if kw else 0
        (covered if hit >= 0.34 else missed).append(point)
    coverage = len(covered) / len(question.ideal_points) if question.ideal_points else 0.5

    sentences = [s for s in re.split(r'[.!?]+', answer) if s.strip()]
    clarity = 4 + (2 if 40 <= len(words) <= 250 else 0) + (2 if len(sentences) >= 3 else 0) \
        + (1 if any(m in answer.lower() for m in ('first', 'second', 'finally', 'situation', 'result')) else 0) \
        + (1 if len(words) >= 25 else 0)
    depth = 2 + min(5, sum(answer.lower().count(m) for m in _DEPTH_MARKERS) * 2) \
        + (2 if re.search(r'\d', answer) else 0) + (1 if len(words) > 80 else 0)
    correctness = round(2 + 8 * coverage)

    feedback = []
    if covered:
        feedback.append('You covered: ' + '; '.join(covered[:3]) + '.')
    if missed:
        feedback.append('Strengthen your answer by addressing: ' + '; '.join(missed[:3]) + '.')
    if depth < 5:
        feedback.append('Add a concrete example or a number to show depth.')
    if clarity < 6:
        feedback.append('Structure it in a few clear sentences (situation, approach, result).')
    return min(10, correctness), min(10, clarity), min(10, depth), ' '.join(feedback)


def rubric_overall(questions):
    scores = [(q.score or 0, q) for q in questions]
    best = max(scores, key=lambda s: s[0])[1]
    weakest = min(scores, key=lambda s: s[0])[1]
    avg_depth = sum(q.depth or 0 for q in questions) / len(questions)
    tips = [f'Strongest answer: "{best.focus or best.question[:60]}".',
            f'Practise next: "{weakest.focus or weakest.question[:60]}".']
    if avg_depth < 5:
        tips.append('Across answers, back claims with specific examples, numbers and trade-offs.')
    tips.append('Scored with the offline rubric (keyword coverage, structure, evidence); add a Claude API key '
                'for detailed AI feedback.')
    return ' '.join(tips)


# ---- Serialisation and progress ----------------------------------------------------

def session_json(session, with_questions=True):
    data = {
        'id': session.id,
        'round_type': session.round_type,
        'company': {'id': session.company.id, 'name': session.company.name,
                    'role_offered': session.company.role_offered} if session.company else None,
        'status': session.status,
        'generator': session.generator,
        'scorer': session.scorer,
        'overall_score': session.overall_score,
        'overall_feedback': session.overall_feedback,
        'error': session.error,
        'created_at': session.created_at.isoformat(),
        'completed_at': session.completed_at.isoformat() if session.completed_at else None,
        'question_count': len(session.questions),
    }
    if with_questions:
        done = session.status == 'completed'
        data['questions'] = [{
            'id': q.id, 'position': q.position, 'question': q.question, 'focus': q.focus,
            'answer': q.answer or '', 'time_taken_s': q.time_taken_s,
            # Ideal points and scores are revealed only after scoring
            **({'ideal_points': q.ideal_points, 'correctness': q.correctness, 'clarity': q.clarity,
                'depth': q.depth, 'score': q.score, 'feedback': q.feedback} if done else {}),
        } for q in session.questions]
    return data
