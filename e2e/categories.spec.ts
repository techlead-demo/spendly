import { expect, test, type Page } from '@playwright/test';

/** Unique category name per test run: names are unique (BR-23) and the database is shared by all tests. */
function uniqueName(label: string): string {
  return `${label} ${Date.now() % 1_000_000}`;
}

function rowWith(page: Page, text: string) {
  return page.getByRole('row').filter({ hasText: text });
}

async function openCategories(page: Page) {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('link', { name: 'Categories' }).click();
  await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();
  await expect(rowWith(page, 'Food')).toBeVisible();
}

async function addCategory(page: Page, name: string) {
  await page.getByLabel('New category').fill(name);
  await page.getByRole('button', { name: 'Add category' }).click();
  await expect(rowWith(page, name.trim())).toBeVisible();
}

async function categoryOptions(page: Page): Promise<string[]> {
  return page.getByLabel('Category').locator('option').allTextContents();
}

async function openAddExpense(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add expense' }).click();
  await expect(page.getByLabel('Category').locator('option').nth(1)).toBeAttached();
}

async function recordExpense(page: Page, values: { date: string; amount: string; category: string; note: string }) {
  await openAddExpense(page);
  await page.getByLabel('Date').fill(values.date);
  await page.getByLabel('Amount').fill(values.amount);
  await page.getByLabel('Category').selectOption({ label: values.category });
  await page.getByLabel('Note').fill(values.note);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(rowWith(page, values.note)).toBeVisible();
}

test.describe('categories', () => {
  test('AC-1, AC-2, AC-3: the header opens the Categories screen with the default categories', async ({ page }) => {
    await page.goto('/#/summary');
    const nav = page.getByRole('navigation');
    await expect(nav.getByRole('link')).toHaveText(['Expenses', 'Summary', 'Budgets', 'Categories']);

    await nav.getByRole('link', { name: 'Categories' }).click();

    await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Categories' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByLabel('New category')).toHaveAttribute('placeholder', 'e.g. Pets');
    await expect(page.getByRole('columnheader')).toHaveText(['Name', 'Expenses', 'Status', '']);
    const food = rowWith(page, 'Food').getByRole('cell');
    await expect(food.nth(2)).toHaveText('Active');
    await expect(food.nth(3)).toHaveText('Rename · Retire');
    // The sample data has Food expenses.
    expect(Number(await food.nth(1).innerText())).toBeGreaterThan(0);
  });

  test('AC-5, AC-6, AC-7: an added category is kept, offered last in the Add expense form and usable', async ({ page }) => {
    const name = uniqueName('Coffee');
    const note = `${name} expense`;
    await openCategories(page);

    await addCategory(page, `  ${name}  `);

    await expect(page.getByLabel('New category')).toHaveValue('');
    await expect(rowWith(page, name).getByRole('cell')).toHaveText([name, '0', 'Active', 'Rename · Retire']);
    await page.reload();
    await expect(rowWith(page, name)).toBeVisible();

    await openAddExpense(page);
    const options = await categoryOptions(page);
    expect(options.slice(0, 7)).toEqual(['Choose a category', 'Food', 'Transport', 'Housing', 'Health', 'Entertainment', 'Other']);
    expect(options.at(-1)).toBe(name);
    await page.getByRole('button', { name: 'Cancel' }).click();

    await recordExpense(page, { date: '2026-10-20', amount: '35000', category: name, note });
    await expect(rowWith(page, note).getByRole('cell').nth(1)).toHaveText(name);
  });

  test('AC-9, AC-8: a duplicate or empty name is rejected under the field', async ({ page }) => {
    await openCategories(page);

    await page.getByLabel('New category').fill('food');
    await page.getByRole('button', { name: 'Add category' }).click();

    await expect(page.getByText('A category named "food" already exists.')).toBeVisible();
    await expect(page.getByLabel('New category')).toHaveAttribute('aria-invalid', 'true');

    await page.getByLabel('New category').fill('  ');
    await page.getByRole('button', { name: 'Add category' }).click();
    await expect(page.getByText('Enter a category name.')).toBeVisible();
  });

  test('AC-13: a renamed category shows its new name on past expenses, in the filter and in the summary', async ({
    page,
  }) => {
    const name = uniqueName('Snacks');
    const renamed = uniqueName('Treats');
    const note = `${name} expense`;
    await openCategories(page);
    await addCategory(page, name);
    await recordExpense(page, { date: '2026-10-21', amount: '42000', category: name, note });

    await openCategories(page);
    await rowWith(page, name).getByRole('button', { name: 'Rename' }).click();
    const input = page.getByRole('textbox', { name: 'Category name' });
    await expect(input).toBeFocused();
    await input.fill(renamed);
    await input.press('Enter');
    await expect(rowWith(page, renamed).getByRole('cell')).toHaveText([renamed, '1', 'Active', 'Rename · Retire']);

    await page.getByRole('navigation').getByRole('link', { name: 'Expenses' }).click();
    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
    await page.getByLabel('Month').fill('2026-10');
    await expect(rowWith(page, note).getByRole('cell').nth(1)).toHaveText(renamed);
    expect(await categoryOptions(page)).toContain(renamed);

    // Wait for the Summary screen so the month is not typed into the list's Month field before it unmounts.
    await page.getByRole('navigation').getByRole('link', { name: 'Summary' }).click();
    await expect(page.getByRole('heading', { name: 'Summary' })).toBeVisible();
    await page.getByLabel('Month').fill('2026-10');
    await expect(rowWith(page, renamed)).toBeVisible();
  });

  test('AC-18 to AC-22: a retired category keeps its expenses everywhere and can be restored', async ({ page }) => {
    const name = uniqueName('Gym');
    const note = `${name} session`;
    await openCategories(page);
    await addCategory(page, name);
    await recordExpense(page, { date: '2026-10-15', amount: '120000', category: name, note });

    await openCategories(page);
    await rowWith(page, name).getByRole('button', { name: 'Retire' }).click();

    // AC-18: no confirmation; the row moves to the end (retired part) with its count.
    await expect(page.getByRole('row').last().getByRole('cell')).toHaveText([name, '1', 'Retired', 'Rename · Restore']);

    // AC-19: not offered for a new expense.
    await openAddExpense(page);
    expect(await categoryOptions(page)).not.toContain(name);

    // AC-20: still listed and offered by the category filter (the month total is covered by the API tests).
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
    await page.getByLabel('Month').fill('2026-10');
    await expect(rowWith(page, note).getByRole('cell').nth(1)).toHaveText(name);
    await page.getByLabel('Category').selectOption({ label: name });
    await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1);
    await expect(rowWith(page, note)).toBeVisible();

    // AC-21: still a row in the monthly summary.
    await page.goto('/#/summary');
    await expect(page.getByRole('heading', { name: 'Summary' })).toBeVisible();
    await page.getByLabel('Month').fill('2026-10');
    await expect(rowWith(page, name)).toContainText('1');

    // AC-22: restore puts it back and the Add expense form offers it again.
    await openCategories(page);
    await rowWith(page, name).getByRole('button', { name: 'Restore' }).click();
    await expect(rowWith(page, name).getByRole('cell').nth(2)).toHaveText('Active');
    await openAddExpense(page);
    expect(await categoryOptions(page)).toContain(name);
  });
});
