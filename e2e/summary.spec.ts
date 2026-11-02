import { expect, test, type Page } from '@playwright/test';

function currentMonth(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

function moneyToNumber(text: string): number {
  return Number(text.replace(/\D/g, ''));
}

/** Food row and footer of the summary on screen; zeros when there is no Food row or no table. */
async function foodAndMonthTotals(page: Page) {
  const table = page.getByRole('table');
  if ((await table.count()) === 0) {
    return { foodCount: 0, foodTotal: 0, monthCount: 0, monthTotal: 0 };
  }
  const food = table.locator('tbody tr').filter({ has: page.getByRole('cell', { name: 'Food', exact: true }) });
  const foodCells = (await food.count()) === 0 ? ['Food', '0', '0'] : await food.getByRole('cell').allTextContents();
  const footerCells = await table.locator('tfoot tr').getByRole('cell').allTextContents();
  return {
    foodCount: Number(foodCells[1]),
    foodTotal: moneyToNumber(foodCells[2] ?? ''),
    monthCount: Number(footerCells[1]),
    monthTotal: moneyToNumber(footerCells[2] ?? ''),
  };
}

test.describe('monthly summary', () => {
  test('AC-1, AC-2: header links switch between the expense list and the summary', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation');
    await expect(page.getByRole('banner')).toContainText('Spendly');
    // SPD-4 adds the "Budgets" link after "Summary".
    await expect(nav.getByRole('link')).toHaveText(['Expenses', 'Summary', 'Budgets']);
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
    const rows = table.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    const footer = table.locator('tfoot tr');
    await expect(footer.getByRole('cell').nth(0)).toHaveText('Month total');
    await expect(footer.getByRole('cell').nth(2)).toHaveText(listTotal ?? '');
    await expect(footer.getByRole('cell').nth(3)).toHaveText('100,0%');

    // BR-13: largest total first. BR-15: every share is a percentage with one decimal.
    const totals = (await rows.locator('td:nth-child(3)').allTextContents()).map(moneyToNumber);
    expect(totals).toEqual([...totals].sort((a, b) => b - a));
    const counts = (await rows.locator('td:nth-child(2)').allTextContents()).map(Number);
    expect(counts.every((count) => count > 0)).toBe(true);
    for (const share of await rows.locator('td:nth-child(4)').allTextContents()) {
      expect(share).toMatch(/^\d{1,3},\d%$/);
    }
    expect(totals.reduce((sum, total) => sum + total, 0)).toBe(moneyToNumber(listTotal ?? ''));
  });

  test('AC-8: an expense recorded on the Add expense form shows up in the summary of its month', async ({ page }) => {
    await page.goto('/#/summary');
    await page.getByLabel('Month').fill('2026-11');
    await expect(page.getByRole('table').or(page.getByText('No expenses for this month.'))).toBeVisible();
    const before = await foodAndMonthTotals(page);

    await page.getByRole('navigation').getByRole('link', { name: 'Expenses' }).click();
    await page.getByRole('button', { name: 'Add expense' }).click();
    await expect(page.getByLabel('Category').locator('option')).toHaveCount(7);
    await page.getByLabel('Date').fill('2026-11-02');
    await page.getByLabel('Amount').fill('30000');
    await page.getByLabel('Category').selectOption({ label: 'Food' });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();

    await page.getByRole('navigation').getByRole('link', { name: 'Summary' }).click();
    await page.getByLabel('Month').fill('2026-11');
    await expect(page.getByRole('table')).toBeVisible();

    await expect
      .poll(() => foodAndMonthTotals(page))
      .toEqual({
        foodCount: before.foodCount + 1,
        foodTotal: before.foodTotal + 30_000,
        monthCount: before.monthCount + 1,
        monthTotal: before.monthTotal + 30_000,
      });
  });

  test('AC-10: shows the empty state for a month without expenses', async ({ page }) => {
    await page.goto('/#/summary');
    await expect(page.getByRole('table')).toBeVisible();

    await page.getByLabel('Month').fill('2020-01');

    await expect(page.getByText('No expenses for this month.')).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);
  });
});
