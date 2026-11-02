import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, insertExpense } from './helpers.js';

const FOOD = 1;
const TRANSPORT = 2;
const HOUSING = 3;
const HEALTH = 4;
const ENTERTAINMENT = 5;
const OTHER = 6;

// QA cases for SPD-2 (specs/SPD-2/test-cases.md) that the Engineer's summary.test.ts does not cover.
describe('GET /api/v1/summary (QA)', () => {
  let context: ReturnType<typeof createTestContext>;

  beforeEach(() => {
    context = createTestContext();
  });

  it('TC-8 (AC-6): orders a Transport/Health tie by category order even when Health was recorded first', async () => {
    insertExpense(context.db, { date: '2026-11-02', amountMinor: 50_000, categoryId: HEALTH });
    insertExpense(context.db, { date: '2026-11-02', amountMinor: 50_000, categoryId: TRANSPORT });

    const res = await request(context.app).get('/api/v1/summary').query({ month: '2026-11' });

    expect(res.body.items.map((i: { categoryId: number }) => i.categoryId)).toEqual([TRANSPORT, HEALTH]);
  });

  it('TC-8 (AC-6): orders six equal totals Food, Transport, Housing, Health, Entertainment, Other', async () => {
    for (const categoryId of [OTHER, ENTERTAINMENT, HEALTH, HOUSING, TRANSPORT, FOOD]) {
      insertExpense(context.db, { date: '2026-03-15', amountMinor: 10_000, categoryId });
    }

    const res = await request(context.app).get('/api/v1/summary').query({ month: '2026-03' });

    expect(res.body.items.map((i: { categoryName: string }) => i.categoryName)).toEqual([
      'Food',
      'Transport',
      'Housing',
      'Health',
      'Entertainment',
      'Other',
    ]);
  });

  it('TC-9 (AC-7): counts the first and last day of October in October, not the neighbouring days', async () => {
    insertExpense(context.db, { date: '2026-09-30', amountMinor: 11_000, categoryId: FOOD });
    insertExpense(context.db, { date: '2026-10-01', amountMinor: 22_000, categoryId: FOOD });
    insertExpense(context.db, { date: '2026-10-31', amountMinor: 33_000, categoryId: FOOD });
    insertExpense(context.db, { date: '2026-11-01', amountMinor: 44_000, categoryId: FOOD });

    const october = await request(context.app).get('/api/v1/summary').query({ month: '2026-10' });
    const november = await request(context.app).get('/api/v1/summary').query({ month: '2026-11' });

    expect(october.body).toEqual({
      month: '2026-10',
      items: [{ categoryId: FOOD, categoryName: 'Food', count: 2, totalMinor: 55_000 }],
      monthCount: 2,
      monthTotalMinor: 55_000,
    });
    expect(november.body.monthCount).toBe(1);
    expect(november.body.monthTotalMinor).toBe(44_000);
  });

  it('TC-11 (AC-8): a Food expense of 30.000 ₫ adds 1 to the Food count and 30.000 ₫ to Food and the month', async () => {
    insertExpense(context.db, { date: '2026-11-01', amountMinor: 120_000, categoryId: FOOD });
    insertExpense(context.db, { date: '2026-11-01', amountMinor: 6_500_000, categoryId: HOUSING });
    const before = await request(context.app).get('/api/v1/summary').query({ month: '2026-11' });

    insertExpense(context.db, { date: '2026-11-02', amountMinor: 30_000, categoryId: FOOD });
    const after = await request(context.app).get('/api/v1/summary').query({ month: '2026-11' });

    const food = (body: { items: { categoryId: number; count: number; totalMinor: number }[] }) =>
      body.items.find((i) => i.categoryId === FOOD)!;
    expect(food(after.body).count).toBe(food(before.body).count + 1);
    expect(food(after.body).totalMinor).toBe(food(before.body).totalMinor + 30_000);
    expect(after.body.monthTotalMinor).toBe(before.body.monthTotalMinor + 30_000);
  });

  it.each(['2026-00', '202611', '2026-11 ', 'abcd-ef'])(
    'TC-18 (AC-15): rejects month=%j with 400 VALIDATION_ERROR',
    async (month) => {
      const res = await request(context.app).get('/api/v1/summary').query({ month });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(typeof res.body.error.message).toBe('string');
    },
  );

  it('TC-18 (AC-15): rejects a repeated month parameter with 400 VALIDATION_ERROR', async () => {
    const res = await request(context.app).get('/api/v1/summary?month=2026-11&month=2026-10');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('TC-24: separates December and January across the year boundary', async () => {
    insertExpense(context.db, { date: '2026-12-31', amountMinor: 70_000, categoryId: TRANSPORT });
    insertExpense(context.db, { date: '2027-01-01', amountMinor: 80_000, categoryId: HEALTH });

    const december = await request(context.app).get('/api/v1/summary').query({ month: '2026-12' });
    const january = await request(context.app).get('/api/v1/summary').query({ month: '2027-01' });

    expect(december.body.items).toEqual([
      { categoryId: TRANSPORT, categoryName: 'Transport', count: 1, totalMinor: 70_000 },
    ]);
    expect(january.body.items).toEqual([{ categoryId: HEALTH, categoryName: 'Health', count: 1, totalMinor: 80_000 }]);
  });

  it('TC-25: keeps large month totals as exact integers', async () => {
    for (let i = 0; i < 3; i += 1) {
      insertExpense(context.db, { date: '2026-11-10', amountMinor: 9_000_000_000, categoryId: HOUSING });
    }
    insertExpense(context.db, { date: '2026-11-10', amountMinor: 1, categoryId: FOOD });

    const res = await request(context.app).get('/api/v1/summary').query({ month: '2026-11' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      month: '2026-11',
      items: [
        { categoryId: HOUSING, categoryName: 'Housing', count: 3, totalMinor: 27_000_000_000 },
        { categoryId: FOOD, categoryName: 'Food', count: 1, totalMinor: 1 },
      ],
      monthCount: 4,
      monthTotalMinor: 27_000_000_001,
    });
  });

  it('TC-27: leaves the GET /api/v1/expenses response shape unchanged', async () => {
    insertExpense(context.db, { date: '2026-11-02', amountMinor: 85_000, categoryId: FOOD, note: 'Lunch' });

    const res = await request(context.app).get('/api/v1/expenses').query({ month: '2026-11' });

    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['items', 'monthTotalMinor']);
    expect(res.body.monthTotalMinor).toBe(85_000);
  });
});
