import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

// QA cases for SPD-3 (specs/SPD-3/test-cases.md). Each test creates its own expenses with a unique note.
const FOOD = 1;
const TRANSPORT = 2;
const NOT_FOUND = 'This expense no longer exists.';

interface ExpenseBody {
  date: string;
  amountMinor: number;
  categoryId: number;
  note?: string | null;
}

let counter = 0;
function uniqueNote(label: string): string {
  counter += 1;
  return `${label} ${Date.now()}-${counter}`;
}

function normalise(text: string | null): string {
  return (text ?? '').replace(/\s/g, ' ').trim();
}

function moneyToNumber(text: string): number {
  return Number(text.replace(/\D/g, ''));
}

function localMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function createExpense(request: APIRequestContext, expense: ExpenseBody): Promise<number> {
  const res = await request.post('/api/v1/expenses', { data: expense });
  expect(res.status()).toBe(201);
  return ((await res.json()) as { id: number }).id;
}

async function getExpense(request: APIRequestContext, id: number) {
  const res = await request.get(`/api/v1/expenses/${id}`);
  return { status: res.status(), body: res.status() === 200 ? await res.json() : null };
}

async function apiMonthTotal(request: APIRequestContext, month: string): Promise<number> {
  const res = await request.get(`/api/v1/expenses?month=${month}`);
  return ((await res.json()) as { monthTotalMinor: number }).monthTotalMinor;
}

async function summaryRow(request: APIRequestContext, month: string, categoryId: number) {
  const body = (await (await request.get(`/api/v1/summary?month=${month}`)).json()) as {
    items: { categoryId: number; count: number; totalMinor: number }[];
  };
  const row = body.items.find((item) => item.categoryId === categoryId);
  return { count: row?.count ?? 0, totalMinor: row?.totalMinor ?? 0 };
}

function rowWith(page: Page, text: string) {
  return page.getByRole('row').filter({ hasText: text });
}

async function rowCells(page: Page, text: string): Promise<string[]> {
  const cells = await rowWith(page, text).getByRole('cell').allTextContents();
  return cells.map(normalise);
}

/** Index of the first data row containing `text`, among all rows of the table. */
async function rowIndex(page: Page, text: string): Promise<number> {
  const rows = await page.getByRole('row').allTextContents();
  return rows.findIndex((row) => row.includes(text));
}

async function monthTotal(page: Page): Promise<number> {
  return moneyToNumber(await page.getByTestId('month-total').innerText());
}

async function showList(page: Page, month: string, category = 'All categories') {
  await page.goto('/');
  await expect(page.getByLabel('Category').locator('option')).toHaveCount(7);
  await page.getByLabel('Month').fill(month);
  await page.getByLabel('Category').selectOption({ label: category });
  await expect(page.getByTestId('month-total')).toContainText('₫');
}

async function openEdit(page: Page, note: string) {
  await expect(rowWith(page, note)).toBeVisible();
  await rowWith(page, note).getByRole('link', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { name: 'Edit expense' })).toBeVisible();
  await expect(page.getByLabel('Amount')).not.toHaveValue('');
}

async function openEditById(page: Page, id: number) {
  await page.goto(`/#/expenses/${id}/edit`);
  await expect(page.getByRole('heading', { name: 'Edit expense' })).toBeVisible();
  await expect(page.getByLabel('Amount')).not.toHaveValue('');
}

async function confirmDelete(page: Page) {
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete expense' }).click();
  await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
}

function countRequests(page: Page, method: string, pattern: RegExp): () => number {
  let count = 0;
  page.on('request', (req) => {
    if (req.method() === method && pattern.test(req.url())) count += 1;
  });
  return () => count;
}

const E = (note: string): ExpenseBody => ({ date: '2026-11-02', amountMinor: 280_000, categoryId: FOOD, note });

