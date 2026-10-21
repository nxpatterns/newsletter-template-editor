import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { openGroup } from './group-accordions.steps';

const { Given, When, Then } = createBdd();

Given('I open the address {string}', async ({ page }, url: string) => {
  await page.goto(url);
});

Then('the start page title should read {string}', async ({ page }, text: string) => {
  await expect(page.getByTestId('start-title')).toHaveText(text);
});

Then('the start page should be visible', async ({ page }) => {
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('start-page')).toBeVisible();
});

Then('the start tiles should be in the order {string}', async ({ page }, order: string) => {
  await expect(page.locator('.start-tile')).toHaveCount(order.split(',').length);
  const ids = await page.locator('.start-tile').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  expect(ids).toEqual(order.split(','));
});

Then('there should be no draft to continue', async ({ page }) => {
  await expect(page.getByTestId('start-title')).toBeVisible();
  await expect(page.getByTestId('start-continue')).toHaveCount(0);
});

Then('the recent list should be empty', async ({ page }) => {
  await expect(page.getByTestId('start-recent-empty')).toBeVisible();
});

Then('the recent list should contain {string}', async ({ page }, name: string) => {
  await expect(page.getByTestId('start-recent').filter({ hasText: name })).toHaveCount(1);
});

Then('the draft to continue should be {string}', async ({ page }, name: string) => {
  await expect(page.getByTestId('start-continue-name')).toHaveText(name);
});

