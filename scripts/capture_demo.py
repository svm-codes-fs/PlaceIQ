"""
Capture README screenshots and a demo video by driving the running app with Playwright.

Expects the frontend at BASE_URL (default http://localhost:3000) on a freshly
seeded database (`flask seed`, password from SEED_PASSWORD).

    python scripts/capture_demo.py [BASE_URL]
Writes docs/screenshots/*.png and docs/demo.webm.
"""
import os
import shutil
import sys
import tempfile

from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000').rstrip('/')
PASSWORD = os.environ.get('SEED_PASSWORD', 'password123')
ROOT = os.path.join(os.path.dirname(__file__), '..')
SHOTS = os.path.join(ROOT, 'docs', 'screenshots')
RESUME = os.path.join(ROOT, 'samples', 'resumes', 'backend_developer.pdf')
VIEWPORT = {'width': 1440, 'height': 900}

ANSWERS = [
    'I would use a token bucket per user stored in Redis. Each request takes a token; tokens refill at a fixed '
    'rate, for example 10 per second. Because Redis operations are atomic, multiple API servers share the limit. '
    'The trade-off is an extra network hop, so I would cache recent decisions locally and fail open if Redis is down.',
    'In my ADC project I measured noise of 4 mV, which was too high. First I checked grounding, then added a '
    'decoupling capacitor near the reference pin; as a result the noise dropped to 0.6 mV. I learned to read the '
    'datasheet layout guidelines before routing the board.',
    'Short answer.',
]


def shot(page, name, full=False):
    page.wait_for_timeout(700)
    page.screenshot(path=os.path.join(SHOTS, f'{name}.png'), full_page=full)
    print('captured', name)


def login(page, username):
    page.goto(f'{BASE}/login')
    page.fill('#login-username', username)
    page.fill('#login-password', PASSWORD)
    page.click('button[type=submit]')
    page.wait_for_url(lambda url: '/login' not in url)
    page.wait_for_load_state('networkidle')


def logout(page):
    page.get_by_role('button', name='Sign Out').click()
    page.wait_for_url('**/login')


def interview(page, drive_label, round_value='technical', count='3', answers=ANSWERS):
    page.goto(f'{BASE}/student/interviews')
    page.wait_for_load_state('networkidle')
    selects = page.locator('form select')
    selects.nth(0).select_option(round_value)
    if drive_label:
        selects.nth(1).select_option(label=drive_label)
    selects.nth(2).select_option(count)
    page.get_by_role('button', name='Start interview').click()
    page.wait_for_selector('textarea')
    for i, answer in enumerate(answers):
        page.fill('textarea', answer)
        page.wait_for_timeout(400)
        if i < len(answers) - 1:
            page.get_by_role('button', name='Next').click()
    page.once('dialog', lambda d: d.accept())
    page.get_by_role('button', name='Submit for scoring').click()
    page.wait_for_selector('text=Overall')


def run(page, capture=True):
    def maybe(name, full=False):
        if capture:
            shot(page, name, full)

    page.goto(f'{BASE}/login')
    page.wait_for_load_state('networkidle')
    maybe('01-login')

    # Student: resume, matches, opportunities, interviews
    login(page, 'aarav_tiet')
    maybe('02-student-dashboard')
    page.goto(f'{BASE}/student/resume')
    page.set_input_files('input[type=file]', RESUME)
    page.wait_for_selector('text=Skills found', timeout=60000)
    page.get_by_role('button', name='Use these in my profile').click()
    page.get_by_role('button', name='Save profile').click()
    page.wait_for_selector('text=Profile saved')
    maybe('03-resume-and-skills')
    page.goto(f'{BASE}/student/matches')
    page.wait_for_selector('text=#1')
    maybe('04-job-matches')
    interview(page, 'Microsoft — Software Engineer')
    maybe('05-interview-results', full=True)
    interview(page, 'Amazon — SDE-1', answers=ANSWERS[:2] + [ANSWERS[0]])
    page.goto(f'{BASE}/student/interviews')
    page.wait_for_selector('figure')
    maybe('06-interview-progress')
    logout(page)

    login(page, 'rohan_tiet')
    page.goto(f'{BASE}/student/companies')
    page.wait_for_selector('text=Ineligible')
    maybe('07-why-cant-i-apply')
    logout(page)

    # Student accepts an offer (notifies the admins live)
    login(page, 'ananya_tiet')
    page.goto(f'{BASE}/student/applications')
    page.get_by_role('button', name='View history').first.click()
    page.wait_for_timeout(800)
    maybe('08-offer-and-timeline')
    page.once('dialog', lambda d: d.accept())
    page.get_by_role('button', name='Accept offer').click()
    page.wait_for_selector('text=Offer accepted')
    logout(page)

    # College admin
    login(page, 'tiet_admin')
    page.wait_for_selector('text=Recruitment Funnel')
    page.get_by_role('button', name='Notifications', exact=False).click()
    page.wait_for_timeout(600)
    maybe('09-admin-dashboard-notifications')
    page.keyboard.press('Escape')
    page.goto(f'{BASE}/admin/companies')
    page.get_by_label('Top candidates for Texas Instruments').click()
    page.wait_for_selector('text=#1')
    maybe('10-top-candidates')
    page.keyboard.press('Escape')
    page.goto(f'{BASE}/admin/applications')
    page.wait_for_selector('tbody tr')
    maybe('11-application-pipeline')
    page.goto(f'{BASE}/admin/policies')
    page.wait_for_selector('[role=switch]')
    maybe('12-placement-policies')
    page.goto(f'{BASE}/admin/students')
    page.get_by_role('button', name='Import CSV').click()
    with tempfile.NamedTemporaryFile('w', suffix='.csv', delete=False) as f:
        f.write('username,email,name,roll_no,branch,cgpa,backlogs\n'
                'meera,meera@example.com,Meera Pillai,102203301,CSE,8.8,0\n'
                'dup,meera@example.com,Duplicate Email,102203302,CSE,8.1,0\n'
                'bad,bad@example.com,Bad Row,102203001,XYZ,11,0\n')
    page.set_input_files('[role=dialog] input[type=file]', f.name)
    page.get_by_role('button', name='Import', exact=True).click()
    page.wait_for_selector('text=Nothing was imported')
    maybe('13-csv-import-errors')
    os.unlink(f.name)
    page.keyboard.press('Escape')
    logout(page)

    login(page, 'superadmin')
    page.wait_for_selector('text=COLLEGES')
    maybe('14-super-admin-colleges')
    logout(page)


def main():
    os.makedirs(SHOTS, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport=VIEWPORT, color_scheme='dark', device_scale_factor=1)
        run(context.new_page(), capture=True)
        context.close()
        browser.close()
    print('Screenshots done. For the video, reseed the database and run with --video.')


def video():
    video_dir = tempfile.mkdtemp()
    with sync_playwright() as p:
        browser = p.chromium.launch(slow_mo=120)
        context = browser.new_context(viewport={'width': 1280, 'height': 800}, color_scheme='dark',
                                      record_video_dir=video_dir, record_video_size={'width': 1280, 'height': 800})
        page = context.new_page()
        run(page, capture=False)
        path = page.video.path()
        context.close()
        browser.close()
    os.makedirs(os.path.join(ROOT, 'docs'), exist_ok=True)
    shutil.move(path, os.path.join(ROOT, 'docs', 'demo.webm'))
    print('wrote docs/demo.webm')


if __name__ == '__main__':
    if '--video' in sys.argv:
        sys.argv.remove('--video')
        BASE = (sys.argv[1] if len(sys.argv) > 1 else BASE).rstrip('/')
        video()
    else:
        main()
