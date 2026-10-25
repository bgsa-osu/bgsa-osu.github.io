/** Stable question identity keeps wording edits separate from form behavior. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BGSAForms = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function findQuestion(question, stored) {
    const labels = [question.label].concat(question.previous_labels || []);
    return stored.find(item => question.id && item.id === question.id) ||
      stored.find(item => question.key && (item.key || item.label) === question.key) ||
      stored.find(item => item.label === question.label) ||
      stored.find(item => labels.includes(item.key || item.label)) ||
      stored.find(item => labels.includes(item.label));
  }

  function displayText(value) {
    return String(value || "").replace(/\bludu\b/gi, "Ludo");
  }

  function displayLabel(question, stored) {
    const label = question.id && stored.id === question.id ? stored.label
      : (question.previous_labels || []).includes(stored.label) && stored.label !== question.label
        ? question.label : stored.label;
    return displayText(label);
  }

  function mergeQuestions(definitions, stored) {
    stored = stored || [];
    const used = new Set();
    const questions = (definitions || []).map(definition => {
      const match = findQuestion(definition, stored);
      // Known legacy duplicates stay in spreadsheet history, not the editor.
      stored.forEach(item => {
        if (findQuestion(definition, [item])) used.add(item);
      });
      return Object.assign({}, match || {}, definition, {
        label: match ? displayLabel(definition, match) : definition.label,
        key: match ? (match.key || match.label) : (definition.key || definition.label),
        stored_label: match ? match.label : definition.label,
        previous_labels: [definition.label].concat(definition.previous_labels || []),
        managed: true
      });
    });
    return questions.concat(stored.filter(item => !used.has(item)));
  }

  return { findQuestion, displayText, displayLabel, mergeQuestions };
});
