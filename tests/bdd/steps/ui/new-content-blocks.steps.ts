import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

const modal = (page: Page) => page.getByTestId('block-edit-modal');
const block = (page: Page) =>
  page.frameLocator('[data-testid="preview-frame"]').locator('tr.nte-block').first();

When('I open the block editor for the first block', async ({ page }) => {
  await page.getByTestId('panel-tab-placed').click();
  await page.locator('[data-testid^="edit-block-"]').first().click();
  await expect(modal(page)).toHaveClass(/is-open/);
});

When('I fill {string} with {string}', async ({ page }, testId: string, value: string) => {
  await modal(page).getByTestId(testId).fill(value);
});

When('I fill {string} with {string} and leave the field', async ({ page }, testId: string, value: string) => {
  const input = modal(page).getByTestId(testId);
  await input.fill(value);
  await input.blur();
});

When('I click {string}', async ({ page }, testId: string) => {
  await modal(page).getByTestId(testId).click();
});

Then('the field {string} should read {string}', async ({ page }, testId: string, value: string) => {
  await expect(modal(page).getByTestId(testId)).toHaveValue(value);
});

Then('the {string} image description should be marked as required', async ({ page }, prefix: string) => {
  await expect(modal(page).getByTestId(`insp-${prefix}-description-required`)).toBeVisible();
});

Then('the {string} image description should not be marked as required', async ({ page }, prefix: string) => {
  await expect(modal(page).getByTestId(`insp-${prefix}-description-required`)).toHaveCount(0);
});

Then('the preview should show {string} in {string}', async ({ page }, text: string, selector: string) => {
  await expect(block(page).locator(selector)).toHaveText(text);
});

Then('the preview should have a {string}', async ({ page }, selector: string) => {
  await expect(block(page).locator(selector)).toHaveCount(1);
});

Then('the preview should have no {string}', async ({ page }, selector: string) => {
  await expect(block(page).locator(selector)).toHaveCount(0);
});

Then('the preview should link {string}', async ({ page }, href: string) => {
  await expect(block(page).locator(`a[href="${href}"]`)).toHaveCount(1);
});

Then('the preview should link {string} {int} times', async ({ page }, href: string, n: number) => {
  await expect(block(page).locator(`a[href="${href}"]`)).toHaveCount(n);
});
