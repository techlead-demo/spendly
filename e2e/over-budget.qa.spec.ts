import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

// QA journeys for SPD-5 (specs/SPD-5/test-cases.md) on the current month, so the "this month" heading is shown.
// Sample data and other tests change the current month's totals, so expected values are derived from
// GET /api/v1/summary. Every category's budget for the current month is set by the test and removed afterwards.

const FOOD = 1;
const ENTERTAINMENT = 5;
const ALL_CATEGORY_IDS = [1, 2, 3, 4, 5, 6];
const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const normalize = (s: string) => s.replace(/\s/g, ' ');
const fmt = (n: number) => normalize(money.format(n));

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function currentMonth(): string {
  return today().slice(0, 7);
}

async function totalOf(request: APIRequestContext, categoryId: number): Promise<number> {
  const res = await request.get(`/api/v1/summary?month=${currentMonth()}`);
  const body = (await res.json()) as { items: { categoryId: number; totalMinor: number }[] };
  return body.items.find((item) => item.categoryId === categoryId)?.totalMinor ?? 0;
}

/** Sets the given budgets from the current month and removes every other category's budget. */
async function setOnlyBudgets(request: APIRequestContext, budgets: Record<number, number>) {
  const items = ALL_CATEGORY_IDS.map((categoryId) => ({ categoryId, amountMinor: budgets[categoryId] ?? null }));
  const res = await request.put('/api/v1/budgets', { data: { month: currentMonth(), items } });
  expect(res.ok()).toBe(true);
}

async function addExpenseApi(request: APIRequestContext, amountMinor: number, categoryId: number) {
  const res = await request.post('/api/v1/expenses', {
    data: { date: today(), amountMinor, categoryId, note: 'SPD-5 QA' },
  });
  expect(res.status()).toBe(201);
}

async function openList(page: Page) {
  const loaded = page.waitForResponse((res) => res.url().includes(`/api/v1/budgets/over?month=${currentMonth()}`));
  await page.goto('/');
  await loaded;
  await expect(page.getByLabel('Month')).toHaveValue(currentMonth());
}

async function bannerLines(page: Page): Promise<string[]> {
  return (await page.getByRole('alert').getByRole('listitem').allTextContents()).map(normalize);
}

test.describe('over-budget warning on the current month (QA)', () => {
  test.afterEach(async ({ request }) => {
    await setOnlyBudgets(request, {});
  });

  test('TC-15 (AC-14): recording a Food expense with Add expense brings up the banner', async ({ page, request }) => {
    const food = await totalOf(request, FOOD);
    await setOnlyBudgets(request, { [FOOD]: food + 50_000 });

    await openList(page);
    await expect(page.getByTestId('month-total')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);

    await page.getByRole('button', { name: 'Add expense' }).click();
    await expect(page.getByLabel('Category').locator('option')).toHaveCount(7);
    await page.getByLabel('Date').fill(today());
    await page.getByLabel('Amount').fill('100000');
    await page.getByLabel('Category').selectOption({ label: 'Food' });
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByLabel('Month')).toHaveValue(currentMonth());
    await expect(page.getByRole('alert')).toContainText('1 category is over budget this month');
    expect(await bannerLines(page)).toEqual([
      `Food: ${fmt(food + 100_000)} spent of ${fmt(food + 50_000)} budget, ${fmt(50_000)} over`,
    ]);
  });

  test('TC-13 (AC-12), TC-16 (AC-15): filter keeps the banner; raising Food on Budgets leaves only Entertainment', async ({
    page,
    request,
  }) => {
    await addExpenseApi(request, 100_000, FOOD);
    await addExpenseApi(request, 100_000, ENTERTAINMENT);
    const food = await totalOf(request, FOOD);
    const entertainment = await totalOf(request, ENTERTAINMENT);
    await setOnlyBudgets(request, { [FOOD]: food - 85_000, [ENTERTAINMENT]: entertainment - 50_000 });
    const foodLine = `Food: ${fmt(food)} spent of ${fmt(food - 85_000)} budget, ${fmt(85_000)} over`;
    const entertainmentLine =
      `Entertainment: ${fmt(entertainment)} spent of ${fmt(entertainment - 50_000)} budget, ${fmt(50_000)} over`;

    await openList(page);
    await expect(page.getByRole('alert')).toContainText('2 categories are over budget this month');
    expect(await bannerLines(page)).toEqual([foodLine, entertainmentLine]);
    const bannerBox = await page.getByRole('alert').boundingBox();
    const categoryBox = await page.getByLabel('Category').boundingBox();
    expect(bannerBox!.y + bannerBox!.height).toBeLessThanOrEqual(categoryBox!.y);

    // AC-12: filtering on Transport changes the list, not the banner.
    await page.getByLabel('Category').selectOption({ label: 'Transport' });
    await expect(page.getByRole('table').locator('tbody tr').filter({ hasText: 'SPD-5 QA' })).toHaveCount(0);
    await expect(page.getByRole('alert')).toContainText('2 categories are over budget this month');
    expect(await bannerLines(page)).toEqual([foodLine, entertainmentLine]);

    // AC-15: raise Food above its total on the Budgets screen (opens on the current month).
    await page.getByRole('link', { name: 'Budgets' }).click();
    await expect(page.getByLabel('Month')).toHaveValue(currentMonth());
    await page.getByRole('textbox', { name: 'Food budget' }).fill(String(food + 100_000));
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Budgets saved.')).toBeVisible();
    const reloaded = page.waitForResponse((res) => res.url().includes(`/api/v1/budgets/over?month=${currentMonth()}`));
    await page.getByRole('link', { name: 'Expenses' }).click();
    await reloaded;

    await expect(page.getByRole('alert')).toContainText('1 category is over budget this month');
    expect(await bannerLines(page)).toEqual([entertainmentLine]);
  });
});
