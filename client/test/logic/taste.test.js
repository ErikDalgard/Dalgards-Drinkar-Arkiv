import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTasteProfile, matchesTasteFilters } from '../../public/js/taste.js';

test('taste profiles keep zero values and reject missing or malformed data', () => {
  assert.deepEqual(parseTasteProfile('3/5, 4/5, 0/5, 4/5, 0/5'), [3, 4, 0, 4, 0]);
  for (const value of ['', null, undefined, '3/5,4/5', '6/5,4/5,0/5,4/5,0/5', '3/5,,0/5,4/5,0/5', '3/5,4/5,0/5,4/5,0/5 trailing']) {
    assert.equal(parseTasteProfile(value), null);
  }
});
test('taste choices combine with AND and do not exclude unprofiled drinks until selected', () => {
  assert.equal(matchesTasteFilters('', new Set()), true);
  assert.equal(matchesTasteFilters('', new Set(['sour'])), false);
  assert.equal(matchesTasteFilters('3/5,4/5,0/5,4/5,0/5', new Set(['sour', 'strong'])), true);
  assert.equal(matchesTasteFilters('3/5,4/5,0/5,3/5,0/5', new Set(['sour', 'strong'])), false);
  assert.equal(matchesTasteFilters('4/5,0/5,3/5,0/5,0/5', new Set(['sweet', 'bitter'])), true);
});
