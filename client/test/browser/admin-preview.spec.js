import { test, expect } from '@playwright/test';
const savedDrink = {
  id: 42, date: '2026-01-02', drink: 'Test Sour', theme: 'Fredag', note: 'Sparad drink',
  url: 'existing.mp4', photo: 'existing.jpeg', ingredients: '6 cl whiskey;3 cl citronjuice',
  steps: 'Skaka;Sila', taste: '',
};
let writes;
test.beforeEach(async ({ page }) => {
  writes = [];
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === 'http://localhost:8787') {
      if (url.pathname === '/admin/verify') return route.fulfill({ json: { success: true } });
      if (url.pathname === '/drinks' && request.method() === 'GET') return route.fulfill({ json: [savedDrink] });
      writes.push({ path: url.pathname, body: request.postDataJSON() });
      return route.fulfill({ json: { success: true } });
    }
    if (url.origin === 'http://127.0.0.1:4173') return route.continue();
    return route.abort();
  });
  await page.goto('/admin.html');
  await page.locator('#admin-key-input').fill('test-only');
  const loaded = page.waitForResponse(response => response.url() === 'http://localhost:8787/drinks');
  await page.getByRole('button', { name: 'Logga in' }).click();
  await loaded;
  await expect(page.locator('#admin-panel')).toBeVisible();
});
test('required fields gate preview/save; local preview uploads nothing and retains the form', async ({ page }) => {
  const save = page.locator('#submit-btn');
  const preview = page.getByRole('button', { name: 'Förhandsgranska', exact: true });
  await expect(save).toBeDisabled();
  await expect(preview).toBeDisabled();
  await page.locator('#f-date').fill('2026-01-02');
  await page.locator('#f-drink').fill('Ny drink');
  await page.locator('#f-photo-file').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP1sAAAAASUVORK5CYII=', 'base64') });
  await expect(preview).toBeDisabled();
  await page.locator('#f-video-file').setInputFiles({ name: 'video.mp4', mimeType: 'video/mp4', buffer: Buffer.from('test-video-bytes') });
  await page.locator('#f-ingredients input').fill('6 cl whiskey');
  await page.locator('#f-steps textarea').fill('Skaka med is');
  await expect(save).toBeEnabled();
  await expect(preview).toBeEnabled();
  await preview.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#modal-drink')).toHaveText('Ny drink');
  await expect(page.locator('#recipe-groups')).toContainText('6 cl whiskey');
  await expect(page.locator('#recipe-groups')).toContainText('Skaka med is');
  await expect(page.locator('#modal-video')).toHaveAttribute('src', /^blob:/);
  await expect(page.locator('#modal-video')).toHaveAttribute('poster', /^blob:/);
  expect(writes).toEqual([]);
  await page.getByRole('button', { name: 'Stäng förhandsgranskning' }).click();
  await expect(page.locator('#f-drink')).toHaveValue('Ny drink');
  await expect(preview).toBeFocused();
  await page.locator('#f-drink').fill('   ');
  await expect(save).toBeDisabled();
  await expect(preview).toBeDisabled();
});
test('existing media enables edit preview; saving resets action availability', async ({ page }) => {
  await page.locator('#mode-select').selectOption('edit');
  await page.locator('#edit-search').fill('Test Sour');
  await page.locator('.edit-search-result').click();
  const save = page.locator('#edit-submit-btn');
  const preview = page.locator('#preview-btn');
  await expect(save).toBeEnabled();
  await expect(preview).toBeEnabled();
  await preview.click();
  await expect(page.locator('#modal-drink')).toHaveText('Test Sour');
  await expect(page.locator('#modal-video')).toHaveAttribute('src', /existing\.mp4$/);
  await expect(page.locator('#modal-video')).toHaveAttribute('poster', /existing\.jpeg$/);
  expect(writes).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.locator('#f-drink').fill('Edited Sour');
  await save.click();
  await expect(page.locator('#submit-btn')).toBeVisible();
  await expect(page.locator('#submit-btn')).toBeDisabled();
  await expect(preview).toBeDisabled();
  expect(writes).toEqual([{ path: '/drinks/42', body: { ...savedDrink, id: undefined, drink: 'Edited Sour' } }]);
});
