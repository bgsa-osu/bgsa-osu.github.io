# Optional children question

The admin form has an “Ask how many children are attending” checkbox. It defaults
to checked so existing events retain their children question. Unchecking it hides
that question for the selected event and sends zero children on new public RSVPs.
Existing RSVP records and historical children counts are preserved.

## Service update

Use the updated `BGSA-Code-optional-children.gs` supplied with this change to
replace the original script in the existing Google Apps Script project. The
script is kept outside this public repository because it contains the project's
spreadsheet configuration.

Save the project, then update the existing web-app deployment through
**Deploy → Manage deployments → Edit → New version → Deploy**. Updating that
existing deployment preserves the URL already configured in the website.

The script automatically adds an `AskChildren` column to the Events tab. A blank
value on an older event means enabled. Creating and editing events stores the
boolean, returns it in public and officer event feeds, and writes `ask_children`
into generated event pages. Older clients that omit the setting on update keep
its saved value. The admin feed advertises `capabilities.askChildren: true`.

The website keeps the checkbox hidden until that capability is reported. Reload
Admin after deploying the service; then create an event or edit an existing one,
set the checkbox, and save.

## Validation

Run `node tests/optional-children.cjs /path/to/BGSA-Code-optional-children.gs`.
The tests execute the supplied script with in-memory Google service doubles,
covering column migration, creation, update/reload, legacy defaults and clients,
generated page configuration, public/officer feeds, authorization, and new RSVP
counts. They make no requests to Google or GitHub.

Browser checks cover checkbox save/edit behavior, visibility on public forms,
and compatibility with the previous service version. Updating the live Google
Apps Script deployment still requires access to its owning Google account.
