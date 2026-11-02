import { expect, test, type Locator, type Page } from '@playwright/test';

type FontStyle = { fontFamily: string; fontSize: string; fontWeight: string; lineHeight: string };

/** Computed font of a form control. */
async function fontOf(locator: Locator): Promise<FontStyle> {
  return locator.evaluate((el) => {
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

test.describe('Note textarea font (QA)', () => {
  test('TC-6: a 200-character Note keeps the design font and the length limit', async ({ page }) => {
    await openAddForm(page);
    const note = page.getByLabel('Note');
    const text = 'Groceries '.repeat(20);

    await note.fill(text);

    await expect(note).toHaveValue(text);
    expect(text).toHaveLength(200);
    expect(await fontOf(note)).toEqual(await fontOf(page.getByLabel('Amount')));
  });

  test('TC-8: Date, Category and Save still inherit the design font family', async ({ page }) => {
    await openAddForm(page);
    const amount = await fontOf(page.getByLabel('Amount'));

    expect(amount.fontFamily).toMatch(/^"?Inter/);
    expect((await fontOf(page.getByLabel('Date'))).fontFamily).toBe(amount.fontFamily);
    expect((await fontOf(page.getByLabel('Category'))).fontFamily).toBe(amount.fontFamily);
    expect((await fontOf(page.getByRole('button', { name: 'Save' }))).fontFamily).toBe(amount.fontFamily);
  });
});
