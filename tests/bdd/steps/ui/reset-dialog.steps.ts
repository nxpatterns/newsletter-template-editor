import { readFile } from 'node:fs/promises';
import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

/** Path of the backup the last scenario step downloaded (one scenario at a time per worker). */
let backupPath = '';

const dialog = (page: Page) => page.getByTestId('reset-dialog');

When('I open the reset dialog', async ({ page }) => {
  await page.getByTestId('start-menu-trigger').click();
  await page.getByTestId('menu-factory-reset').click();
  await expect(dialog(page).getByRole('alertdialog')).toBeVisible();
});

Then('the reset dialog should list {string}', async ({ page }, kinds: string) => {
  const rows = dialog(page).locator('.reset-kind');
  await expect(rows).toHaveCount(kinds.split(',').length);
  const ids = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')?.replace('reset-kind-', '')));
  expect(ids).toEqual(kinds.split(','));
});

Then('the reset kind {string} should show the count {string}', async ({ page }, kind: string, count: string) => {
  await expect(dialog(page).getByTestId(`reset-kind-${kind}`).getByTestId('reset-kind-count')).toHaveText(count);
});

Then('every reset kind should be checked', async ({ page }) => {
  const boxes = dialog(page).locator('.reset-kind input[type="checkbox"]');
  const states = await boxes.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).checked));
  expect(states.length).toBeGreaterThan(0);
  expect(states.every(Boolean)).toBe(true);
});

When('I uncheck the reset kind {string}', async ({ page }, kind: string) => {
  await dialog(page).getByTestId(`reset-kind-${kind}`).getByRole('checkbox').uncheck();
});

When('I check the reset kind {string}', async ({ page }, kind: string) => {
  await dialog(page).getByTestId(`reset-kind-${kind}`).getByRole('checkbox').check();
});

When('I choose none of the reset kinds', async ({ page }) => {
  await dialog(page).getByTestId('reset-select-none').click();
});

When('I choose all reset kinds', async ({ page }) => {
  await dialog(page).getByTestId('reset-select-all').click();
});

Then('the selected line should read {string}', async ({ page }, text: string) => {
  await expect(dialog(page).getByTestId('reset-selected-line')).toHaveText(text);
});

Then('the delete button should read {string}', async ({ page }, text: string) => {
  await expect(dialog(page).getByTestId('reset-delete')).toHaveText(text);
});

Then('the reset hint {string} should be shown', async ({ page }, key: string) => {
  await expect(dialog(page).locator(`[data-hint="${key}"]`)).toBeVisible();
});

Then('saving and deleting should not be possible even after ticking the acknowledgement', async ({ page }) => {
  await dialog(page).getByTestId('reset-acknowledge').check();
  await expect(dialog(page).getByTestId('reset-delete')).toBeDisabled();
  await expect(dialog(page).getByTestId('reset-save')).toBeDisabled();
});

When('I save the checked kinds as a file', async ({ page }) => {
  const download = page.waitForEvent('download');
  await dialog(page).getByTestId('reset-save').click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^newsletter-backup-\d{4}-\d{2}-\d{2}\.json$/);
  backupPath = await file.path();
});

Then('the saved backup should hold only {string}', async ({}, kinds: string) => {
  const backup = JSON.parse(await readFile(backupPath, 'utf8')) as { kind: string; contains: string[] };
  expect(backup.kind).toBe('nte-backup');
  expect(backup.contains).toEqual(kinds.split(','));
});

Then('the save box should name the backup file', async ({ page }) => {
  const box = dialog(page).getByTestId('reset-save-box');
  await expect(box).toHaveAttribute('data-state', 'ok');
  await expect(box.getByTestId('reset-save-file')).toHaveText(/^newsletter-backup-.*\.json$/);
});

Then('the save box should say the selection changed', async ({ page }) => {
  await expect(dialog(page).getByTestId('reset-selection-changed')).toBeVisible();
});

Then('the start page message should say {string}', async ({ page }, text: string) => {
  await expect(page.getByTestId('start-notice')).toContainText(text);
});

Then('the start page message should offer to open the backup', async ({ page }) => {
  await expect(page.getByTestId('start-notice')).toContainText('reset.');
  await expect(page.getByTestId('start-notice-open-backup')).toBeVisible();
});

When('I close the start page message', async ({ page }) => {
  await page.getByTestId('start-notice-close').click();
});

Then('no start page message should be shown', async ({ page }) => {
  await expect(page.getByTestId('start-notice')).toHaveCount(0);
});

When('I open the backup from the start page message', async ({ page }) => {
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('start-notice-open-backup').click();
  await (await chooser).setFiles(backupPath);
});

When('I press Escape', async ({ page }) => {
  await page.keyboard.press('Escape');
});

Then('the reset dialog should be closed', async ({ page }) => {
  await expect(dialog(page)).toBeHidden();
});

Given('the window is phone sized', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
});

Then('the reset dialog should sit at the bottom of the screen', async ({ page }) => {
  const box = await dialog(page).getByRole('alertdialog').boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBe(375);
  expect(Math.round(box!.y + box!.height)).toBe(812);
});

Then('the delete button should be above the cancel button', async ({ page }) => {
  const del = await dialog(page).getByTestId('reset-delete').boundingBox();
  const cancel = await dialog(page).getByTestId('reset-cancel').boundingBox();
  expect(del!.y).toBeLessThan(cancel!.y);
});

/** Own blocks and drafts written straight into the app database (the block editor UI comes later). */
Given('the browser holds {int} own blocks and {int} block drafts', async ({ page }, blocks: number, drafts: number) => {
  await page.evaluate(
    async ({ blocks, drafts }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('nte-docs', 2);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const tx = db.transaction(['ownBlocks', 'blockDrafts'], 'readwrite');
      const local = { tenantId: null, ownerId: null };
      for (let i = 1; i <= blocks; i++) {
        tx.objectStore('ownBlocks').put({
          ...local,
          id: `block-${i}`,
          name: `Block ${i}`,
          kind: 'free',
          baseType: null,
          createdAt: '2026-05-02T10:00:00.000Z',
          updatedAt: '2026-05-02T10:00:00.000Z',
          latestVersionId: null,
          versionCount: 0,
        });
      }
      for (let i = 1; i <= drafts; i++) {
        tx.objectStore('blockDrafts').put({
          ...local,
          id: `draft-${i}`,
          blockId: i <= blocks ? `block-${i}` : null,
          name: `Draft ${i}`,
          createdAt: '2026-05-02T10:00:00.000Z',
          updatedAt: `2026-05-0${Math.min(i + 1, 9)}T10:00:00.000Z`,
          content: {},
        });
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { blocks, drafts },
  );
});

Then(
  'the browser should hold {int} own blocks and {int} standalone block drafts',
  async ({ page }, blocks: number, drafts: number) => {
    const counts = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('nte-docs', 2);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const tx = db.transaction(['ownBlocks', 'blockDrafts'], 'readonly');
      const all = <T>(store: string) =>
        new Promise<T[]>((resolve, reject) => {
          const req = tx.objectStore(store).getAll();
          req.onsuccess = () => resolve(req.result as T[]);
          req.onerror = () => reject(req.error);
        });
      const [ownBlocks, blockDrafts] = await Promise.all([all('ownBlocks'), all<{ blockId: string | null }>('blockDrafts')]);
      db.close();
      return { blocks: ownBlocks.length, standalone: blockDrafts.filter((d) => d.blockId === null).length, drafts: blockDrafts.length };
    });
    expect(counts).toEqual({ blocks, standalone: drafts, drafts });
  },
);
