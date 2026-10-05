import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

Then('the document should not scroll', async ({ page }) => {
  const overflow = await page.evaluate(() => {
    const html = getComputedStyle(document.documentElement).overflow + getComputedStyle(document.documentElement).overflowY;
    const body = getComputedStyle(document.body).overflow + getComputedStyle(document.body).overflowY;
    return { html, body, scrollY: window.scrollY, scrollHeight: document.documentElement.scrollHeight, clientHeight: document.documentElement.clientHeight };
  });
  expect(overflow.scrollY).toBe(0);
  expect(overflow.html.includes('hidden') || overflow.body.includes('hidden')).toBeTruthy();
});

Then('I should see the locale switcher', async ({ page }) => {
  await expect(page.getByTestId('locale-en')).toBeVisible();
  await expect(page.getByTestId('locale-de')).toBeVisible();
});

When('I open the impressum footer link', async ({ page }) => {
  await page.getByTestId('footer-impressum').click();
});

Then('I should see the legal dialog', async ({ page }) => {
  const dialog = page.getByTestId('legal-modal');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/Legal Notice|Impressum|hobby|Hobby/i);
});

When('I open the about footer link', async ({ page }) => {
  await page.getByTestId('footer-about').click();
});

Then('I should see the about page', async ({ page }) => {
  await expect(page.getByTestId('about-page')).toBeVisible();
  await expect(page).toHaveURL(/\/about\/?$/);
});

Then('the preview frame should fill the main work area', async ({ page }) => {
  const metrics = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="app-shell"]') as HTMLElement | null;
    const header = document.querySelector('.app-header') as HTMLElement | null;
    const footer = document.querySelector('.app-footer') as HTMLElement | null;
    const main = document.querySelector('.app-main') as HTMLElement | null;
    const frame = document.querySelector('[data-testid="preview-frame"]') as HTMLElement | null;
    const outlet = document.querySelector('.app-main > router-outlet') as HTMLElement | null;
    if (!shell || !header || !footer || !main || !frame) {
      return null;
    }
    const shellBox = shell.getBoundingClientRect();
    const headerBox = header.getBoundingClientRect();
    const footerBox = footer.getBoundingClientRect();
    const mainBox = main.getBoundingClientRect();
    const frameBox = frame.getBoundingClientRect();
    const outletBox = outlet?.getBoundingClientRect();
    return {
      viewportH: window.innerHeight,
      shellH: shellBox.height,
      mainH: mainBox.height,
      frameH: frameBox.height,
      gapHeaderToFrame: frameBox.top - headerBox.bottom,
      gapFrameToFooter: footerBox.top - frameBox.bottom,
      outletH: outletBox?.height ?? 0,
      frameTop: frameBox.top,
      footerTop: footerBox.top,
    };
  });

  expect(metrics).toBeTruthy();
  // Shell roughly fills viewport
  expect(Math.abs(metrics!.shellH - metrics!.viewportH)).toBeLessThan(4);
  // Main work band is most of the viewport (header+footer are small)
  expect(metrics!.mainH / metrics!.viewportH).toBeGreaterThan(0.7);
  // Preview iframe fills nearly all of main (allow 24px chrome/rounding)
  expect(metrics!.frameH).toBeGreaterThan(metrics!.mainH - 24);
  expect(metrics!.frameH / metrics!.viewportH).toBeGreaterThan(0.65);
  // No large empty gap above/below the frame inside the shell
  expect(Math.abs(metrics!.gapHeaderToFrame)).toBeLessThan(8);
  expect(Math.abs(metrics!.gapFrameToFooter)).toBeLessThan(8);
  // router-outlet must not steal vertical space
  expect(metrics!.outletH).toBeLessThan(2);
});

When('I toggle the side panel', async ({ page }) => {
  await page.getByTestId('side-panel-toggle').click();
});

Then('the side panel should be collapsed', async ({ page }) => {
  const panel = page.getByTestId('side-panel');
  await expect(panel).toHaveClass(/collapsed/);
  const expanded = await page.getByTestId('side-panel-toggle').getAttribute('aria-expanded');
  expect(expanded).toBe('false');
});

Then('the side panel should be expanded', async ({ page }) => {
  const panel = page.getByTestId('side-panel');
  await expect(panel).not.toHaveClass(/collapsed/);
  const expanded = await page.getByTestId('side-panel-toggle').getAttribute('aria-expanded');
  expect(expanded).toBe('true');
});
