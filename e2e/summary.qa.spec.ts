import { expect, test, type Page } from '@playwright/test';

// QA journeys for SPD-2 (specs/SPD-2/test-cases.md). Sample data dates are relative to today, so expected
// values are derived from GET /api/v1/expenses for the same month instead of being hard-coded.

const CATEGORY_NAMES = ['Food', 'Transport', 'Housing', 'Health', 'Entertainment', 'Other'];
const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const shareFormat = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const normalize = (s: string) => s.replace(/\s/g, ' ');

function monthOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function previousMonth(): string {
  const today = new Date();
  return monthOf(new Date(today.getFullYear(), today.getMonth() - 1, 1));
}

/** BR-15 share, rounded half up to one decimal, computed independently of the app. */
function share(part: number, total: number): string {
  const tenths = Math.floor((part * 2000 + total) / (2 * total));
  return `${shareFormat.format(tenths / 10)}%`;
}

async function bodyRows(page: Page): Promise<string[][]> {
  const rows = page.getByRole('table').locator('tbody tr');
  const count = await rows.count();
  const result: string[][] = [];
  for (let i = 0; i < count; i += 1) {
    result.push((await rows.nth(i).getByRole('cell').allTextContents()).map(normalize));
  }
  return result;
}

type SummaryOnScreen = {
  rows: Record<string, { count: number; total: number }>;
  monthCount: number;
  monthTotal: number;
};

const digits = (s: string) => Number(s.replace(/\D/g, ''));

/** Picks `month` on the Summary screen, waits for its response, and reads the rows and the footer. */
async function summaryOf(page: Page, month: string): Promise<SummaryOnScreen> {
  if ((await page.getByLabel('Month').inputValue()) !== month) {
    const response = page.waitForResponse((r) => r.url().includes(`/api/v1/summary?month=${month}`));
    await page.getByLabel('Month').fill(month);
    await response;
  }
  await expect(page.getByRole('table').or(page.getByText('No expenses for this month.'))).toBeVisible();
  if ((await page.getByRole('table').count()) === 0) return { rows: {}, monthCount: 0, monthTotal: 0 };
  const rows: SummaryOnScreen['rows'] = {};
  for (const [name, count, total] of await bodyRows(page)) {
    rows[name!] = { count: Number(count), total: digits(total!) };
  }
  const footer = await page.getByRole('table').locator('tfoot tr').getByRole('cell').allTextContents();
  return { rows, monthCount: Number(footer[1]), monthTotal: digits(footer[2]!) };
}

async function addExpense(page: Page, values: { date: string; amount: string; category: string }) {
  await page.getByRole('button', { name: 'Add expense' }).click();
  await expect(page.getByLabel('Category').locator('option')).toHaveCount(7);
  await page.getByLabel('Date').fill(values.date);
  await page.getByLabel('Amount').fill(values.amount);
  await page.getByLabel('Category').selectOption({ label: values.category });
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
  await expect(page.getByLabel('Month')).toHaveValue(values.date.slice(0, 7));
}

