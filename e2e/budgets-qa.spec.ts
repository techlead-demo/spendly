import { expect, test, type Page } from '@playwright/test';

// QA journeys for SPD-4 (specs/SPD-4/test-cases.md). The API runs on a shared in-memory database, so tests that
// write budgets either use their own far-future year or set every value they assert on.

/** The local month `offset` months from today, "YYYY-MM". */
function monthFromNow(offset = 0): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function freshYear(): number {
  return 3000 + Math.floor(Math.random() * 5000);
}

function budgetField(page: Page, category: string) {
  return page.getByRole('textbox', { name: `${category} budget` });
}

async function openBudgets(page: Page) {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('link', { name: 'Budgets' }).click();
  await expect(page.getByRole('heading', { name: 'Budgets' })).toBeVisible();
  await expect(budgetField(page, 'Food')).toBeVisible();
}

async function selectMonth(page: Page, month: string) {
  const loaded = page.waitForResponse((res) => res.url().includes(`/api/v1/budgets?month=${month}`));
  await page.getByLabel('Month').fill(month);
  await loaded;
  await expect(budgetField(page, 'Food')).toBeVisible();
}

async function save(page: Page) {
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Budgets saved.')).toBeVisible();
}

test.describe('SPD-4 QA: budgets', () => {
  test('TC-1 (AC-1), TC-2 (AC-2): header links, active link, Budgets opens on the current month from every screen', async ({
    page,
  }) => {
    await page.goto('/');
    const header = page.getByRole('banner');
    const nav = page.getByRole('navigation');
    await expect(header).toContainText('Spendly');
    // SPD-6 AC-1 adds the "Categories" link last.
    await expect(nav.getByRole('link')).toHaveText(['Expenses', 'Summary', 'Budgets', 'Categories']);
    await expect(nav.getByRole('link', { name: 'Expenses' })).toHaveAttribute('aria-current', 'page');

    await nav.getByRole('link', { name: 'Summary' }).click();
    await expect(nav.getByRole('link', { name: 'Summary' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Expenses' })).not.toHaveAttribute('aria-current', 'page');

    await nav.getByRole('link', { name: 'Budgets' }).click();
    await expect(page.getByRole('heading', { name: 'Budgets' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Budgets' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByLabel('Month')).toHaveValue(monthFromNow());
    await expect(page.getByLabel('Month')).toHaveAttribute('min', monthFromNow());

    // From the Add expense form.
    await nav.getByRole('link', { name: 'Expenses' }).click();
    await page.getByRole('button', { name: 'Add expense' }).click();
    await nav.getByRole('link', { name: 'Budgets' }).click();
    await expect(page.getByRole('heading', { name: 'Budgets' })).toBeVisible();
    await expect(page.getByLabel('Month')).toHaveValue(monthFromNow());
  });

  test('TC-40: Budgets and the SPD-2 Summary screen live side by side in the header navigation', async ({ page }) => {
    const nav = page.getByRole('navigation');
    await page.goto('/#/budgets');
    await expect(page.getByRole('heading', { name: 'Budgets' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Budgets' })).toHaveAttribute('aria-current', 'page');
    await expect(budgetField(page, 'Food')).toBeVisible();

    await nav.getByRole('link', { name: 'Summary' }).click();
    await expect(page.getByRole('heading', { name: 'Summary' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Budgets' })).toHaveCount(0);
    await expect(page.getByLabel('Month')).toHaveValue(monthFromNow());
    await expect(nav.getByRole('link', { name: 'Summary' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Budgets' })).not.toHaveAttribute('aria-current', 'page');

    await page.getByLabel('Month').fill(monthFromNow(3));
    await nav.getByRole('link', { name: 'Budgets' }).click();
    await expect(page.getByRole('heading', { name: 'Budgets' })).toBeVisible();
    await expect(page.getByLabel('Month')).toHaveValue(monthFromNow());
    await expect(budgetField(page, 'Food')).toBeVisible();

    await page.goto('/#/nope');
    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Expenses' })).toHaveAttribute('aria-current', 'page');
  });

  test('TC-3 (AC-3): six category rows in order with "No limit", "₫" and the hint', async ({ page }) => {
    await openBudgets(page);

    const rows = page.getByRole('row');
    await expect(rows).toHaveCount(7);
    await expect(page.getByRole('columnheader')).toHaveText(['Category', 'Monthly budget']);
    const names = ['Food', 'Transport', 'Housing', 'Health', 'Entertainment', 'Other'];
    for (const [index, name] of names.entries()) {
      await expect(rows.nth(index + 1).getByRole('cell').first()).toHaveText(name);
      await expect(budgetField(page, name)).toHaveAttribute('placeholder', 'No limit');
      await expect(rows.nth(index + 1)).toContainText('₫');
    }
    await expect(
      page.getByText(
        'A budget applies to this month and every later month until you change it. Leave it empty for no limit.',
      ),
    ).toBeVisible();
  });

  test('TC-4 (AC-4, AC-5): budgets of the current month survive a reload and carry forward', async ({ page }) => {
    await openBudgets(page);
    const others = ['Transport', 'Housing', 'Health', 'Other'];
    const before: Record<string, string> = {};
    for (const name of others) before[name] = await budgetField(page, name).inputValue();

    await budgetField(page, 'Food').fill('700000');
    await budgetField(page, 'Entertainment').fill('300000');
    await save(page);
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Budgets' })).toBeVisible();
    await expect(page.getByLabel('Month')).toHaveValue(monthFromNow());
    await expect(budgetField(page, 'Food')).toHaveValue('700000');
    await expect(budgetField(page, 'Entertainment')).toHaveValue('300000');
    for (const name of others) await expect(budgetField(page, name)).toHaveValue(before[name] ?? '');

    for (const offset of [1, 7]) {
      await selectMonth(page, monthFromNow(offset));
      await expect(budgetField(page, 'Food')).toHaveValue('700000');
      await expect(budgetField(page, 'Entertainment')).toHaveValue('300000');
    }
  });

  test('TC-11 (AC-10): Save without changes shows "Budgets saved." and changes nothing', async ({ page }) => {
    const month = `${freshYear()}-04`;
    await openBudgets(page);
    await selectMonth(page, month);
    await budgetField(page, 'Food').fill('700000');
    await save(page);
    await page.reload();
    await selectMonth(page, month);
    const puts: string[] = [];
    page.on('request', (req) => {
      if (req.method() === 'PUT' && req.url().includes('/api/v1/budgets')) puts.push(req.postData() ?? '');
    });

    await save(page);

    await page.reload();
    await selectMonth(page, month);
    await expect(budgetField(page, 'Food')).toHaveValue('700000');
    expect(puts.filter((body) => (JSON.parse(body) as { items: unknown[] }).items.length > 0)).toEqual([]);
  });

  test('TC-10 (AC-6, AC-7, AC-8, AC-9, AC-11): the spec chain through the screen', async ({ page }) => {
    const y = freshYear();
    const m = (n: number) => `${y + Math.floor((n - 1) / 12)}-${String(((n - 1) % 12) + 1).padStart(2, '0')}`;
    // m(1)..: AC-4 month = m(1), "2026-12" = m(2), "2027-01" = m(3), ..., "2027-05" = m(7).
    await openBudgets(page);
    await selectMonth(page, m(1));
    await budgetField(page, 'Food').fill('700000');
    await budgetField(page, 'Entertainment').fill('300000');
    await save(page);

    // AC-6
    await selectMonth(page, m(3));
    await budgetField(page, 'Food').fill('800000');
    await save(page);
    for (const [n, food] of [
      [1, '700000'],
      [2, '700000'],
      [3, '800000'],
      [4, '800000'],
    ] as const) {
      await selectMonth(page, m(n));
      await expect(budgetField(page, 'Food')).toHaveValue(food);
      await expect(budgetField(page, 'Entertainment')).toHaveValue('300000');
    }

    // AC-7 then AC-11 (only Entertainment changed in m(2))
    await selectMonth(page, m(2));
    await budgetField(page, 'Food').fill('750000');
    await save(page);
    await budgetField(page, 'Entertainment').fill('310000');
    await save(page);
    for (const [n, food] of [
      [1, '700000'],
      [2, '750000'],
      [3, '800000'],
      [20, '800000'],
    ] as const) {
      await selectMonth(page, m(n));
      await expect(budgetField(page, 'Food')).toHaveValue(food);
    }

    // AC-8
    await selectMonth(page, m(5));
    await budgetField(page, 'Food').fill('');
    await save(page);
    for (const [n, food] of [
      [4, '800000'],
      [5, ''],
      [6, ''],
      [15, ''],
    ] as const) {
      await selectMonth(page, m(n));
      await expect(budgetField(page, 'Food')).toHaveValue(food);
    }

    // AC-9
    await selectMonth(page, m(7));
    await budgetField(page, 'Food').fill('600000');
    await save(page);
    for (const [n, food] of [
      [5, ''],
      [6, ''],
      [7, '600000'],
      [30, '600000'],
    ] as const) {
      await selectMonth(page, m(n));
      await expect(budgetField(page, 'Food')).toHaveValue(food);
    }
  });

  test('TC-16 (AC-15), TC-17 (AC-16): 1 đồng and a value with spaces are stored', async ({ page }) => {
    const month = `${freshYear()}-06`;
    await openBudgets(page);
    await selectMonth(page, month);

    await budgetField(page, 'Food').fill('1');
    await budgetField(page, 'Transport').fill('  700000  ');
    await budgetField(page, 'Housing').fill('   ');
    await save(page);
    await page.reload();
    await selectMonth(page, month);

    await expect(budgetField(page, 'Food')).toHaveValue('1');
    await expect(budgetField(page, 'Transport')).toHaveValue('700000');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('TC-13 (AC-12): "700.000" is rejected and nothing of the form is stored', async ({ page }) => {
    const month = `${freshYear()}-08`;
    await openBudgets(page);
    await selectMonth(page, month);
    const otherBefore = await budgetField(page, 'Other').inputValue();

    await budgetField(page, 'Food').fill('700.000');
    await budgetField(page, 'Other').fill('123456');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('alert')).toHaveText('Please fix the highlighted fields.');
    await expect(budgetField(page, 'Food')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Enter a whole amount in đồng, greater than 0.')).toBeVisible();
    await expect(page.getByText('Budgets saved.')).toHaveCount(0);
    await page.reload();
    await selectMonth(page, month);
    await expect(budgetField(page, 'Other')).toHaveValue(otherBefore);
  });

  test('TC-18 (AC-17): the previous month is read-only and shows the budgets in effect then', async ({ page, request }) => {
    const previous = monthFromNow(-1);
    const api = await request.get(`/api/v1/budgets?month=${previous}`);
    const food = ((await api.json()) as { items: { amountMinor: number | null }[] }).items[0]?.amountMinor ?? null;
    await openBudgets(page);

    await selectMonth(page, previous);

    await expect(budgetField(page, 'Food')).toHaveValue(food === null ? '' : String(food));
    for (const name of ['Food', 'Transport', 'Housing', 'Health', 'Entertainment', 'Other']) {
      await expect(budgetField(page, name)).toBeDisabled();
    }
    await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0);
    await expect(page.getByText('Past months cannot be changed.')).toBeVisible();
    await expect(page.getByText(/A budget applies to this month/)).toHaveCount(0);
  });

  test('TC-20 (AC-19), TC-21 (AC-20): month change discards edits; a cleared month keeps the data, no request', async ({
    page,
  }) => {
    const y = freshYear();
    await openBudgets(page);
    await selectMonth(page, `${y}-01`);
    await budgetField(page, 'Health').fill('90000');
    await save(page);

    await budgetField(page, 'Health').fill('12345');
    await selectMonth(page, `${y}-02`);
    await expect(budgetField(page, 'Health')).toHaveValue('90000');

    const requests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/v1/budgets')) requests.push(req.url());
    });
    await page.getByLabel('Month').fill('');
    await expect(budgetField(page, 'Health')).toHaveValue('90000');
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByText('Loading…')).toHaveCount(0);
    expect(requests).toEqual([]);
  });

  test('TC-23 (AC-22): a failing budgets request shows the load error and no table', async ({ page }) => {
    await page.route('**/api/v1/budgets?*', (route) => route.abort('connectionrefused'));
    await page.goto('/#/budgets');

    await expect(page.getByRole('alert')).toHaveText('Could not load the budgets. Try again.');
    await expect(page.getByRole('table')).toHaveCount(0);
  });

  test('TC-24 (AC-23): a 500 on save shows the save error above the table and keeps the edits', async ({ page }) => {
    const month = `${freshYear()}-09`;
    await openBudgets(page);
    await selectMonth(page, month);
    await page.route('**/api/v1/budgets', (route) =>
      route.request().method() === 'PUT'
        ? route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } }),
          })
        : route.continue(),
    );

    await budgetField(page, 'Food').fill('654321');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('alert')).toHaveText('Could not save the budgets. Try again.');
    await expect(budgetField(page, 'Food')).toHaveValue('654321');
    await expect(page.getByText('Budgets saved.')).toHaveCount(0);
  });
});
