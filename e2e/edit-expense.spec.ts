import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const FOOD = 1;
const TRANSPORT = 2;

/** Unique note per test run, so tests can find their own rows in the shared database. */
function uniqueNote(label: string): string {
  return `${label} ${Date.now()}`;
}

function moneyToNumber(text: string): number {
  return Number(text.replace(/\D/g, ''));
}

async function createExpense(
  request: APIRequestContext,
  expense: { date: string; amountMinor: number; categoryId: number; note: string },
): Promise<number> {
  const res = await request.post('/api/v1/expenses', { data: expense });
  expect(res.status()).toBe(201);
  return ((await res.json()) as { id: number }).id;
}

function rowWith(page: Page, text: string) {
  return page.getByRole('row').filter({ hasText: text });
}

async function rowCells(page: Page, text: string): Promise<string[]> {
  const cells = await rowWith(page, text).getByRole('cell').allTextContents();
  return cells.map((cell) => cell.replace(/\s/g, ' '));
}

async function showList(page: Page, month: string, category = 'All categories') {
  await page.goto('/');
  await page.getByLabel('Month').fill(month);
  await page.getByLabel('Category').selectOption({ label: category });
  await expect(page.getByTestId('month-total')).toContainText('₫');
}

async function monthTotal(page: Page): Promise<number> {
  return moneyToNumber(await page.getByTestId('month-total').innerText());
}