test.describe('monthly summary (QA)', () => {
  test('TC-1 (AC-1): the active link is underlined and "Categories" is not shown', async ({ page }) => {
    await page.goto('/#/summary');
    const nav = page.getByRole('navigation');

    // SPD-4 AC-1 adds the "Budgets" link after "Summary".
    await expect(page.getByRole('banner')).toHaveText(/^\s*Spendly\s*Expenses\s*Summary\s*Budgets\s*$/);
    await expect(nav.getByRole('link', { name: 'Categories' })).toHaveCount(0);
    const active = nav.getByRole('link', { name: 'Summary' });
    await expect(active).toHaveAttribute('aria-current', 'page');
    await expect(active).toHaveCSS('border-bottom-style', 'solid');
    await expect(nav.getByRole('link', { name: 'Expenses' })).toHaveCSS('border-bottom-style', 'none');
  });

  test('TC-10 (AC-3, AC-4, AC-5, AC-6, AC-7, AC-17): picking the previous month shows its per-category summary', async ({
    page,
    request,
  }) => {
    const month = previousMonth();
    const list = await (await request.get(`/api/v1/expenses?month=${month}`)).json();
    const groups = new Map<number, { count: number; total: number }>();
    for (const e of list.items as { categoryId: number; amountMinor: number }[]) {
      const g = groups.get(e.categoryId) ?? { count: 0, total: 0 };
      groups.set(e.categoryId, { count: g.count + 1, total: g.total + e.amountMinor });
    }
    const expected = [...groups.entries()]
      .sort(([idA, a], [idB, b]) => b.total - a.total || idA - idB)
      .map(([id, g]) => [
        CATEGORY_NAMES[id - 1]!,
        String(g.count),
        normalize(money.format(g.total)),
        share(g.total, list.monthTotalMinor),
      ]);
    expect(expected.length).toBeGreaterThan(0);

    await page.goto('/#/summary');
    await expect(page.getByRole('table')).toBeVisible();
    const summaryRequest = page.waitForRequest((r) => r.url().includes(`/api/v1/summary?month=${month}`));
    await page.getByLabel('Month').fill(month);
    await summaryRequest;

    await expect.poll(() => bodyRows(page)).toEqual(expected);
    const footer = (await page.getByRole('table').locator('tfoot tr').getByRole('cell').allTextContents()).map(
      normalize,
    );
    expect(footer).toEqual([
      'Month total',
      String(list.items.length),
      normalize(money.format(list.monthTotalMinor)),
      '100,0%',
    ]);
  });

  test('TC-15 (AC-11): shows "Loading…" until the summary arrives', async ({ page }) => {
    let release: () => void = () => {};
    const released = new Promise<void>((r) => (release = r));
    await page.route('**/api/v1/summary?**', async (route) => {
      await released;
      await route.continue();
    });

    await page.goto('/#/summary');

    await expect(page.getByText('Loading…')).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);
    release();
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByText('Loading…')).toHaveCount(0);
  });

  test('TC-16 (AC-12): shows the error alert and no table when the API is unreachable', async ({ page }) => {
    await page.route('**/api/v1/summary?**', (route) => route.abort('connectionrefused'));

    await page.goto('/#/summary');

    await expect(page.getByRole('alert')).toHaveText('Could not load the summary. Try again.');
    await expect(page.getByRole('table')).toHaveCount(0);
  });

  test('TC-16 (AC-12): shows the error alert when the API answers 500', async ({ page }) => {
    await page.route('**/api/v1/summary?**', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } }),
      }),
    );

    await page.goto('/#/summary');

    await expect(page.getByRole('alert')).toHaveText('Could not load the summary. Try again.');
    await expect(page.getByRole('table')).toHaveCount(0);
  });

  test('TC-11 (AC-8): Food 30.000 ₫ recorded on the form raises the 2026-11 Food row and month total', async ({
    page,
  }) => {
    await page.goto('/#/summary');
    await expect(page.getByLabel('Month')).toHaveValue('2026-11');
    await expect(page.getByRole('table')).toBeVisible();
    const before = await summaryOf(page, '2026-11');

    await page.getByRole('navigation').getByRole('link', { name: 'Expenses' }).click();
    await addExpense(page, { date: '2026-11-02', amount: '30000', category: 'Food' });
    await page.getByRole('navigation').getByRole('link', { name: 'Summary' }).click();

    await expect(page.getByLabel('Month')).toHaveValue('2026-11');
    await expect.poll(() => summaryOf(page, '2026-11')).toEqual({
      rows: {
        ...before.rows,
        Food: { count: (before.rows.Food?.count ?? 0) + 1, total: (before.rows.Food?.total ?? 0) + 30_000 },
      },
      monthCount: before.monthCount + 1,
      monthTotal: before.monthTotal + 30_000,
    });
  });

  test('TC-29 (AC-7): an expense recorded on 2026-10-31 counts in October, not in November', async ({ page }) => {
    await page.goto('/#/summary');
    await expect(page.getByRole('table')).toBeVisible();
    const novBefore = await summaryOf(page, '2026-11');
    const octBefore = await summaryOf(page, '2026-10');

    await page.getByRole('navigation').getByRole('link', { name: 'Expenses' }).click();
    await addExpense(page, { date: '2026-10-31', amount: '7777', category: 'Entertainment' });
    await page.getByRole('navigation').getByRole('link', { name: 'Summary' }).click();
    await expect(page.getByRole('table')).toBeVisible();

    expect(await summaryOf(page, '2026-11')).toEqual(novBefore);
    const ent = octBefore.rows.Entertainment ?? { count: 0, total: 0 };
    expect(await summaryOf(page, '2026-10')).toEqual({
      rows: { ...octBefore.rows, Entertainment: { count: ent.count + 1, total: ent.total + 7777 } },
      monthCount: octBefore.monthCount + 1,
      monthTotal: octBefore.monthTotal + 7777,
    });
  });

  test('TC-30 (AC-2): leaving the Add expense form via "Summary" and back via "Expenses" opens the list', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add expense' }).click();
    await expect(page.getByRole('heading', { name: 'Add expense' })).toBeVisible();

    await page.getByRole('navigation').getByRole('link', { name: 'Summary' }).click();
    await expect(page.getByRole('heading', { name: 'Summary' })).toBeVisible();
    await expect(page.getByLabel('Month')).toHaveValue('2026-11');
    await page.getByRole('navigation').getByRole('link', { name: 'Expenses' }).click();

    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
    await expect(page.getByLabel('Month')).toHaveValue('2026-11');
    await expect(page.getByTestId('month-total')).toBeVisible();
  });

  test('TC-17 (AC-13): clearing the month keeps the summary and sends no request', async ({ page }) => {
    await page.goto('/#/summary');
    await expect(page.getByRole('table')).toBeVisible();
    const before = await bodyRows(page);
    const requests: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/api/v1/summary')) requests.push(r.url());
    });

    await page.getByLabel('Month').fill('');
    await page.waitForLoadState('networkidle');

    await expect(page.getByLabel('Month')).toHaveValue('');
    await expect(page.getByRole('table')).toBeVisible();
    expect(await bodyRows(page)).toEqual(before);
    expect(requests).toEqual([]);
  });
});
