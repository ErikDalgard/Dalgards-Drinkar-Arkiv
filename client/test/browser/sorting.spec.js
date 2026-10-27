import { test, expect } from '@playwright/test';
const drinks = [
  ['Örtdrink', '2026-01-03'], ['Äppeldrink', '2026-01-05'], ['Åkerbär', '2026-01-01'],
  ['Zebra', '2026-01-02'], ['Ananas', '2026-01-04'],
].map(([drink, date], index) => ({ id: index + 1, drink, date, ingredients: 'gin', theme: '', note: '', steps: '', taste: '', photo: '', url: '' }));

test('sort control defaults to newest and supports date and Swedish alphabetical order', async ({ page }) => {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://localhost:8787') {
      if (url.pathname === '/drinks') return route.fulfill({ json: drinks });
      if (url.pathname === '/spirits') return route.fulfill({ json: [{ name: 'Gin', synonyms: ['gin'] }] });
    }
    if (url.origin === 'http://127.0.0.1:4173') return route.continue();
    return route.abort();
  });
  await page.goto('/');
  const sort = page.getByRole('combobox', { name: 'Sortera drinkar', exact: true });
  const titles = page.locator('#grid .card-open');
  await expect(page.locator('.sort-control')).toContainText('Sortera');
  await expect(sort).toHaveValue('desc');
  await expect(titles).toHaveText(['Äppeldrink', 'Ananas', 'Örtdrink', 'Zebra', 'Åkerbär']);
  await sort.selectOption('asc');
  await expect(titles).toHaveText(['Åkerbär', 'Zebra', 'Örtdrink', 'Ananas', 'Äppeldrink']);
  await sort.selectOption('name-asc');
  await expect(titles).toHaveText(['Ananas', 'Zebra', 'Åkerbär', 'Äppeldrink', 'Örtdrink']);
  await sort.selectOption('name-desc');
  await expect(titles).toHaveText(['Örtdrink', 'Äppeldrink', 'Åkerbär', 'Zebra', 'Ananas']);
  await page.locator('#home-link').click();
  await expect(sort).toHaveValue('desc');
  await expect(titles).toHaveText(['Äppeldrink', 'Ananas', 'Örtdrink', 'Zebra', 'Åkerbär']);
});
