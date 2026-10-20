import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

const card = (page: import('@playwright/test').Page) => page.getByTestId('start-continue');

Given('motion is allowed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

/** Only the click: an unsaved-changes question may come before the editor opens. */
When('I click the start tile {string} and stay', async ({ page }, id: string) => {
  await page.getByTestId(id).click();
});

Then('the editor should be open', async ({ page }) => {
  await expect(page).toHaveURL(/\/edit\//);
  await expect(page.getByTestId('confirm-dialog')).toBeHidden();
});

When('I pick {string} from the library', async ({ page }, name: string) => {
  if (!(await page.getByTestId('library-picker').isVisible())) {
    await page.getByTestId('file-menu-trigger').click();
    await page.getByTestId('file-open-library').click();
  }
  await page
    .getByTestId('library-pick')
    .filter({ has: page.locator('.lib-name', { hasText: new RegExp(`^${name}$`) }) })
    .click();
});

When('I choose the project file {string}', async ({ page }, name: string) => {
  await page.getByTestId('file-project-input').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from('{}'),
  });
});

When('I ask to delete the first library entry', async ({ page }) => {
  await page.getByTestId('file-menu-trigger').click();
  await page.getByTestId('file-open-library').click();
  await page.getByTestId('library-delete').first().click();
});

When('I cancel the open dialog', async ({ page }) => {
  const dialog = page.getByTestId('confirm-dialog');
  await dialog.getByTestId('confirm-cancel').click();
  await expect(dialog).toBeHidden();
});

Then('the library should still list {int} template(s)', async ({ page }, count: number) => {
  await expect(page.getByTestId('library-pick')).toHaveCount(count);
});

Then('the open dialog should be of kind {string}', async ({ page }, kind: string) => {
  const dialog = page.getByTestId('confirm-dialog');
  await expect(dialog.locator('.confirm-dialog')).toHaveAttribute('data-tone', kind);
  await expect(dialog.locator('.confirm-tone-tile svg')).toBeVisible();
  await expect(dialog.getByTestId('confirm-tone')).not.toBeEmpty();
});

Then('the unsaved changes question should name only {string}', async ({ page }, changed: string) => {
  const text = page.getByTestId('confirm-dialog').locator('.confirm-text');
  await expect(text.locator('.confirm-name--dirty').first()).toHaveText(changed);
  await expect(text.locator('.confirm-name:not(.confirm-name--dirty)')).toHaveCount(0);
});

Then(
  'the unsaved changes question should name {string} as unsaved and {string} as next',
  async ({ page }, changed: string, next: string) => {
    const text = page.getByTestId('confirm-dialog').locator('.confirm-text');
    await expect(text.locator('.confirm-name--dirty')).toHaveText([changed]);
    await expect(text.locator('.confirm-name:not(.confirm-name--dirty)')).toHaveText([next]);
    const outcomes = page.getByTestId('confirm-outcomes');
    await expect(outcomes).toContainText(changed);
    await expect(outcomes).toContainText(next);
  },
);

/** Records every animation that starts on the not saved card (Angular prefixes keyframe names, so keep the tail). */
When('I watch the not saved card', async ({ page }) => {
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { cardAnimations: string[] }).cardAnimations = seen;
    document.addEventListener('animationstart', (e) => {
      if ((e.target as HTMLElement).dataset?.['testid'] === 'start-continue') {
        seen.push(e.animationName.replace(/^.*_(?=start-nudge-)/, ''));
      }
    });
  });
});

const recorded = (page: import('@playwright/test').Page) =>
  page.evaluate(() => [...(window as unknown as { cardAnimations: string[] }).cardAnimations]);

Then('the not saved card should shake and glow', async ({ page }) => {
  await expect(card(page)).toHaveClass(/start-continue--nudge/);
  await expect.poll(() => recorded(page)).toEqual(expect.arrayContaining(['start-nudge-shake', 'start-nudge-glow']));
});

Then('the not saved card should only glow', async ({ page }) => {
  await expect(card(page)).toHaveClass(/start-continue--nudge/);
  await expect.poll(() => recorded(page)).toContain('start-nudge-glow');
  expect(await recorded(page)).not.toContain('start-nudge-shake');
});

/** Signal: the class goes away on animationend. */
When('the not saved card has stopped', async ({ page }) => {
  await expect(card(page)).not.toHaveClass(/start-continue--nudge/);
});
