import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { createFilters } from '../../public/js/filters.js';
const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const drinks = [
  { drink: 'Gin Sour', theme: 'Sommar', date: '2026-01-01', ingredients: 'gin;citron', note: '', steps: '' },
  { drink: 'Vodka Sour', theme: 'Vinter', date: '2026-02-01', ingredients: 'vodka;citron', note: '', steps: '' },
];
test('search, dates, exclusive spirit links and clear-filter behavior', () => {
  const dom = new JSDOM(html);
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  dom.window.scrollTo = () => {};
  try {
    const filters = createFilters(['Sommar', 'Vinter'], () => {});
    const search = document.getElementById('search');
    search.value = 'vodka';
    assert.deepEqual(filters.apply(drinks), [drinks[1]]);
    document.getElementById('date-to').value = '2026-01-31';
    assert.deepEqual(filters.apply(drinks), []);
    filters.filterBySpirit('Gin');
    assert.equal(search.value, '');
    assert.equal(document.getElementById('date-to').value, '');
    assert.deepEqual(filters.apply(drinks), [drinks[0]]);
    search.value = 'vodka';
    document.getElementById('active-filter-clear').click();
    assert.equal(search.value, 'vodka');
    assert.deepEqual(filters.apply(drinks), [drinks[1]]);
    document.getElementById('empty-reset').click();
    assert.equal(search.value, '');
    assert.deepEqual(filters.apply(drinks), drinks);
    assert.equal(document.getElementById('active-filters').hidden, true);
  } finally {
    dom.window.close(); delete globalThis.document; delete globalThis.window;
  }
});
