import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createUnsavedChanges } from '../../public/js/admin-unsaved.js';

function fixture() {
  const dom = new JSDOM('<form id="drink"><input value="Saved"><input type="radio" name="taste" value="0"><textarea>Original</textarea></form><form id="filters"><input value="Gin"></form>');
  const forms = [...dom.window.document.forms];
  let saving = false;
  const guard = createUnsavedChanges(forms, () => saving);
  const blocked = () => !dom.window.dispatchEvent(new dom.window.Event('beforeunload', { cancelable: true }));
  return { dom, forms, guard, blocked, setSaving(value) { saving = value; guard.refresh(); }, close() { guard.dispose(); dom.window.close(); } };
}
test('unsaved guard tracks reverted values, dynamic recipe rows, radio choices and both forms', () => {
  const f = fixture();
  try {
    const [drink, filters] = f.forms;
    const input = drink.querySelector('input');
    assert.equal(f.blocked(), false);
    input.value = 'Draft';
    f.guard.refresh();
    assert.equal(f.guard.hasChanges(drink), true);
    assert.equal(f.blocked(), true);
    input.value = 'Saved';
    f.guard.refresh();
    assert.equal(f.blocked(), false);
    const row = drink.ownerDocument.createElement('input');
    drink.append(row);
    assert.equal(f.guard.hasChanges(drink), true);
    row.remove();
    assert.equal(f.guard.hasChanges(drink), false);
    drink.querySelector('[type="radio"]').checked = true;
    f.guard.refresh();
    assert.equal(f.blocked(), true);
    filters.querySelector('input').value = 'Vodka';
    f.guard.markClean(drink);
    assert.equal(f.blocked(), true);
    f.guard.markClean(filters);
    assert.equal(f.blocked(), false);
  } finally { f.close(); }
});
test('discard confirmation respects cancel and active saving protects even a pristine form', () => {
  const f = fixture();
  try {
    const drink = f.forms[0];
    let prompts = 0;
    f.dom.window.confirm = () => { prompts++; return false; };
    assert.equal(f.guard.confirmDiscard(drink), true);
    assert.equal(prompts, 0);
    drink.querySelector('textarea').value = 'Edited';
    assert.equal(f.guard.confirmDiscard(drink), false);
    assert.equal(prompts, 1);
    f.dom.window.confirm = () => true;
    assert.equal(f.guard.confirmDiscard(drink), true);
    assert.equal(f.guard.hasChanges(drink), true);
    f.guard.markClean(drink);
    f.setSaving(true);
    assert.equal(f.blocked(), true);
    f.setSaving(false);
    assert.equal(f.blocked(), false);
  } finally { f.close(); }
});
