import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

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
  const href = linkRow(page, n).getByTestId(`cta-link-href-${n - 1}`);
  await href.fill(address);
  await href.blur();
});

Then(
  'link list row {int} should link to {string} and show {string}',
  async ({ page }, n: number, href: string, kind: string) => {
    await expect(linkRow(page, n).getByTestId(`cta-link-href-${n - 1}`)).toHaveValue(href);
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
