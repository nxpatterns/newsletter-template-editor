import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

When('I note the page scroll position', async ({ page }) => {
  const y = await page.evaluate(() => window.scrollY);
  await page.evaluate((scrollY) => {
    (window as unknown as { __nteScrollY?: number }).__nteScrollY = scrollY;
  }, y);
});

When('I save the template', async ({ page }) => {
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

Then('the message pager should show {int} of {int}', async ({ page }, position: number, total: number) => {
  await expect(page.getByTestId('app-snackbar-position')).toHaveText(`${position} / ${total}`);
});

Then('the message pager should be hidden', async ({ page }) => {
  await expect(page.getByTestId('app-snackbar')).toBeVisible();
  await expect(page.getByTestId('app-snackbar-nav')).toHaveCount(0);
});

When('I page to the older message', async ({ page }) => {
  await page.getByTestId('app-snackbar-older').click();
});

When('I page to the newer message', async ({ page }) => {
  await page.getByTestId('app-snackbar-newer').click();
});

When('I move the pointer off the message', async ({ page }) => {
  await page.mouse.move(1, 1);
});

Then('the message timer should be paused', async ({ page }) => {
  await expect(page.getByTestId('app-snackbar')).toContainClass('snackbar--paused');
});

Then('the message timer should be running', async ({ page }) => {
  await expect(page.getByTestId('app-snackbar')).not.toContainClass('snackbar--paused');
});
