import type { DatabaseSync } from 'node:sqlite';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, insertBudget, insertExpense } from './helpers.js';

// QA tests for SPD-5. Cases already covered by server/test/overBudget.test.ts are not repeated here.

const FOOD = 1;
const TRANSPORT = 2;
const HOUSING = 3;
const HEALTH = 4;
const ENTERTAINMENT = 5;
const OTHER = 6;

/** Today is 2026-11-02 (current month 2026-11). */
const now = () => new Date(2026, 10, 2, 9, 30);

type Context = ReturnType<typeof createTestContext>;

function overBudget(context: Context, month: string) {
  return request(context.app).get('/api/v1/budgets/over').query({ month });
}

/** The spec's default data for 2026-11. */
function seedDefault(db: DatabaseSync): void {
  insertBudget(db, { categoryId: FOOD, fromMonth: '2026-11', amountMinor: 700_000 });
  insertBudget(db, { categoryId: ENTERTAINMENT, fromMonth: '2026-11', amountMinor: 300_000 });
  insertBudget(db, { categoryId: HOUSING, fromMonth: '2026-11', amountMinor: 6_500_000 });
  insertExpense(db, { date: '2026-11-01', amountMinor: 6_500_000, categoryId: HOUSING });
  insertExpense(db, { date: '2026-11-02', amountMinor: 785_000, categoryId: FOOD });
  insertExpense(db, { date: '2026-11-04', amountMinor: 350_000, categoryId: ENTERTAINMENT });
  insertExpense(db, { date: '2026-11-08', amountMinor: 200_000, categoryId: TRANSPORT });
  insertExpense(db, { date: '2026-11-10', amountMinor: 75_000, categoryId: HEALTH });
}

describe('GET /api/v1/budgets/over (QA)', () => {
  let context: Context;

  beforeEach(() => {
    context = createTestContext({ now });
  });

  it('TC-3 (AC-2): does not list a category equal to its budget or a category without a budget', async () => {
    seedDefault(context.db);

    const res = await overBudget(context, '2026-11');

    const ids = res.body.items.map((item: { categoryId: number }) => item.categoryId);
    expect(ids).not.toContain(HOUSING);
    expect(ids).not.toContain(TRANSPORT);
    expect(ids).not.toContain(HEALTH);
    expect(ids).not.toContain(OTHER);
    expect(ids).toEqual([FOOD, ENTERTAINMENT]);
  });

  it('TC-6 (AC-5): equal amounts over follow the category order even when the later category spent more', async () => {
    // Both 85.000 over; Entertainment has the larger total, so only the fixed category order puts Food first.
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2026-11', amountMinor: 100_000 });
    insertBudget(context.db, { categoryId: ENTERTAINMENT, fromMonth: '2026-11', amountMinor: 300_000 });
    insertExpense(context.db, { date: '2026-11-04', amountMinor: 385_000, categoryId: ENTERTAINMENT });
    insertExpense(context.db, { date: '2026-11-02', amountMinor: 185_000, categoryId: FOOD });

    const res = await overBudget(context, '2026-11');

    expect(res.body.items.map((item: { categoryId: number; overMinor: number }) => [item.categoryId, item.overMinor]))
      .toEqual([
        [FOOD, 85_000],
        [ENTERTAINMENT, 85_000],
      ]);
  });

  it('TC-17 (AC-16): an expense dated 2026-11-28 counts towards the 2026-11 total', async () => {
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2026-11', amountMinor: 700_000 });
    insertExpense(context.db, { date: '2026-11-02', amountMinor: 600_000, categoryId: FOOD });
    insertExpense(context.db, { date: '2026-11-28', amountMinor: 185_000, categoryId: FOOD });

    const res = await overBudget(context, '2026-11');

    expect(res.body).toEqual({
      month: '2026-11',
      items: [{ categoryId: FOOD, categoryName: 'Food', spentMinor: 785_000, budgetMinor: 700_000, overMinor: 85_000 }],
    });
  });

  it('TC-21: counts the first and last day of the month and not the neighbouring months', async () => {
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2026-10', amountMinor: 100_000 });
    insertExpense(context.db, { date: '2026-10-31', amountMinor: 500_000, categoryId: FOOD });
    insertExpense(context.db, { date: '2026-11-01', amountMinor: 60_000, categoryId: FOOD });
    insertExpense(context.db, { date: '2026-11-30', amountMinor: 60_000, categoryId: FOOD });
    insertExpense(context.db, { date: '2026-12-01', amountMinor: 500_000, categoryId: FOOD });

    const res = await overBudget(context, '2026-11');

    expect(res.body.items).toEqual([
      { categoryId: FOOD, categoryName: 'Food', spentMinor: 120_000, budgetMinor: 100_000, overMinor: 20_000 },
    ]);
  });

  it('TC-24: a budget removed from a month onward means no limit in that month (BR-16, BR-17)', async () => {
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2026-10', amountMinor: 100_000 });
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2026-11', amountMinor: null });
    insertExpense(context.db, { date: '2026-10-15', amountMinor: 500_000, categoryId: FOOD });
    insertExpense(context.db, { date: '2026-11-15', amountMinor: 500_000, categoryId: FOOD });

    const november = await overBudget(context, '2026-11');
    const october = await overBudget(context, '2026-10');

    expect(november.body).toEqual({ month: '2026-11', items: [] });
    expect(october.body.items.map((item: { categoryId: number }) => item.categoryId)).toEqual([FOOD]);
  });

  it('TC-9 (AC-8): returns no items for any month when no budget was ever set', async () => {
    insertExpense(context.db, { date: '2026-10-15', amountMinor: 9_000_000, categoryId: FOOD });
    insertExpense(context.db, { date: '2027-01-15', amountMinor: 9_000_000, categoryId: OTHER });

    const october = await overBudget(context, '2026-10');
    const january = await overBudget(context, '2027-01');

    expect(october.body).toEqual({ month: '2026-10', items: [] });
    expect(january.body).toEqual({ month: '2027-01', items: [] });
  });

  it('TC-20: rejects month=2026-00 with 400 VALIDATION_ERROR', async () => {
    const res = await overBudget(context, '2026-00');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
