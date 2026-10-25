"""Exercise actual Admin code and public form across a question-label rename.

Requires PyYAML, python-liquid, Playwright and Chrome/Chromium. No production I/O.
"""
import json
import re
import shutil
from pathlib import Path
from urllib.parse import urlparse

from liquid import DictLoader, Environment
from playwright.sync_api import sync_playwright
import yaml

ROOT = Path(__file__).resolve().parents[1]
EVENT_ID = 'evt-1792786389442'
def body(path):
    text = path.read_text()
    return text.split('---', 2)[2] if text.startswith('---') else text

def prep(text):
    return re.sub(r'{%\s*include\s+([\w./-]+)\s*%}', r'{% include "\1" %}', text)

env = Environment(loader=DictLoader({p.name: prep(p.read_text()) for p in (ROOT/'_includes').glob('*.html')}))
env.add_filter('jsonify', json.dumps)
env.add_filter('relative_url', lambda value: value or '')
env.add_filter('absolute_url', lambda value: value or '')
env.add_filter('uri_escape', lambda value: value or '')
env.add_filter('normalize_whitespace', lambda value: ' '.join(str(value).split()))
site = yaml.safe_load((ROOT/'_config.yml').read_text())
site['data'] = {p.stem: yaml.safe_load(p.read_text()) for p in (ROOT/'_data').glob('*.yml')}
site['posts'] = []
site['pages'] = []
for path in (ROOT/'events').glob('*.md'):
    item = yaml.safe_load(path.read_text().split('---', 2)[1])
    item['url'] = item['permalink']
    site['pages'].append(item)
fixture = next(item for item in site['pages'] if item['event_id'] == EVENT_ID)
home = env.from_string(prep(body(ROOT/'index.html'))).render(page={'url':'/'}, site=site)
public = env.from_string(body(ROOT/'_layouts/event.html')).render(page=fixture, site=site)
current = dict(fixture, id=EVENT_ID, name=fixture['title'], date=fixture['event_date'], open=True, askChildren=True, rsvps=0, attendees=0)
expected = site['data']['rsvp_forms'][EVENT_ID]['questions']
renamed = ['Contact telephone', 'Tournament preference', 'Preferred playing partner', 'Additional games']
sent, errors = [], []
supported = True

with sync_playwright() as p:
    executable = shutil.which('google-chrome') or shutil.which('chromium')
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'], **({'executable_path':executable} if executable else {}))
    page = browser.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))

    def respond(route):
        request, url = route.request, urlparse(route.request.url)
        if url.hostname == 'admin-preview.test':
            if url.path.startswith('/assets/js/'):
                route.fulfill(content_type='application/javascript', body=(ROOT/url.path.lstrip('/')).read_text())
            else:
                route.fulfill(content_type='text/html; charset=utf-8', body='<meta charset="UTF-8">'+(public if url.path=='/event/' else home))
        elif url.hostname == 'script.google.com':
            if request.method == 'POST':
                data = request.post_data_json
                sent.append(data)
                if data['action'] == 'listEvents':
                    route.fulfill(json={'ok':True,'capabilities':{'askChildren':True,'questionIds':supported},'events':[current]})
                elif data['action'] == 'updateEvent':
                    current['questions'] = [{key:value for key,value in question.items() if key in ['id','key','label','type','options','required','after','show_if','help','help_bold']} for question in data['questions']]
                    route.fulfill(json={'ok':True,'message':'Saved'})
                else:
                    route.fulfill(json={'ok':False,'message':'Not needed by test'})
            else:
                route.fulfill(json={'ok':True,'events':[current]})
        else:
            route.abort()

    page.route('**/*', respond)
    page.add_init_script("sessionStorage.setItem('bgsaOfficerToken','test-only')")
    page.goto('https://admin-preview.test/?officer=1#admin')
    page.locator('#officer-events').get_by_role('button',name='Edit',exact=True).click()
    rows = page.locator('#ev-questions .officer__question')
    assert rows.count() == 4
    for index, caption in enumerate(renamed):
        assert not rows.nth(index).locator('input').nth(0).evaluate('(el)=>el.readOnly')
        assert rows.nth(index).locator('input').nth(1).evaluate('(el)=>el.readOnly')
        assert rows.nth(index).get_by_role('button',name='Remove').is_disabled()
        rows.nth(index).locator('input').nth(0).fill(caption)
    page.locator('#ev-name').fill('Another event title')
    page.locator('#ev-photo').set_input_files(str(ROOT/'assets/jpeg/indoor_games_flyer.jpeg'))
    page.locator('#ev-submit').click()
    page.wait_for_function("document.querySelector('#ev-name').value === ''")
    saved = next(item for item in sent if item['action']=='updateEvent')
    assert [q['label'] for q in saved['questions']] == renamed
    assert [q['id'] for q in saved['questions']] == [q['id'] for q in expected]
    assert [q['key'] for q in saved['questions']] == [q.get('key', q['label']) for q in fixture['questions']]
    assert saved['photo']['data']
    page.locator('#officer-events').get_by_role('button',name='Edit',exact=True).click()
    assert page.locator('#ev-questions .officer__question input:first-child').evaluate_all('(els)=>els.map(el=>el.value)') == renamed
    page.goto('https://admin-preview.test/event/')
    page.wait_for_function("!document.querySelector('button[type=submit]').disabled")
    labels = page.locator('.member-form__row:visible > label').all_text_contents()
    assert labels[labels.index('tOSU Name.#')+1] == renamed[0]
    game = page.get_by_label(renamed[1],exact=True)
    assert game.locator('option').count() == 4
    game.select_option('29')
    assert page.get_by_label(renamed[2],exact=True).is_visible()
    game.select_option('Neither')
    assert page.get_by_label(renamed[2],exact=True).is_hidden()
    assert page.get_by_role('group',name=renamed[3]).locator('input[type=checkbox]').count() == 4
    # An older service must not discard identities already saved by the new one.
    supported = False
    page.goto('https://admin-preview.test/?officer=1#admin')
    page.locator('#officer-events').get_by_role('button',name='Edit',exact=True).click()
    assert page.locator('#ev-submit').is_disabled()
    assert not errors, errors
    browser.close()
print('Passed: Admin rename/save/reopen, photo upload, public labels and structure, stable answer keys, and older-service protection. No production writes.')
