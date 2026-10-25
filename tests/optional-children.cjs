// Run with: node tests/optional-children.cjs /path/to/BGSA-Code-optional-children.gs
// Google services are replaced with in-memory doubles; nothing is sent or deployed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(process.argv[2], 'utf8');

class Sheet {
  constructor(rows) { this.rows = rows.map(row => row.slice()); }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return Math.max(1, ...this.rows.map(row => row.length)); }
  getMaxRows() { return 100; }
  appendRow(row) { this.rows.push(row.slice()); }
  getRange(r, c, height = 1, width = 1) {
    const sheet = this;
    return {
      getValues() {
        return Array.from({ length: height }, (_, y) =>
          Array.from({ length: width }, (_, x) => sheet.rows[r - 1 + y]?.[c - 1 + x] ?? ''));
      },
      setValues(values) {
        values.forEach((row, y) => row.forEach((value, x) => {
          sheet.rows[r - 1 + y] ||= [];
          sheet.rows[r - 1 + y][c - 1 + x] = value;
        }));
        return this;
      },
      setValue(value) { return this.setValues([[value]]); },
      setFontWeight() { return this; },
      setNumberFormat() { return this; }
    };
  }
}

const context = vm.createContext({ console });
new vm.Script(source, { filename: 'Code.gs' }).runInContext(context);
const evaluate = code => vm.runInContext(code, context);
const headers = Array.from(evaluate('EVENT_HEADERS'));
const events = new Sheet([headers.filter(name => name !== 'AskChildren')]);
const replies = new Sheet([Array.from(evaluate('RSVP_HEADERS'))]);
const writes = [];
context.SpreadsheetApp = { openById: () => ({ getSheetByName: () => events }) };
context.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
context.testEvents = events;
context.testReplies = replies;
context.recordPage = (path, encoded) => writes.push({ path, text: Buffer.from(encoded, 'base64').toString('utf8') });
context.encode = text => Buffer.from(text).toString('base64');
evaluate(`
  json = payload => payload;
  sessionValid = token => token === 'test-session';
  eventFolder = () => ({ getId: () => 'test-folder' });
  createRsvpSpreadsheet = () => 'test-sheet';
  countRsvps = () => ({ rsvps: 0, attendees: 0 });
  githubRead = () => null;
  githubWrite = (path, content) => recordPage(path, content);
  githubRemove = () => { throw new Error('Unexpected page removal'); };
  toBase64 = text => encode(text);
  addMissingQuestionColumns = () => {};
  rsvpSheet = () => testReplies;
  isFlooding = () => false;
`);
evaluate('Date.now = (() => { let tick = 1792786389442; return () => tick++; })()');
const base = {
  token: 'test-session', name: 'Children setting test', date: '2026-11-01',
  deadline: '2026-10-30', time: '4–6 PM', location: 'Test room',
  description: 'Test', questions: [], askPayment: false
};

assert.equal(context.createEvent({ ...base, askChildren: false }).ok, true);
let at = context.eventColumns(events);
assert.equal(events.rows[0].filter(name => name === 'AskChildren').length, 1);
let eventId = events.rows[1][at.ID];
assert.equal(events.rows[1][at.AskChildren], false);
assert.match(writes.at(-1).text, /ask_children: false\n/);
assert.equal(context.doGet({}).events[0].askChildren, false);
assert.equal(context.listEventsForOfficer({ token: 'test-session' }).capabilities.askChildren, true);
assert.equal(context.findEvent(context.SpreadsheetApp.openById(), eventId).askChildren, false);

// Editing from an older website tab must not reset an explicitly disabled setting.
assert.equal(context.updateEvent({ ...base, id: eventId }).ok, true);
assert.equal(events.rows[1][at.AskChildren], false);
assert.match(writes.at(-1).text, /ask_children: false\n/);
assert.equal(context.updateEvent({ ...base, id: eventId, askChildren: true }).ok, true);
assert.equal(events.rows[1][at.AskChildren], true);
assert.match(writes.at(-1).text, /ask_children: true\n/);
assert.equal(context.updateEvent({ ...base, id: eventId, askChildren: false }).ok, true);

assert.equal(context.createEvent(base).ok, true);
assert.equal(events.rows[2][at.AskChildren], true);
const legacyRow = events.rows[2].slice(0, at.AskChildren);
legacyRow[at.ID] = 'legacy-event';
events.appendRow(legacyRow);
for (const [value, expected] of [[undefined, true], ['', true], [false, false], ['false', false], ['FALSE', false], [true, true]]) {
  const row = legacyRow.slice();
  row[at.AskChildren] = value;
  assert.equal(context.eventFromRow(at, row, {}).askChildren, expected);
}
assert.equal(context.doGet({}).events.find(event => event.id === 'legacy-event').askChildren, true);
assert.equal(context.listEventsForOfficer({ token: 'bad' }).ok, false);

// Disabling the question affects new submissions, not replies already stored.
const replyAt = Object.fromEntries(replies.rows[0].map((name, index) => [name, index]));
const historical = Array(replies.getLastColumn()).fill('');
historical[replyAt['Name.#']] = 'old.1';
historical[replyAt.Children] = 4;
replies.appendRow(historical);
const registration = {
  eventId, firstName: 'Test', lastName: 'Player', affiliation: 'osu',
  nameNumber: 'test.1', adults: 1, children: 5, answers: {}
};
assert.equal(context.submitRsvp(registration).ok, true);
assert.equal(replies.rows[2][replyAt.Children], 0);
assert.equal(replies.rows[1][replyAt.Children], 4);
context.updateEvent({ ...base, id: eventId, askChildren: true });
assert.equal(context.submitRsvp({ ...registration, nameNumber: 'test.2', children: 3 }).ok, true);
assert.equal(replies.rows[3][replyAt.Children], 3);
assert.equal(replies.rows[1][replyAt.Children], 4);

// The capability is also advertised when the spreadsheet has no events yet.
const savedRows = events.rows.slice();
events.rows = [events.rows[0]];
const empty = context.listEventsForOfficer({ token: 'test-session' });
assert.equal(empty.capabilities.askChildren, true);
assert.equal(empty.events.length, 0);
events.rows = savedRows;
console.log('Passed: column migration, create/update/reload, old-event defaults, older clients, generated pages, public/officer feeds, authorization, and RSVP counts.');

// Renamed question captions still write to the original answer column.
events.rows[1][at.Questions] = JSON.stringify([{id:'phone',key:'Phone No',label:'Contact phone',type:'tel',options:[]}]);
const phoneColumn = replies.rows[0].length;
replies.rows[0].push('Phone No');
assert.equal(context.submitRsvp({...registration,nameNumber:'keys.1',answers:{'Contact phone':'6145550101'}}).ok,true);
assert.equal(replies.rows.at(-1)[phoneColumn],'6145550101');
assert.equal(context.submitRsvp({...registration,nameNumber:'keys.2',answers:{'Phone No':'6145550102'}}).ok,true);
assert.equal(replies.rows.at(-1)[phoneColumn],'6145550102');
console.log('Passed: renamed questions save both legacy-label and stable-key submissions in the original column.');
