import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * A far-future year for the test's own budgets and expenses, so that the sample data and other tests do not
 * change its category totals. Budgets of other tests may carry forward into it, so each test sets the budget
 * of every category it spends in.
 */
function freshYear(): number {
  return 3000 + Math.floor(Math.random() * 5000);
}

async function setBudgets(request: APIRequestContext, month: string, items: [number, number | null][]) {
  const res = await request.put('/api/v1/budgets', {
    data: { month, items: items.map(([categoryId, amountMinor]) => ({ categoryId, amountMinor })) },
  });
  expect(res.ok()).toBe(true);
}

async function addExpense(request: APIRequestContext, date: string, amountMinor: number, categoryId: number) {
  const res = await request.post('/api/v1/expenses', { data: { date, amountMinor, categoryId, note: null } });
  expect(res.status()).toBe(201);
}

async function showMonth(page: Page, month: string) {
  const loaded = page.waitForResponse((res) => res.url().includes(`/api/v1/budgets/over?month=${month}`));
  await page.getByLabel('Month').fill(month);
  await loaded;
  await expect(page.getByLabel('Month')).toHaveValue(month);
}

function banner(page: Page) {
  return page.getByRole('alert');
}

async function bannerLines(page: Page): Promise<string[]> {
  const lines = await banner(page).getByRole('listitem').allTextContents();
  return lines.map((line) => line.replace(/\s/g, ' '));
}

const FOOD = 1;
const TRANSPORT = 2;
const HOUSING = 3;
const ENTERTAINMENT = 5;

test.describe('over-budget warning', () => {
  test('AC-1, AC-2, AC-10, AC-12, AC-15: lists the categories over budget for the selected month', async ({
    page,
    request,
  }) => {
    const y = freshYear();
    const month = `${y}-01`;
    await setBudgets(request, month, [
      [FOOD, 700_000],
      [TRANSPORT, null],
      [HOUSING, 6_500_000],
      [ENTERTAINMENT, 300_000],
    ]);
    await addExpense(request, `${month}-01`, 6_500_000, HOUSING);
    await addExpense(request, `${month}-02`, 280_000, FOOD);
    await addExpense(request, `${month}-15`, 505_000, FOOD);
    await addExpense(request, `${month}-04`, 350_000, ENTERTAINMENT);
    await addExpense(request, `${month}-08`, 200_000, TRANSPORT);

    await page.goto('/');
    await showMonth(page, month);

    await expect(banner(page)).toContainText(`2 categories are over budget in 01/${y}`);
    expect(await bannerLines(page)).toEqual([
      'Food: 785.000 ₫ spent of 700.000 ₫ budget, 85.000 ₫ over',
      'Entertainment: 350.000 ₫ spent of 300.000 ₫ budget, 50.000 ₫ over',
    ]);
    const bannerBox = await banner(page).boundingBox();
    const monthBox = await page.getByLabel('Month').boundingBox();
    expect(bannerBox!.y).toBeLessThan(monthBox!.y);

    // AC-12: the category filter does not change the banner.
    await page.getByLabel('Category').selectOption({ label: 'Transport' });
    await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1);
    await expect(banner(page)).toContainText(`2 categories are over budget in 01/${y}`);
    expect(await bannerLines(page)).toHaveLength(2);

    // AC-15: raising the Food budget on the Budgets screen removes Food from the banner.
    await page.getByRole('link', { name: 'Budgets' }).click();
    await expect(page.getByRole('heading', { name: 'Budgets' })).toBeVisible();
    const budgetsLoaded = page.waitForResponse((res) => res.url().includes(`/api/v1/budgets?month=${month}`));
    await page.getByLabel('Month').fill(month);
    await budgetsLoaded;
    await page.getByRole('textbox', { name: 'Food budget' }).fill('800000');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Budgets saved.')).toBeVisible();
    await page.getByRole('link', { name: 'Expenses' }).click();
    await showMonth(page, month);

    await expect(banner(page)).toContainText(`1 category is over budget in 01/${y}`);
    expect(await bannerLines(page)).toEqual(['Entertainment: 350.000 ₫ spent of 300.000 ₫ budget, 50.000 ₫ over']);
  });

  test('AC-7, AC-14: no banner until a new expense takes Food over its budget', async ({ page, request }) => {
    const y = freshYear();
    const month = `${y}-02`;
    await setBudgets(request, month, [[FOOD, 700_000]]);
    await addExpense(request, `${month}-01`, 650_000, FOOD);

    await page.goto('/');
    await showMonth(page, month);
    await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1);
    await expect(banner(page)).toHaveCount(0);

    await page.getByRole('button', { name: 'Add expense' }).click();
    await expect(page.getByLabel('Category').locator('option')).toHaveCount(7);
    await page.getByLabel('Date').fill(`${month}-02`);
    await page.getByLabel('Amount').fill('100000');
    await page.getByLabel('Category').selectOption({ label: 'Food' });
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByLabel('Month')).toHaveValue(month);
    await expect(banner(page)).toContainText(`1 category is over budget in 02/${y}`);
    expect(await bannerLines(page)).toEqual(['Food: 750.000 ₫ spent of 700.000 ₫ budget, 50.000 ₫ over']);
  });
});
