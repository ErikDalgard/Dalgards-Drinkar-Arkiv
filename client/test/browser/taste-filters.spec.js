import { test, expect } from '@playwright/test';
const base = { date: '2026-01-02', theme: 'Klassiker', note: '', url: '', photo: '', steps: 'Skaka', ingredients: 'gin', taste: '' };
const drinks = [
  { ...base, id: 1, drink: 'Syrlig gin', taste: '3/5,4/5,0/5,4/5,0/5' },
  { ...base, id: 2, drink: 'Syrlig vodka', ingredients: 'vodka', taste: '3/5,4/5,0/5,3/5,0/5' },
  { ...base, id: 3, drink: 'Ingen smakprofil' },
];
test('taste filters sit beside spirits, exclude missing profiles and support removable selections', async ({ page }) => {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://localhost:8787' && url.pathname === '/drinks') return route.fulfill({ json: drinks });
    if (url.origin === 'http://localhost:8787' && url.pathname === '/spirits') return route.fulfill({ json: [{ name: 'Gin', synonyms: ['gin'] }, { name: 'Vodka', synonyms: ['vodka'] }] });
    if (url.origin === 'http://127.0.0.1:4173') return route.continue();
    return route.abort();
  });
  await page.goto('/');
  await expect(page.locator('#grid .card')).toHaveCount(3);
  await page.locator('#filter-toggle').click();
  await expect(page.locator('#taste-picker-toggle')).toBeVisible();
  // Measure both in the same frame while the panel's padding animates.
  const { spirit, taste } = await page.evaluate(() => {
    const spirit = document.getElementById('spirit-picker-toggle').getBoundingClientRect();
    const taste = document.getElementById('taste-picker-toggle').getBoundingClientRect();
    return { spirit: { x: spirit.x, y: spirit.y }, taste: { x: taste.x, y: taste.y } };
  });
  expect(Math.abs(spirit.y - taste.y)).toBeLessThan(2);
  expect(taste.x).toBeGreaterThan(spirit.x);
  await page.locator('#taste-picker-toggle').click();
  await expect(page.locator('#taste-filter-info')).toContainText('2 av 3 drinkar');
  const panel = await page.locator('#taste-picker-panel').boundingBox();
  expect(panel.x).toBeGreaterThanOrEqual(0);
  expect(panel.x + panel.width).toBeLessThanOrEqual(page.viewportSize().width);
  await page.locator('[data-taste="sour"]').click();
  await expect(page.locator('#grid .card')).toHaveCount(2);
  await page.locator('[data-taste="strong"]').click();
  await expect(page.locator('#grid .card')).toHaveCount(1);
  await page.locator('#taste-filter-options').press('Escape');
  await expect(page.locator('#taste-picker-panel')).toBeHidden();
  await expect(page.locator('#taste-picker-toggle')).toBeFocused();
  await page.locator('#spirit-picker-toggle').click();
  const spiritPanel = await page.locator('#spirit-picker-panel').boundingBox();
  expect(spiritPanel.x).toBeGreaterThanOrEqual(0);
  expect(spiritPanel.x + spiritPanel.width).toBeLessThanOrEqual(page.viewportSize().width);
  await page.locator('#spirit-chip-list').getByRole('button', { name: 'Vodka', exact: true }).click();
  await expect(page.locator('#grid .card')).toHaveCount(0);
  await page.locator('#spirit-picker-toggle').click();
  await page.getByRole('button', { name: 'Ta bort filter: Stark', exact: true }).click();
  await expect(page.locator('#grid .card')).toHaveCount(1);
  await expect(page.locator('#grid')).toContainText('Syrlig vodka');
  await page.locator('#active-filter-clear').click();
  await expect(page.locator('#grid .card')).toHaveCount(3);
  await expect(page.locator('#taste-picker-label')).toHaveText('Alla smaker');
});
