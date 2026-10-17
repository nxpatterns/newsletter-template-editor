import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { STANDARD_SETS } from '../../../../src/core/colors/model';

const { Given, When, Then } = createBdd();

const modal = (page: Page) => page.getByTestId('block-edit-modal');
const linkRow = (page: Page, n: number) => modal(page).getByTestId(`cta-link-row-${n - 1}`);

When('I open the block editor for seed block {string}', async ({ page }, blockId: string) => {
  await page.getByTestId('panel-tab-placed').click();
  await page.getByTestId(`edit-block-${blockId}`).click();
  await expect(modal(page)).toHaveClass(/is-open/);
});

Then('link list row {int} should be open', async ({ page }, n: number) => {
  await expect(linkRow(page, n).getByTestId(`cta-link-toggle-${n - 1}`)).toHaveAttribute('aria-expanded', 'true');
  await expect(linkRow(page, n).locator(`#insp-cta-label-${n - 1}`)).toBeVisible();
});

Then('link list row {int} should be closed', async ({ page }, n: number) => {
  await expect(linkRow(page, n).getByTestId(`cta-link-toggle-${n - 1}`)).toHaveAttribute('aria-expanded', 'false');
  await expect(linkRow(page, n).locator('input')).toHaveCount(0);
});

When('I open link list row {int}', async ({ page }, n: number) => {
  await linkRow(page, n).getByTestId(`cta-link-toggle-${n - 1}`).click();
});

When('I enter the link address {string} in link list row {int}', async ({ page }, address: string, n: number) => {
  const href = linkRow(page, n).getByTestId(`cta-link-target-${n - 1}`);
  await href.fill(address);
  await href.blur();
});

Then(
  'link list row {int} should link to {string} and show {string}',
  async ({ page }, n: number, href: string, kind: string) => {
    await expect(linkRow(page, n).getByTestId(`cta-link-target-${n - 1}`)).toHaveValue(href);
    await expect(linkRow(page, n).getByTestId(`cta-link-kind-${n - 1}`)).toHaveText(kind);
  },
);

When('I pick {string} as the icon for all benefit lines', async ({ page }, icon: string) => {
  await modal(page).getByTestId('benefit-icon-all').click();
  await modal(page).getByRole('option', { name: icon, exact: true }).click();
});

Then('every benefit line should use the icon {string}', async ({ page }, icon: string) => {
  const glyphs = modal(page).locator('[data-testid^="benefit-row-"] .row-icon-glyph');
  await expect(glyphs).toHaveCount(4);
  await expect(glyphs).toHaveText([icon, icon, icon, icon]);
});

When('I press Enter in benefit line {int}', async ({ page }, n: number) => {
  const input = modal(page).getByTestId(`benefit-text-${n - 1}`);
  await input.focus();
  await input.press('Enter');
});

Then('there should be {int} benefit lines with line {int} empty and focused', async ({ page }, count: number, n: number) => {
  await expect(modal(page).locator('[data-testid^="benefit-row-"]')).toHaveCount(count);
  const input = modal(page).getByTestId(`benefit-text-${n - 1}`);
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
});

When('I move benefit line {int} down with the keyboard', async ({ page }, n: number) => {
  const handle = modal(page).getByTestId(`benefit-row-${n - 1}`).locator('.row-drag');
  await handle.focus();
  await handle.press('ArrowDown');
  await expect(modal(page).getByTestId(`benefit-row-${n}`).locator('.row-drag')).toBeFocused();
});

Then('benefit line {int} should read {string}', async ({ page }, n: number, text: string) => {
  await expect(modal(page).getByTestId(`benefit-text-${n - 1}`)).toHaveValue(text);
});

When('I turn off the previous price', async ({ page }) => {
  const toggle = modal(page).getByTestId('price-strike-toggle');
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(toggle).not.toBeChecked();
});

Then('the previous price fields should be hidden', async ({ page }) => {
  await expect(modal(page).locator('#insp-p-strike-amount')).toHaveCount(0);
  await expect(modal(page).locator('#insp-p-strike-label')).toHaveCount(0);
});

Then('the preview frame should not show a previous price', async ({ page }) => {
  const frame = page.frameLocator('[data-testid="preview-frame"]');
  await expect(frame.locator('.price-main')).toBeVisible();
  await expect(frame.locator('.price-strike')).toHaveCount(0);
});

