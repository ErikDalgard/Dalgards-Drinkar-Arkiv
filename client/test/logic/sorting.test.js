import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareDrinks } from '../../public/js/utils.js';

test('date sorting supports newest and oldest first', () => {
  const drinks = [{ drink: 'Old', date: '2025-01-01' }, { drink: 'New', date: '2026-01-01' }];
  assert.deepEqual([...drinks].sort((a, b) => compareDrinks(a, b, 'desc')), [drinks[1], drinks[0]]);
  assert.deepEqual([...drinks].sort((a, b) => compareDrinks(a, b, 'asc')), drinks);
});
test('name sorting uses Swedish alphabet and puts newer duplicate recipes first', () => {
  const drinks = ['Ö', 'Ä', 'Å', 'Z', 'A'].map(drink => ({ drink, date: '2026-01-01' }));
  assert.deepEqual([...drinks].sort((a, b) => compareDrinks(a, b, 'name-asc')).map(d => d.drink), ['A', 'Z', 'Å', 'Ä', 'Ö']);
  assert.deepEqual([...drinks].sort((a, b) => compareDrinks(a, b, 'name-desc')).map(d => d.drink), ['Ö', 'Ä', 'Å', 'Z', 'A']);
  const older = { drink: 'Dry Martini', date: '2025-01-01' };
  const newer = { drink: 'Dry Martini', date: '2026-01-01' };
  for (const order of ['name-asc', 'name-desc']) {
    assert.deepEqual([older, newer].sort((a, b) => compareDrinks(a, b, order)), [newer, older]);
  }
});
