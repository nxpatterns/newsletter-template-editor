import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

const blockFrame = (page: Page) => page.frameLocator('[data-testid="block-preview-frame"]');
const editorFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]');

async function blockEditorReady(page: Page): Promise<void> {
  await expect(page.getByTestId('block-editor-page')).toHaveAttribute('data-status', 'ready');
}

When('I adjust the built-in block {string}', async ({ page }, type: string) => {
  await page.getByTestId('panel-tab-catalog').click();
  await page.getByTestId('catalog-list-built').click();
  await page.getByTestId(`adjust-block-${type}`).click();
  await expect(page).toHaveURL(/\/blocks\/[0-9a-f-]{36}\?/);
  await blockEditorReady(page);
});

Then('the block editor should show a copy of {string}', async ({ page }, type: string) => {
  await expect(page.getByTestId('block-editor-kind')).toContainText(`Copy of “${type}”`);
  await expect(page.getByTestId('block-editor-name')).toHaveValue(`${type} (copy)`);
});

Then('the block editor address should name the template it came from', async ({ page }) => {
  await expect(page).toHaveURL((url) => url.searchParams.get('from') === 'draft');
  await expect(page.getByTestId('block-editor-back')).toContainText('Back to');
  await expect(page.getByTestId('block-editor-back')).toContainText('CloudLib');
});

Then('the block state should read {string}', async ({ page }, text: string) => {
  await expect(page.getByTestId('block-editor-state')).toHaveText(text);
});

Then('the block preview should show the badge {string}', async ({ page }, text: string) => {
  await expect(blockFrame(page).getByTestId('block-preview-locked')).toHaveText(text);
});

Then('the block preview should say it uses the colors of the template', async ({ page }) => {
  await expect(page.getByTestId('block-preview-source')).toContainText('Preview in the colors of');
});

When('I open the block tab {string}', async ({ page }, tab: string) => {
  await page.getByTestId(`block-tab-${tab}`).click();
});

Then('the parts should be locked', async ({ page }) => {
  await expect(page.getByTestId('block-parts-locked')).toBeVisible();
  await expect(page.locator('.be-part[aria-disabled="true"]')).toHaveCount(6);
});

When('I change the block field {string} to {string}', async ({ page }, label: string, value: string) => {
  await page.getByTestId('block-tab-props').click();
  await page.getByTestId('block-props-fields').getByLabel(label, { exact: true }).fill(value);
});

Then('the block preview should show {string}', async ({ page }, text: string) => {
  await expect(blockFrame(page).locator('tr.nte-block')).toContainText(text);
});

When('I fix the block color {string} to {string}', async ({ page }, key: string, hex: string) => {
  await page.getByTestId('block-tab-props').click();
  await page.getByTestId(`clone-color-toggle-${key}`).click();
  await page.getByTestId('clone-color-mode-fixed').click();
  await page.getByTestId('clone-color-hex').fill(hex);
  await expect(page.getByTestId(`clone-color-${key}`)).toContainText(hex.toUpperCase());
});

Then('the block color {string} should be marked as fixed', async ({ page }, key: string) => {
  await page.getByTestId('block-tab-props').click();
  await expect(page.getByTestId(`clone-color-${key}`).getByTestId('clone-color-fixed')).toBeVisible();
});

Then('the block color {string} should warn about {string}', async ({ page }, key: string, set: string) => {
  const row = page.getByTestId(`clone-color-${key}`);
  await expect(row.locator('xpath=following-sibling::p[1]')).toContainText(`Hard to read in ${set}`);
});

Then('the check tab should count {int} finding(s)', async ({ page }, n: number) => {
  await expect(page.getByTestId('block-tab-checks-count')).toHaveText(String(n));
  await page.getByTestId('block-tab-checks').click();
  await expect(page.getByTestId('block-check-warning')).toHaveCount(n);
});

