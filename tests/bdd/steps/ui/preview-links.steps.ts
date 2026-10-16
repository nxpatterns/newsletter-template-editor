import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

const opened = new WeakMap<Page, Page[]>();

Given('I open the editor with a placeholder button {string}', async ({ page }, id: string) => {
  const seed = JSON.parse(readFileSync('src/core/seed-data/cloudlib-campaign.v1.json', 'utf8'));
  seed.blocks.push({ id, type: 'cta-button', text: 'Placeholder', href: 'https://example.com' });
  await page.addInitScript((value) => {
    localStorage.setItem('nte:newsletter:v1', value);
  }, JSON.stringify(seed));
  await page.goto('/edit/draft');
});

Given('I count new tabs', async ({ page, context }) => {
  const tabs: Page[] = [];
  opened.set(page, tabs);
  // Keep the test offline: the opened tab gets a stub page instead of the real site.
  await context.route('https://www.cloudlib.eu/**', (route) => route.fulfill({ body: 'ok' }));
  context.on('page', (p) => tabs.push(p));
});

When('I click the link in preview block {string}', async ({ page }, id: string) => {
  const link = page.frameLocator('[data-testid="preview-frame"]').locator(`tr[data-block-id="${id}"] a[href]`).first();
  await link.scrollIntoViewIfNeeded();
  await link.click();
});

Then('a new tab should open {string}', async ({ page }, url: string) => {
  const tabs = opened.get(page)!;
  await expect.poll(() => tabs.length).toBeGreaterThan(0);
  const tab = tabs[tabs.length - 1]!;
  await tab.waitForURL(url);
});

Then('exactly {int} new tab should have opened', async ({ page }, n: number) => {
  expect(opened.get(page)!.length).toBe(n);
});
