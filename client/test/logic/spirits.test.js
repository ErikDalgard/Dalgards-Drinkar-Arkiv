import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDrinkSpirits, ingredientsContainSpirit } from '../../public/js/spirits.js';

test('spirit categories match synonyms, not only category names', () => {
  for (const [ingredient, category] of [['BOURBON', 'Whiskey'], ['mezcal', 'Tequila'], ['brandy', 'Cognac'], ['aperol', 'Aperitif & Bitter'], ['vit rom', 'Ljus Rom']]) {
    assert.equal(ingredientsContainSpirit(`4 cl ${ingredient}`, category), true);
    assert.ok(getDrinkSpirits(`4 cl ${ingredient}`).includes(category));
  }
});
test('multiple spirits are unique and retain picker order', () => {
  assert.deepEqual(getDrinkSpirits('gin;vodka;gin;vermouth'), ['Vodka', 'Gin', 'Vermouth']);
});
test('empty recipes and unknown categories do not match', () => {
  assert.deepEqual(getDrinkSpirits(null), []);
  assert.deepEqual(getDrinkSpirits('citronjuice;sockerlag'), []);
  assert.equal(ingredientsContainSpirit('vodka', 'Unknown'), false);
});
