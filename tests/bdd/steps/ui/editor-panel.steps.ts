import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

Then('I should see the editor panel tabs', async ({ page }) => {
  await expect(page.getByTestId('editor-panel')).toBeVisible();
  await expect(page.getByTestId('panel-tab-placed')).toBeVisible();
  await expect(page.getByTestId('panel-tab-catalog')).toBeVisible();
  await expect(page.getByTestId('panel-tab-colors')).toBeVisible();
  await expect(page.getByTestId('side-panel-toggle')).toBeVisible();
});

Then('I should see the placed blocks list', async ({ page }) => {
  await expect(page.getByTestId('placed-blocks-tab')).toBeVisible();
  await expect(page.getByTestId('block-list')).toBeVisible();
});

When('I open the catalog tab', async ({ page }) => {
  await page.getByTestId('panel-tab-catalog').click();
});

Then('I should see the block catalog cards', async ({ page }) => {
  await expect(page.getByTestId('catalog-tab')).toBeVisible();
  await expect(page.getByTestId('block-catalog')).toBeVisible();
  await expect(page.getByTestId('add-block-hero')).toBeVisible();
  await expect(page.getByTestId('add-block-divider')).toBeVisible();
});

When('I note the placed block count', async ({ page }) => {
  await page.getByTestId('panel-tab-placed').click();
  const count = await page.locator('[data-testid="block-list"] > li').count();
  await page.evaluate((n) => {
    (window as unknown as { __nteBlockCount?: number }).__nteBlockCount = n;
  }, count);
  await page.getByTestId('panel-tab-catalog').click();
});

When('I click a divider catalog card', async ({ page }) => {
  await page.getByTestId('add-block-divider').click();
});

Then('the catalog tab should stay selected', async ({ page }) => {
  await expect(page.getByTestId('panel-tab-catalog')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('catalog-tab')).toBeVisible();
});

Then('the placed block count should be unchanged', async ({ page }) => {
  const before = await page.evaluate(
    () => (window as unknown as { __nteBlockCount?: number }).__nteBlockCount ?? -1,
  );
  await page.getByTestId('panel-tab-placed').click();
  const after = await page.locator('[data-testid="block-list"] > li').count();
  expect(after).toBe(before);
});

Then('the divider catalog card should be draggable', async ({ page }) => {
  const card = page.getByTestId('add-block-divider');
  await expect(card).toHaveAttribute('draggable', 'true');
});

When('I open the placed blocks tab', async ({ page }) => {
  await page.getByTestId('panel-tab-placed').click();
});

Then('the placed list should contain at least {int} dividers', async ({ page }, count: number) => {
  await expect(page.getByTestId('block-list')).toBeVisible();
  const labels = page.locator('[data-testid="block-list"] .placed-label');
  const texts = await labels.allTextContents();
  const dividers = texts.filter((t) => /divider|trenner/i.test(t)).length;
  expect(dividers).toBeGreaterThanOrEqual(count);
});

When('I select the first document block', async ({ page }) => {
  await page.getByTestId('panel-tab-placed').click();
  const first = page.locator('[data-testid^="select-block-"]').first();
  await first.click();
  await expect(first).toHaveAttribute('aria-pressed', 'true');
});

When('I set the hero label to {string}', async ({ page }, label: string) => {
  const firstEdit = page.locator('[data-testid^="edit-block-"]').first();
  await firstEdit.click();
  const modal = page.getByTestId('block-edit-modal');
  await expect(modal).toBeVisible();
  const input = page.getByTestId('insp-hero-label');
  await expect(input).toBeVisible();
  await input.fill(label);
  await input.blur();
});

Then('the preview frame should contain {string}', async ({ page }, text: string) => {
  const frame = page.frameLocator('[data-testid="preview-frame"]');
  await expect(frame.locator('body')).toContainText(text);
});

When('I open the campaign tab', async ({ page }) => {
  await page.getByTestId('panel-tab-campaign').click();
});

Then('I should see the preheader help text', async ({ page }) => {
  const help = page.getByTestId('g-preheader-help');
  await expect(help).toBeVisible();
  await expect(help).toContainText(/Gmail|Posteingang|inbox/i);
});

When('I resize the side panel toward half the viewport', async ({ page }) => {
  const handle = page.getByTestId('side-panel-resizer');
  await expect(handle).toBeVisible();
  const box = await handle.boundingBox();
  expect(box).toBeTruthy();
  const viewport = page.viewportSize();
  expect(viewport).toBeTruthy();
  const targetX = Math.floor(viewport!.width * 0.55);
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetX, box!.y + box!.height / 2, { steps: 8 });
  await page.mouse.up();
});

Then('the side panel width should be within the allowed range', async ({ page }) => {
  const metrics = await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="side-panel"]') as HTMLElement | null;
    if (!panel) return null;
    const width = panel.getBoundingClientRect().width;
    return { width, viewport: window.innerWidth };
  });
  expect(metrics).toBeTruthy();
  expect(metrics!.width).toBeGreaterThanOrEqual(336 - 2);
  expect(metrics!.width).toBeLessThanOrEqual(metrics!.viewport * 0.5 + 2);
});

