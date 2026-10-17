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
