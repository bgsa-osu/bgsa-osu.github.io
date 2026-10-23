# Optional children question: backend dependency

This branch prepares the website controls. Do not deploy it as a complete feature
until the existing Google Apps Script service implements the setting below.
The service source is not in this repository.

- Persist the boolean `askChildren` on event creation and update. Missing values
  on existing events must mean `true`; explicit `false` must survive serialization.
- Include `askChildren` in officer `listEvents` and the public events feed.
- Write `ask_children: true` or `ask_children: false` into generated event page
  front matter. The event layout serializes this flag into the RSVP configuration.
- Keep existing RSVP records and children counts intact. The website sends zero
  children on a new RSVP when the question is disabled.

The checkbox defaults to checked, matching existing event behavior. It loads the
saved value when editing and submits the flag in both create and update requests.
Both the standalone event form and legacy inline form honor the setting.

Local browser checks cover default behavior, loading an unchecked setting,
sending an updated setting, and showing/hiding the public form field. Save/reload
checks currently use a mocked service; real persistence remains unverified.
