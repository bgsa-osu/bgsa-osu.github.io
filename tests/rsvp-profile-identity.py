"""Browser regression for RSVP settings surviving event title/photo edits.

Requires PyYAML, python-liquid, Playwright, and Chrome (or Playwright Chromium).
Run: python tests/rsvp-profile-identity.py
All requests are intercepted; no real RSVP is submitted.
"""
import json
import os
import re
from pathlib import Path
import shutil
from urllib.parse import urlparse

from liquid import Environment
from playwright.sync_api import sync_playwright
import yaml

ROOT = Path(__file__).resolve().parents[1]
EVENT_ID = "evt-1792786389442"
profiles = yaml.safe_load((ROOT / "_data/rsvp_forms.yml").read_text())
profile = profiles[EVENT_ID]
fixture = next(
    data
    for path in (ROOT / "events").glob("*.md")
    if (data := yaml.safe_load(path.read_text().split("---", 2)[1])).get("event_id") == EVENT_ID
)
layout = (ROOT / "_layouts/event.html").read_text().split("---", 2)[2]
env = Environment()
env.add_filter("jsonify", json.dumps)
env.add_filter("relative_url", lambda value: value or "")
script = (ROOT / "assets/js/rsvp.js").read_text()
profile_script = (ROOT / "assets/js/rsvp-profile.js").read_text()

# Other events keep their default forms rather than inheriting this customization.
for path in (ROOT / "events").glob("*.md"):
    other = yaml.safe_load(path.read_text().split("---", 2)[1])
    if other.get("event_id") == EVENT_ID:
        continue
    html = env.from_string(layout).render(page=other, site={"data": {"rsvp_forms": profiles}})
    data = json.loads(re.search(r'<script type="application/json" id="event-data">(.*?)</script>', html, re.S)[1])
    assert data["questions"] == other["questions"]
    assert data["payments"] == other["payments"]
    assert data["verifyQuestions"] is False

