# Editing event details and question labels safely

An event's custom form is selected by its permanent `event_id`, independently of
its title, photo, date, time, location, and description. The event page uses the
current photo saved in Admin. Existing response spreadsheets are retained.

Each question now has three separate properties:

- `id`: permanent identity used by form rules.
- `key`: the original response-column name, preserved on every later edit.
- `label`: the wording shown to attendees and edited in Admin.

The four managed indoor-game questions retain their phone placement, field types,
required flags, game choices, and conditional teammate rule. Admin can rename
labels; structural controls remain fixed. Additional ordinary questions keep
the existing text/choice editing controls.

The service gives legacy questions deterministic identities when reading them,
then persists identities and keys on save. It reuses existing spreadsheet columns
rather than renaming or deleting them. Existing answers remain in place. Public
forms submit answer keys, and the service also accepts display-label submissions
from older clients. Officer answer editing shows current captions while using
stable keys internally.

Stale clients that attempt unidentified question renames are rejected with an
instruction to refresh Admin. The website hides question-renaming controls until
the service advertises `capabilities.questionIds`. It also prevents an older
service from saving an event whose question identities have already been stored,
so a service rollback cannot silently strip those identities.

## Service deployment

The complete updated script is supplied outside this public repository as
`BGSA-Code-optional-children.gs` (also `BGSA-Code-stable-questions.gs`). The prior
script is saved as `BGSA-Code-before-question-renaming.gs`. It retains the supplied
spreadsheet configuration, the current live payment choices, and the original
email/login functions.

Replace the existing Apps Script code, save, and update the existing web-app
deployment using **Deploy → Manage deployments → Edit → New version → Deploy**.
Keep that deployment's URL. Reload Admin to enable label editing.

The same update adds three affiliation choices: affiliated with tOSU, not affiliated
with tOSU, and guest. The last two use a required email without an OSU identifier.
They are recorded as distinct affiliation values. The additional non-affiliated
choice appears when the service advertises `capabilities.affiliationChoices`;
older services keep their supported affiliated/guest choices.

## Checks

- `python tests/rsvp-profile-identity.py`: public form after title, photo, detail,
  and question-label changes; all affiliations and OSU ID/email requirements.
- `python tests/rsvp-admin-question-rename.py`: real Admin code through rename,
  save, reopen, public rendering, and older-service protection.
- `node tests/question-identity.cjs /path/to/BGSA-Code-stable-questions.gs`: schema,
  immutable answer keys, legacy migration, and stale-client protection.
- `node tests/optional-children.cjs /path/to/BGSA-Code-stable-questions.gs`: event
  persistence, children counts, affiliations, and answer-column compatibility.

Browser checks require PyYAML, python-liquid, Playwright, and Chrome/Chromium.
All checks intercept external requests or use in-memory Google service doubles;
they neither send emails nor write production RSVP data.
