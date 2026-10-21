import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

const codes = (list: string) => list.split(',').map((c) => c.trim());

When('I open the language menu', async ({ page }) => {
  await page.getByTestId('locale-menu-trigger').click();
  await expect(page.getByTestId('locale-menu-panel')).toBeVisible();
});

When('I open the language menu with the keyboard', async ({ page }) => {
  await page.getByTestId('locale-menu-trigger').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('locale-menu-panel')).toBeVisible();
});

When('I choose the language {string}', async ({ page }, code: string) => {
  await page.getByTestId(`locale-${code}`).click();
});

When('I click the planned language {string}', async ({ page }, code: string) => {
  // The row is aria-disabled on purpose; a user can still click on it.
  await page.getByTestId(`locale-soon-${code}`).click({ force: true });
});

When('I press {string} in the language menu', async ({ page }, key: string) => {
  await page.keyboard.press(key);
});

When('I click outside the language menu', async ({ page }) => {
  await page.getByTestId('start-page').click({ position: { x: 5, y: 5 } });
});

Then('the choosable languages should be {string}', async ({ page }, list: string) => {
  const items = page.getByTestId('locale-menu-panel').locator('button[role="menuitemradio"]');
  await expect(items).toHaveCount(codes(list).length);
  for (const code of codes(list)) {
    await expect(page.getByTestId(`locale-${code}`)).toBeEnabled();
  }
});

Then('the planned languages should be {string}', async ({ page }, list: string) => {
  const rows = page.getByTestId('locale-menu-panel').locator('[aria-disabled="true"]');
  await expect(rows).toHaveCount(codes(list).length);
  for (const code of codes(list)) {
    await expect(page.getByTestId(`locale-soon-${code}`)).toHaveAttribute('aria-disabled', 'true');
  }
});

Then('the planned languages should not be buttons', async ({ page }) => {
  await expect(page.getByTestId('locale-menu-panel').locator('button[aria-disabled], [aria-disabled][tabindex]')).toHaveCount(0);
});

Then('the language menu should have no search field', async ({ page }) => {
  await expect(page.getByTestId('locale-search')).toHaveCount(0);
});

Then('the language menu should be closed', async ({ page }) => {
  await expect(page.getByTestId('locale-menu-panel')).toHaveCount(0);
  await expect(page.getByTestId('locale-menu-trigger')).toHaveAttribute('aria-expanded', 'false');
});

Then('the language menu should be open', async ({ page }) => {
  await expect(page.getByTestId('locale-menu-panel')).toBeVisible();
});

Then('the language {string} should be marked as current', async ({ page }, code: string) => {
  await expect(page.getByTestId(`locale-${code}`)).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('locale-menu-panel').locator('[aria-checked="true"]')).toHaveCount(1);
});

Then('the focus should be on the language {string}', async ({ page }, code: string) => {
  await expect(page.getByTestId(`locale-${code}`)).toBeFocused();
});

Then('the focus should be on the language button', async ({ page }) => {
  await expect(page.getByTestId('locale-menu-trigger')).toBeFocused();
});