with sync_playwright() as playwright:
    executable = os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH") or shutil.which("google-chrome") or shutil.which("chromium")
    browser = playwright.chromium.launch(
        **({"executable_path": executable} if executable else {}),
        headless=True,
        args=["--no-sandbox"],
    )
    variants = [
        dict(fixture),
        dict(fixture, title="A renamed event with the same ID", image="https://photo.example/changed.jpg", ask_children=False),
        dict(fixture, event_date="2026-11-02", event_time="1–5 PM", location="Another room",
             deadline="2026-10-31", description="Revised event description.", ask_children=True),
    ]
    renamed_labels = {
        "phone": "Contact telephone", "tournament": "Your tournament preference",
        "teammate": "Your preferred partner", "other-games": "Additional games"
    }
    renamed = dict(fixture)
    renamed["questions"] = [dict(id=q["id"], key=q["label"], label=renamed_labels[q["id"]], type="text", options=[])
                            for q in profile["questions"]]
    variants.append(renamed)
    for index, event in enumerate(variants):
        captions = {q["id"]: next((item["label"] for item in event["questions"] if item.get("id") == q["id"]), q["label"])
                    for q in profile["questions"]}
        rendered = env.from_string(layout).render(page=event, site={"data": {"rsvp_forms": profiles}})
        page = browser.new_page()
        errors, submissions = [], []
        page.on("pageerror", lambda error: errors.append(str(error)))

        def respond(route):
            request = route.request
            url = urlparse(request.url)
            if url.hostname == "rsvp-preview.test":
                if url.path == "/assets/js/rsvp-profile.js":
                    route.fulfill(content_type="application/javascript", body=profile_script)
                elif url.path == "/assets/js/rsvp.js":
                    route.fulfill(content_type="application/javascript", body=script)
                else:
                    route.fulfill(content_type="text/html; charset=utf-8", body='<meta charset="UTF-8">' + rendered)
            elif url.hostname == "script.google.com":
                if request.method == "POST":
                    submissions.append(request.post_data_json)
                    route.fulfill(json={"ok": True, "message": "Saved in test"})
                else:
                    route.fulfill(json={"ok": True, "capabilities": {"affiliationChoices": True}, "events": [{
                        "id": EVENT_ID, "name": event["title"], "date": event["event_date"],
                        "questions": event["questions"], "rsvps": 0, "attendees": 0,
                    }]})
            else:
                route.abort()

        page.route("**/*", respond)
        page.goto("https://rsvp-preview.test/event/")
        page.wait_for_function("!document.querySelector('button[type=submit]').disabled")
        assert page.locator(".event-page__photo img").get_attribute("src") == event["image"]
        affiliation = page.get_by_label("Are you affiliated with tOSU?", exact=True)
        assert affiliation.locator("option").all_text_contents() == [
            "I am affiliated with tOSU", "I am not affiliated with tOSU", "I am a guest"
        ]
        for external in ["non-osu", "guest"]:
            page.get_by_label("tOSU Name.#").fill("clear.1")
            affiliation.select_option(external)
            assert page.get_by_label("tOSU Name.#").is_hidden()
            assert not page.get_by_label("tOSU Name.#").evaluate("el=>el.required")
            assert page.get_by_label("tOSU Name.#").input_value() == ""
            assert page.get_by_label("Email", exact=True).is_visible()
            assert page.get_by_label("Email", exact=True).evaluate("el=>el.required")
            affiliation.select_option("osu")
        labels = page.locator(".member-form__row:visible > label").all_text_contents()
        assert labels[labels.index("tOSU Name.#") + 1] == captions["phone"]
        game = page.get_by_label(captions["tournament"], exact=True)
        assert game.locator("option").all_text_contents() == [
            "Choose one", "29", "Ludu (teammates will be randomly selected)", "Neither"
        ]
        teammate = page.get_by_label(captions["teammate"], exact=True)
        assert teammate.is_hidden()
        game.select_option("29")
        assert teammate.is_visible()
        teammate.fill("Test teammate")
        game.select_option(label="Ludu (teammates will be randomly selected)")
        assert teammate.is_hidden() and teammate.input_value() == ""
        game.select_option("Neither" if index == 0 else "29")
        if index:
            teammate.fill("Test teammate")
        assert page.locator(".rsvp__choices label").all_text_contents() == [
            "Uno", "Sequence", "Carrom (subject to popularity)", "Chess (subject to popularity)"
        ]
        assert page.get_by_label("Children attending with you").count() == (0 if event.get("ask_children") is False else 1)
        assert event["event_time"] in page.locator(".event-page__facts").text_content()
        assert event["location"] in page.locator(".event-page__facts").text_content()
        assert page.locator("[data-rich]").text_content().strip() == event["description"].strip()
        page.get_by_label("First name").fill("Test")
        page.get_by_label("Last name").fill("Player")
        page.get_by_label("tOSU Name.#").fill("test.1")
        page.get_by_label(captions["phone"], exact=True).fill("6145550100")
        selected_affiliation = ["osu", "non-osu", "guest", "osu"][index]
        affiliation.select_option(selected_affiliation)
        if selected_affiliation != "osu":
            page.get_by_label("Email", exact=True).fill("test@example.org")
        page.get_by_label("Payment status").select_option(label="Membership paid")
        page.get_by_label("Uno", exact=True).check()
        page.get_by_label("Sequence", exact=True).check()
        page.get_by_role("button", name="Send RSVP").click()
        page.get_by_role("status").filter(has_text="Saved in test").wait_for()
        assert len(submissions) == 1
        assert submissions[0]["affiliation"] == selected_affiliation
        if selected_affiliation != "osu":
            assert submissions[0]["nameNumber"] == ""
            assert submissions[0]["email"] == "test@example.org"
        assert submissions[0]["answers"]["29 or Ludu Tournament"] == ("Neither" if index == 0 else "29")
        assert submissions[0]["answers"]["Other games (select all that apply)"] == "Uno, Sequence"
        assert not errors, errors
        page.close()
    browser.close()
print("Passed: routine event edits retain phone position, game controls, teammate logic, children setting, and RSVP answers.")
