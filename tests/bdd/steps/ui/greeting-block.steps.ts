import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

Given('I open the home page with an extra greeting block', async ({ page }) => {
  const seed = JSON.parse(readFileSync('src/core/seed-data/cloudlib-campaign.v1.json', 'utf8'));
  seed.blocks.unshift({
    id: 'test-greeting',
    type: 'greeting',
    text: 'Werte Geschäftspartner',
    useName: false,
    nameLead: 'Guten Tag',
  });
  await page.addInitScript((value) => localStorage.setItem('nte:newsletter:v1', value), JSON.stringify(seed));
  await page.goto('/');
});

When('I switch on the greeting by name', async ({ page }) => {
  const toggle = page.getByTestId('block-edit-modal').getByTestId('greeting-use-name');
  await toggle.check();
  await expect(page.getByTestId('block-edit-modal').getByTestId('insp-greeting-lead')).toBeVisible();
});

When('I set the greeting sample name to {string}', async ({ page }, name: string) => {
  await page.getByTestId('block-edit-modal').getByTestId('insp-greeting-sample').fill(name);
});

const greetingLine = (page: Page) =>
  page.frameLocator('[data-testid="preview-frame"]').locator('tr[data-block-id="test-greeting"] p.greeting-line');

Then('the greeting preview should read {string}', async ({ page }, text: string) => {
  await expect(greetingLine(page)).toHaveText(text);
});

When('I choose the greeting option {string} {string}', async ({ page }, key: string, value: string) => {
  const option = page.getByTestId('block-edit-modal').getByTestId(`greeting-${key}-${value}`);
  await option.click();
  await expect(option).toHaveAttribute('aria-checked', 'true');
});

Then('the greeting preview should use size {string} and color {string}', async ({ page }, size: string, color: string) => {
  await expect(greetingLine(page)).toHaveClass(new RegExp(`rt-size-${size}`));
  await expect(greetingLine(page)).toHaveClass(new RegExp(`text-${color}`));
});
