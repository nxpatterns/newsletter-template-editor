import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

const brand = (page: Page) => page.getByTestId('brand-fields');
const preview = (page: Page) => page.frameLocator('[data-testid="preview-frame"]');

When('I rename brand name part {int} to {string}', async ({ page }, n: number, text: string) => {
  await brand(page).getByTestId(`brand-part-text-${n - 1}`).fill(text);
});

When('I add a brand name part {string}', async ({ page }, text: string) => {
  const count = await brand(page).locator('[data-testid^="brand-part-text-"]').count();
  await brand(page).getByTestId('brand-part-add').click();
  await brand(page).getByTestId(`brand-part-text-${count}`).fill(text);
});

Then('the preview brand name should read {string}', async ({ page }, text: string) => {
  await expect(preview(page).locator('[data-field="brand.name"]')).toHaveText(text);
});

When('I lower the stars to {int}', async ({ page }, target: number) => {
  const count = brand(page).getByTestId('brand-stars-count');
  while (Number(await count.textContent()) > target) {
    const before = Number(await count.textContent());
    await brand(page).getByTestId('brand-stars-fewer').click();
    await expect(count).toHaveText(String(before - 1));
  }
});

Then('the preview should show no stars', async ({ page }) => {
  await expect(preview(page).locator('.brand-stars')).toHaveCount(0);
  await expect(preview(page).locator('.footer-stars-glyph')).toHaveCount(0);
});