Then('the block editor should be shorter than the default height', async ({ page }) => {
  const box = await modal(page).locator('.block-edit-dialog').boundingBox();
  expect(box).toBeTruthy();
  expect(box!.height).toBeLessThan(400);
});

Then('the button text counter should read {string}', async ({ page }, text: string) => {
  const counter = modal(page).locator('.ed-label-row').filter({ has: page.locator('label[for="insp-cta-text"]') }).locator('.ed-count');
  await expect(counter).toHaveText(text);
  await expect(counter).not.toHaveClass(/is-over/);
});

When('I type the button text {string}', async ({ page }, text: string) => {
  await modal(page).getByTestId('insp-cta-text').fill(text);
});

Then('the button text counter should warn', async ({ page }) => {
  const counter = modal(page).locator('.ed-label-row').filter({ has: page.locator('label[for="insp-cta-text"]') }).locator('.ed-count');
  await expect(counter).toHaveClass(/is-over/);
});

When('I enter the button link {string}', async ({ page }, href: string) => {
  const input = modal(page).getByTestId('insp-button-link-target');
  await input.fill(href);
  await input.blur();
});

Then('the button should link to {string} and show {string}', async ({ page }, href: string, kind: string) => {
  await expect(modal(page).getByTestId('insp-button-link-target')).toHaveValue(href);
  await expect(modal(page).getByTestId('insp-cta-kind')).toHaveText(kind);
});

Given('I open the editor with an extra thin divider', async ({ page }) => {
  const seed = JSON.parse(readFileSync('src/core/seed-data/cloudlib-campaign.v1.json', 'utf8'));
  seed.blocks.push({ id: 'test-divider', type: 'divider', style: 'thin' });
  await page.addInitScript((value) => {
    localStorage.setItem('nte:newsletter:v1', value);
  }, JSON.stringify(seed));
  await page.goto('/edit/draft');
});

Then('the divider tile {string} should be selected', async ({ page }, style: string) => {
  await expect(modal(page).getByTestId(`divider-style-${style}`)).toHaveAttribute('aria-checked', 'true');
  await expect(modal(page).locator('.ed-tile[aria-checked="true"]')).toHaveCount(1);
});

When('I pick the divider tile {string}', async ({ page }, style: string) => {
  await modal(page).getByTestId(`divider-style-${style}`).click();
});

Then('the space height slider should be disabled', async ({ page }) => {
  await expect(modal(page).getByTestId('insp-divider-height')).toBeDisabled();
});

Then('the space height slider should be enabled', async ({ page }) => {
  await expect(modal(page).getByTestId('insp-divider-height')).toBeEnabled();
});

Then('the divider background switch should be disabled', async ({ page }) => {
  const opts = modal(page).getByTestId('insp-divider-background').getByRole('radio');
  await expect(opts).toHaveCount(2);
  for (const opt of await opts.all()) await expect(opt).toBeDisabled();
});

When('I pick the divider background {string}', async ({ page }, bg: string) => {
  const opt = modal(page).getByTestId(`divider-bg-${bg}`);
  await opt.click();
  await expect(opt).toHaveAttribute('aria-checked', 'true');
});

Then('the preview divider {string} should use the page background color', async ({ page }, id: string) => {
  const seed = JSON.parse(readFileSync('src/core/seed-data/cloudlib-campaign.v1.json', 'utf8'));
  const td = page.frameLocator('[data-testid="preview-frame"]').locator(`tr[data-block-id="${id}"] > td`);
  await expect(td).toHaveAttribute('bgcolor', seed.globals.colors.dark.general.page ?? STANDARD_SETS.dark.page);
});

When('I click {int}px above the divider {string} in the preview', async ({ page }, dy: number, id: string) => {
  const td = page.frameLocator('[data-testid="preview-frame"]').locator(`tr[data-block-id="${id}"] > td`);
  await expect(td.locator('.nte-hit')).toHaveCount(1);
  await td.scrollIntoViewIfNeeded();
  const box = await td.boundingBox();
  if (!box) throw new Error('divider row has no box');
  expect(box.height).toBeLessThan(4);
  await page.mouse.click(box.x + box.width / 2, box.y - dy);
});

Then('the preview block {string} should be selected', async ({ page }, id: string) => {
  const tr = page.frameLocator('[data-testid="preview-frame"]').locator(`tr[data-block-id="${id}"]`);
  await expect(tr).toHaveClass(/\bis-selected\b/);
});
