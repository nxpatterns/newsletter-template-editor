import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

When('I open the start page menu', async ({ page }) => {
  await page.getByTestId('start-menu-trigger').click();
  await expect(page.getByTestId('start-menu-panel')).toBeVisible();
});

When('I open the editor menu', async ({ page }) => {
  await page.getByTestId('file-menu-trigger').click();
  await expect(page.getByTestId('file-menu-panel')).toBeVisible();
});

Then('the start page menu entries should be {string}', async ({ page }, order: string) => {
  const ids = await page
    .getByTestId('start-menu-panel')
    .getByRole('menuitem')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  expect(ids).toEqual(order.split(','));
});

Then('the last editor menu entry should be {string}', async ({ page }, id: string) => {
  await expect(page.getByTestId('file-menu-panel').getByRole('menuitem').last()).toHaveAttribute('data-testid', id);
});

Then('the menu entry {string} should be disabled', async ({ page }, id: string) => {
  await expect(page.getByTestId(id)).toBeDisabled();
});

Then('the menu entry {string} should be enabled', async ({ page }, id: string) => {
  await expect(page.getByTestId(id)).toBeEnabled();
});

Then('the reset entry should be shown in the danger color', async ({ page }) => {
  const entry = page.getByTestId('menu-factory-reset');
  const danger = await page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--ds-danger)';
    document.body.appendChild(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  await expect(entry).toHaveCSS('color', danger);
});

When('I choose the menu entry {string}', async ({ page }, id: string) => {
  await page.getByTestId(id).click();
});

When('I pick the saved template {string}', async ({ page }, name: string) => {
  const picker = page.getByTestId('library-picker');
  await expect(picker).toBeVisible();
  await picker.getByTestId('library-pick').filter({ hasText: name }).click();
});

Then('the reset can only be confirmed after ticking the acknowledgement', async ({ page }) => {
  const dialog = page.getByTestId('reset-dialog');
  await expect(dialog.getByRole('alertdialog')).toBeVisible();
  await expect(dialog.getByTestId('reset-delete')).toBeDisabled();
  await dialog.getByTestId('reset-acknowledge').check();
  await expect(dialog.getByTestId('reset-delete')).toBeEnabled();
});

When('I cancel the reset', async ({ page }) => {
  const dialog = page.getByTestId('reset-dialog');
  await dialog.getByTestId('reset-cancel').click();
  await expect(dialog).toBeHidden();
});

When('I confirm the reset', async ({ page }) => {
  const dialog = page.getByTestId('reset-dialog');
  await dialog.getByTestId('reset-acknowledge').check();
  await dialog.getByTestId('reset-delete').click();
});

When('the browser remembers a panel width', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('newsletter-template-editor.side-panel-width.v1', '420'));
});

Then('the browser should keep no app state except the language', async ({ page }) => {
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('newsletter-template-editor.')));
  expect(keys).toEqual(['newsletter-template-editor.locale.v1']);
});

Then('the app language should be {string}', async ({ page }, lang: string) => {
  await expect(page.locator('html')).toHaveAttribute('lang', lang);
});

const LONG_NAME = 'Herbstaktion-2026-'.repeat(15).slice(0, 255);

When('I rename the newsletter to a name with 255 characters', async ({ page }) => {
  await page.getByTestId('file-menu-trigger').click();
  await page.getByTestId('file-rename').click();
  await page.getByTestId('confirm-prompt-input').fill(LONG_NAME);
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('confirm-dialog')).toBeHidden();
});

Then('the template name in the menu head should be shown in full on several lines', async ({ page }) => {
  const name = page.getByTestId('file-menu-doc-name');
  await expect(name).toHaveText(LONG_NAME);
  const box = await name.evaluate((el) => ({
    clipped: el.scrollWidth > el.clientWidth,
    lines: Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)),
  }));
  expect(box.clipped).toBe(false);
  expect(box.lines).toBeGreaterThan(1);
});
