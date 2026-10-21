import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

Then('the current blocks view should be {string}', async ({ page }, view: string) => {
  await expect(page.getByTestId(`placed-view-${view}`)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId(view === 'tree' ? 'placed-tree' : 'block-list')).toBeVisible();
});

When('I switch the current blocks view to {string}', async ({ page }, view: string) => {
  await page.getByTestId(`placed-view-${view}`).click();
  await expect(page.getByTestId(view === 'tree' ? 'placed-tree' : 'block-list')).toBeVisible();
});

Then('the tree group {string} should be collapsed', async ({ page }, group: string) => {
  await expect(page.getByTestId(`tree-group-${group}`)).toHaveAttribute('aria-expanded', 'false');
  await expect(
    page.getByTestId(`tree-col-${group}`).locator('[data-testid^="tree-part-"]'),
  ).toHaveCount(0);
});

When('I expand the tree group {string}', async ({ page }, group: string) => {
  const head = page.getByTestId(`tree-group-${group}`);
  if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click();
  await expect(head).toHaveAttribute('aria-expanded', 'true');
});

Then(
  'the tree group {string} should list {string}',
  async ({ page }, group: string, list: string) => {
    const expected = list.split(',').map((p) => `tree-part-${p.trim()}`);
    const parts = page.getByTestId(`tree-col-${group}`).locator('[data-testid^="tree-part-"]');
    await expect(parts).toHaveCount(expected.length);
    expect(
      await parts.evaluateAll((els) => els.map((el) => el.getAttribute('data-testid'))),
    ).toEqual(expected);
  },
);

When('I point at the tree part {string}', async ({ page }, part: string) => {
  await page.getByTestId(`tree-part-${part}`).click();
});

Then('the tree status should name the route {string}', async ({ page }, route: string) => {
  await expect(page.getByTestId('tree-status-route')).toHaveText(route);
});

When('I open the place from the tree status', async ({ page }) => {
  await page.getByTestId('tree-open').click();
});

Then('the panel tab {string} should be the selected tab', async ({ page }, tab: string) => {
  await expect(page.getByTestId(`panel-tab-${tab}`)).toHaveAttribute('aria-selected', 'true');
});

Then('the tree group {string} should show a warning', async ({ page }, group: string) => {
  await expect(page.getByTestId(`tree-group-${group}`).locator('.node-warn')).toBeVisible();
});

Then('the tree part {string} should be marked off', async ({ page }, part: string) => {
  const node = page.getByTestId(`tree-part-${part}`);
  await expect(node).toHaveClass(/\bis-off\b/);
  await expect(node.locator('.node-warn')).toBeVisible();
});

When('I pick block {int} in the tree', async ({ page }, n: number) => {
  const block = page.locator('[data-testid^="tree-block-"]').nth(n - 1);
  await block.click();
  await expect(block).toHaveAttribute('aria-selected', 'true');
});

Then('block {int} in the list should be selected', async ({ page }, n: number) => {
  await expect(page.locator('[data-testid^="placed-item-"]').nth(n - 1)).toHaveClass(
    /\bis-selected\b/,
  );
});

When('I collapse the tree group {string}', async ({ page }, group: string) => {
  const head = page.getByTestId(`tree-group-${group}`);
  if ((await head.getAttribute('aria-expanded')) !== 'false') await head.click();
  await expect(head).toHaveAttribute('aria-expanded', 'false');
});

Then('the tree group {string} should be expanded', async ({ page }, group: string) => {
  await expect(page.getByTestId(`tree-group-${group}`)).toHaveAttribute('aria-expanded', 'true');
});
