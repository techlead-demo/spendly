import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, insertBudget } from './helpers.js';

const FOOD = 1;
const TRANSPORT = 2;
const ENTERTAINMENT = 5;

/** Today is 2026-11-02 in all tests (current month 2026-11). */
const now = () => new Date(2026, 10, 2, 9, 30);

type Context = ReturnType<typeof createTestContext>;

async function budgetsOf(context: Context, month: string): Promise<Record<number, number | null>> {
  const res = await request(context.app).get('/api/v1/budgets').query({ month });
  expect(res.status).toBe(200);
  return Object.fromEntries(
    (res.body.items as { categoryId: number; amountMinor: number | null }[]).map((item) => [
      item.categoryId,
      item.amountMinor,
    ]),
  );
}

function setBudgets(context: Context, body: unknown) {
  return request(context.app).put('/api/v1/budgets').send(body as object);
}

describe('GET /api/v1/budgets', () => {
  let context: Context;

  beforeEach(() => {
    context = createTestContext({ now });
  });

  it('returns all six categories with null when no budget has been set', async () => {
    const res = await request(context.app).get('/api/v1/budgets?month=2026-11');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      month: '2026-11',
      items: [1, 2, 3, 4, 5, 6].map((categoryId) => ({ categoryId, amountMinor: null })),
    });
  });

  it('AC-24: returns the budget in effect per category in the fixed order', async () => {
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2026-11', amountMinor: 700_000 });
    insertBudget(context.db, { categoryId: ENTERTAINMENT, fromMonth: '2026-11', amountMinor: 300_000 });

    const res = await request(context.app).get('/api/v1/budgets?month=2026-12');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      month: '2026-12',
      items: [
        { categoryId: 1, amountMinor: 700_000 },
        { categoryId: 2, amountMinor: null },
        { categoryId: 3, amountMinor: null },
        { categoryId: 4, amountMinor: null },
        { categoryId: 5, amountMinor: 300_000 },
        { categoryId: 6, amountMinor: null },
      ],
    });
  });

  it('AC-24: a budget does not apply to the months before its start month', async () => {
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2026-11', amountMinor: 700_000 });

    expect((await budgetsOf(context, '2026-10'))[FOOD]).toBeNull();
    expect((await budgetsOf(context, '2026-11'))[FOOD]).toBe(700_000);
    expect((await budgetsOf(context, '2030-01'))[FOOD]).toBe(700_000);
  });

  it.each([undefined, '', '2026-13', '2026-1', '11/2026', '2026-11-01'])(
    'AC-25: rejects month=%j with 400 VALIDATION_ERROR',
    async (month) => {
      const res = await request(context.app).get('/api/v1/budgets').query(month === undefined ? {} : { month });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: { code: 'VALIDATION_ERROR', message: 'month is required and must be YYYY-MM' },
      });
    },
  );
});

