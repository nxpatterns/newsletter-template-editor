import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { STANDARD_SETS, type ColorMode } from '../../../../src/core/colors/model';

const { When, Then } = createBdd();

const brand = (page: Page) => page.getByTestId('brand-fields');
const preview = (page: Page) => page.frameLocator('[data-testid="preview-frame"]');

/** `top` → header stars, `bottom` → footer stars. */
const FRAME = { top: 'header', bottom: 'footer' } as const;
const GLYPH = { top: '.brand-stars', bottom: '.footer-stars-glyph' } as const;
const ROLE = { top: 'starsTop', bottom: 'starsBottom' } as const;
type Where = keyof typeof FRAME;

const rgb = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
};

Then('the colors tab should offer no star color', async ({ page }) => {
  await expect(page.getByTestId('color-general-link')).toBeVisible();
  await expect(page.locator('[data-testid^="color-general-stars"]')).toHaveCount(0);
  await expect(page.getByTestId('color-slot-header.stars')).toHaveCount(0);
  await expect(page.getByTestId('color-slot-footer.stars')).toHaveCount(0);
});

When('I set the {string} star color to {string}', async ({ page }, where: Where, hex: string) => {
  const input = brand(page).getByTestId(`brand-stars-color-hex-${FRAME[where]}`);
  await input.fill(hex);
  await input.dispatchEvent('change');
  await expect(input).toHaveValue(hex.toUpperCase());
  await expect(brand(page).getByTestId(`brand-stars-color-reset-${FRAME[where]}`)).toBeVisible();
});

Then('the {string} stars should have the color {string}', async ({ page }, where: Where, hex: string) => {
  await expect(preview(page).locator(GLYPH[where])).toHaveCSS('color', rgb(hex));
});

Then('the {string} stars should use the standard {string} star color', async ({ page }, where: Where, mode: ColorMode) => {
  await expect(preview(page).locator(GLYPH[where])).toHaveCSS('color', rgb(STANDARD_SETS[mode][ROLE[where]]));
});

Then('the {string} star color should warn about its background', async ({ page }, where: Where) => {
  await expect(brand(page).getByTestId(`brand-stars-color-warn-${FRAME[where]}`)).toBeVisible();
});

Then('the {string} star color should show no warning', async ({ page }, where: Where) => {
  await expect(brand(page).getByTestId(`brand-stars-color-hex-${FRAME[where]}`)).toBeVisible();
  await expect(brand(page).getByTestId(`brand-stars-color-warn-${FRAME[where]}`)).toHaveCount(0);
});

When('I make the {string} star color readable', async ({ page }, where: Where) => {
  await brand(page).getByTestId(`brand-stars-color-fix-${FRAME[where]}`).click();
});

When('I reset the {string} star color', async ({ page }, where: Where) => {
  await brand(page).getByTestId(`brand-stars-color-reset-${FRAME[where]}`).click();
  await expect(brand(page).getByTestId(`brand-stars-color-reset-${FRAME[where]}`)).toHaveCount(0);
});
