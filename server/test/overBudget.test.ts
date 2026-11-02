import type { DatabaseSync } from 'node:sqlite';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, insertBudget, insertExpense } from './helpers.js';

const FOOD = 1;
const TRANSPORT = 2;
const HOUSING = 3;
const HEALTH = 4;
const ENTERTAINMENT = 5;

/** Today is 2026-11-02 in all tests (current month 2026-11). */
const now = () => new Date(2026, 10, 2, 9, 30);

type Context = ReturnType<typeof createTestContext>;

function overBudget(context: Context, month: string) {
  return request(context.app).get('/api/v1/budgets/over').query({ month });
}

/** The spec's data for 2026-11: Food 785.000 of 700.000, Entertainment 350.000 of 300.000, Housing 6.500.000 of 6.500.000. */
function seedNovember(db: DatabaseSync): void {
  insertBudget(db, { categoryId: FOOD, fromMonth: '2026-11', amountMinor: 700_000 });
  insertBudget(db, { categoryId: ENTERTAINMENT, fromMonth: '2026-11', amountMinor: 300_000 });
  insertBudget(db, { categoryId: HOUSING, fromMonth: '2026-11', amountMinor: 6_500_000 });
  insertExpense(db, { date: '2026-11-01', amountMinor: 6_500_000, categoryId: HOUSING });
  insertExpense(db, { date: '2026-11-02', amountMinor: 280_000, categoryId: FOOD });
  insertExpense(db, { date: '2026-11-15', amountMinor: 505_000, categoryId: FOOD });
  insertExpense(db, { date: '2026-11-04', amountMinor: 150_000, categoryId: ENTERTAINMENT });
  insertExpense(db, { date: '2026-11-21', amountMinor: 200_000, categoryId: ENTERTAINMENT });
  insertExpense(db, { date: '2026-11-08', amountMinor: 200_000, categoryId: TRANSPORT });
  insertExpense(db, { date: '2026-11-10', amountMinor: 75_000, categoryId: HEALTH });
}

