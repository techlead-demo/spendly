import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestContext, insertExpense } from './helpers.js';

// QA tests for SPD-4 (specs/SPD-4/test-cases.md). Every budget is written through the API, as a user would.

const FOOD = 1;
const TRANSPORT = 2;
const HOUSING = 3;
const ENTERTAINMENT = 5;
const MAX_SAFE = 9007199254740991;

/** Today is 2026-11-02 (current month 2026-11) unless a test says otherwise. */
const nov2 = () => new Date(2026, 10, 2, 9, 30);

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

async function foodOf(context: Context, month: string): Promise<number | null | undefined> {
  return (await budgetsOf(context, month))[FOOD];
}

function put(context: Context, body: unknown) {
  return request(context.app).put('/api/v1/budgets').send(body as object);
}

async function putOk(context: Context, month: string, items: { categoryId: number; amountMinor: number | null }[]) {
  const res = await put(context, { month, items });
  expect([200, 204]).toContain(res.status);
  return res;
}

describe('SPD-4 QA: budgets API', () => {
  it('TC-5 (AC-5): budgets set for 2026-11 carry forward to 2026-12 and 2027-06', async () => {
    const context = createTestContext({ now: nov2 });
    await putOk(context, '2026-11', [
      { categoryId: FOOD, amountMinor: 700_000 },
      { categoryId: ENTERTAINMENT, amountMinor: 300_000 },
    ]);

    for (const month of ['2026-11', '2026-12', '2027-06']) {
      const budgets = await budgetsOf(context, month);
      expect(budgets[FOOD]).toBe(700_000);
      expect(budgets[ENTERTAINMENT]).toBe(300_000);
      expect(budgets[TRANSPORT]).toBeNull();
    }
    expect(await foodOf(context, '2026-10')).toBeNull();
  });

  it('TC-26 (AC-24): GET 2026-12 returns six items in the fixed order with the budgets in effect', async () => {
    const context = createTestContext({ now: nov2 });
    await putOk(context, '2026-11', [
      { categoryId: FOOD, amountMinor: 700_000 },
      { categoryId: ENTERTAINMENT, amountMinor: 300_000 },
    ]);

    const res = await request(context.app).get('/api/v1/budgets').query({ month: '2026-12' });

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([
      { categoryId: 1, amountMinor: 700_000 },
      { categoryId: 2, amountMinor: null },
      { categoryId: 3, amountMinor: null },
      { categoryId: 4, amountMinor: null },
      { categoryId: 5, amountMinor: 300_000 },
      { categoryId: 6, amountMinor: null },
    ]);
  });

  it('TC-6..TC-9, TC-28, TC-29 (AC-6, AC-7, AC-8, AC-9, AC-26, AC-27): the spec chain through PUT only', async () => {
    const context = createTestContext({ now: nov2 });
    // AC-4
    await putOk(context, '2026-11', [
      { categoryId: FOOD, amountMinor: 700_000 },
      { categoryId: ENTERTAINMENT, amountMinor: 300_000 },
    ]);

    // AC-6 / AC-26
    await putOk(context, '2027-01', [{ categoryId: FOOD, amountMinor: 800_000 }]);
    for (const [month, food] of [
      ['2026-11', 700_000],
      ['2026-12', 700_000],
      ['2027-01', 800_000],
      ['2027-02', 800_000],
    ] as const) {
      const budgets = await budgetsOf(context, month);
      expect(budgets[FOOD], month).toBe(food);
      expect(budgets[ENTERTAINMENT], month).toBe(300_000);
    }

    // AC-8 / AC-27 (from the state after AC-6)
    await putOk(context, '2027-03', [{ categoryId: FOOD, amountMinor: null }]);
    expect(await foodOf(context, '2027-02')).toBe(800_000);
    expect(await foodOf(context, '2027-03')).toBeNull();
    expect(await foodOf(context, '2027-04')).toBeNull();
    expect(await foodOf(context, '2028-01')).toBeNull();
    expect((await budgetsOf(context, '2027-03'))[ENTERTAINMENT]).toBe(300_000);

    // AC-9
    await putOk(context, '2027-05', [{ categoryId: FOOD, amountMinor: 600_000 }]);
    expect(await foodOf(context, '2027-03')).toBeNull();
    expect(await foodOf(context, '2027-04')).toBeNull();
    expect(await foodOf(context, '2027-05')).toBe(600_000);
    expect(await foodOf(context, '2030-01')).toBe(600_000);

    // AC-7 (an earlier month changed afterwards keeps every later record)
    await putOk(context, '2026-12', [{ categoryId: FOOD, amountMinor: 750_000 }]);
    expect(await foodOf(context, '2026-11')).toBe(700_000);
    expect(await foodOf(context, '2026-12')).toBe(750_000);
    expect(await foodOf(context, '2027-01')).toBe(800_000);
    expect(await foodOf(context, '2027-02')).toBe(800_000);
    expect(await foodOf(context, '2027-03')).toBeNull();
    expect(await foodOf(context, '2027-05')).toBe(600_000);
  });

  it('TC-7 (AC-7): setting the same month twice replaces the value of that month only', async () => {
    const context = createTestContext({ now: nov2 });
    await putOk(context, '2026-11', [{ categoryId: FOOD, amountMinor: 700_000 }]);
    await putOk(context, '2027-01', [{ categoryId: FOOD, amountMinor: 800_000 }]);

    await putOk(context, '2026-11', [{ categoryId: FOOD, amountMinor: 650_000 }]);

    expect(await foodOf(context, '2026-12')).toBe(650_000);
    expect(await foodOf(context, '2027-01')).toBe(800_000);
  });

  it.each([undefined, '2026-13', '2026-1', '11/2026', '2026-00', ' 2026-11', '2026-11-01'])(
    'TC-27 (AC-25): GET with month=%j is 400 VALIDATION_ERROR',
    async (month) => {
      const context = createTestContext({ now: nov2 });

      const res = await request(context.app).get('/api/v1/budgets').query(month === undefined ? {} : { month });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    },
  );

  it('TC-27 (AC-25): GET with a repeated month parameter is 400 VALIDATION_ERROR', async () => {
    const context = createTestContext({ now: nov2 });

    const res = await request(context.app).get('/api/v1/budgets?month=2026-11&month=2026-12');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('TC-30 (AC-28): PUT for 2026-10 is rejected and stores nothing; 2026-11 is accepted', async () => {
    const context = createTestContext({ now: nov2 });

    const past = await put(context, { month: '2026-10', items: [{ categoryId: FOOD, amountMinor: 700_000 }] });

    expect(past.status).toBe(400);
    expect(past.body.error.code).toBe('VALIDATION_ERROR');
    expect(await foodOf(context, '2026-10')).toBeNull();
    expect(await foodOf(context, '2026-11')).toBeNull();
    expect(await foodOf(context, '2099-12')).toBeNull();

    await putOk(context, '2026-11', [{ categoryId: FOOD, amountMinor: 700_000 }]);
    expect(await foodOf(context, '2026-11')).toBe(700_000);
  });

  it('TC-30 (AC-28): on the last minute of 2026-11 the current month is still 2026-11', async () => {
    const context = createTestContext({ now: () => new Date(2026, 10, 30, 23, 59, 59) });

    const res = await put(context, { month: '2026-11', items: [{ categoryId: FOOD, amountMinor: 700_000 }] });

    expect(res.status).toBe(200);
  });

  it('TC-19 (AC-18): on 2026-12-01 a write to 2026-11 is rejected, the 2026-11 budget still applies to 2026-12', async () => {
    let today = new Date(2026, 10, 2, 9, 30);
    const context = createTestContext({ now: () => today });
    await putOk(context, '2026-11', [{ categoryId: FOOD, amountMinor: 700_000 }]);

    today = new Date(2026, 11, 1, 0, 0, 1);
    const res = await put(context, { month: '2026-11', items: [{ categoryId: FOOD, amountMinor: 1 }] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await foodOf(context, '2026-11')).toBe(700_000);
    expect(await foodOf(context, '2026-12')).toBe(700_000);
    await putOk(context, '2026-12', [{ categoryId: FOOD, amountMinor: 750_000 }]);
    expect(await foodOf(context, '2026-11')).toBe(700_000);
  });

  it.each<[string, Record<string, unknown>]>([
    ['amountMinor 0', { categoryId: TRANSPORT, amountMinor: 0 }],
    ['amountMinor -1', { categoryId: TRANSPORT, amountMinor: -1 }],
    ['amountMinor 12.5', { categoryId: TRANSPORT, amountMinor: 12.5 }],
    ['amountMinor "700000"', { categoryId: TRANSPORT, amountMinor: '700000' }],
    ['amountMinor 9007199254740992', { categoryId: TRANSPORT, amountMinor: MAX_SAFE + 1 }],
    ['amountMinor 1e300', { categoryId: TRANSPORT, amountMinor: 1e300 }],
    ['amountMinor true', { categoryId: TRANSPORT, amountMinor: true }],
    ['amountMinor missing', { categoryId: TRANSPORT }],
    ['unknown categoryId 99', { categoryId: 99, amountMinor: 500_000 }],
    ['categoryId 0', { categoryId: 0, amountMinor: 500_000 }],
    ['categoryId 1.5', { categoryId: 1.5, amountMinor: 500_000 }],
  ])(
    'TC-31 (AC-29): %s as the second item is 400 VALIDATION_ERROR and the valid first item is not stored',
    async (_, invalidItem) => {
      const context = createTestContext({ now: nov2 });

      const res = await put(context, {
        month: '2026-12',
        items: [{ categoryId: FOOD, amountMinor: 700_000 }, invalidItem],
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      const budgets = await budgetsOf(context, '2027-06');
      expect(Object.values(budgets).every((amount) => amount === null)).toBe(true);
    },
  );

  it.each([undefined, null, '2026-13', '2026-1', '11/2026', '2026-00', 202612])(
    'TC-31 (AC-29): PUT with month %j is 400 VALIDATION_ERROR and stores nothing',
    async (month) => {
      const context = createTestContext({ now: nov2 });

      const res = await put(context, { month, items: [{ categoryId: FOOD, amountMinor: 700_000 }] });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(await foodOf(context, '2027-06')).toBeNull();
    },
  );

  it('TC-31 (AC-29): an unknown category listed first stores none of the other items', async () => {
    const context = createTestContext({ now: nov2 });
    await putOk(context, '2026-11', [{ categoryId: FOOD, amountMinor: 700_000 }]);

    const res = await put(context, {
      month: '2026-12',
      items: [
        { categoryId: 42, amountMinor: 1 },
        { categoryId: FOOD, amountMinor: 900_000 },
        { categoryId: ENTERTAINMENT, amountMinor: null },
      ],
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await foodOf(context, '2026-12')).toBe(700_000);
  });

  it('TC-32 (AC-29 boundary): 9007199254740991 is accepted and read back exactly; 1 is accepted', async () => {
    const context = createTestContext({ now: nov2 });

    await putOk(context, '2026-11', [
      { categoryId: FOOD, amountMinor: MAX_SAFE },
      { categoryId: TRANSPORT, amountMinor: 1 },
    ]);

    const budgets = await budgetsOf(context, '2026-12');
    expect(budgets[FOOD]).toBe(MAX_SAFE);
    expect(budgets[TRANSPORT]).toBe(1);
  });

  it.each<[string, unknown]>([
    ['no body', undefined],
    ['a JSON array body', [{ categoryId: FOOD, amountMinor: 1 }]],
    ['items that is an object', { month: '2026-12', items: { categoryId: FOOD, amountMinor: 1 } }],
    ['an item that is null', { month: '2026-12', items: [null] }],
    ['an item that is a number', { month: '2026-12', items: [5] }],
    ['empty items', { month: '2026-12', items: [] }],
  ])('TC-33: PUT with %s is 400 VALIDATION_ERROR, not 500', async (_, body) => {
    const context = createTestContext({ now: nov2 });

    const res = body === undefined ? await request(context.app).put('/api/v1/budgets') : await put(context, body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('TC-33: PUT with malformed JSON is 400, not 500', async () => {
    const context = createTestContext({ now: nov2 });

    const res = await request(context.app)
      .put('/api/v1/budgets')
      .set('Content-Type', 'application/json')
      .send('{"month": "2026-12", "items": [');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('TC-34: a budget from 2026-12 carries into 2027-01 across the year boundary and not into 2026-11', async () => {
    const context = createTestContext({ now: nov2 });

    await putOk(context, '2026-12', [{ categoryId: FOOD, amountMinor: 500_000 }]);

    expect(await foodOf(context, '2026-11')).toBeNull();
    expect(await foodOf(context, '2026-12')).toBe(500_000);
    expect(await foodOf(context, '2027-01')).toBe(500_000);
  });

  it('TC-37: existing endpoints are unchanged by budgets (categories list, expenses of a month)', async () => {
    const context = createTestContext({ now: nov2 });
    await putOk(context, '2026-11', [{ categoryId: FOOD, amountMinor: 700_000 }]);

    const categories = await request(context.app).get('/api/v1/categories');
    const expenses = await request(context.app).get('/api/v1/expenses').query({ month: '2026-11' });

    expect(categories.status).toBe(200);
    expect(categories.body.items).toHaveLength(6);
    expect(expenses.status).toBe(200);
    expect(expenses.body).toEqual({ items: [], monthTotalMinor: 0 });
  });

  it('TC-39: the SPD-2 summary endpoint is unchanged by stored budgets', async () => {
    const context = createTestContext({ now: nov2 });
    insertExpense(context.db, { date: '2026-11-01', amountMinor: 6_500_000, categoryId: HOUSING });
    insertExpense(context.db, { date: '2026-11-02', amountMinor: 120_000, categoryId: FOOD });
    await putOk(context, '2026-11', [
      { categoryId: FOOD, amountMinor: 700_000 },
      { categoryId: HOUSING, amountMinor: null },
    ]);

    const res = await request(context.app).get('/api/v1/summary').query({ month: '2026-11' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      month: '2026-11',
      items: [
        { categoryId: HOUSING, categoryName: 'Housing', count: 1, totalMinor: 6_500_000 },
        { categoryId: FOOD, categoryName: 'Food', count: 1, totalMinor: 120_000 },
      ],
      monthCount: 2,
      monthTotalMinor: 6_620_000,
    });
  });
});