async function findLinkListSelect(page: import('@playwright/test').Page) {
  await page.getByTestId('panel-tab-placed').click();
  const list = page.getByTestId('block-list');
  await expect(list).toBeVisible();
  const items = list.locator('li');
  const count = await items.count();
  for (let i = 0; i < count; i++) {
    const item = items.nth(i);
    const label = await item.locator('.placed-label').innerText();
    if (/link\s*list|linkliste/i.test(label)) {
      return item;
    }
  }
  throw new Error('Link list block not found in placed list');
}

When('I select the link list block', async ({ page }) => {
  const item = await findLinkListSelect(page);
  await item.locator('[data-testid^="select-block-"]').click();
  await expect(item.locator('[data-testid^="select-block-"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

let settledPreviewY: number | null = null;

When('smooth scrolling is enabled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

When('I select the link list block and the preview scroll settles', async ({ page }) => {
  // Arm the browser's scrollend signal before the click; it resolves with the settled Y.
  await page.evaluate(() => {
    const frame = document.querySelector('[data-testid="preview-frame"]') as HTMLIFrameElement;
    const doc = frame.contentDocument!;
    (window as unknown as { __nteScrollEnd: Promise<number> }).__nteScrollEnd = new Promise((resolve) => {
      doc.addEventListener(
        'scrollend',
        () => resolve((doc.scrollingElement ?? doc.documentElement).scrollTop),
        { once: true },
      );
    });
  });
  const item = await findLinkListSelect(page);
  await item.locator('[data-testid^="select-block-"]').click();
  settledPreviewY = await page.evaluate(
    () => (window as unknown as { __nteScrollEnd: Promise<number> }).__nteScrollEnd,
  );
  expect(settledPreviewY).toBeGreaterThan(0);
});

Then('the preview should keep the settled scroll position', async ({ page }) => {
  expect(settledPreviewY).not.toBeNull();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const frame = document.querySelector('[data-testid="preview-frame"]') as HTMLIFrameElement;
        const doc = frame.contentDocument!;
        return (doc.scrollingElement ?? doc.documentElement).scrollTop;
      }),
    )
    .toBe(settledPreviewY);
});

When('I open the link list block editor', async ({ page }) => {
  const item = await findLinkListSelect(page);
  await item.locator('[data-testid^="edit-block-"]').click();
  await expect(page.getByTestId('block-edit-modal')).toBeVisible();
  await expect(page.getByTestId('block-edit-modal')).toHaveClass(/is-open/);
});

Then('I should see the CTA link row editor without a JSON textarea', async ({ page }) => {
  const modal = page.getByTestId('block-edit-modal');
  await expect(modal.getByTestId('cta-link-rows')).toBeVisible();
  await expect(modal.getByTestId('cta-link-row-0')).toBeVisible();
  await expect(modal.getByTestId('cta-link-add')).toBeVisible();
  await expect(modal.locator('#insp-cta-links')).toHaveCount(0);
  await expect(modal.locator('textarea')).toHaveCount(0);
});

When('I add a CTA link row titled {string}', async ({ page }, title: string) => {
  const modal = page.getByTestId('block-edit-modal');
  const before = await modal.locator('[data-testid^="cta-link-row-"]').count();
  await modal.getByTestId('cta-link-add').click();
  const rows = modal.locator('[data-testid^="cta-link-row-"]');
  await expect(rows).toHaveCount(before + 1);
  const last = rows.nth(before);
  await last.locator('input.ed-input').first().fill(title);
  await last.locator('input.ed-input').first().blur();
});

When('I add several empty CTA link rows totaling at least {int}', async ({ page }, minRows: number) => {
  const modal = page.getByTestId('block-edit-modal');
  const rows = modal.locator('[data-testid^="cta-link-row-"]');
  let count = await rows.count();
  while (count < minRows) {
    await modal.getByTestId('cta-link-add').click();
    count = await rows.count();
  }
  expect(count).toBeGreaterThanOrEqual(minRows);
});

When('I rename the first CTA link row title to {string}', async ({ page }, title: string) => {
  const modal = page.getByTestId('block-edit-modal');
  const first = modal.getByTestId('cta-link-row-0');
  const titleInput = first.locator('input.ed-input').first();
  await titleInput.fill(title);
  await titleInput.blur();
});

When('I save the block edit modal', async ({ page }) => {
  await page.getByTestId('block-edit-save').click();
  await expect(page.getByTestId('block-edit-modal')).toHaveCount(0, { timeout: 5000 });
});

Then('the block edit modal should be fully visible in the viewport', async ({ page }) => {
  const box = await page.getByTestId('block-edit-modal').locator('.block-edit-dialog').boundingBox();
  expect(box).toBeTruthy();
  const viewport = page.viewportSize();
  expect(viewport).toBeTruthy();
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
});

Then('the block edit modal head should stay within the viewport', async ({ page }) => {
  const head = page.getByTestId('block-edit-modal').locator('.block-edit-head');
  await expect(head).toBeVisible();
  const box = await head.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual((page.viewportSize()?.height ?? 0) + 1);
});

Then('the block edit modal should stack above the app header', async ({ page }) => {
  const layers = await page.evaluate(() => {
    const modal = document.querySelector('[data-testid="block-edit-modal"]') as HTMLElement | null;
    const header = document.querySelector('.app-header') as HTMLElement | null;
    if (!modal || !header) return null;
    const modalZ = Number.parseInt(getComputedStyle(modal).zIndex, 10);
    const headerZ = Number.parseInt(getComputedStyle(header).zIndex, 10);
    return { modalZ, headerZ };
  });
  expect(layers).toBeTruthy();
  expect(layers!.modalZ).toBeGreaterThan(layers!.headerZ);
});

Then('the preview should show the selected block in view', async ({ page }) => {
  const selected = page.frameLocator('[data-testid="preview-frame"]').locator('tr.nte-block.is-selected');
  await expect(selected).toBeInViewport();
});

const paragraphEditor = (page: import('@playwright/test').Page) =>
  page.getByTestId('block-edit-modal').getByTestId('insp-paragraph-html');

let inlineColorCountBefore = 0;

When('I open the paragraph editor for seed block {string}', async ({ page }, blockId: string) => {
  await page.getByTestId('panel-tab-placed').click();
  await page.getByTestId(`edit-block-${blockId}`).click();
  await expect(page.getByTestId('block-edit-modal')).toHaveClass(/is-open/);
  await expect(paragraphEditor(page).locator('p').first()).toBeVisible();
});

When('I turn on the formatting info', async ({ page }) => {
  await page.getByTestId('block-edit-modal').getByTestId('rt-info-mode').click();
  await expect(page.getByTestId('rt-info-legend')).toBeVisible();
});

Then('a paragraph info label should mention {string}', async ({ page }, text: string) => {
  await expect(paragraphEditor(page).locator('p[data-rt-info]').first()).toHaveAttribute(
    'data-rt-info',
    new RegExp(text),
  );
});

When('I click the first inline-colored text', async ({ page }) => {
  const colored = paragraphEditor(page).locator('span[data-rt-color]');
  await expect(colored.first()).toBeVisible();
  inlineColorCountBefore = await colored.count();
  await colored.first().click();
});

Then('the info panel should list {string}', async ({ page }, text: string) => {
  await expect(page.getByTestId('rt-info-item-color')).toContainText(text);
});

When('I remove the color in the info panel', async ({ page }) => {
  await page.getByTestId('rt-info-remove-color').click();
});

Then('that text should have no inline color anymore', async ({ page }) => {
  await expect(paragraphEditor(page).locator('span[data-rt-color]')).toHaveCount(inlineColorCountBefore - 1);
  await expect(page.getByTestId('rt-info-panel')).toHaveCount(0);
});

When('I select {string} in paragraph {int} of the editor', async ({ page }, word: string, n: number) => {
  const para = paragraphEditor(page).locator(':scope > p').nth(n - 1);
  await expect(para).toContainText(word);
  await para.evaluate((p, w) => {
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const at = (node as Text).data.indexOf(w);
      if (at < 0) continue;
      const range = document.createRange();
      range.setStart(node, at);
      range.setEnd(node, at + w.length);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    throw new Error(`"${w}" is not inside one text node`);
  }, word);
});

When('I set the text color to {string}', async ({ page }, token: string) => {
  await page.getByTestId('block-edit-modal').getByTestId('rt-color-select').selectOption(token);
});

Then(
  'paragraph {int} should color exactly {string} as {string}',
  async ({ page }, n: number, word: string, token: string) => {
    const colored = paragraphEditor(page).locator(':scope > p').nth(n - 1).locator(`[data-rt-color="${token}"]`);
    await expect(colored).toHaveText([word]);
  },
);

Then('the info label of paragraph {int} should mention {string}', async ({ page }, n: number, text: string) => {
  await expect(paragraphEditor(page).locator(':scope > p').nth(n - 1)).toHaveAttribute(
    'data-rt-info',
    new RegExp(text),
  );
});

When('I click the bold text in paragraph {int}', async ({ page }, n: number) => {
  await paragraphEditor(page).locator(':scope > p').nth(n - 1).locator('strong').first().click();
});

When('I remove {string} in the info panel', async ({ page }, kind: string) => {
  await expect(page.getByTestId(`rt-info-item-${kind}`)).toBeVisible();
  await page.getByTestId(`rt-info-remove-${kind}`).click();
});

Then('paragraph {int} should have no bold text anymore', async ({ page }, n: number) => {
  const para = paragraphEditor(page).locator(':scope > p').nth(n - 1);
  await expect(para.locator('strong, b')).toHaveCount(0);
  await expect(para).not.toHaveAttribute('data-rt-info', /.+/);
});

Then('the info panel should show {string}', async ({ page }, text: string) => {
  await expect(page.getByTestId('rt-info-panel')).toContainText(text);
});
