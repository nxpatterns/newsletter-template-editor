import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

const frame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]');
let exportedHtml = '';

Then('the preview should show the empty slot {string}', async ({ page }, text: string) => {
  await expect(frame(page).locator('tr.nte-empty-slot .nte-empty-slot-box')).toHaveText(text);
});

Then('the preview should not show the empty slot', async ({ page }) => {
  await expect(frame(page).locator('tr.nte-empty-slot')).toHaveCount(0);
});

When(
  'I drag the catalog card {string} over the preview {}',
  async ({ page }, type: string, where: string) => {
    await page.getByTestId('panel-tab-catalog').click();
    const card = page.getByTestId(`add-block-${type}`);
    const preview = await page.getByTestId('preview-frame').boundingBox();
    const slot = await frame(page).locator('tr.nte-empty-slot').boundingBox();
    expect(preview && slot).toBeTruthy();
    const target =
      where === 'content'
        ? { x: slot!.x + slot!.width / 2, y: slot!.y + slot!.height / 2 }
        : { x: preview!.x + 24, y: preview!.y + preview!.height - 40 };
    await card.hover();
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 12 });
  },
);

Then('the empty slot should be marked as the insert target', async ({ page }) => {
  await expect(frame(page).locator('tr.nte-empty-slot')).toHaveClass(/nte-drop-before/);
  await expect(frame(page).locator('tr.nte-empty-slot .nte-insert-label')).toHaveText('Insert here');
});

Then("the preview should not show 'insert at end'", async ({ page }) => {
  await expect(frame(page).locator('body')).not.toHaveClass(/nte-drop-append/);
});

When('I drop it', async ({ page }) => {
  await page.mouse.up();
});

Then('the first block in the preview should be a {string}', async ({ page }, type: string) => {
  await expect(frame(page).locator('tr.nte-block')).toHaveCount(1);
  await expect(frame(page).locator('tr.nte-block').first()).toHaveAttribute('data-block-type', type);
});

When('I open the HTML export', async ({ page }) => {
  await page.getByTestId('file-menu-trigger').click();
  await page.getByTestId('file-export').click();
  const download = page.waitForEvent('download');
  await page.getByTestId('export-html-go').click();
  exportedHtml = readFileSync(await (await download).path(), 'utf8');
});

Then('the export should not contain {string}', async ({}, text: string) => {
  expect(exportedHtml.length).toBeGreaterThan(0);
  expect(exportedHtml).not.toContain(text);
  expect(exportedHtml).not.toContain('nte-empty-slot');
});
