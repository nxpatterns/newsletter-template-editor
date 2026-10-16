import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

const frame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]');

When('I open the panel tab {string}', async ({ page }, tab: string) => {
  await page.getByTestId(`panel-tab-${tab}`).click();
});

When('I switch the frame part {string} off', async ({ page }, part: string) => {
  await page.getByTestId(`frame-part-${part}`).uncheck();
});

When('I switch the frame part {string} on', async ({ page }, part: string) => {
  await page.getByTestId(`frame-part-${part}`).check();
});

Then('the frame part warning {string} should be visible', async ({ page }, part: string) => {
  await expect(page.getByTestId(`frame-warn-${part}`)).toBeVisible();
});

Then('the preview footer links should contain {string}', async ({ page }, text: string) => {
  await expect(frame(page).locator('.footer-links')).toContainText(text);
});

Then('the preview footer links should not contain {string}', async ({ page }, text: string) => {
  await expect(frame(page).locator('.footer-links')).not.toContainText(text);
});

Then('the preview should show no header stars', async ({ page }) => {
  await expect(frame(page).locator('.brand-stars')).toHaveCount(0);
});

Then('the preview should show footer stars', async ({ page }) => {
  await expect(frame(page).locator('.footer-stars-line')).toBeVisible();
});