async function openEdit(page: Page, note: string) {
  await rowWith(page, note).getByRole('link', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { name: 'Edit expense' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
}

test.describe('edit and delete an expense', () => {
  test('AC-1, AC-2, AC-4: edits the amount and note from the "Edit" link', async ({ page, request }) => {
    const note = uniqueNote('Groceries at Co.opmart');
    const newNote = uniqueNote('Groceries');
    await createExpense(request, { date: '2026-11-02', amountMinor: 280_000, categoryId: FOOD, note });
    await showList(page, '2026-11');
    await expect(rowWith(page, note)).toBeVisible();
    const totalBefore = await monthTotal(page);

    await openEdit(page, note);
    await expect(page.getByLabel('Date')).toHaveValue('2026-11-02');
    await expect(page.getByLabel('Amount')).toHaveValue('280000');
    await expect(page.getByLabel('Category').locator('option:checked')).toHaveText('Food');
    await expect(page.getByLabel('Note')).toHaveValue(note);
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await page.getByLabel('Amount').fill('250000');
    await page.getByLabel('Note').fill(newNote);
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
    await expect(page.getByLabel('Month')).toHaveValue('2026-11');
    await expect(page.getByLabel('Category').locator('option:checked')).toHaveText('All categories');
    await expect(rowWith(page, newNote)).toBeVisible();
    expect(await rowCells(page, newNote)).toEqual(['02/11/2026', 'Food', newNote, '250.000 ₫', 'Edit']);
    await expect.poll(() => monthTotal(page)).toBe(totalBefore - 30_000);
  });

  test('AC-5: a category change moves the amount to the other category in the summary', async ({ page, request }) => {
    const note = uniqueNote('Recategorised');
    await createExpense(request, { date: '2026-11-02', amountMinor: 280_000, categoryId: FOOD, note });
    const summaryRow = async (categoryId: number) => {
      const body = (await (await request.get('/api/v1/summary?month=2026-11')).json()) as {
        items: { categoryId: number; count: number; totalMinor: number }[];
      };
      return body.items.find((item) => item.categoryId === categoryId) ?? { count: 0, totalMinor: 0 };
    };
    const foodBefore = await summaryRow(FOOD);
    const transportBefore = await summaryRow(TRANSPORT);
    await showList(page, '2026-11');

    await openEdit(page, note);
    await page.getByLabel('Category').selectOption({ label: 'Transport' });
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(rowWith(page, note).getByRole('cell').nth(1)).toHaveText('Transport');
    expect(await summaryRow(FOOD)).toMatchObject({
      count: foodBefore.count - 1,
      totalMinor: foodBefore.totalMinor - 280_000,
    });
    expect(await summaryRow(TRANSPORT)).toMatchObject({
      count: transportBefore.count + 1,
      totalMinor: transportBefore.totalMinor + 280_000,
    });
  });

  test('AC-6: a date change shows the new month with "All categories"', async ({ page, request }) => {
    const note = uniqueNote('Moved');
    await createExpense(request, { date: '2026-11-02', amountMinor: 280_000, categoryId: FOOD, note });
    await showList(page, '2026-11', 'Food');

    await openEdit(page, note);
    await page.getByLabel('Date').fill('2026-10-28');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByLabel('Month')).toHaveValue('2026-10');
    await expect(page.getByLabel('Category').locator('option:checked')).toHaveText('All categories');
    await expect(rowWith(page, note)).toBeVisible();
    expect((await rowCells(page, note))[0]).toBe('28/10/2026');
    await page.getByLabel('Month').fill('2026-11');
    await expect(page.getByTestId('month-total')).toBeVisible();
    await expect(rowWith(page, note)).toHaveCount(0);
  });

  test('AC-11: Cancel stores nothing and returns to the previous month and category', async ({ page, request }) => {
    const note = uniqueNote('Unchanged');
    await createExpense(request, { date: '2026-10-20', amountMinor: 45_000, categoryId: FOOD, note });
    await showList(page, '2026-10', 'Food');

    await openEdit(page, note);
    await page.getByLabel('Amount').fill('1000');
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByLabel('Month')).toHaveValue('2026-10');
    await expect(page.getByLabel('Category').locator('option:checked')).toHaveText('Food');
    await expect(rowWith(page, note)).toBeVisible();
    expect((await rowCells(page, note))[3]).toBe('45.000 ₫');
  });

  test('AC-18, AC-19, AC-20, AC-35: deletes after confirmation and restores with "Undo"', async ({ page, request }) => {
    const note = uniqueNote('To delete');
    await createExpense(request, { date: '2026-11-02', amountMinor: 280_000, categoryId: FOOD, note });
    await showList(page, '2026-11', 'Food');
    const totalBefore = await monthTotal(page);

    await openEdit(page, note);
    await page.getByRole('button', { name: 'Delete' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByRole('heading', { name: 'Delete this expense?' })).toBeVisible();
    await expect(dialog).toContainText('02/11/2026 · Food · 280.000');
    await expect(dialog.getByRole('button', { name: 'Keep' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Delete' })).toBeFocused();

    await page.getByRole('button', { name: 'Delete' }).click();
    await dialog.getByRole('button', { name: 'Delete expense' }).click();

    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
    await expect(page.getByLabel('Month')).toHaveValue('2026-11');
    await expect(page.getByLabel('Category').locator('option:checked')).toHaveText('Food');
    const toast = page.getByRole('status');
    await expect(toast).toContainText('Expense deleted.');
    await expect(rowWith(page, note)).toHaveCount(0);
    await expect.poll(() => monthTotal(page)).toBe(totalBefore - 280_000);

    await toast.getByRole('button', { name: 'Undo' }).click();

    await expect(toast).toHaveCount(0);
    await expect(rowWith(page, note)).toBeVisible();
    await expect.poll(() => monthTotal(page)).toBe(totalBefore);
  });

  test('AC-36: without "Undo" the toast closes after 5 seconds and the deletion stays', async ({ page, request }) => {
    const note = uniqueNote('Gone');
    const id = await createExpense(request, { date: '2026-11-02', amountMinor: 10_000, categoryId: FOOD, note });
    await showList(page, '2026-11');

    await openEdit(page, note);
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete expense' }).click();

    await expect(page.getByRole('status')).toContainText('Expense deleted.');
    await expect(page.getByRole('status')).toHaveCount(0, { timeout: 7_000 });
    await expect(rowWith(page, note)).toHaveCount(0);
    expect((await request.get(`/api/v1/expenses/${id}`)).status()).toBe(404);
  });

  test('AC-24: an unknown expense shows "This expense no longer exists." and "Back to expenses"', async ({ page }) => {
    await page.goto('/#/expenses/999999/edit');

    await expect(page.getByRole('alert')).toHaveText('This expense no longer exists.');
    await expect(page.getByLabel('Amount')).toHaveCount(0);
    await page.getByRole('link', { name: 'Back to expenses' }).click();

    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
    await expect(page.getByLabel('Category').locator('option:checked')).toHaveText('All categories');
  });
});
