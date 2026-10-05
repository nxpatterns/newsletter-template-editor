import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, Then } = createBdd();

Given('I open the home page', async ({ page }) => {
  await page.goto('/');
});

Then('I should see the app title {string}', async ({ page }, title: string) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
});
