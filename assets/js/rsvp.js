/**
 * The RSVP form on a single event's page.
 *
 * Everything the form needs -- the questions, the payment options, the event
 * id -- is already in the page, written there by Jekyll. So the form appears
 * immediately. Only the head count is fetched, because it changes as people
 * reply, and it arrives quietly after the page is already usable.
 */
(function () {
  const ENDPOINT = "https://script.google.com/macros/s/AKfycbyERJU9MoHdDvPEHaGwW1L1sYfdE255YAQKqhyjljtUiifbQi7T-7oBAm3U4ZNA97tjlw/exec";

  const mount = document.getElementById("rsvp-mount");
  const dataTag = document.getElementById("event-data");
  if (!mount || !dataTag) return;

  let event;
  try {
    event = JSON.parse(dataTag.textContent);
  } catch (err) {
    console.error("Event data could not be read.", err);
    return;
  }

  /* ---- the description, which is plain text in the front matter ---- */

  const desc = document.querySelector("[data-rich]");
  if (desc) {
    const escaped = desc.textContent
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    desc.innerHTML = escaped
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|[\s(])((https?:\/\/)[^\s<]+)/g,
        '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  }

  /* ---- form building ---- */

  function field(labelText, control) {
    const wrap = document.createElement("div");
    wrap.className = "member-form__row";
    const label = document.createElement("label");
    label.textContent = labelText;
    label.htmlFor = control.id;
    wrap.append(label, control);
    return wrap;
  }

  function input(id, type, required, extra) {
    const el = document.createElement("input");
    el.id = id;
    el.type = type;
    el.required = !!required;
    Object.assign(el, extra || {});
    return el;
  }

  const form = document.createElement("form");
  form.className = "member-form rsvp__form";

  const first = input("rsvp-first", "text", true, { maxLength: 60 });
  const last = input("rsvp-last", "text", true, { maxLength: 60 });
  const nameNumber = input("rsvp-namenum", "text", true, { maxLength: 40 });
  const email = input("rsvp-email", "email", false, { maxLength: 120 });
  const adults = input("rsvp-adults", "number", true, { min: 1, max: 20, value: 1 });
  const kids = input("rsvp-kids", "number", false, { min: 0, max: 20, value: 0 });

  const names = document.createElement("div");
  names.className = "member-form__pair";
  names.append(field("First name", first), field("Last name", last));
  form.appendChild(names);

  // Guests have no Name.#, so their email is what identifies their reply.
  const affiliation = document.createElement("select");
  affiliation.id = "rsvp-aff";
  [["osu", "I am at Ohio State"], ["guest", "I am a guest"]].forEach(pair => {
    const option = document.createElement("option");
    option.value = pair[0];
    option.textContent = pair[1];
    affiliation.appendChild(option);
  });
  form.appendChild(field("Are you at Ohio State?", affiliation));

  const nameRow = field("tOSU Name.#", nameNumber);
  const emailRow = field("Email", email);
  form.append(nameRow, emailRow);

  function applyAffiliation() {
    const guest = affiliation.value === "guest";
    nameRow.style.display = guest ? "none" : "";
    emailRow.style.display = guest ? "" : "none";
    nameNumber.required = !guest;
    email.required = guest;
    if (guest) nameNumber.value = ""; else email.value = "";
  }
  affiliation.addEventListener("change", applyAffiliation);
  applyAffiliation();

  const counts = document.createElement("div");
  counts.className = "member-form__pair";
  counts.append(
    field("Adults attending (including you)", adults),
    field("Children attending with you", kids)
  );
  form.appendChild(counts);

  let payment = null;
  if ((event.payments || []).length) {
    payment = document.createElement("select");
    payment.id = "rsvp-payment";
    payment.required = true;
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "Choose one";
    payment.appendChild(blank);
    event.payments.forEach(option => {
      const el = document.createElement("option");
      el.value = option;
      el.textContent = option;
      payment.appendChild(el);
    });
    form.appendChild(field("Payment status", payment));
  }

  const extras = (event.questions || []).map((question, index) => {
    let control;
    if (question.type === "choice" && (question.options || []).length) {
      control = document.createElement("select");
      const blank = document.createElement("option");
      blank.value = "";
      blank.textContent = "Choose one";
      control.appendChild(blank);
      question.options.forEach(option => {
        const el = document.createElement("option");
        el.value = option;
        el.textContent = option;
        control.appendChild(el);
      });
    } else {
      control = document.createElement("input");
      control.type = "text";
      control.maxLength = 200;
    }
    control.id = "rsvp-extra-" + index;
    form.appendChild(field(question.label, control));
    return { label: question.label, control: control };
  });

  // Honeypot, as on every other form here.
  const trap = document.createElement("div");
  trap.className = "member-form__hp";
  trap.setAttribute("aria-hidden", "true");
  const trapInput = input("rsvp-website", "text", false, { tabIndex: -1, autocomplete: "off" });
  trap.appendChild(trapInput);
  form.appendChild(trap);

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn btn--theme";
  submit.textContent = "Send RSVP";
  form.appendChild(submit);

  const status = document.createElement("p");
  status.className = "member-form__status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  form.appendChild(status);

  mount.appendChild(form);

  /* ---- sending ---- */

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!form.checkValidity()) return form.reportValidity();

    submit.disabled = true;
    status.textContent = "Sending\u2026";

    const answers = {};
    extras.forEach(extra => { answers[extra.label] = extra.control.value; });

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "rsvp",
          eventId: event.id,
          firstName: first.value,
          lastName: last.value,
          affiliation: affiliation.value,
          nameNumber: nameNumber.value,
          email: email.value,
          adults: adults.value,
          children: kids.value,
          payment: payment ? payment.value : "",
          answers: answers,
          website: trapInput.value
        })
      });
      const result = await response.json();
      status.textContent = result.message;
      if (result.ok) {
        form.reset();
        applyAffiliation();
        showCount();
      }
    } catch (err) {
      console.error("RSVP failed.", err);
      status.textContent = "Could not reach the server. Please try again.";
    } finally {
      submit.disabled = false;
    }
  });

  /* ---- the head count, fetched after the page is already usable ---- */

  const countLine = document.getElementById("rsvp-count");

  async function showCount() {
    if (!countLine) return;
    try {
      const response = await fetch(ENDPOINT, { cache: "no-store" });
      const result = await response.json();
      const match = (result.events || []).find(e => e.id === event.id);
      if (!match) return;

      countLine.textContent = match.rsvps
        ? match.rsvps + (match.rsvps === 1 ? " reply" : " replies") + ", " +
          match.attendees + (match.attendees === 1 ? " person" : " people") + " coming so far."
        : "No one has replied yet.";
    } catch (err) {
      // A missing count is not worth an error message on the page.
      console.warn("Could not load the head count.", err);
    }
  }

  showCount();
})();
