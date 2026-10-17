import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { STANDARD_SETS, type ColorMode } from '../../../../src/core/colors/model';

const { When, Then } = createBdd();

/** First block of a type in the placed list, by its data attribute in the preview. */
const blockId = async (page: Page, type: string) =>
  (await page
    .frameLocator('[data-testid="preview-frame"]')
    .locator(`tr[data-block-type="${type}"]`)
    .first()
    .getAttribute('data-block-id')) ?? '';

When('I open the colors tab', async ({ page }) => {
  await page.getByTestId('panel-tab-colors').click();
  await expect(page.getByTestId('colors-fields')).toBeVisible();
});

When('I switch to the {string} color set', async ({ page }, mode: string) => {
  const button = page.getByTestId(`colors-mode-${mode}`);
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
});

Then('the preview page should use the standard {string} page color', async ({ page }, mode: ColorMode) => {
  const td = page.frameLocator('[data-testid="preview-frame"]').locator('td.email-outer-pad');
  await expect(td).toHaveAttribute('bgcolor', STANDARD_SETS[mode].page);
});

When('I give the block {string} its own {string} color {string}', async ({ page }, type: string, slot: string, hex: string) => {
  const id = await blockId(page, type);
  await page.getByTestId(`colors-acc-${id}`).click();
  await page.getByTestId(`color-slot-open-${id}.${slot}`).click();
  const input = page.getByTestId(`color-slot-hex-${id}.${slot}`);
  await input.fill(hex);
  await input.dispatchEvent('change');
  await expect(page.getByTestId(`color-slot-${id}.${slot}`)).toContainText(hex.toUpperCase());
});

When('I change the general color {string} to {string}', async ({ page }, role: string, hex: string) => {
  const input = page.getByTestId(`color-general-hex-${role}`);
  await input.fill(hex);
  await input.dispatchEvent('change');
});

Then('the color question should be shown with {string} preselected', async ({ page }, choice: string) => {
  await expect(page.getByTestId('colors-dialog')).toBeVisible();
  await expect(page.getByTestId(`colors-dialog-${choice}`)).toBeChecked();
});

When('I confirm the color question', async ({ page }) => {
  await page.getByTestId('colors-dialog-apply').click();
  await expect(page.getByTestId('colors-dialog')).toHaveCount(0);
});

Then('the general color {string} should be {string}', async ({ page }, role: string, hex: string) => {
  await expect(page.getByTestId(`color-general-hex-${role}`)).toHaveValue(hex.toUpperCase());
});

Then('the block {string} should still use its own {string} color {string}', async ({ page }, type: string, slot: string, hex: string) => {
  const id = await blockId(page, type);
  await expect(page.getByTestId(`color-slot-${id}.${slot}`)).toContainText(hex.toUpperCase());
});

Then('the block {string} should not use its own {string} color {string}', async ({ page }, type: string, slot: string, hex: string) => {
  const id = await blockId(page, type);
  await expect(page.getByTestId(`color-slot-${id}.${slot}`)).not.toContainText(hex.toUpperCase());
});

When('I reset the colors of the block {string}', async ({ page }, type: string) => {
  const id = await blockId(page, type);
  await page.getByTestId(`color-block-reset-${id}`).click();
});

Then('the block colors should list every placed block once', async ({ page }) => {
  const inPreview = page.frameLocator('[data-testid="preview-frame"]').locator('tr[data-block-id]');
  await expect(inPreview.first()).toBeVisible();
  const ids = await inPreview.evaluateAll((rows) => rows.map((r) => r.getAttribute('data-block-id')));
  const listed = page.getByTestId('colors-block-accordions').locator('[data-testid^="colors-acc-"]');
  await expect(listed).toHaveCount(new Set(ids).size);
});

const ids = (list: string) => list.split(',').map((s) => s.trim());
const sectionHead = (page: Page, id: string) => page.getByTestId(`colors-acc-${id}`);

Then('the color sections should be {string} in this order', async ({ page }, list: string) => {
  const sections = page.getByTestId('colors-fields').locator(':scope > [data-testid^="colors-section-"]');
  await expect(sections).toHaveCount(ids(list).length);
  for (const [i, id] of ids(list).entries()) await expect(sections.nth(i)).toHaveAttribute('data-testid', `colors-section-${id}`);
});

Then('the color sections {string} should each be listed once', async ({ page }, list: string) => {
  for (const id of ids(list)) await expect(sectionHead(page, id)).toHaveCount(1);
});

Then('the color sections {string} should be closed', async ({ page }, list: string) => {
  for (const id of ids(list)) await expect(sectionHead(page, id)).toHaveAttribute('aria-expanded', 'false');
});

When('I open the color section {string}', async ({ page }, id: string) => {
  await sectionHead(page, id).click();
  await expect(sectionHead(page, id)).toHaveAttribute('aria-expanded', 'true');
});

Then('the color section {string} should be open', async ({ page }, id: string) => {
  await expect(sectionHead(page, id)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator(`#colors-panel-${id}`)).not.toHaveAttribute('inert');
});
