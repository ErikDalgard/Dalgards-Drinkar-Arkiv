import { test, expect } from '@playwright/test';
const drinks = [1, 2].map(id => ({ id, date: '2026-01-02', drink: `Drink ${id}`, theme: 'Fredag', note: '', ingredients: '6 cl gin', steps: 'Skaka', taste: '', photo: 'existing.jpeg', url: 'existing.mp4' }));
const initialSpirits = [{ name: 'Gin', synonyms: ['gin'] }];
let failWrites;
const blocked = page => page.evaluate(() => {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
});
async function selectDrink(page, name) {
  await page.locator('#edit-search').fill(name);
  await page.locator('.edit-search-result').click();
}
test.beforeEach(async ({ page }) => {
  failWrites = false;
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === 'http://localhost:8787') {
      if (url.pathname === '/admin/verify') return route.fulfill({ json: { success: true } });
      if (request.method() !== 'GET') {
        if (failWrites) return route.fulfill({ status: 500, json: { error: 'Test failure' } });
        return route.fulfill({ json: url.pathname === '/spirits' ? request.postDataJSON() : { success: true } });
      }
      if (url.pathname === '/drinks') return route.fulfill({ json: drinks });
      if (url.pathname === '/spirits') return route.fulfill({ json: initialSpirits });
    }
    if (url.origin === 'http://127.0.0.1:4173') return route.continue();
    return route.abort();
  });
  await page.goto('/admin.html');
  await page.locator('#admin-key-input').fill('test-only');
  await page.locator('#key-save').click();
  await expect(page.locator('.admin-spirit-row')).toHaveCount(1);
});
test('mode changes ask before discarding, cancel preserves drafts, and reverted edits need no warning', async ({ page }) => {
  await page.locator('#f-drink').fill('Osparad drink');
  expect(await blocked(page)).toBe(true);
  page.once('dialog', async dialog => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain('osparade ändringar');
    await dialog.dismiss();
  });
  await page.locator('[data-admin-mode="edit"]').click();
  await expect(page.locator('[data-admin-mode="add"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#f-drink')).toHaveValue('Osparad drink');
  await page.locator('[data-admin-mode="filters"]').click();
  await page.locator('[data-admin-mode="add"]').click();
  await expect(page.locator('#f-drink')).toHaveValue('Osparad drink');
  await page.locator('#f-drink').fill('');
  expect(await blocked(page)).toBe(false);
  await page.locator('[data-admin-mode="edit"]').click();
  await selectDrink(page, 'Drink 1');
  expect(await blocked(page)).toBe(false);
  await page.locator('#f-note').fill('Ändrad kommentar');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('[data-admin-mode="add"]').click();
  await expect(page.locator('#f-note')).toHaveValue('');
  expect(await blocked(page)).toBe(false);
});
test('selecting another drink protects recipe edits and selected files', async ({ page }) => {
  await page.locator('[data-admin-mode="edit"]').click();
  await selectDrink(page, 'Drink 1');
  await page.locator('#add-ingredients-heading').click();
  await page.locator('#f-ingredients .admin-recipe-value').last().fill('Syrup');
  expect(await blocked(page)).toBe(true);
  page.once('dialog', dialog => dialog.dismiss());
  await selectDrink(page, 'Drink 2');
  await expect(page.locator('#f-id')).toHaveValue('1');
  await expect(page.locator('#f-ingredients .admin-recipe-value').last()).toHaveValue('Syrup');
  page.once('dialog', dialog => dialog.accept());
  await selectDrink(page, 'Drink 2');
  await expect(page.locator('#f-id')).toHaveValue('2');
  expect(await blocked(page)).toBe(false);
  await page.locator('#f-photo-file').setInputFiles({ name: 'new.jpeg', mimeType: 'image/jpeg', buffer: Buffer.from('test-only') });
  expect(await blocked(page)).toBe(true);
  await page.locator('#f-photo-file').setInputFiles([]);
  expect(await blocked(page)).toBe(false);
  await page.getByRole('radio', { name: 'Sötma: 3 av 5', exact: true }).check();
  expect(await blocked(page)).toBe(true);
  await page.getByRole('button', { name: 'Rensa smakprofil', exact: true }).click();
  expect(await blocked(page)).toBe(false);
});
test('successful save clears the warning, failed save and preview keep it', async ({ page }) => {
  await page.locator('[data-admin-mode="edit"]').click();
  await selectDrink(page, 'Drink 1');
  await page.locator('#f-note').fill('Ny kommentar');
  await page.locator('#preview-btn').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await blocked(page)).toBe(true);
  await page.locator('#edit-submit-btn').click();
  await expect(page.locator('#f-id')).toHaveValue('');
  expect(await blocked(page)).toBe(false);
  await page.locator('[data-admin-mode="edit"]').click();
  await selectDrink(page, 'Drink 2');
  await page.locator('#f-note').fill('Behåll vid fel');
  failWrites = true;
  await page.locator('#edit-submit-btn').click();
  await expect(page.locator('#toast')).toContainText('Fel:');
  await expect(page.locator('#edit-submit-btn')).toBeEnabled();
  await expect(page.locator('#f-note')).toHaveValue('Behåll vid fel');
  expect(await blocked(page)).toBe(true);
});
test('filter drafts survive view switches, and only saving or discarding clears their warning', async ({ page }) => {
  await page.locator('[data-admin-mode="filters"]').click();
  const name = page.locator('.spirit-name');
  await name.fill('Ginsorter');
  expect(await blocked(page)).toBe(true);
  await page.locator('[data-admin-mode="add"]').click();
  expect(await blocked(page)).toBe(true);
  await page.locator('[data-admin-mode="filters"]').click();
  await expect(name).toHaveValue('Ginsorter');
  await page.locator('#spirits-discard').click();
  expect(await blocked(page)).toBe(false);
  await name.fill('Ginsorter');
  await page.locator('#spirits-save').click();
  await expect(page.locator('#spirits-status')).toContainText('har sparats');
  expect(await blocked(page)).toBe(false);
  await name.fill('Behåll vid fel');
  failWrites = true;
  await page.locator('#spirits-save').click();
  await expect(page.locator('#spirits-status')).toContainText('Test failure');
  expect(await blocked(page)).toBe(true);
});
test('desktop browser asks before leaving a dirty page, and cancel keeps it open', async ({ page, isMobile }) => {
  // Mobile browsers may suppress native beforeunload dialogs; internal guards run on both.
  test.skip(isMobile, 'Native tab-leaving dialogs depend on mobile browser support');
  await page.locator('#f-drink').fill('Osparad drink');
  let type;
  page.once('dialog', async dialog => { type = dialog.type(); await dialog.dismiss(); });
  await page.locator('#home-link').click();
  expect(type).toBe('beforeunload');
  await expect(page).toHaveURL(/admin\.html$/);
  await expect(page.locator('#f-drink')).toHaveValue('Osparad drink');
  await page.locator('#f-drink').fill('');
  await page.locator('#home-link').click();
  await expect(page).toHaveURL(/index\.html$/);
});
