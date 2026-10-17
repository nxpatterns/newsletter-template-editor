import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

const toggle = (page: Page, group: string) => page.getByTestId(group).getByTestId('group-toggle');

/** Opens a collapsible group (Campaign, Brand) unless it is open already. */
export async function openGroup(page: Page, group: string): Promise<void> {
  const head = toggle(page, group);
  if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click();
  await expect(head).toHaveAttribute('aria-expanded', 'true');
}

When('I open the group {string}', async ({ page }, group: string) => {
  await openGroup(page, group);
});

Then('the groups {string} should all be closed', async ({ page }, list: string) => {
  for (const group of list.split(',').map((g) => g.trim())) {
    await expect(toggle(page, group)).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId(group).getByTestId('group-panel')).toHaveAttribute('inert', '');
  }
});

Then('the group {string} should be open', async ({ page }, group: string) => {
  await expect(toggle(page, group)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId(group).getByTestId('group-panel')).not.toHaveAttribute('inert');
});
