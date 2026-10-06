import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

Then('I should see the editor panel tabs', async ({ page }) => {
  await expect(page.getByTestId('editor-panel')).toBeVisible();
  await expect(page.getByTestId('panel-tab-blocks')).toBeVisible();
  await expect(page.getByTestId('panel-tab-inspector')).toBeVisible();
  await expect(page.getByTestId('panel-tab-colors')).toBeVisible();
});

Then('I should see the block library', async ({ page }) => {
  await expect(page.getByTestId('blocks-tab')).toBeVisible();
  await expect(page.getByTestId('add-block-hero')).toBeVisible();
  await expect(page.getByTestId('block-list')).toBeVisible();
});

When('I select the first document block', async ({ page }) => {
  const first = page.locator('[data-testid^="select-block-"]').first();
  await first.click();
  await expect(page.getByTestId('block-inspector')).toBeVisible();
});

When('I set the hero label to {string}', async ({ page }, label: string) => {
  const input = page.getByTestId('insp-hero-label');
  await expect(input).toBeVisible();
  await input.fill(label);
});

Then('the preview frame should contain {string}', async ({ page }, text: string) => {
  const frame = page.frameLocator('[data-testid="preview-frame"]');
  await expect(frame.locator('body')).toContainText(text);
});

When('I resize the side panel toward half the viewport', async ({ page }) => {
  const handle = page.getByTestId('side-panel-resizer');
  await expect(handle).toBeVisible();
  const box = await handle.boundingBox();
  expect(box).toBeTruthy();
  const viewport = page.viewportSize();
  expect(viewport).toBeTruthy();
  const targetX = Math.floor(viewport!.width * 0.55);
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetX, box!.y + box!.height / 2, { steps: 8 });
  await page.mouse.up();
});

Then('the side panel width should be within the allowed range', async ({ page }) => {
  const metrics = await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="side-panel"]') as HTMLElement | null;
    if (!panel) return null;
    const width = panel.getBoundingClientRect().width;
    return { width, viewport: window.innerWidth };
  });
  expect(metrics).toBeTruthy();
  expect(metrics!.width).toBeGreaterThanOrEqual(336 - 2);
  expect(metrics!.width).toBeLessThanOrEqual(metrics!.viewport * 0.5 + 2);
});
