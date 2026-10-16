"""AI mock interviews: generation, answering, scoring and progress."""
from types import SimpleNamespace

from app.services import ai
from tests.conftest import find

STRONG_ANSWER = (
    'First, I built a URL shortener in Python with Flask and PostgreSQL as my project, and my role was the backend. '
    'Python fit the problem because the team knew it and Flask kept the API small. The hardest challenge was '
    'collisions in short codes, so I switched to base62 IDs from a sequence, which meant zero collisions. '
    'As a result, p95 latency dropped from 180 ms to 40 ms after I added Redis caching. '
    'If I did it again I would improve the analytics pipeline instead of writing to the main database.'
)


def _start(student, **body):
    res = student.post('/api/student/interviews', json=body)
    assert res.status_code == 202, res.get_json()
    return res.get_json()


def test_offline_interview_end_to_end(make_client, tiet_admin):
    student = make_client('aarav_tiet')
    microsoft = find(tiet_admin.get('/api/admin/companies').get_json(), name='Microsoft')
    session = _start(student, round_type='technical', company_id=microsoft['id'], count=4)

    assert session['status'] == 'ready' and session['generator'] == 'question_bank'
    questions = session['questions']
    assert len(questions) == 4
    assert 'ideal_points' not in questions[0]  # hidden until scored
    assert questions[0]['focus'] in ('Data Structures', 'System Design', 'C++', 'Python', 'Azure')

    url = f'/api/student/interviews/{session["id"]}'
    assert student.put(f'{url}/answers/{questions[0]["id"]}', json={'answer': STRONG_ANSWER, 'time_taken_s': 95}).status_code == 200
    assert student.put(f'{url}/answers/{questions[1]["id"]}', json={'answer': 'Not sure.'}).status_code == 200

    result = student.post(f'{url}/submit').get_json()
    assert result['status'] == 'completed' and result['scorer'] == 'rubric'
    scored = result['questions']
    assert scored[0]['score'] > scored[1]['score']
    assert scored[1]['correctness'] == 0  # too short to count
    assert scored[0]['ideal_points'] and scored[0]['feedback']
    assert 'offline rubric' in result['overall_feedback']

    # Can't answer or submit again
    assert student.put(f'{url}/answers/{questions[2]["id"]}', json={'answer': 'late'}).status_code == 400
    assert student.post(f'{url}/submit').status_code == 400

    history = student.get('/api/student/interviews').get_json()
    assert history['progress'][0]['score'] == result['overall_score']


def test_hr_and_behavioral_rounds_use_their_banks(make_client):
    student = make_client('rohan_tiet')
    hr = _start(student, round_type='hr', count=3)
    assert len(hr['questions']) == 3
    behavioral = _start(student, round_type='behavioral', count=3)
    assert all('time' in q['question'].lower() or 'situation' in q['question'].lower() or 'describe' in q['question'].lower()
               for q in behavioral['questions'])


def test_submit_requires_an_answer_and_validates_round(make_client):
    student = make_client('rohan_tiet')
    session = _start(student, round_type='technical', count=3)
    assert student.post(f'/api/student/interviews/{session["id"]}/submit').status_code == 400
    assert student.post('/api/student/interviews', json={'round_type': 'karaoke'}).status_code == 400


def test_sessions_are_private(make_client):
    session = _start(make_client('rohan_tiet'), round_type='hr', count=3)
    other = make_client('aarav_tiet')
    assert other.get(f'/api/student/interviews/{session["id"]}').status_code == 404
    # Other colleges can't see it at all
    assert make_client('neha_dit').get(f'/api/student/interviews/{session["id"]}').status_code == 404


class _SequencedMessages:
    def __init__(self, results):
        self.results, self.calls = list(results), []

    def parse(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(stop_reason='end_turn', parsed_output=self.results.pop(0))


def test_claude_generates_and_scores(app, make_client, monkeypatch):
    questions = ai.QuestionSet(questions=[
        ai.InterviewQuestion(question='How would you design a rate limiter?', focus='System Design',
                             ideal_answer_points=['Token bucket', 'Distributed counters', 'Failure modes']),
        ai.InterviewQuestion(question='Explain virtual memory.', focus='Operating Systems',
                             ideal_answer_points=['Paging', 'TLB', 'Page faults']),
        ai.InterviewQuestion(question='Tell me about a hard bug.', focus='Debugging',
                             ideal_answer_points=['Symptom', 'Root cause', 'Fix']),
    ])
    scores = ai.InterviewScores(answers=[
        ai.AnswerScore(question_index=0, correctness=8, clarity=7, depth=6, feedback='Good token bucket explanation.'),
        ai.AnswerScore(question_index=1, correctness=0, clarity=0, depth=0, feedback='No answer.'),
        ai.AnswerScore(question_index=2, correctness=12, clarity=5, depth=5, feedback='Clear story.'),
    ], overall_feedback='Strong on design; revise OS fundamentals.')
    messages = _SequencedMessages([questions, scores])
    monkeypatch.setattr(ai, '_client', lambda: SimpleNamespace(beta=SimpleNamespace(messages=messages)))
    app.config['ANTHROPIC_API_KEY'] = 'test-key'

    student = make_client('aarav_tiet')
    session = _start(student, round_type='technical', count=3)
    assert session['generator'] == 'claude'
    assert [q['question'] for q in session['questions']][0] == 'How would you design a rate limiter?'

    url = f'/api/student/interviews/{session["id"]}'
    student.put(f'{url}/answers/{session["questions"][0]["id"]}', json={'answer': 'Use a token bucket per user...'})
    result = student.post(f'{url}/submit').get_json()
    assert result['scorer'] == 'claude'
    assert result['questions'][2]['correctness'] == 10  # clamped to 0-10
    assert result['overall_feedback'] == 'Strong on design; revise OS fundamentals.'

    generate_call, score_call = messages.calls
    assert generate_call['output_format'] is ai.QuestionSet
    assert 'Candidate skills: Python, C++' in generate_call['messages'][0]['content']
    assert score_call['output_format'] is ai.InterviewScores
    assert score_call['fallbacks'] == 'default'
    assert 'Student answer: (no answer)' in score_call['messages'][0]['content']
