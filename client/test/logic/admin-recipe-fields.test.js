import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
const source = readFileSync(new URL('../../public/js/admin-recipe-fields.js', import.meta.url), 'utf8');

for (const kind of ['ingredients', 'steps']) {
  test(`${kind}: load, add, remove, renumber and serialize recipe rows`, () => {
    const dom = new JSDOM(`<div id="f-${kind}"></div><button id="add-${kind}"></button><button id="add-${kind}-heading"></button>`, { runScripts: 'outside-only' });
    try {
      dom.window.eval(source);
      const editor = dom.window.createRecipeFields(kind, kind === 'steps' ? 'Steg' : 'Ingrediens', kind === 'steps');
      const document = dom.window.document;
      const rows = document.getElementById(`f-${kind}`);
      editor.setValue(' 6 cl whiskey;3 cl citronjuice; ');
      assert.equal(rows.children.length, 2);
      assert.equal(editor.getValue(), '6 cl whiskey;3 cl citronjuice');
      document.getElementById(`add-${kind}`).click();
      assert.equal(rows.children.length, 3);
      assert.equal(editor.getValue(), '6 cl whiskey;3 cl citronjuice');
      rows.lastElementChild.querySelector('input, textarea').value = 'Servera';
      rows.children[1].querySelector('button').click();
      assert.equal(editor.getValue(), '6 cl whiskey;Servera');
      assert.match(rows.children[1].querySelector('label').textContent, /2$/);
      assert.equal(document.activeElement, rows.children[1].querySelector('input, textarea'));
      editor.setValue('a;b||c;d');
      assert.equal(editor.getValue(), 'a;b||c;d');
      editor.setValue('');
      rows.firstElementChild.querySelector('button').click();
      assert.equal(rows.children.length, 1);
      assert.equal(editor.getValue(), '');
    } finally { dom.window.close(); }
  });
}

for (const kind of ['ingredients', 'steps']) {
  test(`${kind}: headings round-trip, reset numbering and support converting old rows`, () => {
    const dom = new JSDOM(`<div id="f-${kind}"></div><button id="add-${kind}"></button><button id="add-${kind}-heading"></button>`, { runScripts: 'outside-only' });
    try {
      dom.window.eval(source);
      const editor = dom.window.createRecipeFields(kind, kind === 'steps' ? 'Steg' : 'Ingrediens', kind === 'steps');
      const document = dom.window.document;
      const rows = document.getElementById(`f-${kind}`);
      document.getElementById(`add-${kind}-heading`).click();
      assert.equal(rows.children.length, 1);
      assert.equal(rows.firstElementChild.dataset.type, 'heading');
      rows.firstElementChild.querySelector('.admin-recipe-value').value = 'Drinken';
      document.getElementById(`add-${kind}`).click();
      rows.lastElementChild.querySelector('.admin-recipe-value').value = 'Skaka';
      assert.equal(editor.getValue(), '# Drinken;Skaka');
      editor.setValue('# Drinken;Skaka;Sila;# Bärsyrup;Koka;Låt svalna');
      assert.deepEqual(Array.from(rows.querySelectorAll('label'), el => el.textContent), [
        'Rubrik', `${kind === 'steps' ? 'Steg' : 'Ingrediens'} 1`, `${kind === 'steps' ? 'Steg' : 'Ingrediens'} 2`,
        'Rubrik', `${kind === 'steps' ? 'Steg' : 'Ingrediens'} 1`, `${kind === 'steps' ? 'Steg' : 'Ingrediens'} 2`,
      ]);
      assert.equal(editor.getValue(), '# Drinken;Skaka;Sila;# Bärsyrup;Koka;Låt svalna');
      editor.setValue('Bärsyrup;Koka');
      const type = rows.firstElementChild.querySelector('select');
      type.value = 'heading';
      type.dispatchEvent(new dom.window.Event('change'));
      assert.equal(editor.getValue(), '# Bärsyrup;Koka');
      rows.firstElementChild.querySelector('button').click();
      assert.equal(editor.getValue(), 'Koka');
      assert.match(rows.firstElementChild.querySelector('label').textContent, /1$/);
    } finally { dom.window.close(); }
  });
}