test.describe('SPD-3 QA: entry point and edit form', () => {
  test('TC-1 (AC-1): every row has an "Edit" link in a last column without header; an empty month has none', async ({
    page,
    request,
  }) => {
    await createExpense(request, E(uniqueNote('TC-1')));
    await showList(page, '2026-11');

    const table = page.getByRole('table');
    const dataRows = table.getByRole('row').filter({ has: page.getByRole('cell') });
    const rowCount = await dataRows.count();
    expect(rowCount).toBeGreaterThan(0);
    for (let i = 0; i < rowCount; i += 1) {
      await expect(dataRows.nth(i).getByRole('cell').last().getByRole('link', { name: 'Edit' })).toBeVisible();
    }
    await expect(table.getByRole('columnheader').last()).toHaveText('');

    await page.getByLabel('Month').fill('2031-03');
    await expect(page.getByText('No expenses for this month.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0);
  });

  test('TC-2 (AC-2): the Edit expense form is pre-filled with the expense', async ({ page, request }) => {
    const note = uniqueNote('Groceries at Co.opmart');
    const id = await createExpense(request, E(note));
    await showList(page, '2026-11');

    await openEdit(page, note);

    await expect(page).toHaveURL(new RegExp(`#/expenses/${id}/edit$`));
    await expect(page.getByLabel('Date')).toHaveValue('2026-11-02');
    await expect(page.getByLabel('Amount')).toHaveValue('280000');
    await expect(page.getByText('₫', { exact: true })).toBeVisible();
    await expect(page.getByText('Whole đồng, no decimals.')).toBeVisible();
    await expect(page.getByLabel('Category').locator('option:checked')).toHaveText('Food');
    await expect(page.getByLabel('Note')).toHaveValue(note);
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete', exact: true })).toBeVisible();
  });

  test('TC-3 (AC-3): an expense without a note opens with an empty Note field', async ({ page, request }) => {
    const id = await createExpense(request, { date: '2031-02-14', amountMinor: 12_345, categoryId: TRANSPORT });
    await showList(page, '2031-02');

    await page.getByRole('row').filter({ hasText: '12.345' }).getByRole('link', { name: 'Edit' }).click();

    await expect(page).toHaveURL(new RegExp(`#/expenses/${id}/edit$`));
    await expect(page.getByLabel('Amount')).toHaveValue('12345');
    await expect(page.getByLabel('Note')).toHaveValue('');
  });

  test('TC-52: reloading the Edit expense screen shows the same expense again', async ({ page, request }) => {
    const note = uniqueNote('Reload');
    const id = await createExpense(request, E(note));
    await openEditById(page, id);

    await page.reload();

    await expect(page.getByLabel('Note')).toHaveValue(note);
    await expect(page.getByLabel('Amount')).toHaveValue('280000');
  });
});

test.describe('SPD-3 QA: edit and save', () => {
  test('TC-4 (AC-4): saves a new amount and note; id, date and category stay; total 30.000 ₫ lower', async ({
    page,
    request,
  }) => {
    const note = uniqueNote('Groceries at Co.opmart');
    const newNote = uniqueNote('Groceries');
    const id = await createExpense(request, E(note));
    await showList(page, '2026-11', 'Food');
    await page.getByLabel('Category').selectOption({ label: 'All categories' });
    await expect(rowWith(page, note)).toBeVisible();
    const totalBefore = await monthTotal(page);
    await page.getByLabel('Category').selectOption({ label: 'Food' });

    await openEdit(page, note);
    await page.getByLabel('Amount').fill('250000');
    await page.getByLabel('Note').fill(newNote);
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
    await expect(page.getByLabel('Month')).toHaveValue('2026-11');
    await expect(page.getByLabel('Category').locator('option:checked')).toHaveText('All categories');
    await expect(rowWith(page, newNote)).toBeVisible();
    expect(await rowCells(page, newNote)).toEqual(['02/11/2026', 'Food', newNote, '250.000 ₫', 'Edit']);
    await expect.poll(() => monthTotal(page)).toBe(totalBefore - 30_000);
    expect((await getExpense(request, id)).body).toEqual({
      id,
      date: '2026-11-02',
      amountMinor: 250_000,
      categoryId: FOOD,
      note: newNote,
    });
  });

  test('TC-5 (AC-5): a category change lists the expense as Transport and moves it in the summary', async ({
    page,
    request,
  }) => {
    const note = uniqueNote('Recategorised');
    await createExpense(request, E(note));
    const foodBefore = await summaryRow(request, '2026-11', FOOD);
    const transportBefore = await summaryRow(request, '2026-11', TRANSPORT);
    await showList(page, '2026-11');

    await openEdit(page, note);
    await page.getByLabel('Category').selectOption({ label: 'Transport' });
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(rowWith(page, note).getByRole('cell').nth(1)).toHaveText('Transport');
    expect(await summaryRow(request, '2026-11', FOOD)).toEqual({
      count: foodBefore.count - 1,
      totalMinor: foodBefore.totalMinor - 280_000,
    });
    expect(await summaryRow(request, '2026-11', TRANSPORT)).toEqual({
      count: transportBefore.count + 1,
      totalMinor: transportBefore.totalMinor + 280_000,
    });
    await page.getByRole('link', { name: 'Summary' }).click();
    await expect(page.getByRole('heading', { name: /summary/i }).first()).toBeVisible();
  });

  test('TC-6 (AC-6): a date change shows October with "All categories"; both month totals change', async ({
    page,
    request,
  }) => {
    const note = uniqueNote('Moved');
    await createExpense(request, E(note));
    const novBefore = await apiMonthTotal(request, '2026-11');
    const octBefore = await apiMonthTotal(request, '2026-10');
    await showList(page, '2026-11', 'Food');

    await openEdit(page, note);
    await page.getByLabel('Date').fill('2026-10-28');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByLabel('Month')).toHaveValue('2026-10');
    await expect(page.getByLabel('Category').locator('option:checked')).toHaveText('All categories');
    await expect(rowWith(page, note)).toBeVisible();
    expect((await rowCells(page, note))[0]).toBe('28/10/2026');
    await expect.poll(() => monthTotal(page)).toBe(octBefore + 280_000);
    expect(await apiMonthTotal(request, '2026-11')).toBe(novBefore - 280_000);
    await page.getByLabel('Month').fill('2026-11');
    await expect.poll(() => monthTotal(page)).toBe(novBefore - 280_000);
    await expect(rowWith(page, note)).toHaveCount(0);
  });

  test('TC-7 (AC-7): after editing E, F (recorded later, same date) is still listed above E', async ({
    page,
    request,
  }) => {
    const noteE = uniqueNote('Order E');
    const noteF = uniqueNote('Order F');
    await createExpense(request, E(noteE));
    await createExpense(request, { ...E(noteF), amountMinor: 20_000 });
    await showList(page, '2026-11');
    expect(await rowIndex(page, noteF)).toBeLessThan(await rowIndex(page, noteE));

    await openEdit(page, noteE);
    await page.getByLabel('Amount').fill('300000');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(rowWith(page, noteE)).toContainText('300.000');
    expect(await rowIndex(page, noteF)).toBeLessThan(await rowIndex(page, noteE));
  });

  test('TC-8 (AC-8): the note is trimmed; spaces only or empty store null and the row shows no note', async ({
    page,
    request,
  }) => {
    const id = await createExpense(request, { date: '2031-04-03', amountMinor: 271_828, categoryId: FOOD, note: 'x' });

    await openEditById(page, id);
    await page.getByLabel('Note').fill('  Market  ');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
    expect((await getExpense(request, id)).body.note).toBe('Market');

    await openEditById(page, id);
    await page.getByLabel('Note').fill('   ');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
    expect((await getExpense(request, id)).body.note).toBeNull();
    expect(await rowCells(page, '271.828')).toEqual(['03/04/2031', 'Food', '', '271.828 ₫', 'Edit']);

    await openEditById(page, id);
    await page.getByLabel('Note').fill('');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
    expect((await getExpense(request, id)).body.note).toBeNull();
  });

  test('TC-9 (AC-9): Save without changes succeeds and leaves the expense unchanged', async ({ page, request }) => {
    const note = uniqueNote('Unchanged save');
    const id = await createExpense(request, E(note));
    await showList(page, '2026-11', 'Food');

    await openEdit(page, note);
    const put = page.waitForResponse((res) => res.request().method() === 'PUT' && res.url().endsWith(`/expenses/${id}`));
    await page.getByRole('button', { name: 'Save' }).click();

    expect((await put).status()).toBe(200);
    await expect(page.getByLabel('Month')).toHaveValue('2026-11');
    await expect(page.getByLabel('Category').locator('option:checked')).toHaveText('All categories');
    expect(await rowCells(page, note)).toEqual(['02/11/2026', 'Food', note, '280.000 ₫', 'Edit']);
    expect((await getExpense(request, id)).body).toEqual({ id, ...E(note) });
  });

  test('TC-10 (AC-10): a double click on Save sends one update; Save and Delete are disabled meanwhile', async ({
    page,
    request,
  }) => {
    const note = uniqueNote('Double save');
    const id = await createExpense(request, E(note));
    const puts = countRequests(page, 'PUT', new RegExp(`/api/v1/expenses/${id}$`));
    await page.route(`**/api/v1/expenses/${id}`, async (route) => {
      if (route.request().method() === 'PUT') await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    await openEditById(page, id);
    await page.getByLabel('Amount').fill('270000');

    await page.getByRole('button', { name: 'Save' }).dblclick();

    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Delete', exact: true })).toBeDisabled();
    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
    await expect(rowWith(page, note)).toContainText('270.000');
    expect(puts()).toBe(1);
  });

  test('TC-11 (AC-11): Cancel stores nothing, asks nothing and returns to October filtered to Food', async ({
    page,
    request,
  }) => {
    const note = uniqueNote('Cancel edit');
    const id = await createExpense(request, { date: '2026-10-20', amountMinor: 45_000, categoryId: FOOD, note });
    let dialogs = 0;
    page.on('dialog', async (dialog) => {
      dialogs += 1;
      await dialog.dismiss();
    });
    await showList(page, '2026-10', 'Food');

    await openEdit(page, note);
    await page.getByLabel('Amount').fill('1000');
    await page.getByLabel('Note').fill('changed');
    await page.getByLabel('Category').selectOption({ label: 'Health' });
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByLabel('Month')).toHaveValue('2026-10');
    await expect(page.getByLabel('Category').locator('option:checked')).toHaveText('Food');
    expect(await rowCells(page, note)).toEqual(['20/10/2026', 'Food', note, '45.000 ₫', 'Edit']);
    expect((await getExpense(request, id)).body).toEqual({
      id,
      date: '2026-10-20',
      amountMinor: 45_000,
      categoryId: FOOD,
      note,
    });
    expect(dialogs).toBe(0);
  });
});

test.describe('SPD-3 QA: validation', () => {
  test('TC-12 (AC-12): invalid amounts show the banner and the amount message and store nothing', async ({
    page,
    request,
  }) => {
    const note = uniqueNote('Bad amount');
    const id = await createExpense(request, E(note));
    const puts = countRequests(page, 'PUT', /\/api\/v1\/expenses\/\d+$/);
    await openEditById(page, id);

    for (const amount of ['', '0', '-5000', '12,5', '12.5', '280.000']) {
      await page.getByLabel('Amount').fill(amount);
      await page.getByRole('button', { name: 'Save' }).click();

      await expect(page.getByRole('alert')).toHaveText('Please fix the highlighted fields.');
      await expect(page.getByLabel('Amount')).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByText('Enter a whole amount in đồng, greater than 0.')).toBeVisible();
    }

    expect(puts()).toBe(0);
    expect((await getExpense(request, id)).body).toEqual({ id, ...E(note) });
  });

  test('TC-13 (AC-13): an empty date shows "Enter a valid date." and stores nothing', async ({ page, request }) => {
    const note = uniqueNote('No date');
    const id = await createExpense(request, E(note));
    await openEditById(page, id);

    await page.getByLabel('Date').fill('');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('alert')).toHaveText('Please fix the highlighted fields.');
    await expect(page.getByText('Enter a valid date.')).toBeVisible();
    await expect(page.getByLabel('Date')).toHaveAttribute('aria-invalid', 'true');
    expect((await getExpense(request, id)).body).toEqual({ id, ...E(note) });
  });

  test('TC-14 (AC-14): "Choose a category" shows "Choose a category." and stores nothing', async ({
    page,
    request,
  }) => {
    const note = uniqueNote('No category');
    const id = await createExpense(request, E(note));
    await openEditById(page, id);

    await page.getByLabel('Category').selectOption({ label: 'Choose a category' });
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('alert')).toHaveText('Please fix the highlighted fields.');
    await expect(page.getByText('Choose a category.', { exact: true })).toBeVisible();
    expect((await getExpense(request, id)).body).toEqual({ id, ...E(note) });
  });

  test('TC-15 (AC-15): all three invalid show three messages and focus Date', async ({ page, request }) => {
    const id = await createExpense(request, E(uniqueNote('All invalid')));
    await openEditById(page, id);

    await page.getByLabel('Date').fill('');
    await page.getByLabel('Amount').fill('0');
    await page.getByLabel('Category').selectOption({ label: 'Choose a category' });
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Enter a valid date.')).toBeVisible();
    await expect(page.getByText('Enter a whole amount in đồng, greater than 0.')).toBeVisible();
    await expect(page.getByText('Choose a category.', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Date')).toBeFocused();
  });

  test('TC-16 (AC-16): the note accepts at most 200 characters, typed or pasted', async ({ page, request }) => {
    const id = await createExpense(request, E(uniqueNote('Long note')));
    await openEditById(page, id);

    await page.getByLabel('Note').fill('');
    await page.getByLabel('Note').pressSequentially('b'.repeat(205));
    await expect(page.getByLabel('Note')).toHaveValue('b'.repeat(200));

    await page.getByLabel('Note').fill('');
    await page.getByLabel('Note').focus();
    await page.keyboard.insertText('c'.repeat(250));
    await expect(page.getByLabel('Note')).toHaveValue('c'.repeat(200));
  });

  test('TC-17 (AC-17): an amount of 1 is stored and listed as "1 ₫"', async ({ page, request }) => {
    const note = uniqueNote('One dong');
    const id = await createExpense(request, E(note));
    await openEditById(page, id);

    await page.getByLabel('Amount').fill('1');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(rowWith(page, note)).toBeVisible();
    expect((await rowCells(page, note))[3]).toBe('1 ₫');
    expect((await getExpense(request, id)).body.amountMinor).toBe(1);
  });
});

test.describe('SPD-3 QA: delete dialog', () => {
  test('TC-18 (AC-18): Delete opens a modal dialog with focus on "Keep", trapped, and deletes nothing yet', async ({
    page,
    request,
  }) => {
    const id = await createExpense(request, E(uniqueNote('Dialog')));
    await openEditById(page, id);

    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByRole('heading', { name: 'Delete this expense?' })).toBeVisible();
    expect(normalise(await dialog.locator('p').textContent())).toBe(
      '02/11/2026 · Food · 280.000 ₫ will be removed. You can undo this for 5 seconds.',
    );
    const keep = dialog.getByRole('button', { name: 'Keep' });
    const confirm = dialog.getByRole('button', { name: 'Delete expense' });
    await expect(keep).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(confirm).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(keep).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(confirm).toBeFocused();
    await expect(page.getByLabel('Amount').click({ trial: true, timeout: 1000 })).rejects.toThrow();
    expect((await getExpense(request, id)).status).toBe(200);
  });

  test('TC-19 (AC-19): Keep, Escape and a click outside close the dialog, keep the values and focus Delete', async ({
    page,
    request,
  }) => {
    const id = await createExpense(request, E(uniqueNote('Keep')));
    await openEditById(page, id);
    await page.getByLabel('Amount').fill('111');
    const deleteButton = page.getByRole('button', { name: 'Delete', exact: true });
    const dialog = page.getByRole('alertdialog');

    await deleteButton.click();
    await dialog.getByRole('button', { name: 'Keep' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(deleteButton).toBeFocused();

    await deleteButton.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(deleteButton).toBeFocused();

    await deleteButton.click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(dialog).toHaveCount(0);
    await expect(deleteButton).toBeFocused();

    await expect(page.getByLabel('Amount')).toHaveValue('111');
    expect((await getExpense(request, id)).body.amountMinor).toBe(280_000);
  });

  test('TC-20 (AC-20): confirming deletes E, keeps November/Food, lowers the totals and shows the toast', async ({
    page,
    request,
  }) => {
    const note = uniqueNote('Delete me');
    const id = await createExpense(request, E(note));
    const foodBefore = await summaryRow(request, '2026-11', FOOD);
    await showList(page, '2026-11', 'Food');
    await expect(rowWith(page, note)).toBeVisible();
    const totalBefore = await monthTotal(page);

    await openEdit(page, note);
    await confirmDelete(page);

    await expect(page.getByLabel('Month')).toHaveValue('2026-11');
    await expect(page.getByLabel('Category').locator('option:checked')).toHaveText('Food');
    await expect(rowWith(page, note)).toHaveCount(0);
    await expect.poll(() => monthTotal(page)).toBe(totalBefore - 280_000);
    const toast = page.getByRole('status');
    await expect(toast).toContainText('Expense deleted.');
    await expect(toast.getByRole('button', { name: 'Undo' })).toBeVisible();
    expect(await summaryRow(request, '2026-11', FOOD)).toEqual({
      count: foodBefore.count - 1,
      totalMinor: foodBefore.totalMinor - 280_000,
    });
    expect((await getExpense(request, id)).status).toBe(404);
  });

  test('TC-21 (AC-21): deleting the only expense of a month shows the empty month and the toast', async ({
    page,
    request,
  }) => {
    const note = uniqueNote('Only one');
    await createExpense(request, { date: '2031-01-15', amountMinor: 280_000, categoryId: FOOD, note });
    await showList(page, '2031-01');

    await openEdit(page, note);
    await confirmDelete(page);

    await expect(page.getByLabel('Month')).toHaveValue('2031-01');
    await expect(page.getByText('No expenses for this month.')).toBeVisible();
    expect(normalise(await page.getByTestId('month-total').textContent())).toBe('0 ₫');
    await expect(page.getByRole('status')).toContainText('Expense deleted.');
    await expect(page.getByRole('status').getByRole('button', { name: 'Undo' })).toBeVisible();
  });

  test('TC-22 (AC-22): unsaved edits are dropped on delete; Undo restores the values from before the edits', async ({
    page,
    request,
  }) => {
    const note = uniqueNote('Edited then deleted');
    const id = await createExpense(request, E(note));
    await showList(page, '2026-11');

    await openEdit(page, note);
    await page.getByLabel('Amount').fill('1000');
    await page.getByLabel('Note').fill('edited');
    await confirmDelete(page);
    expect((await getExpense(request, id)).status).toBe(404);
    await page.getByRole('status').getByRole('button', { name: 'Undo' }).click();

    await expect(rowWith(page, note)).toBeVisible();
    expect((await getExpense(request, id)).body).toEqual({ id, ...E(note) });
  });

  test('TC-23 (AC-23): while deleting, one request is sent, both buttons are disabled and Escape is ignored', async ({
    page,
    request,
  }) => {
    const note = uniqueNote('Slow delete');
    const id = await createExpense(request, E(note));
    const deletes = countRequests(page, 'DELETE', new RegExp(`/api/v1/expenses/${id}$`));
    await page.route(`**/api/v1/expenses/${id}`, async (route) => {
      if (route.request().method() === 'DELETE') await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    await openEditById(page, id);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    const dialog = page.getByRole('alertdialog');

    await dialog.getByRole('button', { name: 'Delete expense' }).dblclick();

    await expect(dialog.getByRole('button', { name: 'Delete expense' })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'Keep' })).toBeDisabled();
    await page.keyboard.press('Escape');
    await page.mouse.click(5, 5);
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Expense deleted.');
    expect(deletes()).toBe(1);
  });
});

test.describe('SPD-3 QA: not found and errors', () => {
  test('TC-24 (AC-24): an unknown id shows the not-found state; "Back to expenses" opens the current month', async ({
    page,
  }) => {
    await showList(page, '2026-08', 'Housing');
    await page.evaluate(() => {
      window.location.hash = '#/expenses/9999/edit';
    });

    await expect(page.getByRole('heading', { name: 'Edit expense' })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveText(NOT_FOUND);
    await expect(page.getByLabel('Amount')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: 'Back to expenses' }).click();

    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
    await expect(page.getByLabel('Month')).toHaveValue(localMonth());
    await expect(page.getByLabel('Category').locator('option:checked')).toHaveText('All categories');
  });

  test('TC-50 (AC-24): an Edit link with id 0 shows "This expense no longer exists."', async ({ page }) => {
    await page.goto('/#/expenses/0/edit');

    await expect(page.getByRole('heading', { name: 'Edit expense' })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveText(NOT_FOUND);
    await expect(page.getByRole('link', { name: 'Back to expenses' })).toBeVisible();
  });

  test('TC-25 (AC-25): Save or confirmed Delete of an expense deleted elsewhere shows the not-found state', async ({
    page,
    request,
  }) => {
    const first = await createExpense(request, E(uniqueNote('Gone on save')));
    await openEditById(page, first);
    expect((await request.delete(`/api/v1/expenses/${first}`)).status()).toBe(204);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('alert')).toHaveText(NOT_FOUND);
    await expect(page.getByLabel('Amount')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Back to expenses' })).toBeVisible();

    const second = await createExpense(request, E(uniqueNote('Gone on delete')));
    await openEditById(page, second);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    expect((await request.delete(`/api/v1/expenses/${second}`)).status()).toBe(204);
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete expense' }).click();

    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveText(NOT_FOUND);
    await expect(page.getByLabel('Amount')).toHaveCount(0);
  });

  test('TC-26 (AC-26): a 400 from the API keeps the form and shows the API message', async ({ page, request }) => {
    const note = uniqueNote('Api 400');
    const id = await createExpense(request, E(note));
    await page.route(`**/api/v1/expenses/${id}`, (route) =>
      route.request().method() === 'PUT'
        ? route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'categoryId 1 does not exist' } }),
          })
        : route.continue(),
    );
    await openEditById(page, id);
    await page.getByLabel('Amount').fill('250000');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('alert')).toHaveText('categoryId 1 does not exist');
    await expect(page.getByRole('heading', { name: 'Edit expense' })).toBeVisible();
    await expect(page.getByLabel('Amount')).toHaveValue('250000');
    await expect(page.getByLabel('Note')).toHaveValue(note);
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  test('TC-27 (AC-27): network failures on Save and Delete keep the form, the values and the expense', async ({
    page,
    request,
  }) => {
    const note = uniqueNote('Offline');
    const id = await createExpense(request, E(note));
    await page.route(`**/api/v1/expenses/${id}`, (route) =>
      ['PUT', 'DELETE'].includes(route.request().method()) ? route.abort('failed') : route.continue(),
    );
    await openEditById(page, id);
    await page.getByLabel('Amount').fill('250000');

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('alert')).toHaveText('Could not save the expense. Try again.');
    await expect(page.getByLabel('Amount')).toHaveValue('250000');

    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete expense' }).click();

    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveText('Could not delete the expense. Try again.');
    await expect(page.getByLabel('Amount')).toHaveValue('250000');
    await expect(page.getByLabel('Note')).toHaveValue(note);
    expect((await getExpense(request, id)).body).toEqual({ id, ...E(note) });
  });

  test('TC-28 (AC-28): a network failure while loading shows the load error and "Back to expenses"', async ({
    page,
    request,
  }) => {
    const id = await createExpense(request, E(uniqueNote('Load fails')));
    await page.route(`**/api/v1/expenses/${id}`, (route) =>
      route.request().method() === 'GET' ? route.abort('failed') : route.continue(),
    );

    await page.goto(`/#/expenses/${id}/edit`);

    await expect(page.getByRole('heading', { name: 'Edit expense' })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveText('Could not load the expense. Try again.');
    await expect(page.getByLabel('Amount')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Back to expenses' })).toBeVisible();
  });
});