When('I click the start tile {string}', async ({ page }, id: string) => {
  await page.getByTestId(id).click();
  await expect(page).toHaveURL(/\/edit\//);
});

When('I continue the draft', async ({ page }) => {
  await page.getByTestId('start-continue-open').click();
  await expect(page).toHaveURL(/\/edit\//);
});

When('I open the recent newsletter {string}', async ({ page }, name: string) => {
  await page.getByTestId('start-recent').filter({ hasText: name }).click();
  await expect(page).toHaveURL(/\/edit\//);
  await expect(page.getByTestId('doc-name')).toContainText(name);
});

/** Only the click: an unsaved-changes question may come before the editor opens. */
When('I click the recent newsletter {string}', async ({ page }, name: string) => {
  await page.getByTestId('start-recent').filter({ hasText: name }).click();
});

Then('the not saved card should shake', async ({ page }) => {
  await expect(page.getByTestId('start-continue')).toHaveClass(/start-continue--nudge/);
});

When('I go back to the start page', async ({ page }) => {
  await page.getByTestId('action-home').click();
});

When('I rename the newsletter to {string}', async ({ page }, name: string) => {
  await page.getByTestId('file-menu-trigger').click();
  await page.getByTestId('file-rename').click();
  await page.getByTestId('confirm-prompt-input').fill(name);
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('confirm-dialog')).toBeHidden();
  await expect(page.getByTestId('doc-name')).toContainText(name);
});

Then('I should be asked about unsaved changes', async ({ page }) => {
  const dialog = page.getByTestId('confirm-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId('confirm-ok')).toBeVisible();
  await expect(dialog.getByTestId('confirm-alt')).toBeVisible();
  await expect(dialog.getByTestId('confirm-cancel')).toBeVisible();
  await expect(dialog.locator('.confirm-dialog')).toHaveAttribute('data-tone', 'warning');
  // Explanations live in the list above the buttons, never inside them.
  await expect(dialog.getByTestId('confirm-outcomes').getByRole('listitem')).toHaveCount(3);
  for (const id of ['confirm-ok', 'confirm-alt', 'confirm-cancel']) {
    await expect(dialog.getByTestId(id).locator('*')).toHaveCount(0);
  }
});

Then('the unsaved changes question should name {string} and {string}', async ({ page }, changed: string, next: string) => {
  const body = page.getByTestId('confirm-dialog').locator('.confirm-text');
  await expect(body).toContainText(changed);
  await expect(body).toContainText(next);
});

When('I answer the unsaved changes question with {string}', async ({ page }, button: string) => {
  const dialog = page.getByTestId('confirm-dialog');
  await expect(dialog.getByTestId('confirm-alt')).toBeVisible();
  await dialog.getByTestId(button).click();
  if (button !== 'confirm-ok') await expect(dialog).toBeHidden();
});

When('I confirm the name prompt', async ({ page }) => {
  const input = page.getByTestId('confirm-prompt-input');
  await expect(input).toBeVisible();
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('start-page')).toBeVisible();
});

/** Wait until the draft storage holds what the header shows (real state, not a timer). */
async function draftStored(page: Page): Promise<void> {
  await page.waitForFunction(async () => {
    const shown = document.querySelector('[data-testid="doc-name"]')?.textContent?.replace('•', '').trim();
    const stored = await new Promise<string | undefined>((resolve) => {
      const open = indexedDB.open('nte-docs');
      open.onsuccess = () => {
        const req = open.result.transaction('recovery', 'readonly').objectStore('recovery').get('current');
        req.onsuccess = () => resolve(req.result?.displayName);
        req.onerror = () => resolve(undefined);
      };
      open.onerror = () => resolve(undefined);
    });
    return !!shown && stored === shown;
  });
}

When('I reload the page', async ({ page }) => {
  await draftStored(page);
  await page.reload();
});

/** Like closing the tab with unsaved changes and opening the app again later. */
When('I reopen the app', async ({ page }) => {
  if (page.url().includes('/edit/')) await draftStored(page);
  await page.goto('/');
  await expect(page.getByTestId('start-title')).toBeVisible();
});

Then('the not saved card should say {string} and {string}', async ({ page }, kicker: string, when: string) => {
  const card = page.getByTestId('start-continue');
  await expect(card.locator('.start-kicker')).toHaveText(kicker);
  await expect(card.locator('.start-meta')).toContainText(when);
});

When('I ask to discard the draft', async ({ page }) => {
  await page.getByTestId('start-discard').click();
  await expect(page.getByTestId('start-discard-confirm')).toBeVisible();
});

Then('the card should ask {string}', async ({ page }, text: string) => {
  await expect(page.getByTestId('start-discard-confirm')).toContainText(text);
});

When('I cancel discarding the draft', async ({ page }) => {
  await page.getByTestId('start-discard-no').click();
  await expect(page.getByTestId('start-discard')).toBeVisible();
});

When('I confirm discarding the draft', async ({ page }) => {
  await page.getByTestId('start-discard-yes').click();
});

Then('the editor should show the document {string}', async ({ page }, name: string) => {
  await expect(page).toHaveURL(/\/edit\//);
  await expect(page.getByTestId('doc-name')).toContainText(name);
  await expect(page.getByTestId('preview-frame')).toBeVisible();
});

Then('the editor should have no blocks', async ({ page }) => {
  await page.getByTestId('panel-tab-placed').click();
  await expect(page.locator('[data-testid="block-list"] > li')).toHaveCount(0);
});

Then('the preview should contain {string}', async ({ page }, text: string) => {
  await expect(page.frameLocator('[data-testid="preview-frame"]').locator('body')).toContainText(text);
});

When('I switch the app language to {string}', async ({ page }, lang: string) => {
  await page.getByTestId('locale-menu-trigger').click();
  await page.getByTestId(`locale-${lang}`).click();
  await expect(page.locator('html')).toHaveAttribute('lang', lang);
});

Then('the preview should not contain {string}', async ({ page }, text: string) => {
  const body = page.frameLocator('[data-testid="preview-frame"]').locator('body');
  await expect(body).toBeVisible();
  await expect(body).not.toContainText(text, { ignoreCase: true });
});

Then('the preview should show the placeholder logo', async ({ page }) => {
  const logo = page.frameLocator('[data-testid="preview-frame"]').locator('img.email-logo');
  await expect(logo).toHaveAttribute('src', 'static/placeholder-logo.png');
  await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(0);
});

Then('the Brand tab should call the logo {string}', async ({ page }, text: string) => {
  await page.getByTestId('panel-tab-brand').click();
  await openGroup(page, 'logo-block');
  await expect(page.getByTestId('logo-block').getByTestId('image-status')).toHaveText(text);
  await expect(page.getByTestId('g-logo-placeholder')).toBeVisible();
});

Then('the address should point to a saved newsletter', async ({ page }) => {
  await expect(page).toHaveURL(/\/edit\/[0-9a-f-]{36}\/current-blocks\//);
});

When('I delete the recent newsletter {string}', async ({ page }, name: string) => {
  const item = page.locator('.start-recent-item').filter({ hasText: name });
  await item.hover();
  const del = item.getByTestId('start-recent-delete');
  await expect(del).toBeVisible();
  await expect(del).toHaveAttribute('aria-label', `Delete template: ${name}`);
  await del.click();
});

Then('the message should say {string}', async ({ page }, text: string) => {
  await expect(page.getByTestId('app-snackbar').locator('.snackbar__text')).toContainText(text);
});

/** Clicks a control of the shown message and waits until that message is gone (older kept ones may follow). */
async function closeShownMessage(page: Page, control: string): Promise<void> {
  const text = page.getByTestId('app-snackbar').locator('.snackbar__text');
  const shown = (await text.textContent()) ?? '';
  await page.getByTestId(control).click();
  await expect(text.filter({ hasText: shown })).toHaveCount(0);
}

When('I undo in the message', async ({ page }) => {
  await closeShownMessage(page, 'app-snackbar-action');
});

When('I delete the start tile {string}', async ({ page }, id: string) => {
  const item = page.locator('.start-tile-item').filter({ has: page.getByTestId(id) });
  await item.hover();
  const del = item.getByTestId('start-demo-delete');
  await expect(del).toBeVisible();
  await del.click();
});

Then('the message should offer to undo', async ({ page }) => {
  await expect(page.getByTestId('app-snackbar-action')).toBeVisible();
});

When('I pin the recent newsletter {string}', async ({ page }, name: string) => {
  const item = page.locator('.start-recent-item').filter({ hasText: name });
  await item.hover();
  const pin = item.getByTestId('start-recent-pin');
  await expect(pin).toHaveAttribute('aria-pressed', 'false');
  await pin.click();
  await expect(pin).toHaveAttribute('aria-pressed', 'true');
});

When('I unpin the start tile {string}', async ({ page }, name: string) => {
  const item = page.locator('.start-tile-item').filter({ has: page.getByTestId('start-pinned').filter({ hasText: name }) });
  await item.hover();
  await item.getByTestId('start-pinned-unpin').click();
});

Then('the recent newsletter {string} should be shown as pinned', async ({ page }, name: string) => {
  const pin = page.locator('.start-recent-item').filter({ hasText: name }).getByTestId('start-recent-pin');
  await expect(pin).toBeVisible();
  await expect(pin).toHaveAttribute('aria-pressed', 'true');
});

Then('the recent newsletter {string} should not be pinned', async ({ page }, name: string) => {
  const pin = page.locator('.start-recent-item').filter({ hasText: name }).getByTestId('start-recent-pin');
  await expect(pin).toHaveAttribute('aria-pressed', 'false');
});

When('I close the message', async ({ page }) => {
  await closeShownMessage(page, 'app-snackbar-dismiss');
});

Then('only the demo tiles should have a delete button', async ({ page }) => {
  await expect(page.locator('.start-tile .start-recent-delete')).toHaveCount(0);
  await expect(page.locator('.start-tiles > .start-recent-delete')).toHaveCount(0);
  await expect(page.locator('.start-tile-item').getByTestId('start-demo-delete')).toHaveCount(2);
  await expect(page.getByTestId('start-continue').getByTestId('start-recent-delete')).toHaveCount(0);
});

Then('the start tile {string} should show the flags {string}', async ({ page }, id: string, codes: string) => {
  const flags = page.getByTestId(id).locator('.start-lang-flags app-flag');
  await expect(flags).toHaveCount(codes.split(',').length);
  expect(await flags.evaluateAll((els) => els.map((e) => e.getAttribute('data-flag')))).toEqual(codes.split(','));
});

Then('the recent newsletter {string} should show the subject {string}', async ({ page }, name: string, subject: string) => {
  const row = page.getByTestId('start-recent').filter({ hasText: name });
  await expect(row.getByTestId('start-recent-subject')).toHaveText(subject);
});
