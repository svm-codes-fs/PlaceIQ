"""
Resume upload and parsing.

Upload stores the PDF and queues `parse_resume`. Parsing uses Claude when an
API key is configured (it reads the PDF directly, including layout), otherwise
an offline heuristic parser (pypdf text + skills vocabulary + regexes). The
result is a *suggestion*: the student reviews and edits it before it becomes
the profile used for matching.
"""
import io
import os
import re
import uuid

from flask import current_app
from pypdf import PdfReader

from app.extensions import db
from app.models import Resume
from app.services.accounts import ValidationError
from app.services.skills import find_skills, normalize_skills

MAX_RESUME_BYTES = 5 * 1024 * 1024
SECTION_HEADINGS = {
    'education': ('education', 'academic', 'academics', 'qualification'),
    'experience': ('experience', 'internship', 'internships', 'work history', 'employment'),
    'projects': ('projects', 'project', 'academic projects', 'personal projects'),
    'skills': ('skills', 'technical skills', 'tools', 'technologies'),
}


def save_upload(student, upload):
    data = upload.read()
    if not upload.filename.lower().endswith('.pdf') or not data.startswith(b'%PDF'):
        raise ValidationError(['Upload your resume as a PDF file.'])
    if len(data) > MAX_RESUME_BYTES:
        raise ValidationError(['The resume must be 5 MB or smaller.'])

    folder = os.path.join(current_app.config['UPLOAD_DIR'], 'resumes', str(student.college_id))
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, f'{student.id}-{uuid.uuid4().hex}.pdf')
    with open(path, 'wb') as f:
        f.write(data)

    resume = student.resume or Resume(student=student, college_id=student.college_id)
    old_path = resume.storage_path
    resume.filename = upload.filename[:255]
    resume.storage_path = path
    resume.status, resume.parser, resume.parsed, resume.error, resume.raw_text = 'uploaded', None, None, None, None
    db.session.add(resume)
    db.session.commit()
    if old_path and old_path != path and os.path.exists(old_path):
        os.remove(old_path)
    return resume


def extract_text(pdf_bytes):
    reader = PdfReader(io.BytesIO(pdf_bytes))
    return '\n'.join((page.extract_text() or '') for page in reader.pages).strip()


def heuristic_parse(text):
    """Offline best-effort extraction from resume text."""
    lines = [re.sub(r'\s+', ' ', line).strip() for line in text.splitlines()]
    lines = [line for line in lines if line]

    sections, current = {}, None
    for line in lines:
        key = next((k for k, heads in SECTION_HEADINGS.items()
                    if line.lower().rstrip(':') in heads), None)
        if key:
            current = key
            continue
        if current:
            sections.setdefault(current, []).append(line)

    cgpa = None
    m = re.search(r'(?:cgpa|cpi|gpa)\s*[:\-]?\s*(\d{1,2}(?:\.\d{1,2})?)\s*(?:/\s*10)?', text, re.IGNORECASE)
    if m and 0 <= float(m.group(1)) <= 10:
        cgpa = float(m.group(1))
    email = re.search(r'[\w.+-]+@[\w-]+\.[\w.]+', text)

    def bullets(key, limit=6):
        # A line that doesn't start with a bullet continues the previous item (PDF line wrapping)
        items = []
        for line in sections.get(key, []):
            if line[:1] in '•-*·' or not items:
                items.append(line.lstrip('•-*· ').strip())
            else:
                items[-1] += ' ' + line
        return [i for i in items if len(i) > 3][:limit]

    projects = [{'name': p.split(':')[0][:80], 'summary': p, 'technologies': find_skills(p)} for p in bullets('projects')]
    experience = [{'title': e.split(',')[0][:80], 'organization': '', 'duration': None, 'summary': e}
                  for e in bullets('experience', 4)]
    education = [{'institution': e, 'degree': '', 'year': None} for e in bullets('education', 3)]
    skills = find_skills(text)
    summary_bits = []
    if skills:
        summary_bits.append('Skills include ' + ', '.join(skills[:6]) + '.')
    if projects:
        summary_bits.append(f'{len(projects)} project(s) listed, e.g. {projects[0]["name"]}.')
    return {
        'name': lines[0] if lines else None,
        'email': email.group(0) if email else None,
        'cgpa': cgpa,
        'skills': skills,
        'summary': ' '.join(summary_bits),
        'education': education,
        'experience': experience,
        'projects': projects,
    }


def parse(resume):
    """Parse a stored resume, preferring Claude and falling back to the heuristic parser."""
    from app.services import ai

    resume.status = 'parsing'
    db.session.commit()
    with open(resume.storage_path, 'rb') as f:
        data = f.read()
    try:
        resume.raw_text = extract_text(data)[:50000]
    except Exception:
        resume.raw_text = ''

    parsed, parser, error = None, None, None
    if ai.ai_enabled():
        try:
            parsed, parser = ai.extract_resume(data).model_dump(), 'claude'
        except ai.AIError as e:
            error = f'AI parsing failed ({e}); used the offline parser instead.'
    if parsed is None:
        if not resume.raw_text:
            resume.status, resume.error = 'failed', 'No text could be read from this PDF (is it a scanned image?).'
            db.session.commit()
            return resume
        parsed, parser = heuristic_parse(resume.raw_text), 'heuristic'

    parsed['skills'] = normalize_skills(parsed.get('skills'))
    resume.parsed, resume.parser, resume.error, resume.status = parsed, parser, error, 'parsed'
    db.session.commit()
    return resume


def profile_text_from(parsed):
    """Default profile summary built from a parsed resume (the student can edit it)."""
    parts = [parsed.get('summary') or '']
    for p in parsed.get('projects') or []:
        parts.append(f'Project: {p.get("name")} — {p.get("summary")}')
    for e in parsed.get('experience') or []:
        parts.append(f'Experience: {e.get("title")} {("at " + e["organization"]) if e.get("organization") else ""}'
                     f' — {e.get("summary")}')
    return '\n'.join(p for p in parts if p.strip())[:4000]
