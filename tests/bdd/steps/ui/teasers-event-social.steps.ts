import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

const frame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]');
const block = (page: Page) => frame(page).locator('tr.nte-block').first();
let download: { name: string; bytes: Buffer } | null = null;

Then('the preview should show {int} teasers in one row', async ({ page }, n: number) => {
  await expect(block(page).locator('.teasers-table tr').first().locator('td.teaser-col')).toHaveCount(n);
});

Then('the calendar link should add {string} in {string}', async ({ page }, dates: string, tz: string) => {
  const href = await block(page).locator('a.event-cal-link').getAttribute('href');
  const url = new URL(href ?? '');
  expect(url.host).toBe('calendar.google.com');
  expect(url.searchParams.get('dates')).toBe(dates);
  expect(url.searchParams.get('ctz')).toBe(tz);
});

When('I open the Social tab', async ({ page }) => {
  await page.getByTestId('panel-tab-social').click();
  await expect(page.getByTestId('social-fields')).toBeVisible();
});

Then('there should be one social link field per icon in {string}', async ({ page }, dir: string) => {
  const ids = readdirSync(dir)
    .filter((f) => f.endsWith('.svg'))
    .map((f) => f.replace(/\.svg$/, ''))
    .sort();
  const fields = page.getByTestId('social-fields').locator('input[data-testid^="g-social-"]');
  await expect(fields).toHaveCount(ids.length);
  const found = (await fields.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.slice(9)))).sort();
  expect(found).toEqual(ids);
});

When('I enter the social link {string} as {string}', async ({ page }, id: string, value: string) => {
  const input = page.getByTestId(`g-social-${id}`);
  await input.fill(value);
  await input.blur();
});

When('I clear the social link {string} with the ×', async ({ page }, id: string) => {
  const input = page.getByTestId(`g-social-${id}`);
  const box = await input.boundingBox();
  if (!box) throw new Error(`social link field ${id} is not visible`);
  await input.click({ position: { x: box.width - 10, y: box.height / 2 } });
});

Then('the social link {string} should read {string}', async ({ page }, id: string, value: string) => {
  await expect(page.getByTestId(`g-social-${id}`)).toHaveValue(value);
});

Then('the preview footer should not show the {string} icon', async ({ page }, label: string) => {
  await expect(frame(page).locator(`.footer-social img.footer-social-icon[alt="${label}"]`)).toHaveCount(0);
});

Then('the preview footer should show the {string} icon', async ({ page }, label: string) => {
  const icon = frame(page).locator(`.footer-social img.footer-social-icon[alt="${label}"]`);
  await expect(icon).toBeVisible();
  await expect(icon).toHaveAttribute('src', /^data:image\/svg\+xml/);
});

When('I open the export dialog', async ({ page }) => {
  await page.getByTestId('file-menu-trigger').click();
  await page.getByTestId('file-export').click();
  await expect(page.getByTestId('export-html-dialog')).toHaveClass(/is-open/);
});

Then('the export should warn that the image address is missing', async ({ page }) => {
  await expect(page.getByTestId('export-asset-warn')).toBeVisible();
});

When('I set the image address to {string}', async ({ page }, url: string) => {
  await page.getByTestId('export-asset-base').fill(url);
  await expect(page.getByTestId('export-asset-hint')).toBeVisible();
});

When('I download the export', async ({ page }) => {
  const pending = page.waitForEvent('download');
  await page.getByTestId('export-html-go').click();
  const d = await pending;
  download = { name: d.suggestedFilename(), bytes: readFileSync(await d.path()) };
});

Then('the downloaded HTML should link {string} as text', async ({}, label: string) => {
  expect(download?.name).toMatch(/\.html$/);
  const html = download!.bytes.toString('utf8');
  expect(html).toMatch(new RegExp(`class="email-footer-link"[^>]*>${label}</a>`));
  expect(html).not.toContain('footer-social-icon');
});

let zipDir = '';

Then('the download should be a ZIP with the HTML and {string} PNG', async ({}, prefix: string) => {
  expect(download?.name).toMatch(/\.zip$/);
  zipDir = mkdtempSync(join(tmpdir(), 'nte-zip-'));
  const zipPath = join(zipDir, 'export.zip');
  writeFileSync(zipPath, download!.bytes);
  execFileSync('unzip', ['-q', zipPath, '-d', zipDir], { stdio: 'ignore' });
  const entries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n');
  expect(entries.some((e) => e.endsWith('.html'))).toBe(true);
  const png = entries.find((e) => e.startsWith(prefix) && e.endsWith('.png'));
  expect(png).toBeTruthy();
  const bytes = readFileSync(join(zipDir, png!));
  expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
  // 2x the 24px display size
  expect(bytes.readUInt32BE(16)).toBe(48);
});

Then('the zipped HTML should show the icon from {string}', async ({}, urlPrefix: string) => {
  const html = readdirSync(zipDir).find((f) => f.endsWith('.html'))!;
  const text = readFileSync(join(zipDir, html), 'utf8');
  expect(text).toMatch(new RegExp(`<img src="${urlPrefix.replace(/[./]/g, '\\$&')}[0-9a-f]{6}\\.png"[^>]*alt="LinkedIn"`));
  expect(text).not.toMatch(/footer-social[\s\S]{0,300}data:image/);
});

Then('the social strip should show {string}', async ({ page }, id: string) => {
  await expect(page.getByTestId(`social-strip-${id}`)).toBeVisible();
});

Then('the social strip should not show {string}', async ({ page }, id: string) => {
  await expect(page.getByTestId(`social-strip-${id}`)).toHaveCount(0);
});
