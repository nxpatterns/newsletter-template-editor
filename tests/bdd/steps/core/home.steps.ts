import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, Then } = createBdd();

Given('I open the start page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('start-page')).toBeVisible();
});

Given('I open the editor with the German demo', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-demo-de').click();
  await expect(page).toHaveURL(/\/edit\/draft$/);
  await expect(page.getByTestId('preview-frame')).toBeVisible();
});

Then('I should see the app title {string}', async ({ page }, title: string) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
});
