"""
Claude API calls, all with structured outputs (Pydantic models validated by the SDK).

Each task's model is configurable (AI_RESUME_MODEL, AI_INTERVIEW_MODEL,
AI_SCORING_MODEL); all default to Claude Opus 5.5. Requests opt into
server-side refusal fallback (`fallbacks="default"`) on models that support it.

When no API key is configured, callers use the offline heuristics instead
(app/services/resumes.py, app/services/interviews.py) and label results as such.
"""
import base64
import logging
from typing import Optional

import anthropic
from flask import current_app
from pydantic import BaseModel, Field

log = logging.getLogger(__name__)


class AIError(Exception):
    """The model could not produce a usable result (refusal, truncation, API error)."""


def ai_enabled():
    cfg = current_app.config
    return bool(cfg.get('ANTHROPIC_API_KEY')) or cfg.get('AI_ENABLED', False)


def _client():
    key = current_app.config.get('ANTHROPIC_API_KEY')
    # With no key in config the SDK resolves credentials itself (env var or `ant auth login` profile)
    return anthropic.Anthropic(api_key=key, timeout=90.0) if key else anthropic.Anthropic(timeout=90.0)


def _check(response):
    if response.stop_reason == 'refusal':
        raise AIError('The model declined this request.')
    if response.stop_reason == 'max_tokens':
        raise AIError('The response was cut off before it finished.')
    if response.parsed_output is None:
        raise AIError('The model returned no structured result.')
    return response.parsed_output


# Models that accept server-side refusal fallback (`fallbacks="default"`)
_FALLBACK_MODELS = ('claude-opus-5', 'claude-sonnet-5-5', 'claude-fable-5')


def _call(model, **kwargs):
    """Structured-output request; adds the refusal-fallback opt-in where the model supports it."""
    if model.startswith(_FALLBACK_MODELS):
        kwargs.update(betas=['server-side-fallback-2026-07-01'], fallbacks='default')
    try:
        return _check(_client().beta.messages.parse(model=model, **kwargs))
    except anthropic.RateLimitError as e:
        raise AIError('The AI service is busy; try again in a minute.') from e
    except anthropic.APIStatusError as e:
        log.warning('Claude API error %s: %s', e.status_code, e.message)
        raise AIError(f'AI service error ({e.status_code}).') from e
    except anthropic.APIConnectionError as e:
        raise AIError('Could not reach the AI service.') from e


# ---- Resume extraction -------------------------------------------------------

class Education(BaseModel):
    institution: str
    degree: str
    year: Optional[str] = None


class Experience(BaseModel):
    title: str
    organization: str
    duration: Optional[str] = None
    summary: str = Field(description='One or two sentences on what they did')


class Project(BaseModel):
    name: str
    summary: str = Field(description='One or two sentences on what was built and the outcome')
    technologies: list[str]


class ResumeData(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    cgpa: Optional[float] = Field(default=None, description='CGPA on a 10-point scale, if stated')
    skills: list[str] = Field(description='Technical and professional skills, each as a short name')
    summary: str = Field(description='Two or three sentence professional summary of the candidate')
    education: list[Education]
    experience: list[Experience]
    projects: list[Project]


RESUME_SYSTEM = (
    'You extract structured data from student resumes for a campus placement platform. '
    'Only include information stated in the resume; never invent skills, grades or experience. '
    'List skills by their common short names (e.g. "React", "PostgreSQL", "SolidWorks"). '
    'Leave optional fields empty when the resume does not say.'
)


def extract_resume(pdf_bytes):
    """Read a resume PDF with Claude and return ResumeData."""
    return _call(
        current_app.config['AI_RESUME_MODEL'],
        max_tokens=8000,
        output_config={'effort': 'low'},
        system=RESUME_SYSTEM,
        messages=[{'role': 'user', 'content': [
            {'type': 'document', 'source': {'type': 'base64', 'media_type': 'application/pdf',
                                            'data': base64.standard_b64encode(pdf_bytes).decode()}},
            {'type': 'text', 'text': 'Extract the structured profile from this resume.'},
        ]}],
        output_format=ResumeData,
    )


# ---- Mock interviews ----------------------------------------------------------

class InterviewQuestion(BaseModel):
    question: str
    focus: str = Field(description='The skill or topic this question tests, in a few words')
    ideal_answer_points: list[str] = Field(description='3-5 points a strong answer would cover')


class QuestionSet(BaseModel):
    questions: list[InterviewQuestion]


class AnswerScore(BaseModel):
    question_index: int
    correctness: int = Field(description='0-10: is the content technically right?')
    clarity: int = Field(description='0-10: is it well structured and easy to follow?')
    depth: int = Field(description='0-10: does it go beyond the surface with reasoning or examples?')
    feedback: str = Field(description='Two to four sentences of specific, constructive feedback')


class InterviewScores(BaseModel):
    answers: list[AnswerScore]
    overall_feedback: str = Field(description='Three to five sentences: strengths and what to practise next')


QUESTION_SYSTEM = (
    'You are an experienced campus recruiter preparing a mock interview for an engineering student. '
    'Write questions a real interviewer at this company would ask for this role and round, pitched at a '
    'final-year student, and grounded in the job description and the student\'s own resume.'
)

SCORING_SYSTEM = (
    'You are a fair, demanding interviewer scoring a student\'s written mock-interview answers. '
    'Score each answer on correctness, clarity and depth from 0 to 10 against the listed ideal points. '
    'An empty or off-topic answer scores 0. Feedback must be specific to what the student wrote.'
)


def generate_questions(context, round_type, count):
    return _call(
        current_app.config['AI_INTERVIEW_MODEL'],
        max_tokens=6000,
        output_config={'effort': 'low'},
        system=QUESTION_SYSTEM,
        messages=[{'role': 'user', 'content': (
            f'{context}\n\nWrite exactly {count} {round_type} interview questions, ordered from warm-up to hardest.'
        )}],
        output_format=QuestionSet,
    ).questions[:count]


def score_answers(context, round_type, qa_pairs):
    """qa_pairs: list of (question, ideal_points, answer)."""
    transcript = '\n\n'.join(
        f'Question {i}: {q}\nIdeal points: {"; ".join(points)}\nStudent answer: {answer or "(no answer)"}'
        for i, (q, points, answer) in enumerate(qa_pairs)
    )
    return _call(
        current_app.config['AI_SCORING_MODEL'],
        max_tokens=8000,
        output_config={'effort': 'medium'},
        system=SCORING_SYSTEM,
        messages=[{'role': 'user', 'content': (
            f'{context}\nRound: {round_type}\n\n{transcript}\n\n'
            f'Score every answer (question_index 0 to {len(qa_pairs) - 1}).'
        )}],
        output_format=InterviewScores,
    )
