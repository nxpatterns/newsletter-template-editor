import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

const modal = (page: Page) => page.getByTestId('block-edit-modal');
const brand = (page: Page) => page.getByTestId('brand-fields');

/** Opaque PNG of any size, drawn by the browser itself (no image library in the test). */
async function pngBytes(page: Page, width: number, height: number): Promise<Buffer> {
  const dataUrl = await page.evaluate(
    ([w, h]) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d')!;
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#2a4f7d');
      g.addColorStop(1, '#c99a6a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      return c.toDataURL('image/png');
    },
    [width, height] as const,
  );
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

/** 40 × 30 solid PNG standing in for an image on a CDN. */
const HOSTED_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAACgAAAAeCAIAAADRv8uKAAAAK0lEQVR42u3NMQ0AAAgDsOnBDIrwjgw4mvRvqudExGKxWCwWi8VisVj8N17h/4FdlKe8ywAAAABJRU5ErkJggg==',
  'base64',
);

Given('hosted test images are served', async ({ page }) => {
  await page.route('https://cdn.example.test/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: HOSTED_PNG }),
  );
});

async function openWithSeed(page: Page, extra?: object): Promise<void> {
  const seed = JSON.parse(readFileSync('src/core/seed-data/cloudlib-campaign.v1.json', 'utf8'));
  if (extra) seed.blocks.push(extra);
  await page.addInitScript((value) => localStorage.setItem('nte:newsletter:v1', value), JSON.stringify(seed));
  await page.goto('/');
}

Given('I open the home page with an extra empty image block', async ({ page }) => {
  await openWithSeed(page, { id: 'test-image', type: 'image', src: '', alt: '', href: '', caption: '', width: 'text' });
});

Then('the image description should be marked as required', async ({ page }) => {
  await expect(modal(page).getByTestId('insp-image-alt')).toHaveAttribute('aria-invalid', 'true');
  await expect(modal(page).getByTestId('insp-image-alt-required')).toBeVisible();
});

Then('the image description should not be marked as required', async ({ page }) => {
  await expect(modal(page).getByTestId('insp-image-alt')).toHaveAttribute('aria-invalid', 'false');
  await expect(modal(page).getByTestId('insp-image-alt-required')).toHaveCount(0);
});

When('I paste the image link {string}', async ({ page }, url: string) => {
  const input = modal(page).getByTestId('image-url');
  await input.fill(url);
  await input.press('Enter');
});

When('I describe the image as {string}', async ({ page }, text: string) => {
  await modal(page).getByTestId('insp-image-alt').fill(text);
});

Then('the image status should read {string}', async ({ page }, text: string) => {
  await expect(page.getByTestId('image-status')).toHaveText(`✓ ${text}`);
});

Then('the image status should start with {string}', async ({ page }, text: string) => {
  await expect(page.getByTestId('image-status')).toHaveText(new RegExp(`^${text}`));
});

Then('the image status should mention {string}', async ({ page }, text: string) => {
  await expect(page.getByTestId('image-status')).toContainText(text);
});

Then('no embedded image warning should be shown', async ({ page }) => {
  await expect(page.getByTestId('image-warn-embedded')).toHaveCount(0);
  await expect(page.getByTestId('email-size-meter')).toHaveCount(0);
});

Then('the embedded image warning and the email size meter should be shown', async ({ page }) => {
  await expect(modal(page).getByTestId('image-warn-embedded')).toBeVisible();
  await expect(modal(page).getByTestId('email-size-total')).toHaveText(/^\d+ KB \/ 102 KB$/);
});

Then('the preview should show the image {string}', async ({ page }, src: string) => {
  const img = page.frameLocator('[data-testid="preview-frame"]').locator('tr[data-block-id="test-image"] img.email-image');
  await expect(img).toHaveAttribute('src', src);
});

When('I choose a {int} × {int} picture file', async ({ page }, w: number, h: number) => {
  const buffer = await pngBytes(page, w, h);
  await modal(page).getByTestId('image-file-input').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer });
});

When('I open the Brand tab', async ({ page }) => {
  await page.getByTestId('panel-tab-brand').click();
  await expect(brand(page)).toBeVisible();
});

Then('the logo should be flagged as SVG and embedded', async ({ page }) => {
  await expect(brand(page).getByTestId('image-warn-svg')).toBeVisible();
  await expect(brand(page).getByTestId('image-warn-embedded')).toBeVisible();
});

When('I paste the logo link {string}', async ({ page }, url: string) => {
  const input = brand(page).getByTestId('image-url');
  await input.fill(url);
  await input.press('Enter');
});

Then('the logo should not be flagged', async ({ page }) => {
  await expect(brand(page).getByTestId('image-warn-svg')).toHaveCount(0);
  await expect(brand(page).getByTestId('image-warn-embedded')).toHaveCount(0);
});
