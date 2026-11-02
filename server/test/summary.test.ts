import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, insertExpense } from './helpers.js';

const FOOD = 1;
const TRANSPORT = 2;
const HOUSING = 3;
const HEALTH = 4;
const OTHER = 6;

describe('GET /api/v1/summary', () => {
  let context: ReturnType<typeof createTestContext>;

  beforeEach(() => {
    context = createTestContext();
    const { db } = context;
    // Example data of the SPD-2 spec (November 2026) plus the neighbouring months.
    insertExpense(db, { date: '2026-10-31', amountMinor: 999_000, categoryId: OTHER, note: 'Last day of October' });
    insertExpense(db, { date: '2026-11-01', amountMinor: 6_500_000, categoryId: HOUSING, note: 'Monthly rent' });
    insertExpense(db, { date: '2026-11-01', amountMinor: 120_000, categoryId: FOOD });
    insertExpense(db, { date: '2026-11-02', amountMinor: 85_000, categoryId: FOOD });
    insertExpense(db, { date: '2026-11-02', amountMinor: 50_000, categoryId: TRANSPORT });
    insertExpense(db, { date: '2026-11-02', amountMinor: 50_000, categoryId: HEALTH });
    insertExpense(db, { date: '2026-12-01', amountMinor: 777_000, categoryId: FOOD, note: 'Next month' });
  });

  it('AC-14: returns count and total per category in BR-13 order with the month count and total', async () => {
    const res = await request(context.app).get('/api/v1/summary?month=2026-11');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      month: '2026-11',
      items: [
        { categoryId: HOUSING, categoryName: 'Housing', count: 1, totalMinor: 6_500_000 },
        { categoryId: FOOD, categoryName: 'Food', count: 2, totalMinor: 205_000 },
        { categoryId: TRANSPORT, categoryName: 'Transport', count: 1, totalMinor: 50_000 },
        { categoryId: HEALTH, categoryName: 'Health', count: 1, totalMinor: 50_000 },
      ],
      monthCount: 5,
      monthTotalMinor: 6_805_000,
    });
  });

  it('AC-3, AC-5: lists only categories with expenses in the month, largest total first', async () => {
    const res = await request(context.app).get('/api/v1/summary?month=2026-11');

    expect(res.body.items.map((i: { categoryName: string }) => i.categoryName)).toEqual([
      'Housing',
      'Food',
      'Transport',
      'Health',
    ]);
  });

  it('AC-6: orders equal totals by the fixed category order', async () => {
    const { db } = context;
    insertExpense(db, { date: '2026-01-10', amountMinor: 50_000, categoryId: OTHER });
    insertExpense(db, { date: '2026-01-10', amountMinor: 50_000, categoryId: HEALTH });
    insertExpense(db, { date: '2026-01-10', amountMinor: 50_000, categoryId: FOOD });
    insertExpense(db, { date: '2026-01-10', amountMinor: 50_000, categoryId: TRANSPORT });

    const res = await request(context.app).get('/api/v1/summary?month=2026-01');

    expect(res.body.items.map((i: { categoryId: number }) => i.categoryId)).toEqual([
      FOOD,
      TRANSPORT,
      HEALTH,
      OTHER,
    ]);
  });

  it('AC-4: the month total equals the expense list month total for all categories', async () => {
    const summary = await request(context.app).get('/api/v1/summary?month=2026-11');
    const list = await request(context.app).get('/api/v1/expenses?month=2026-11');

    expect(summary.body.monthTotalMinor).toBe(6_805_000);
    expect(summary.body.monthTotalMinor).toBe(list.body.monthTotalMinor);
    expect(summary.body.monthCount).toBe(list.body.items.length);
  });

  it('AC-7: counts an expense in the month of its date only (month boundaries)', async () => {
    const res = await request(context.app).get('/api/v1/summary?month=2026-10');

    expect(res.body).toEqual({
      month: '2026-10',
      items: [{ categoryId: OTHER, categoryName: 'Other', count: 1, totalMinor: 999_000 }],
      monthCount: 1,
      monthTotalMinor: 999_000,
    });
  });

  it('AC-8: includes a newly recorded expense in the category and month totals', async () => {
    insertExpense(context.db, { date: '2026-11-02', amountMinor: 30_000, categoryId: FOOD, note: 'New' });

    const res = await request(context.app).get('/api/v1/summary?month=2026-11');

    expect(res.body.items[1]).toEqual({ categoryId: FOOD, categoryName: 'Food', count: 3, totalMinor: 235_000 });
    expect(res.body.monthCount).toBe(6);
    expect(res.body.monthTotalMinor).toBe(6_835_000);
  });

  it('AC-9: returns a single row for a month with one expense of 1 ₫', async () => {
    insertExpense(context.db, { date: '2025-06-15', amountMinor: 1, categoryId: OTHER });

    const res = await request(context.app).get('/api/v1/summary?month=2025-06');

    expect(res.body).toEqual({
      month: '2025-06',
      items: [{ categoryId: OTHER, categoryName: 'Other', count: 1, totalMinor: 1 }],
      monthCount: 1,
      monthTotalMinor: 1,
    });
  });

  it('AC-16: returns no items and zero count and total for a month without expenses', async () => {
    const res = await request(context.app).get('/api/v1/summary?month=2020-01');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ month: '2020-01', items: [], monthCount: 0, monthTotalMinor: 0 });
  });

  it.each(['', '2026-13', '2026-1', '11/2026', '2026-11-01'])(
    'AC-15: rejects month=%j with 400 VALIDATION_ERROR',
    async (month) => {
      const res = await request(context.app).get('/api/v1/summary').query({ month });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: { code: 'VALIDATION_ERROR', message: 'month is required and must be YYYY-MM' },
      });
    },
  );

  it('AC-15: rejects a missing month with 400 VALIDATION_ERROR', async () => {
    const res = await request(context.app).get('/api/v1/summary');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
