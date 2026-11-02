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

test.describe('monthly summary (QA)', () => {
  test('TC-1 (AC-1): the active link is underlined and "Categories" is not shown', async ({ page }) => {
    await page.goto('/#/summary');
    const nav = page.getByRole('navigation');

    await expect(page.getByRole('banner')).toHaveText(/^\s*Spendly\s*Expenses\s*Summary\s*$/);
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