describe('GET /api/v1/budgets/over', () => {
  let context: Context;

  beforeEach(() => {
    context = createTestContext({ now });
  });

  it('AC-1, AC-2: lists the categories over budget, largest amount over first', async () => {
    seedNovember(context.db);

    const res = await overBudget(context, '2026-11');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      month: '2026-11',
      items: [
        { categoryId: FOOD, categoryName: 'Food', spentMinor: 785_000, budgetMinor: 700_000, overMinor: 85_000 },
        {
          categoryId: ENTERTAINMENT,
          categoryName: 'Entertainment',
          spentMinor: 350_000,
          budgetMinor: 300_000,
          overMinor: 50_000,
        },
      ],
    });
  });

  it('AC-3: lists only Food when Entertainment is under its budget', async () => {
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2026-11', amountMinor: 700_000 });
    insertBudget(context.db, { categoryId: ENTERTAINMENT, fromMonth: '2026-11', amountMinor: 300_000 });
    insertExpense(context.db, { date: '2026-11-02', amountMinor: 785_000, categoryId: FOOD });
    insertExpense(context.db, { date: '2026-11-04', amountMinor: 250_000, categoryId: ENTERTAINMENT });

    const res = await overBudget(context, '2026-11');

    expect(res.body.items.map((item: { categoryName: string }) => item.categoryName)).toEqual(['Food']);
  });

  it('AC-4: orders by amount over, largest first', async () => {
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2026-11', amountMinor: 700_000 });
    insertBudget(context.db, { categoryId: ENTERTAINMENT, fromMonth: '2026-11', amountMinor: 300_000 });
    insertExpense(context.db, { date: '2026-11-02', amountMinor: 785_000, categoryId: FOOD });
    insertExpense(context.db, { date: '2026-11-04', amountMinor: 450_000, categoryId: ENTERTAINMENT });

    const res = await overBudget(context, '2026-11');

    expect(res.body.items.map((item: { categoryId: number; overMinor: number }) => [item.categoryId, item.overMinor]))
      .toEqual([
        [ENTERTAINMENT, 150_000],
        [FOOD, 85_000],
      ]);
  });

  it('AC-5: equal amounts over follow the fixed category order', async () => {
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2026-11', amountMinor: 700_000 });
    insertBudget(context.db, { categoryId: ENTERTAINMENT, fromMonth: '2026-11', amountMinor: 300_000 });
    // Entertainment's expense is inserted first so that insertion order cannot explain the result.
    insertExpense(context.db, { date: '2026-11-04', amountMinor: 385_000, categoryId: ENTERTAINMENT });
    insertExpense(context.db, { date: '2026-11-02', amountMinor: 785_000, categoryId: FOOD });

    const res = await overBudget(context, '2026-11');

    expect(res.body.items.map((item: { categoryId: number }) => item.categoryId)).toEqual([FOOD, ENTERTAINMENT]);
  });

  it('AC-6: 1 đồng over the budget is over budget', async () => {
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2026-11', amountMinor: 700_000 });
    insertExpense(context.db, { date: '2026-11-02', amountMinor: 700_001, categoryId: FOOD });

    const res = await overBudget(context, '2026-11');

    expect(res.body.items).toEqual([
      { categoryId: FOOD, categoryName: 'Food', spentMinor: 700_001, budgetMinor: 700_000, overMinor: 1 },
    ]);
  });

  it('AC-7: returns no items when spending equals the budget or the category has no budget', async () => {
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2026-11', amountMinor: 700_000 });
    insertExpense(context.db, { date: '2026-11-02', amountMinor: 700_000, categoryId: FOOD });
    insertExpense(context.db, { date: '2026-11-04', amountMinor: 350_000, categoryId: ENTERTAINMENT });

    const res = await overBudget(context, '2026-11');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ month: '2026-11', items: [] });
  });

  it('AC-8: returns no items when no budget has ever been set', async () => {
    insertExpense(context.db, { date: '2026-11-02', amountMinor: 9_000_000, categoryId: FOOD });

    const res = await overBudget(context, '2026-11');

    expect(res.body).toEqual({ month: '2026-11', items: [] });
  });

  it('AC-9: returns no items for a month without expenses', async () => {
    seedNovember(context.db);

    const res = await overBudget(context, '2026-12');

    expect(res.body).toEqual({ month: '2026-12', items: [] });
  });

  it('AC-10: compares a past month with the budget in effect for it', async () => {
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2026-10', amountMinor: 700_000 });
    insertExpense(context.db, { date: '2026-10-31', amountMinor: 900_000, categoryId: FOOD });
    insertExpense(context.db, { date: '2026-11-01', amountMinor: 50_000, categoryId: FOOD });

    const res = await overBudget(context, '2026-10');

    expect(res.body).toEqual({
      month: '2026-10',
      items: [{ categoryId: FOOD, categoryName: 'Food', spentMinor: 900_000, budgetMinor: 700_000, overMinor: 200_000 }],
    });
  });

  it('AC-11: a budget raised from a later month applies from that month only', async () => {
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2026-11', amountMinor: 700_000 });
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2026-12', amountMinor: 800_000 });
    insertExpense(context.db, { date: '2026-11-02', amountMinor: 785_000, categoryId: FOOD });
    insertExpense(context.db, { date: '2026-12-02', amountMinor: 785_000, categoryId: FOOD });

    const december = await overBudget(context, '2026-12');
    const november = await overBudget(context, '2026-11');

    expect(december.body.items).toEqual([]);
    expect(november.body.items).toEqual([
      { categoryId: FOOD, categoryName: 'Food', spentMinor: 785_000, budgetMinor: 700_000, overMinor: 85_000 },
    ]);
  });

  it('AC-14: a newly recorded expense is included', async () => {
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2026-11', amountMinor: 700_000 });
    insertExpense(context.db, { date: '2026-11-01', amountMinor: 650_000, categoryId: FOOD });
    expect((await overBudget(context, '2026-11')).body.items).toEqual([]);

    await request(context.app)
      .post('/api/v1/expenses')
      .send({ date: '2026-11-02', amountMinor: 100_000, categoryId: FOOD, note: null });
    const res = await overBudget(context, '2026-11');

    expect(res.body.items).toEqual([
      { categoryId: FOOD, categoryName: 'Food', spentMinor: 750_000, budgetMinor: 700_000, overMinor: 50_000 },
    ]);
  });

  it('AC-15: a raised budget is used right away', async () => {
    seedNovember(context.db);

    await request(context.app)
      .put('/api/v1/budgets')
      .send({ month: '2026-11', items: [{ categoryId: FOOD, amountMinor: 800_000 }] });
    const res = await overBudget(context, '2026-11');

    expect(res.body.items.map((item: { categoryName: string }) => item.categoryName)).toEqual(['Entertainment']);
  });

  it('AC-16: expenses dated later in the month count, and neighbouring months do not', async () => {
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2026-10', amountMinor: 700_000 });
    insertExpense(context.db, { date: '2026-10-31', amountMinor: 500_000, categoryId: FOOD });
    insertExpense(context.db, { date: '2026-11-01', amountMinor: 400_000, categoryId: FOOD });
    insertExpense(context.db, { date: '2026-11-28', amountMinor: 400_000, categoryId: FOOD });
    insertExpense(context.db, { date: '2026-12-01', amountMinor: 500_000, categoryId: FOOD });

    const res = await overBudget(context, '2026-11');

    expect(res.body.items).toEqual([
      { categoryId: FOOD, categoryName: 'Food', spentMinor: 800_000, budgetMinor: 700_000, overMinor: 100_000 },
    ]);
  });

  it.each([undefined, '', '2026-13', '2026-1', '11/2026', '2026-11-01'])(
    'rejects month=%j with 400 VALIDATION_ERROR',
    async (month) => {
      const res = await request(context.app)
        .get('/api/v1/budgets/over')
        .query(month === undefined ? {} : { month });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: { code: 'VALIDATION_ERROR', message: 'month is required and must be YYYY-MM' },
      });
    },
  );
});