describe('PUT /api/v1/budgets', () => {
  let context: Context;

  beforeEach(() => {
    context = createTestContext({ now });
  });

  it('AC-4: stores budgets from the month and returns the budgets of that month', async () => {
    const res = await setBudgets(context, {
      month: '2026-11',
      items: [
        { categoryId: FOOD, amountMinor: 700_000 },
        { categoryId: ENTERTAINMENT, amountMinor: 300_000 },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.month).toBe('2026-11');
    expect(res.body.items).toEqual([
      { categoryId: 1, amountMinor: 700_000 },
      { categoryId: 2, amountMinor: null },
      { categoryId: 3, amountMinor: null },
      { categoryId: 4, amountMinor: null },
      { categoryId: 5, amountMinor: 300_000 },
      { categoryId: 6, amountMinor: null },
    ]);
  });

  it('AC-5: budgets carry forward to every later month', async () => {
    await setBudgets(context, { month: '2026-11', items: [{ categoryId: FOOD, amountMinor: 700_000 }] });

    expect((await budgetsOf(context, '2026-12'))[FOOD]).toBe(700_000);
    expect((await budgetsOf(context, '2027-06'))[FOOD]).toBe(700_000);
  });

  it('AC-6, AC-26: a change from a later month leaves earlier months unchanged', async () => {
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2026-11', amountMinor: 700_000 });
    insertBudget(context.db, { categoryId: ENTERTAINMENT, fromMonth: '2026-11', amountMinor: 300_000 });

    const res = await setBudgets(context, { month: '2027-01', items: [{ categoryId: FOOD, amountMinor: 800_000 }] });

    expect(res.status).toBe(200);
    for (const [month, food] of [
      ['2026-11', 700_000],
      ['2026-12', 700_000],
      ['2027-01', 800_000],
      ['2027-02', 800_000],
    ] as const) {
      const budgets = await budgetsOf(context, month);
      expect(budgets[FOOD]).toBe(food);
      expect(budgets[ENTERTAINMENT]).toBe(300_000);
    }
  });

  it('AC-7: a change from an earlier month keeps a budget set from a later month', async () => {
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2026-11', amountMinor: 700_000 });
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2027-01', amountMinor: 800_000 });

    await setBudgets(context, { month: '2026-12', items: [{ categoryId: FOOD, amountMinor: 750_000 }] });

    expect((await budgetsOf(context, '2026-11'))[FOOD]).toBe(700_000);
    expect((await budgetsOf(context, '2026-12'))[FOOD]).toBe(750_000);
    expect((await budgetsOf(context, '2027-01'))[FOOD]).toBe(800_000);
    expect((await budgetsOf(context, '2028-05'))[FOOD]).toBe(800_000);
  });

  it('AC-8, AC-27: null removes the budget from the month onward and keeps earlier months', async () => {
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2026-11', amountMinor: 700_000 });
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2027-01', amountMinor: 800_000 });

    const res = await setBudgets(context, { month: '2027-03', items: [{ categoryId: FOOD, amountMinor: null }] });

    expect(res.status).toBe(200);
    expect((await budgetsOf(context, '2027-02'))[FOOD]).toBe(800_000);
    expect((await budgetsOf(context, '2027-03'))[FOOD]).toBeNull();
    expect((await budgetsOf(context, '2027-04'))[FOOD]).toBeNull();
    expect((await budgetsOf(context, '2028-01'))[FOOD]).toBeNull();
  });

  it('AC-9: a budget set after a removal applies from its own month only', async () => {
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2027-01', amountMinor: 800_000 });
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2027-03', amountMinor: null });

    await setBudgets(context, { month: '2027-05', items: [{ categoryId: FOOD, amountMinor: 600_000 }] });

    expect((await budgetsOf(context, '2027-03'))[FOOD]).toBeNull();
    expect((await budgetsOf(context, '2027-04'))[FOOD]).toBeNull();
    expect((await budgetsOf(context, '2027-05'))[FOOD]).toBe(600_000);
    expect((await budgetsOf(context, '2029-01'))[FOOD]).toBe(600_000);
  });

  it('AC-11: categories missing from the request keep their budgets', async () => {
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2026-11', amountMinor: 700_000 });

    await setBudgets(context, { month: '2026-11', items: [{ categoryId: ENTERTAINMENT, amountMinor: 200_000 }] });

    expect((await budgetsOf(context, '2026-11'))[FOOD]).toBe(700_000);
    expect((await budgetsOf(context, '2027-11'))[FOOD]).toBe(700_000);
  });

  it('AC-15: accepts 1 đồng', async () => {
    const res = await setBudgets(context, { month: '2026-11', items: [{ categoryId: FOOD, amountMinor: 1 }] });

    expect(res.status).toBe(200);
    expect((await budgetsOf(context, '2026-11'))[FOOD]).toBe(1);
  });

  it('AC-28: rejects a month before the current month and stores nothing', async () => {
    const res = await setBudgets(context, { month: '2026-10', items: [{ categoryId: FOOD, amountMinor: 700_000 }] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'month must be the current month (2026-11) or later' },
    });
    expect((await budgetsOf(context, '2026-10'))[FOOD]).toBeNull();
    expect((await budgetsOf(context, '2030-01'))[FOOD]).toBeNull();
  });

  it('AC-28: accepts the current month', async () => {
    const res = await setBudgets(context, { month: '2026-11', items: [{ categoryId: FOOD, amountMinor: 700_000 }] });

    expect(res.status).toBe(200);
  });

  it.each<[string, { month: string | undefined; amountMinor: unknown; categoryId?: number }]>([
    ['amountMinor 0', { month: '2026-12', amountMinor: 0 }],
    ['amountMinor -1', { month: '2026-12', amountMinor: -1 }],
    ['amountMinor 12.5', { month: '2026-12', amountMinor: 12.5 }],
    ['amountMinor "700000"', { month: '2026-12', amountMinor: '700000' }],
    ['amountMinor above 9007199254740991', { month: '2026-12', amountMinor: 9007199254740992 }],
    ['unknown categoryId', { month: '2026-12', amountMinor: 500_000, categoryId: 99 }],
    ['month 2026-13', { month: '2026-13', amountMinor: 500_000 }],
    ['month 2026-1', { month: '2026-1', amountMinor: 500_000 }],
    ['month 11/2026', { month: '11/2026', amountMinor: 500_000 }],
    ['missing month', { month: undefined, amountMinor: 500_000 }],
  ])('AC-29: rejects %s with 400 VALIDATION_ERROR and stores no budget of the request', async (_, invalid) => {
    const res = await setBudgets(context, {
      month: invalid.month,
      items: [
        { categoryId: FOOD, amountMinor: 700_000 },
        { categoryId: invalid.categoryId ?? TRANSPORT, amountMinor: invalid.amountMinor },
      ],
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const budgets = await budgetsOf(context, '2027-01');
    expect(budgets[FOOD]).toBeNull();
    expect(budgets[TRANSPORT]).toBeNull();
  });

  it.each([
    ['a body that is not an object', []],
    ['missing items', { month: '2026-12' }],
    ['empty items', { month: '2026-12', items: [] }],
    ['a duplicate category', {
      month: '2026-12',
      items: [
        { categoryId: FOOD, amountMinor: 1 },
        { categoryId: FOOD, amountMinor: 2 },
      ],
    }],
    ['a categoryId that is not a positive integer', { month: '2026-12', items: [{ categoryId: '1', amountMinor: 1 }] }],
  ])('rejects %s with 400 VALIDATION_ERROR', async (_, body) => {
    const res = await setBudgets(context, body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
