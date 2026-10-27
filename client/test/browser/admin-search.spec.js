import { test, expect } from '@playwright/test';
const base = { drink: 'Dry Martini', theme: 'Klassiker', note: '', ingredients: 'gin;vermouth', steps: 'Rör med is', url: 'existing.mp4', taste: '' };
const drinks = [
  { ...base, id: 202, date: '2026-01-02', photo: 'new.jpeg' },
  { ...base, id: 101, date: '2025-01-01', photo: 'old.jpeg' },
];
test('admin suggestions show thumbnails, date and theme and select the correct duplicate', async ({ page }) => {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://localhost:8787') {
      if (url.pathname === '/admin/verify') return route.fulfill({ json: { success: true } });
      if (url.pathname === '/drinks') return route.fulfill({ json: drinks });
      if (url.pathname === '/spirits') return route.fulfill({ json: [{ name: 'Gin', synonyms: ['gin'] }] });
    }
    if (url.origin === 'http://127.0.0.1:4173') return route.continue();
    return route.abort();
  });
  await page.goto('/admin.html');
  await page.locator('#admin-key-input').fill('test-only');
  const loaded = page.waitForResponse(response => response.url().endsWith('/drinks'));
  await page.locator('#key-save').click();
  await loaded;
  await page.locator('[data-admin-mode="edit"]').click();
  await page.locator('#edit-search').fill('Dry Martini');
  const results = page.locator('.edit-search-result');
  await expect(results).toHaveCount(2);
  await expect(results.nth(0).locator('img')).toHaveAttribute('src', /new\.jpeg$/);
  await expect(results.nth(1).locator('img')).toHaveAttribute('src', /old\.jpeg$/);
  await expect(results.nth(0)).toContainText('2 januari 2026 · Klassiker');
  await expect(results.nth(1)).toContainText('1 januari 2025 · Klassiker');
  await results.nth(1).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#f-id')).toHaveValue('101');
  await expect(page.locator('#f-drink')).toHaveValue('Dry Martini');
  await expect(page.locator('#edit-search-results')).toBeHidden();
  await page.locator('#edit-search').fill('Ingenting matchar');
  await expect(page.locator('.edit-search-empty')).toHaveText('Inga träffar');
  await expect(results).toHaveCount(0);
});
