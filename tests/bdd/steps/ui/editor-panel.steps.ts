import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

Then('I should see the editor panel tabs', async ({ page }) => {
  await expect(page.getByTestId('editor-panel')).toBeVisible();
  await expect(page.getByTestId('panel-tab-placed')).toBeVisible();
  await expect(page.getByTestId('panel-tab-catalog')).toBeVisible();
  await expect(page.getByTestId('panel-tab-colors')).toBeVisible();
  await expect(page.getByTestId('side-panel-toggle')).toBeVisible();
});

Then('I should see the placed blocks list', async ({ page }) => {
  await expect(page.getByTestId('placed-blocks-tab')).toBeVisible();
  await expect(page.getByTestId('block-list')).toBeVisible();
});

When('I open the catalog tab', async ({ page }) => {
  await page.getByTestId('panel-tab-catalog').click();
});

Then('I should see the block catalog cards', async ({ page }) => {
  await expect(page.getByTestId('catalog-tab')).toBeVisible();
  await expect(page.getByTestId('block-catalog')).toBeVisible();
  await expect(page.getByTestId('add-block-hero')).toBeVisible();
  await expect(page.getByTestId('add-block-divider')).toBeVisible();
});

When('I add a divider from the catalog', async ({ page }) => {
  await page.getByTestId('add-block-divider').click();
});

When('I open the placed blocks tab', async ({ page }) => {
  await page.getByTestId('panel-tab-placed').click();
});

Then('the placed list should contain at least {int} dividers', async ({ page }, count: number) => {
  await expect(page.getByTestId('block-list')).toBeVisible();
  const labels = page.locator('[data-testid="block-list"] .placed-label');
  const texts = await labels.allTextContents();
  const dividers = texts.filter((t) => /divider|trenner/i.test(t)).length;
  expect(dividers).toBeGreaterThanOrEqual(count);
});

When('I select the first document block', async ({ page }) => {
  await page.getByTestId('panel-tab-placed').click();
  const first = page.locator('[data-testid^="select-block-"]').first();
  await first.click();
  await expect(page.getByTestId('placed-inspector-pane')).toBeVisible();
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

When('I open the campaign tab', async ({ page }) => {
  await page.getByTestId('panel-tab-campaign').click();
});

Then('I should see the preheader help text', async ({ page }) => {
  const help = page.getByTestId('g-preheader-help');
  await expect(help).toBeVisible();
  await expect(help).toContainText(/Gmail|Posteingang|inbox/i);
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
