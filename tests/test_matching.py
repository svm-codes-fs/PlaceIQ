"""Resume upload and parsing, the matching profile, job matches and candidate ranking."""
import io
import os
from types import SimpleNamespace

import pytest

from app.services import ai
from tests.conftest import find

SAMPLES = os.path.join(os.path.dirname(__file__), '..', 'samples', 'resumes')


def _pdf(name):
    with open(os.path.join(SAMPLES, name), 'rb') as f:
        return f.read()


def _upload(client, data, filename='resume.pdf'):
    return client.client.post('/api/student/resume', data={'file': (io.BytesIO(data), filename)},
                              headers=client._csrf(), content_type='multipart/form-data')


def test_resume_upload_parses_offline_and_suggests_profile(make_client):
    student = make_client('neha_dit')
    res = _upload(student, _pdf('backend_developer.pdf'))
    assert res.status_code == 202

    resume = student.get('/api/student/resume').get_json()['resume']
    assert resume['status'] == 'parsed' and resume['parser'] == 'heuristic'  # no API key in tests
    assert resume['parsed']['cgpa'] == 8.9
    assert {'Python', 'PostgreSQL', 'Docker', 'Spring Boot'} <= set(resume['parsed']['skills'])

    suggested = student.get('/api/student/resume/suggested-profile').get_json()
    assert 'Distributed Job Queue' in suggested['profile_summary']


def test_resume_upload_rejects_non_pdf(make_client):
    student = make_client('neha_dit')
    assert _upload(student, b'hello', 'resume.txt').status_code == 400
    assert _upload(student, b'not really a pdf', 'resume.pdf').status_code == 400


def test_saving_profile_reranks_matches(make_client):
    student = make_client('neha_dit')  # DIT drives: Wipro (Java/SQL/OOP), L&T (civil)
    res = student.put('/api/student/skills', json={
        'skills': 'java, sql, OOP, Communication', 'profile_summary': 'Java developer who enjoys backend work.'})
    assert res.status_code == 200
    assert res.get_json()['profile']['skills'] == ['Java', 'SQL', 'OOP', 'Communication']

    matches = student.get('/api/student/matches').get_json()['matches']
    assert [m['name'] for m in matches] == ['Wipro', 'L&T']
    wipro = matches[0]
    assert wipro['skill_coverage'] == 1.0 and wipro['missing_skills'] == []
    assert wipro['score'] > matches[1]['score']


def test_matches_report_missing_skills_and_eligibility(make_client):
    student = make_client('aarav_tiet')  # CSE, 9.12; skills include Python, C++, DS, System Design
    matches = student.get('/api/student/matches').get_json()['matches']
    microsoft = find(matches, name='Microsoft')
    assert microsoft['missing_skills'] == ['Azure']
    assert microsoft['is_eligible'] is True
    assert matches[0]['name'] == 'Microsoft'
    tata = find(matches, name='Tata Motors')
    assert tata['is_eligible'] is False and tata['score'] < microsoft['score']


def test_admin_candidates_ranked_for_drive(tiet_admin):
    ti = find(tiet_admin.get('/api/admin/companies').get_json(), name='Texas Instruments')
    # Texas Instruments is Ongoing; candidate ranking still works for any drive
    data = tiet_admin.get(f'/api/admin/companies/{ti["id"]}/candidates').get_json()
    names = [c['name'] for c in data['candidates']]
    assert names[0] == 'Ananya Gupta'  # ECE, analog + embedded skills
    top = data['candidates'][0]
    assert top['is_eligible'] and 'Analog Circuits' in top['matched_skills']
    # Ineligible students are ranked after eligible ones
    flags = [c['is_eligible'] for c in data['candidates']]
    assert flags == sorted(flags, reverse=True)


def test_company_required_skills_are_normalised(tiet_admin):
    res = tiet_admin.post('/api/admin/companies', json={
        'name': 'Flipkart', 'role_offered': 'SDE', 'package_lpa': 30, 'min_cgpa': 7, 'max_backlogs': 0,
        'allowed_branches': ['CSE'], 'required_skills': 'java, reactjs, k8s'})
    assert res.get_json()['required_skills'] == ['Java', 'React', 'Kubernetes']


class _FakeMessages:
    def __init__(self, result, stop_reason='end_turn'):
        self.result, self.stop_reason, self.calls = result, stop_reason, []

    def parse(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(stop_reason=self.stop_reason, parsed_output=self.result)


@pytest.fixture
def fake_claude(app, monkeypatch):
    def install(result, stop_reason='end_turn'):
        messages = _FakeMessages(result, stop_reason)
        monkeypatch.setattr(ai, '_client', lambda: SimpleNamespace(beta=SimpleNamespace(messages=messages)))
        app.config['ANTHROPIC_API_KEY'] = 'test-key'
        return messages
    return install


def test_claude_resume_parsing_request_and_result(make_client, fake_claude):
    parsed = ai.ResumeData(name='Neha Joshi', email=None, cgpa=8.1, skills=['reactjs', 'Node.js'],
                           summary='Full-stack developer.', education=[], experience=[],
                           projects=[ai.Project(name='Campus App', summary='Built it', technologies=['React'])])
    messages = fake_claude(parsed)
    student = make_client('neha_dit')
    _upload(student, _pdf('backend_developer.pdf'))

    resume = student.get('/api/student/resume').get_json()['resume']
    assert resume['parser'] == 'claude' and resume['parsed']['skills'] == ['React', 'Node.js']

    call = messages.calls[0]
    assert call['model'] == 'claude-opus-5-5'
    assert call['output_format'] is ai.ResumeData
    assert call['fallbacks'] == 'default' and call['betas'] == ['server-side-fallback-2026-07-01']
    document = call['messages'][0]['content'][0]
    assert document['type'] == 'document' and document['source']['media_type'] == 'application/pdf'


def test_claude_refusal_falls_back_to_offline_parser(make_client, fake_claude):
    fake_claude(None, stop_reason='refusal')
    student = make_client('neha_dit')
    _upload(student, _pdf('embedded_engineer.pdf'))
    resume = student.get('/api/student/resume').get_json()['resume']
    assert resume['parser'] == 'heuristic' and 'declined' in resume['error']
    assert 'Verilog' in resume['parsed']['skills']
