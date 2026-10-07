import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

When('I note the page scroll position', async ({ page }) => {
  const y = await page.evaluate(() => window.scrollY);
  await page.evaluate((scrollY) => {
    (window as unknown as { __nteScrollY?: number }).__nteScrollY = scrollY;
  }, y);
});

When('I save the template from the file menu', async ({ page }) => {
  await page.getByTestId('file-menu-trigger').click();
  await page.getByTestId('file-save').click();
  // Fresh sessions have no library binding → Save opens Save as prompt.
  const dialog = page.getByTestId('confirm-dialog');
  await expect(dialog).toBeVisible();
  await page.getByTestId('confirm-ok').click();
  await expect(dialog).toBeHidden();
});

Then('I should see a snackbar with text {string}', async ({ page }, text: string) => {
  const snackbar = page.getByTestId('app-snackbar');
  await expect(snackbar).toBeVisible();
  await expect(snackbar).toContainText(text);
});

Then('the snackbar should be fixed above the footer', async ({ page }) => {
  const snackbar = page.getByTestId('app-snackbar');
  const footer = page.getByTestId('app-version');

  const box = await snackbar.boundingBox();
  const footerBox = await footer.boundingBox();
  expect(box).toBeTruthy();
  expect(footerBox).toBeTruthy();

  const position = await snackbar.evaluate((el) => getComputedStyle(el).position);
  expect(position).toBe('fixed');

  // Snackbar bottom edge sits above footer top edge
  expect(box!.y + box!.height).toBeLessThanOrEqual(footerBox!.y + 1);

  // Full-width bar across the viewport
  const viewport = page.viewportSize();
  expect(viewport).toBeTruthy();
  expect(box!.width).toBeGreaterThan(viewport!.width * 0.9);
  await expect(page.getByTestId('app-snackbar-progress')).toBeVisible();
});

Then('the page scroll position should be unchanged', async ({ page }) => {
  const before = await page.evaluate(
    () => (window as unknown as { __nteScrollY?: number }).__nteScrollY ?? 0,
  );
  const after = await page.evaluate(() => window.scrollY);
  expect(after).toBe(before);
});

Then('I should see the application version in the footer', async ({ page }) => {
  const version = page.getByTestId('app-version');
  await expect(version).toBeVisible();
  await expect(version).toHaveText(/^v\d+\.\d+\.\d+$/);
});
