import { expect, test, type Page } from '@playwright/test';

/** The local current month, "YYYY-MM", as the app computes it. */
function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * A far-future year for the test's own budget records. Budgets of other tests (or earlier runs on a reused server)
 * may still carry forward into it, so tests compare categories they do not set with the value shown before.
 */
function freshYear(): number {
  return 3000 + Math.floor(Math.random() * 5000);
}

function budgetField(page: Page, category: string) {
  return page.getByRole('textbox', { name: `${category} budget` });
}

async function openBudgets(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Budgets' }).click();
  await expect(page.getByRole('heading', { name: 'Budgets' })).toBeVisible();
  await expect(budgetField(page, 'Food')).toBeVisible();
}

async function selectMonth(page: Page, month: string) {
  const loaded = page.waitForResponse((res) => res.url().includes(`/api/v1/budgets?month=${month}`));
  await page.getByLabel('Month').fill(month);
  await loaded;
  await expect(page.getByLabel('Month')).toHaveValue(month);
  await expect(budgetField(page, 'Food')).toBeVisible();
}

async function expectFood(page: Page, month: string, value: string) {
  await selectMonth(page, month);
  await expect(budgetField(page, 'Food')).toHaveValue(value);
}

async function save(page: Page) {
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Budgets saved.')).toBeVisible();
}

test.describe('budgets', () => {
  test('AC-1, AC-2, AC-3: the header links to the Budgets screen on the current month', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation');
    await expect(nav.getByRole('link')).toHaveText(['Expenses', 'Summary', 'Budgets']);
    await expect(nav.getByRole('link', { name: 'Expenses' })).toHaveAttribute('aria-current', 'page');

    await openBudgets(page);

    await expect(nav.getByRole('link', { name: 'Budgets' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByLabel('Month')).toHaveValue(currentMonth());
    await expect(page.getByRole('row')).toHaveCount(7);
    await expect(page.getByRole('row').nth(1)).toContainText('Food');
    await expect(page.getByRole('row').nth(6)).toContainText('Other');
    await expect(budgetField(page, 'Food')).toHaveAttribute('placeholder', 'No limit');
  });

  test('AC-4 to AC-9: budgets carry forward until changed or removed from a later month', async ({ page }) => {
    const y = freshYear();
    await openBudgets(page);

    // AC-4
    await selectMonth(page, `${y}-01`);
    const transportBefore = await budgetField(page, 'Transport').inputValue();
    await budgetField(page, 'Food').fill('700000');
    await budgetField(page, 'Entertainment').fill('300000');
    await save(page);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Budgets' })).toBeVisible();
    await selectMonth(page, `${y}-01`);
    await expect(budgetField(page, 'Food')).toHaveValue('700000');
    await expect(budgetField(page, 'Entertainment')).toHaveValue('300000');
    await expect(budgetField(page, 'Transport')).toHaveValue(transportBefore);

    // AC-5
    await expectFood(page, `${y}-02`, '700000');
    await expectFood(page, `${y}-12`, '700000');
    await expect(budgetField(page, 'Entertainment')).toHaveValue('300000');

    // AC-6
    await selectMonth(page, `${y}-03`);
    await budgetField(page, 'Food').fill('800000');
    await save(page);
    await expectFood(page, `${y}-01`, '700000');
    await expectFood(page, `${y}-02`, '700000');
    await expectFood(page, `${y}-04`, '800000');
    await expect(budgetField(page, 'Entertainment')).toHaveValue('300000');

    // AC-7
    await selectMonth(page, `${y}-02`);
    await budgetField(page, 'Food').fill('750000');
    await save(page);
    await expectFood(page, `${y}-01`, '700000');
    await expectFood(page, `${y}-02`, '750000');
    await expectFood(page, `${y}-03`, '800000');

    // AC-8
    await selectMonth(page, `${y}-05`);
    await budgetField(page, 'Food').fill('');
    await save(page);
    await expectFood(page, `${y}-04`, '800000');
    await expectFood(page, `${y}-06`, '');
    await expectFood(page, `${y}-11`, '');

    // AC-9
    await selectMonth(page, `${y}-07`);
    await budgetField(page, 'Food').fill('600000');
    await save(page);
    await expectFood(page, `${y}-05`, '');
    await expectFood(page, `${y}-06`, '');
    await expectFood(page, `${y}-08`, '600000');
  });

  test('AC-12, AC-13, AC-14: invalid budgets are highlighted and nothing is saved until fixed', async ({ page }) => {
    const month = `${freshYear()}-01`;
    await openBudgets(page);
    await selectMonth(page, month);
    const foodBefore = await budgetField(page, 'Food').inputValue();
    const healthBefore = await budgetField(page, 'Health').inputValue();

    await budgetField(page, 'Food').fill('12,5');
    await budgetField(page, 'Transport').fill('0');
    await budgetField(page, 'Health').fill('90000');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('alert')).toHaveText('Please fix the highlighted fields.');
    await expect(page.getByText('Enter a whole amount in đồng, greater than 0.')).toHaveCount(2);
    await expect(budgetField(page, 'Food')).toBeFocused();
    await page.reload();
    await expectFood(page, month, foodBefore);
    await expect(budgetField(page, 'Health')).toHaveValue(healthBefore);

    await budgetField(page, 'Food').fill('700001');
    await budgetField(page, 'Transport').fill('1');
    await save(page);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.reload();
    await expectFood(page, month, '700001');
    await expect(budgetField(page, 'Transport')).toHaveValue('1');
  });

  test('AC-17: a past month is read-only', async ({ page }) => {
    await openBudgets(page);

    await selectMonth(page, '2020-01');

    await expect(page.getByText('Past months cannot be changed.')).toBeVisible();
    await expect(budgetField(page, 'Food')).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0);
  });
});
