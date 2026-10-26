import { setSpirits } from "../../public/js/spirits.js";
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

setSpirits(JSON.parse(readFileSync(new URL("../spirits.json", import.meta.url), "utf8")));

test('taste filters count complete profiles, combine with spirits, and reset cleanly', () => {
  const videos = [
    { ...drinks[0], taste: '3/5,4/5,0/5,4/5,0/5' },
    { ...drinks[1], taste: '3/5,4/5,0/5,3/5,0/5' },
    { ...drinks[0], drink: 'Utan profil', taste: '' },
    { ...drinks[0], drink: 'Ofullständig profil', taste: '3/5,4/5' },
  ];
  const dom = new JSDOM(html);
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  dom.window.scrollTo = () => {};
  try {
    const filters = createFilters(['Sommar', 'Vinter'], () => {}, videos);
    const choose = id => document.querySelector(`[data-taste="${id}"]`).click();
    assert.match(document.getElementById('taste-filter-info').textContent, /2 av 4/);
    assert.deepEqual(filters.apply(videos), videos);
    choose('sour');
    assert.deepEqual(filters.apply(videos), videos.slice(0, 2));
    choose('strong');
    assert.deepEqual(filters.apply(videos), [videos[0]]);
    document.querySelector('[data-spirit="Vodka"]').click();
    assert.deepEqual(filters.apply(videos), []);
    document.querySelector('[aria-label="Ta bort filter: Stark"]').click();
    assert.deepEqual(filters.apply(videos), [videos[1]]);
    document.getElementById('active-filter-clear').click();
    assert.deepEqual(filters.apply(videos), videos);
    assert.equal(document.getElementById('taste-picker-label').textContent, 'Alla smaker');
    choose('sour');
    filters.filterBySpirit('Gin');
    assert.deepEqual(filters.apply(videos), [videos[0], videos[2], videos[3]]);
    assert.equal(document.querySelector('[data-taste="sour"]').getAttribute('aria-pressed'), 'false');
  } finally {
    dom.window.close(); delete globalThis.document; delete globalThis.window;
  }
});
