import { expect, test, type Page } from '@playwright/test';

/** Unique note per test run, so tests can find their own rows in the shared database. */
function uniqueNote(label: string): string {
  return `${label} ${Date.now()}`;
}

function moneyToNumber(text: string): number {
  return Number(text.replace(/\D/g, ''));
}

async function openForm(page: Page) {
  await page.getByRole('button', { name: 'Add expense' }).click();
  await expect(page.getByRole('heading', { name: 'Add expense' })).toBeVisible();
  // Categories are loaded asynchronously; wait until they are there.
  await expect(page.getByLabel('Category').locator('option')).toHaveCount(7);
}

async function fillForm(page: Page, values: { date: string; amount: string; category: string; note?: string }) {
  await page.getByLabel('Date').fill(values.date);
  await page.getByLabel('Amount').fill(values.amount);
  await page.getByLabel('Category').selectOption({ label: values.category });
  await page.getByLabel('Note').fill(values.note ?? '');
}

function rowWith(page: Page, text: string) {
  return page.getByRole('row').filter({ hasText: text });
}

async function rowCells(page: Page, text: string): Promise<string[]> {
  const cells = await rowWith(page, text).getByRole('cell').allTextContents();
  return cells.map((cell) => cell.replace(/\s/g, ' '));
}

test.describe('add expense', () => {
  test('AC-1, AC-4: records an expense and shows it in its month with the higher month total', async ({ page }) => {
    const note = uniqueNote('Lunch');
    await page.goto('/');
    await page.getByLabel('Month').fill('2026-11');
    await expect(page.getByTestId('month-total')).toContainText('₫');
    const totalBefore = moneyToNumber(await page.getByTestId('month-total').innerText());

    await openForm(page);
    await fillForm(page, { date: '2026-11-02', amount: '85000', category: 'Food', note });
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
    await expect(page.getByLabel('Month')).toHaveValue('2026-11');
    await expect(rowWith(page, note)).toBeVisible();
    expect(await rowCells(page, note)).toEqual(['02/11/2026', 'Food', note, '85.000 ₫']);
    await expect
      .poll(async () => moneyToNumber(await page.getByTestId('month-total').innerText()))
      .toBe(totalBefore + 85_000);
  });

  test('AC-5, AC-7: switches to the month of the expense with "All categories"', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Category').selectOption({ label: 'Health' });

    await openForm(page);
    await fillForm(page, { date: '2026-09-15', amount: '30000', category: 'Transport' });
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByLabel('Month')).toHaveValue('2026-09');
    await expect(page.getByLabel('Category')).toHaveValue('');
    await expect(page.getByLabel('Category').locator('option:checked')).toHaveText('All categories');
    const row = page.getByRole('row').filter({ hasText: '15/09/2026' }).filter({ hasText: '30.000 ₫' });
    await expect(row.first()).toBeVisible();
    await expect(row.first().getByRole('cell').nth(1)).toHaveText('Transport');
  });

  test('AC-9: accepts a future date', async ({ page }) => {
    const note = uniqueNote('Christmas');
    await page.goto('/');

    await openForm(page);
    await fillForm(page, { date: '2026-12-24', amount: '500000', category: 'Other', note });
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByLabel('Month')).toHaveValue('2026-12');
    await expect(rowWith(page, note)).toBeVisible();
    expect(await rowCells(page, note)).toEqual(['24/12/2026', 'Other', note, '500.000 ₫']);
  });

  test('AC-11: Cancel stores nothing and keeps the previous month and category', async ({ page }) => {
    const note = uniqueNote('Cancelled');
    await page.goto('/');
    await page.getByLabel('Month').fill('2026-08');
    await page.getByLabel('Category').selectOption({ label: 'Housing' });

    await openForm(page);
    await fillForm(page, { date: '2026-08-10', amount: '42000', category: 'Food', note });
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByLabel('Month')).toHaveValue('2026-08');
    await expect(page.getByLabel('Category').locator('option:checked')).toHaveText('Housing');
    await page.getByLabel('Category').selectOption({ label: 'All categories' });
    await expect(page.getByTestId('month-total')).toBeVisible();
    await expect(rowWith(page, note)).toHaveCount(0);
  });

  test('AC-15, AC-17: shows all field errors, focuses Date, then saves once corrected', async ({ page }) => {
    const note = uniqueNote('Corrected');
    await page.goto('/');
    await openForm(page);
    await page.getByLabel('Date').fill('');
    await page.getByLabel('Amount').fill('12,5');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('alert')).toHaveText('Please fix the highlighted fields.');
    await expect(page.getByText('Enter a valid date.')).toBeVisible();
    await expect(page.getByText('Enter a whole amount in đồng, greater than 0.')).toBeVisible();
    await expect(page.getByText('Choose a category.')).toBeVisible();
    await expect(page.getByLabel('Date')).toBeFocused();
    await expect(page.getByLabel('Amount')).toHaveAttribute('aria-invalid', 'true');

    await fillForm(page, { date: '2026-10-20', amount: '1', category: 'Entertainment', note });
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByLabel('Month')).toHaveValue('2026-10');
    expect(await rowCells(page, note)).toEqual(['20/10/2026', 'Entertainment', note, '1 ₫']);
  });

  test('AC-16: the note accepts at most 200 characters', async ({ page }) => {
    await page.goto('/');
    await openForm(page);

    await page.getByLabel('Note').pressSequentially('a'.repeat(205));

    await expect(page.getByLabel('Note')).toHaveValue('a'.repeat(200));
  });

  test('AC-25: keeps the form when the API cannot be reached', async ({ page }) => {
    const note = uniqueNote('Offline');
    await page.route('**/api/v1/expenses', (route) =>
      route.request().method() === 'POST' ? route.abort('failed') : route.continue(),
    );
    await page.goto('/');
    await openForm(page);
    await fillForm(page, { date: '2026-11-02', amount: '85000', category: 'Food', note });

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('alert')).toHaveText('Could not save the expense. Try again.');
    await expect(page.getByRole('heading', { name: 'Add expense' })).toBeVisible();
    await expect(page.getByLabel('Amount')).toHaveValue('85000');
    await expect(page.getByLabel('Note')).toHaveValue(note);
  });
});
