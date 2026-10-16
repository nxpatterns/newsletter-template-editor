import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

const row = (page: Page) =>
  page.frameLocator('[data-testid="preview-frame"]').locator('tr[data-block-id="test-image-text"]');

Given('I open the editor with an extra image and text block', async ({ page }) => {
  const seed = JSON.parse(readFileSync('src/core/seed-data/cloudlib-campaign.v1.json', 'utf8'));
  seed.blocks.push({
    id: 'test-image-text',
    type: 'image-text',
    src: '',
    alt: 'Room',
    href: '',
    body: [{ type: 'p', children: [{ type: 'text', text: 'Guests see the room before they book.' }] }],
    side: 'left',
    imageWidth: 'third',
    valign: 'top',
  });
  await page.addInitScript((value) => localStorage.setItem('nte:newsletter:v1', value), JSON.stringify(seed));
  await page.goto('/edit/draft');
});

When('I choose the image text option {string} {string}', async ({ page }, key: string, value: string) => {
  const option = page.getByTestId('block-edit-modal').getByTestId(`image-text-${key}-${value}`);
  await option.click();
  await expect(option).toHaveAttribute('aria-checked', 'true');
});

async function expectPictureSide(page: Page, side: 'left' | 'right'): Promise<void> {
  const img = row(page).locator('img.image-text-img');
  const copy = row(page).locator('td.image-text-copy');
  await expect(img).toHaveAttribute('src', 'https://cdn.example.test/room.png');
  await expect(async () => {
    const a = await img.boundingBox();
    const b = await copy.boundingBox();
    expect(a && b).toBeTruthy();
    if (side === 'left') expect(a!.x + a!.width).toBeLessThanOrEqual(b!.x);
    else expect(b!.x + b!.width).toBeLessThanOrEqual(a!.x);
  }).toPass();
}

Then('the preview should show the picture left of the text', async ({ page }) => expectPictureSide(page, 'left'));
Then('the preview should show the picture right of the text', async ({ page }) => expectPictureSide(page, 'right'));

Then('the preview picture should be {int} pixels wide', async ({ page }, px: number) => {
  const img = row(page).locator('img.image-text-img');
  await expect(img).toHaveAttribute('width', String(px));
  await expect(async () => expect(Math.round((await img.boundingBox())!.width)).toBe(px)).toPass();
});
