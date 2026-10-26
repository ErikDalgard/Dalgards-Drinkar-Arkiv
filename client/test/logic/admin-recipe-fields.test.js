import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
const source = readFileSync(new URL('../../public/js/admin-recipe-fields.js', import.meta.url), 'utf8');

for (const kind of ['ingredients', 'steps']) {
  test(`${kind}: load, add, remove, renumber and serialize recipe rows`, () => {
    const dom = new JSDOM(`<div id="f-${kind}"></div><button id="add-${kind}"></button>`, { runScripts: 'outside-only' });
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
