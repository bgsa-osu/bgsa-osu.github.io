// node tests/question-identity.cjs /path/to/BGSA-Code-stable-questions.gs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const forms = require('../assets/js/rsvp-profile.js');
const context = vm.createContext({ console, Utilities: { getUuid: () => 'test-uuid' } });
new vm.Script(fs.readFileSync(process.argv[2], 'utf8'), { filename: 'Code.gs' }).runInContext(context);
const plain = value => JSON.parse(JSON.stringify(value));
const definitions = [
  { id: 'phone', label: 'Phone No', type: 'tel', after: 'identity', required: true },
  { id: 'tournament', label: 'Tournament', type: 'choice', options: ['29', 'Ludo', 'Neither'] },
  { id: 'teammate', label: 'Teammate', type: 'text', show_if: { question_id: 'tournament', equals: '29' } },
  { id: 'other', label: 'Other games', type: 'multichoice', options: ['Uno', 'Sequence'], help:'Please select the games you intend to play.', help_bold:true }
];
const legacy = definitions.map(question => ({ label: question.label, type: 'text', options: [] }));
const aliased = forms.mergeQuestions([{id:'tournament',label:'Tournament',previous_labels:['Games choice'],type:'choice'}], [{label:'Games choice'}]);
assert.equal(aliased[0].label, 'Tournament');
assert.equal(aliased[0].key, 'Games choice');
assert.equal(forms.displayLabel({id:'tournament'}, {id:'tournament',label:'29 or Ludu Tournament'}), '29 or Ludo Tournament');
const spelling = context.parseQuestions(JSON.stringify([{label:'29 or Ludu Tournament',options:['Ludu']}]));
assert.equal(spelling[0].label,'29 or Ludo Tournament');
assert.equal(spelling[0].key,'29 or Ludu Tournament');
assert.equal(spelling[0].options[0],'Ludo');
const initial = forms.mergeQuestions(definitions, legacy);
const saved = context.normaliseQuestions(initial, legacy);
assert.deepEqual(Array.from(saved, q => q.key), definitions.map(q => q.label));
const renamed = saved.map((question, i) => ({ ...question, label: 'Renamed field ' + i }));
// Even a client attempting to change a known key cannot move earlier responses.
renamed[0].key = 'Not the old column';
const updated = context.normaliseQuestions(renamed, saved);
assert.deepEqual(Array.from(updated, q => q.key), definitions.map(q => q.label));
assert.deepEqual(Array.from(updated, q => q.id), definitions.map(q => q.id));
const visible = forms.mergeQuestions(definitions, plain(updated));
assert.deepEqual(visible.map(q => q.label), renamed.map(q => q.label));
assert.deepEqual(visible.map(q => q.type), definitions.map(q => q.type));
assert.deepEqual(visible[1].options, ['29', 'Ludo', 'Neither']);
assert.deepEqual(visible[2].show_if, { question_id: 'tournament', equals: '29' });
assert.equal(visible[0].after, 'identity');
assert.equal(context.questionAnswer('Tournament', { 'Renamed field 1': '29' }, updated), '29');
assert.equal(context.questionAnswer('Tournament', { Tournament: 'Ludo' }, updated), 'Ludo');

// Question renames must reuse, rather than rename/add, the spreadsheet columns.
const headers = definitions.map(q => q.label);
const sheet = {
  getLastColumn: () => headers.length,
  getRange: () => ({
    getValues: () => [headers.slice()],
    setValue: () => { throw new Error('Renaming a question attempted to add a new answer column'); }
  })
};
context.fakeSheet = sheet;
vm.runInContext('rsvpSheet = () => fakeSheet;', context);
context.addMissingQuestionColumns({}, 'event', updated);
assert.deepEqual(headers, definitions.map(q => q.label));

// Metadata remains stable when an older tab resends existing wording. Stale
// clients cannot silently rename unknown fields without their identity.
const oldClient = updated.map(q => ({ label: q.label, options: q.options }));
const compatible = context.normaliseQuestions(oldClient, updated);
assert.deepEqual(Array.from(compatible, q => q.id), definitions.map(q => q.id));
assert.deepEqual(Array.from(compatible, q => q.key), definitions.map(q => q.label));
assert.equal(compatible[0].after, 'identity');
assert.deepEqual(plain(compatible[2].show_if), { equals: '29', question_id: 'tournament' });
assert.equal(compatible[3].type, 'multichoice');
assert.equal(compatible[3].help, definitions[3].help);
assert.equal(compatible[3].help_bold, true);
assert.throws(() => context.normaliseQuestions([updated[0], updated[0]], updated), /distinct/);
assert.throws(() => context.normaliseQuestions([{label:'Unknown rename',options:[]}], updated), /refresh Admin/);
const textField = {id:'generic',key:'Original question',label:'Original question',type:'text',options:[]};
assert.equal(context.normaliseQuestions([{id:'generic',key:textField.key,label:'Updated',options:['Yes','No']}], [textField])[0].type, 'choice');
assert.equal(context.normaliseQuestions([{id:'generic',key:textField.key,label:'Updated',options:[]}], [{...textField,type:'choice',options:['Yes','No']}])[0].type, 'text');
const upgradedLegacy = context.parseQuestions(JSON.stringify(legacy));
assert.equal(upgradedLegacy[0].key, 'Phone No');
assert.throws(() => context.normaliseQuestions([{label:'Unknown rename'}], upgradedLegacy), /refresh Admin/);
console.log('Passed: question IDs, label changes, immutable answer columns, structure, condition references, older clients, and duplicate protection.');