When('I save the block as own block', async ({ page }) => {
  await page.getByTestId('block-editor-publish').click();
  await expect(page.getByTestId('block-editor-state')).toContainText('version');
  await expect(page).toHaveURL((url) => !url.searchParams.has('type'));
});

Then('the replace offer should name {int} block(s)', async ({ page }, n: number) => {
  await expect(page.getByTestId('confirm-dialog')).toBeVisible();
  const option = page.getByTestId('confirm-option');
  await expect(option).not.toBeChecked();
  await expect(page.getByTestId('confirm-dialog')).toContainText(n === 1 ? 'Replace the “Price box” block' : `Replace all ${n}`);
});

When('I close the replace offer', async ({ page }) => {
  await page.getByTestId('confirm-cancel').click();
  await expect(page.getByTestId('confirm-dialog')).toHaveCount(0);
});

When('I accept the replace offer', async ({ page }) => {
  await page.getByTestId('confirm-option').check();
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('confirm-dialog')).toHaveCount(0);
});

When('I reload the block editor', async ({ page }) => {
  await page.reload();
  await blockEditorReady(page);
});

When('I undo in the block editor', async ({ page }) => {
  await page.getByTestId('block-editor-undo').click();
});

When('I go back from the block editor', async ({ page }) => {
  await page.getByTestId('block-editor-back').click();
  await expect(page).toHaveURL(/\/edit\//);
  await expect(page.getByTestId('preview-frame')).toBeVisible();
});

When('I click the way back in the block editor', async ({ page }) => {
  await page.getByTestId('block-editor-back').click();
});

Then('the template should have unsaved changes', async ({ page }) => {
  await expect(page.getByTestId('save-state')).toHaveText('Not saved');
});

Then('the placed block list should mark {int} block(s) as own', async ({ page }, n: number) => {
  await page.getByTestId('panel-tab-placed').click();
  await expect(page.getByTestId('placed-own')).toHaveCount(n);
});

Then('the preview price box should keep the amount {string}', async ({ page }, amount: string) => {
  await expect(editorFrame(page).locator('tr.nte-block[data-block-type="price-box"]')).toContainText(amount);
});

When('I show the own blocks', async ({ page }) => {
  await page.getByTestId('panel-tab-catalog').click();
  await page.getByTestId('catalog-list-own').click();
});

Then('the own block list should show {string} with {string}', async ({ page }, name: string, line: string) => {
  const card = page.getByTestId('own-block-catalog').getByRole('listitem', { name });
  await expect(card).toHaveCount(1);
  await expect(card).toContainText(line);
});

When('I drag the own block {string} to the top of the preview', async ({ page }, name: string) => {
  const card = page.getByTestId('own-block-catalog').getByRole('listitem', { name });
  const first = await editorFrame(page).locator('tr.nte-block').first().boundingBox();
  expect(first).toBeTruthy();
  await card.hover();
  await page.mouse.down();
  await page.mouse.move(first!.x + first!.width / 2, first!.y + 6, { steps: 12 });
  await expect(editorFrame(page).locator('tr.nte-block').first()).toHaveClass(/nte-drop-before/);
  await page.mouse.up();
});

Then('the first block in the preview should be an own {string}', async ({ page }, type: string) => {
  await expect(editorFrame(page).locator('tr.nte-block').first()).toHaveAttribute('data-block-type', type);
});

Then('the leave question should offer to save a draft', async ({ page }) => {
  await expect(page.getByTestId('confirm-dialog')).toContainText('Save changes to the block?');
  await expect(page.getByTestId('confirm-ok')).toHaveText('Save draft');
});

When('I discard the block changes', async ({ page }) => {
  await page.getByTestId('confirm-alt').click();
});

Then('the editor should show the panel tab {string}', async ({ page }, tab: string) => {
  await expect(page).toHaveURL(new RegExp(`/edit/draft/${tab}`));
  await expect(page.getByTestId(`panel-tab-${tab}`)).toHaveAttribute('aria-selected', 'true');
});
