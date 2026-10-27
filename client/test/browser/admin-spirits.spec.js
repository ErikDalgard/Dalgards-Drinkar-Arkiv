import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const initial = JSON.parse(readFileSync(new URL('../spirits.json', import.meta.url), 'utf8'));

test('admin changes persist and drive public spirit filters and recipe links', async ({ page }) => {
  let catalog = structuredClone(initial);
  let writes = 0;
  const drink = { id: 1, date: '2026-01-02', drink: 'Testdrink', theme: 'Fredag', ingredients: '6 cl majswhiskey', steps: 'Skaka', note: '', photo: '', url: '', taste: '' };
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === 'http://localhost:8787') {
      if (url.pathname === '/admin/verify') return route.fulfill({ json: { success: true } });
      if (url.pathname === '/drinks') return route.fulfill({ json: [drink] });
      if (url.pathname === '/spirits') {
        if (request.method() === 'PUT') {
          expect(request.headers()['x-admin-key']).toBe('test-only');
          catalog = request.postDataJSON();
          writes++;
        }
        return route.fulfill({ json: catalog });
      }
    }
    if (url.origin === 'http://127.0.0.1:4173') return route.continue();
    return route.abort();
  });
  await page.goto('/admin.html');
  await page.locator('#admin-key-input').fill('test-only');
  await page.getByRole('button', { name: 'Logga in' }).click();
  await page.getByRole('button', { name: 'Redigera filter', exact: true }).click();
  await expect(page.locator('.admin-spirit-row')).toHaveCount(11);
  const whiskey = page.locator('.admin-spirit-row').nth(5);
  await expect(whiskey.getByLabel('Spritsort', { exact: true })).toHaveValue('Whiskey');
  await whiskey.getByLabel('Spritsort', { exact: true }).fill('Bourbon');
  await whiskey.getByLabel('Sökord – ett per rad').fill('majswhiskey\nbourbon');
  await expect(page.locator('#spirits-unsaved')).toBeVisible();
  await page.getByRole('button', { name: 'Spara spritsorter', exact: true }).click();
  await expect(page.locator('#toast')).toContainText('Spritsorterna har sparats');
  await expect(page.locator('#spirits-status')).toBeHidden();
  await expect(page.locator('#spirits-unsaved')).toBeHidden();
  expect(writes).toBe(1);
  await page.getByRole('button', { name: '+ Lägg till spritsort', exact: true }).click();
  await expect(page.locator('.admin-spirit-row')).toHaveCount(12);
  await expect(page.locator('#spirits-unsaved')).toBeVisible();
  await page.getByRole('button', { name: 'Ångra ändringar', exact: true }).click();
  await expect(page.locator('.admin-spirit-row')).toHaveCount(11);
  expect(writes).toBe(1);
  await expect(page.locator('#spirits-unsaved')).toBeHidden();
  await page.goto('/');
  await expect(page.locator('#grid .card')).toHaveCount(1);
  await page.locator('#filter-toggle').click();
  await page.locator('#spirit-picker-toggle').click();
  await page.locator('#spirit-chip-list').getByRole('button', { name: 'Bourbon', exact: true }).click();
  await expect(page.locator('#grid .card')).toHaveCount(1);
  await page.locator('#grid .card-open').first().click();
  await expect(page.locator('#recipe-spirit-links')).toContainText('Bourbon');
});

test('unsaved filter badge clears when edits are reverted', async ({ page }) => {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://localhost:8787') {
      if (url.pathname === '/admin/verify') return route.fulfill({ json: { success: true } });
      if (url.pathname === '/drinks') return route.fulfill({ json: [] });
      if (url.pathname === '/spirits') return route.fulfill({ json: initial });
    }
    if (url.origin === 'http://127.0.0.1:4173') return route.continue();
    return route.abort();
  });
  await page.goto('/admin.html');
  await page.locator('#admin-key-input').fill('test-only');
  await page.locator('#key-save').click();
  await page.locator('[data-admin-mode="filters"]').click();
  const name = page.locator('.spirit-name').first();
  await expect(name).toHaveValue('Vodka');
  await expect(page.locator('#spirits-unsaved')).toBeHidden();
  await name.fill('Vodkasorter');
  await expect(page.locator('#spirits-unsaved')).toBeVisible();
  await expect(page.locator('#spirits-save')).toBeEnabled();
  await name.fill('Vodka');
  await expect(page.locator('#spirits-unsaved')).toBeHidden();
  await expect(page.locator('#spirits-save')).toBeDisabled();
  await expect(page.locator('#spirits-discard')).toBeDisabled();
});
