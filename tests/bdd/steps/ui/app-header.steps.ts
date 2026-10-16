import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

Then('the app title should not be a link', async ({ page }) => {
  await expect(page.getByTestId('app-title')).toBeVisible();
  await expect(page.getByTestId('action-start')).toHaveCount(0);
  await expect(page.getByTestId('action-home')).toHaveCount(0);
});

Then('the app title and the home button should lead to the start page', async ({ page }) => {
  await expect(page.getByTestId('action-start')).toHaveAttribute('href', '/');
  await expect(page.getByTestId('action-start')).toContainText('Newsletter Template Editor');
  await expect(page.getByTestId('action-home')).toHaveAttribute('href', '/');
});

Then('the header should show no save state', async ({ page }) => {
  await expect(page.getByTestId('doc-name')).toBeVisible();
  await expect(page.getByTestId('save-state')).toHaveCount(0);
});

Then('the save state should read {string}', async ({ page }, text: string) => {
  await expect(page.getByTestId('save-state')).toContainText(text);
});

Then('the Save button should be enabled', async ({ page }) => {
  await expect(page.getByTestId('file-save')).toBeEnabled();
});

Then('the Save button should be disabled', async ({ page }) => {
  await expect(page.getByTestId('file-save')).toBeDisabled();
});

When('I press the save shortcut', async ({ page }) => {
  await page.keyboard.press('ControlOrMeta+S');
});

Then('no dialog should be open', async ({ page }) => {
  await expect(page.getByTestId('confirm-dialog')).toBeHidden();
});

When('I open the About page', async ({ page }) => {
  await page.getByTestId('footer-about').click();
  await expect(page.getByTestId('about-page')).toBeVisible();
});

Then('the header should offer to go back to {string}', async ({ page }, name: string) => {
  await expect(page.getByTestId('action-back-to-doc')).toContainText(name);
});

When('I go back to the newsletter', async ({ page }) => {
  await page.getByTestId('action-back-to-doc').click();
  await expect(page).toHaveURL(/\/edit\//);
});

When('I click the home link in the footer', async ({ page }) => {
  const links = page.locator('.app-footer-center .footer-link');
  await expect(links.first()).toHaveAttribute('data-testid', 'footer-home');
  await links.first().click();
});
