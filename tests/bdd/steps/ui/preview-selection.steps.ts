import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

const frame = (page: import('@playwright/test').Page) => page.frameLocator('[data-testid="preview-frame"]');

When('I click preview block {string}', async ({ page }, id: string) => {
  const row = frame(page).locator(`tr[data-block-id="${id}"]`);
  await row.scrollIntoViewIfNeeded();
  // Plain text cell, not a link, so the click only selects.
  await row.locator('td').first().click({ position: { x: 2, y: 2 } });
});

When('I click the empty area of the preview', async ({ page }) => {
  // Top-left corner of the document: page background beside the email container.
  await frame(page).locator('body').click({ position: { x: 2, y: 2 } });
});

Then('no preview block should be selected', async ({ page }) => {
  await expect(frame(page).locator('tr.nte-block.is-selected')).toHaveCount(0);
});
