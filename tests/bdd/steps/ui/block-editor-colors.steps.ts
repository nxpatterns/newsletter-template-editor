import { expect, type Locator, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { STANDARD_SETS, type ColorMode, type ColorRole } from '../../../../src/core/colors/model';

const { When, Then } = createBdd();

const preview = (page: Page) => page.frameLocator('[data-testid="preview-frame"]');
const modal = (page: Page) => page.getByTestId('block-edit-modal');

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

const firstBlockId = async (page: Page, type: string) =>
  (await preview(page).locator(`tr[data-block-type="${type}"]`).first().getAttribute('data-block-id')) ?? '';

/** The paragraph text is edited on the lite editor surface, the other fields by test id. */
const field = (page: Page, name: string): Locator =>
  name === 'paragraph-surface' ? modal(page).locator('.rt-editor.rt-clone') : modal(page).getByTestId(name);

async function setOwnColor(page: Page, id: string, slot: string, hex: string): Promise<void> {
  const acc = page.getByTestId(`colors-acc-${id}`);
  if ((await acc.getAttribute('aria-expanded')) !== 'true') await acc.click();
  await expect(acc).toHaveAttribute('aria-expanded', 'true');
  await page.getByTestId(`color-slot-open-${id}.${slot}`).click();
  const input = page.getByTestId(`color-slot-hex-${id}.${slot}`);
  await input.fill(hex);
  await input.dispatchEvent('change');
  await expect(page.getByTestId(`color-slot-${id}.${slot}`)).toContainText(hex.toUpperCase());
}

When(
  'I give the block {string} its own {string} color {string} and {string} color {string}',
  async ({ page }, type: string, bgSlot: string, bgHex: string, fgSlot: string, fgHex: string) => {
    const id = await firstBlockId(page, type);
    await setOwnColor(page, id, bgSlot, bgHex);
    await setOwnColor(page, id, fgSlot, fgHex);
  },
);

When('I open the block editor for the first {string} block', async ({ page }, type: string) => {
  const id = await firstBlockId(page, type);
  await page.getByTestId('panel-tab-placed').click();
  await page.getByTestId(`edit-block-${id}`).click();
  await expect(modal(page)).toHaveClass(/is-open/);
});

Then('the editor field {string} should show text {string} on {string}', async ({ page }, name: string, fg: string, bg: string) => {
  const el = field(page, name);
  await expect(el).toHaveCSS('color', rgb(fg));
  await expect(el).toHaveCSS('background-color', rgb(bg));
});

Then(
  'the editor field {string} should show the standard {string} colors {string} on {string}',
  async ({ page }, name: string, mode: ColorMode, fg: ColorRole, bg: ColorRole) => {
    const el = field(page, name);
    await expect(el).toHaveCSS('color', rgb(STANDARD_SETS[mode][fg]));
    await expect(el).toHaveCSS('background-color', rgb(STANDARD_SETS[mode][bg]));
  },
);

Then(
  'the preview of the first {string} block should show {string} in {string} on {string} in {string}',
  async ({ page }, type: string, fgSel: string, fg: string, bgSel: string, bg: string) => {
    const row = preview(page).locator(`tr[data-block-type="${type}"]`).first();
    await expect(row.locator(fgSel).first()).toHaveCSS('color', rgb(fg));
    const bgEl = row.locator(bgSel).first();
    // The row itself can carry the background class.
    const target = (await bgEl.count()) ? bgEl : row;
    await expect(target).toHaveCSS('background-color', rgb(bg));
  },
);
