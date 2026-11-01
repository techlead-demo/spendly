import { expect, test } from '@playwright/test';

test.describe('expense list', () => {
  test('shows the current month with its expenses and the month total', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
    await expect(page.getByLabel('Month')).toHaveValue(/^\d{4}-\d{2}$/);
    await expect(page.getByRole('table').locator('tbody tr').first()).toBeVisible();
    await expect(page.getByTestId('month-total')).toContainText('₫');
  });
});
