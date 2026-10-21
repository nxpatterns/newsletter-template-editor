import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

Then('the address should end with {string}', async ({ page }, end: string) => {
  await expect(page).toHaveURL((url) => url.pathname.endsWith(end));
});

When('I go back in the browser', async ({ page }) => {
  await page.goBack();
});

When('I go forward in the browser', async ({ page }) => {
  await page.goForward();
});


Then('the not found page should be of kind {string}', async ({ page }, kind: string) => {
  await expect(page.getByTestId('not-found-page')).toHaveAttribute('data-kind', kind);
});

When('I follow the not found link {string}', async ({ page }, testId: string) => {
  await page.getByTestId(testId).click();
});
