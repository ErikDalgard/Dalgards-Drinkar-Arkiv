import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createTasteFields } from '../../public/js/admin-taste-fields.js';

function withEditor(callback) {
  const dom = new JSDOM('<div id="admin-taste-rows"></div><p id="admin-taste-hint"></p><button id="admin-taste-clear"></button>');
  const originalEvent = globalThis.Event;
  globalThis.document = dom.window.document;
  globalThis.Event = dom.window.Event;
  try { callback(createTasteFields(), dom.window.document); }
  finally { delete globalThis.document; globalThis.Event = originalEvent; dom.window.close(); }
}
test('taste editor distinguishes empty, partial and complete profiles, including zeros', () => withEditor((editor, document) => {
  assert.equal(editor.getValue(), '');
  assert.equal(editor.isComplete(), true);
  assert.equal(document.querySelectorAll('input:checked').length, 0);
  assert.equal(document.getElementById('admin-taste-clear').disabled, true);
  document.querySelector('input[name="taste-0"][value="3"]').click();
  assert.equal(editor.isComplete(), false);
  assert.match(document.getElementById('admin-taste-hint').textContent, /1 av 5/);
  [4, 0, 4, 0].forEach((value, i) => document.querySelector(`input[name="taste-${i + 1}"][value="${value}"]`).click());
  assert.equal(editor.isComplete(), true);
  assert.equal(editor.getValue(), '3/5,4/5,0/5,4/5,0/5');
  document.getElementById('admin-taste-clear').click();
  assert.equal(editor.getValue(), '');
  assert.equal(document.querySelectorAll('input:checked').length, 0);
  assert.equal(editor.isComplete(), true);
}));
test('taste editor loads existing ratings and preserves unrecognized legacy data until explicitly edited', () => withEditor((editor, document) => {
  editor.setValue(' 3/5, 1/5, 0/5, 4/5, 0/5 ');
  assert.equal(document.querySelectorAll('input:checked').length, 5);
  assert.equal(editor.getValue(), '3/5,1/5,0/5,4/5,0/5');
  editor.setValue('old-format');
  assert.equal(editor.getValue(), 'old-format');
  assert.match(document.getElementById('admin-taste-hint').textContent, /behålls/);
  document.querySelector('input[name="taste-0"][value="0"]').click();
  assert.equal(editor.isComplete(), false);
  document.getElementById('admin-taste-clear').click();
  assert.equal(editor.getValue(), '');
}));
