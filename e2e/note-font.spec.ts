import { expect, test, type Page } from '@playwright/test';

const FOOD = 1;

type FontStyle = { fontFamily: string; fontSize: string; fontWeight: string; lineHeight: string };

/** Computed font of the form control with the given label. */
async function fontOf(page: Page, label: string): Promise<FontStyle> {
  return page.getByLabel(label).evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
    };
  });
}

async function openAddForm(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add expense' }).click();
  await expect(page.getByRole('heading', { name: 'Add expense' })).toBeVisible();
  await expect(page.getByLabel('Category').locator('option')).toHaveCount(7);
}

test.describe('Note textarea font', () => {
  test('AC-1, AC-5: the Note textarea uses the Amount input font family, not monospace', async ({ page }) => {
    await openAddForm(page);

    const note = await fontOf(page, 'Note');
    const amount = await fontOf(page, 'Amount');
    expect(amount.fontFamily).toMatch(/^"?Inter/);
    expect(note.fontFamily).toBe(amount.fontFamily);
    expect(note.fontFamily).not.toBe('monospace');
  });

  test('AC-2: the Note textarea has the Amount input font size, weight and line height', async ({ page }) => {
    await openAddForm(page);

    const note = await fontOf(page, 'Note');
    const amount = await fontOf(page, 'Amount');
    expect(note.fontSize).toBe('15px');
    expect(note.fontWeight).toBe('400');
    expect(note).toEqual(amount);
  });

  test('AC-3: the Note textarea of the Edit expense form matches the Amount input font', async ({ page, request }) => {
    const text = `Groceries at Co.opmart ${Date.now()}`;
    const res = await request.post('/api/v1/expenses', {
      data: { date: '2026-11-02', amountMinor: 280_000, categoryId: FOOD, note: text },
    });
    expect(res.status()).toBe(201);
    await page.goto('/');
    await page.getByLabel('Month').fill('2026-11');
    await expect(page.getByTestId('month-total')).toContainText('₫');

    await page.getByRole('row').filter({ hasText: text }).getByRole('link', { name: 'Edit' }).click();
    await expect(page.getByRole('heading', { name: 'Edit expense' })).toBeVisible();
    await expect(page.getByLabel('Note')).toHaveValue(text);

    expect(await fontOf(page, 'Note')).toEqual(await fontOf(page, 'Amount'));
  });

  test('AC-4: in the validation-error state the Note textarea keeps the Amount input font family', async ({ page }) => {
    await openAddForm(page);
    await page.getByLabel('Amount').fill('');
    await page.getByLabel('Note').fill('Taxi');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('alert')).toHaveText('Please fix the highlighted fields.');

    const note = await fontOf(page, 'Note');
    const amount = await fontOf(page, 'Amount');
    expect(note.fontFamily).toBe(amount.fontFamily);
    expect(note.fontFamily).not.toBe('monospace');
  });
});
