import { expect, test } from '@playwright/test';

function currentMonth(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

test.describe('monthly summary', () => {
  test('AC-1, AC-2: header links switch between the expense list and the summary', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation');
    await expect(page.getByRole('banner')).toContainText('Spendly');
    await expect(nav.getByRole('link')).toHaveText(['Expenses', 'Summary']);
    await expect(nav.getByRole('link', { name: 'Expenses' })).toHaveAttribute('aria-current', 'page');

    await nav.getByRole('link', { name: 'Summary' }).click();

    await expect(page.getByRole('heading', { name: 'Summary' })).toBeVisible();
    await expect(page.getByLabel('Month')).toHaveValue(currentMonth());
    await expect(nav.getByRole('link', { name: 'Summary' })).toHaveAttribute('aria-current', 'page');

    await nav.getByRole('link', { name: 'Expenses' }).click();

    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
  });

  test('AC-3, AC-4, AC-17: shows the month per category with the same month total as the expense list', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('month-total')).toContainText('₫');
    const listTotal = await page.getByTestId('month-total').textContent();

    await page.getByRole('link', { name: 'Summary' }).click();

    const table = page.getByRole('table');
    await expect(table.getByRole('columnheader')).toHaveText(['Category', 'Expenses', 'Total', 'Share']);
    await expect(table.locator('tbody tr').first()).toBeVisible();
    const footer = table.locator('tfoot tr');
    await expect(footer.getByRole('cell').nth(0)).toHaveText('Month total');
    await expect(footer.getByRole('cell').nth(2)).toHaveText(listTotal ?? '');
    await expect(footer.getByRole('cell').nth(3)).toHaveText('100,0%');
  });

  test('AC-10: shows the empty state for a month without expenses', async ({ page }) => {
    await page.goto('/#/summary');
    await expect(page.getByRole('table')).toBeVisible();

    await page.getByLabel('Month').fill('2020-01');

    await expect(page.getByText('No expenses for this month.')).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);
  });
});