test.describe('SPD-3 QA: undo toast', () => {
  test('TC-35 (AC-35): Undo restores E in its previous position on November/Food and the totals', async ({
    page,
    request,
  }) => {
    const note = uniqueNote('Undo me');
    const id = await createExpense(request, E(note));
    await createExpense(request, { ...E(uniqueNote('Neighbour')), amountMinor: 15_000 });
    const foodBefore = await summaryRow(request, '2026-11', FOOD);
    await showList(page, '2026-11', 'Food');
    await expect(rowWith(page, note)).toBeVisible();
    const indexBefore = await rowIndex(page, note);
    const totalBefore = await monthTotal(page);

    await openEdit(page, note);
    await confirmDelete(page);
    await expect.poll(() => monthTotal(page)).toBe(totalBefore - 280_000);
    await page.getByRole('status').getByRole('button', { name: 'Undo' }).click();

    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(rowWith(page, note)).toBeVisible();
    await expect(page.getByLabel('Month')).toHaveValue('2026-11');
    await expect(page.getByLabel('Category').locator('option:checked')).toHaveText('Food');
    expect(await rowIndex(page, note)).toBe(indexBefore);
    await expect.poll(() => monthTotal(page)).toBe(totalBefore);
    expect((await getExpense(request, id)).body).toEqual({ id, ...E(note) });
    expect(await summaryRow(request, '2026-11', FOOD)).toEqual(foodBefore);
  });

  test('TC-36 (AC-36): without Undo the toast closes after about 5 seconds and the deletion stays', async ({
    page,
    request,
  }) => {
    const note = uniqueNote('Timeout');
    const id = await createExpense(request, E(note));
    await showList(page, '2026-11');
    const totalBefore = await monthTotal(page);

    await openEdit(page, note);
    await confirmDelete(page);
    await expect(page.getByRole('status')).toContainText('Expense deleted.');
    const shownAt = Date.now();
    await expect(page.getByRole('status')).toHaveCount(0, { timeout: 9_000 });
    const elapsed = Date.now() - shownAt;

    expect(elapsed).toBeGreaterThanOrEqual(4_000);
    expect(elapsed).toBeLessThanOrEqual(6_500);
    await expect(rowWith(page, note)).toHaveCount(0);
    expect(await monthTotal(page)).toBe(totalBefore - 280_000);
    expect((await getExpense(request, id)).status).toBe(404);
  });

  test('TC-37 (AC-37): after deleting E and Undo, F (recorded later, same date) is above E again', async ({
    page,
    request,
  }) => {
    const noteE = uniqueNote('Undo order E');
    const noteF = uniqueNote('Undo order F');
    await createExpense(request, E(noteE));
    await createExpense(request, { ...E(noteF), amountMinor: 20_000 });
    await showList(page, '2026-11');

    await openEdit(page, noteE);
    await confirmDelete(page);
    await page.getByRole('status').getByRole('button', { name: 'Undo' }).click();

    await expect(rowWith(page, noteE)).toBeVisible();
    expect(await rowIndex(page, noteF)).toBeLessThan(await rowIndex(page, noteE));
    expect((await rowIndex(page, noteE)) - (await rowIndex(page, noteF))).toBe(1);
  });

  test('TC-38 (AC-38): leaving the list or reloading closes the toast and the deletion stays', async ({
    page,
    request,
  }) => {
    const toast = page.getByRole('status');
    const foodBefore = await summaryRow(request, '2026-11', FOOD);
    const notes = [uniqueNote('Leave summary'), uniqueNote('Leave reload'), uniqueNote('Leave add')];
    const ids = [];
    for (const note of notes) ids.push(await createExpense(request, E(note)));
    const other = uniqueNote('Leave edit other');
    await createExpense(request, E(other));
    const fourth = uniqueNote('Leave edit');
    ids.push(await createExpense(request, E(fourth)));
    await showList(page, '2026-11');

    await openEdit(page, notes[0]);
    await confirmDelete(page);
    await expect(toast).toBeVisible();
    await page.getByRole('link', { name: 'Summary' }).click();
    await expect(toast).toHaveCount(0);
    await page.getByRole('link', { name: 'Expenses' }).click();
    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
    await expect(toast).toHaveCount(0);

    await page.getByLabel('Month').fill('2026-11');
    await openEdit(page, notes[1]);
    await confirmDelete(page);
    await expect(toast).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
    await expect(toast).toHaveCount(0);

    await page.getByLabel('Month').fill('2026-11');
    await openEdit(page, notes[2]);
    await confirmDelete(page);
    await expect(toast).toBeVisible();
    await page.getByRole('button', { name: 'Add expense' }).click();
    await expect(toast).toHaveCount(0);
    await page.getByRole('button', { name: 'Cancel' }).click();

    await openEdit(page, fourth);
    await confirmDelete(page);
    await expect(toast).toBeVisible();
    await rowWith(page, other).getByRole('link', { name: 'Edit' }).click();
    await expect(page.getByRole('heading', { name: 'Edit expense' })).toBeVisible();
    await expect(toast).toHaveCount(0);

    for (const id of ids) expect((await getExpense(request, id)).status).toBe(404);
    expect(await summaryRow(request, '2026-11', FOOD)).toEqual({
      count: foodBefore.count + 1,
      totalMinor: foodBefore.totalMinor + 280_000,
    });
  });

  test('TC-39 (AC-39): while restoring, Undo is disabled, one request is sent and the toast stays past 5 s', async ({
    page,
    request,
  }) => {
    test.setTimeout(45_000);
    const note = uniqueNote('Slow undo');
    const id = await createExpense(request, E(note));
    const restores = countRequests(page, 'POST', new RegExp(`/api/v1/expenses/${id}/restore$`));
    const toast = page.getByRole('status');
    let visibleAfter6s = false;
    let undoDisabledAfter6s = false;
    await page.route(`**/api/v1/expenses/${id}/restore`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 6_000));
      visibleAfter6s = await toast.isVisible();
      undoDisabledAfter6s = await toast.getByRole('button', { name: 'Undo' }).isDisabled();
      await route.continue();
    });
    await showList(page, '2026-11');

    await openEdit(page, note);
    await confirmDelete(page);
    const undo = toast.getByRole('button', { name: 'Undo' });
    await undo.dblclick();
    await expect(undo).toBeDisabled();

    await expect(toast).toHaveCount(0, { timeout: 12_000 });
    expect(visibleAfter6s).toBe(true);
    expect(undoDisabledAfter6s).toBe(true);
    expect(restores()).toBe(1);
    await expect(rowWith(page, note)).toBeVisible();
  });

  test('TC-40 (AC-40): a failed restore shows "Could not restore the expense." without Undo for 5 s', async ({
    page,
    request,
  }) => {
    const note = uniqueNote('Undo fails');
    const id = await createExpense(request, E(note));
    await page.route(`**/api/v1/expenses/${id}/restore`, (route) => route.abort('failed'));
    await showList(page, '2026-11');
    const toast = page.getByRole('status');

    await openEdit(page, note);
    await confirmDelete(page);
    await toast.getByRole('button', { name: 'Undo' }).click();

    await expect(toast).toHaveText('Could not restore the expense.');
    const shownAt = Date.now();
    await expect(toast.getByRole('button', { name: 'Undo' })).toHaveCount(0);
    await expect(toast).toHaveCount(0, { timeout: 9_000 });
    const elapsed = Date.now() - shownAt;
    expect(elapsed).toBeGreaterThanOrEqual(4_000);
    expect(elapsed).toBeLessThanOrEqual(6_500);
    await expect(rowWith(page, note)).toHaveCount(0);
    expect((await getExpense(request, id)).status).toBe(404);
  });

  test('TC-40 (AC-40): a restore answered with a server error also shows "Could not restore the expense."', async ({
    page,
    request,
  }) => {
    const note = uniqueNote('Undo 500');
    const id = await createExpense(request, E(note));
    await page.route(`**/api/v1/expenses/${id}/restore`, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'boom' } }),
      }),
    );
    await showList(page, '2026-11');

    await openEdit(page, note);
    await confirmDelete(page);
    await page.getByRole('status').getByRole('button', { name: 'Undo' }).click();

    await expect(page.getByRole('status')).toHaveText('Could not restore the expense.');
    expect((await getExpense(request, id)).status).toBe(404);
  });

  test('TC-41 (AC-41): the toast is a polite live region and Undo is reachable and usable with the keyboard', async ({
    page,
    request,
  }) => {
    const note = uniqueNote('Keyboard undo');
    const id = await createExpense(request, E(note));
    await showList(page, '2026-11');

    await openEdit(page, note);
    await confirmDelete(page);
    const toast = page.getByRole('status');
    await expect(toast).toContainText('Expense deleted.');
    const live = await toast.getAttribute('aria-live');
    expect(live === null || live === 'polite').toBe(true);

    const undo = toast.getByRole('button', { name: 'Undo' });
    let reached = false;
    for (let i = 0; i < 40 && !reached; i += 1) {
      await page.keyboard.press('Tab');
      reached = await undo.evaluate((el) => el === document.activeElement);
    }
    expect(reached).toBe(true);
    await page.keyboard.press('Enter');

    await expect(toast).toHaveCount(0);
    await expect(rowWith(page, note)).toBeVisible();
    expect((await getExpense(request, id)).status).toBe(200);
  });
});
