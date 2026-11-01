import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, insertExpense } from './helpers.js';

const FOOD = 1;
const TRANSPORT = 2;

describe('GET /api/v1/expenses', () => {
  let context: ReturnType<typeof createTestContext>;

  beforeEach(() => {
    context = createTestContext();
    const { db } = context;
    insertExpense(db, { date: '2026-09-30', amountMinor: 999_000, categoryId: FOOD, note: 'Previous month' });
    insertExpense(db, { date: '2026-10-01', amountMinor: 50_000, categoryId: FOOD, note: 'First day' });
    insertExpense(db, { date: '2026-10-15', amountMinor: 30_000, categoryId: TRANSPORT, note: null });
    insertExpense(db, { date: '2026-10-31', amountMinor: 120_000, categoryId: FOOD, note: 'Last day' });
    insertExpense(db, { date: '2026-11-01', amountMinor: 888_000, categoryId: TRANSPORT, note: 'Next month' });
  });

  it('returns the expenses of the month, newest date first, with the month total', async () => {
    const res = await request(context.app).get('/api/v1/expenses?month=2026-10');

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([
      { id: 4, date: '2026-10-31', amountMinor: 120_000, categoryId: FOOD, note: 'Last day' },
      { id: 3, date: '2026-10-15', amountMinor: 30_000, categoryId: TRANSPORT, note: null },
      { id: 2, date: '2026-10-01', amountMinor: 50_000, categoryId: FOOD, note: 'First day' },
    ]);
    expect(res.body.monthTotalMinor).toBe(200_000);
  });

  it('orders expenses on the same date by newest first', async () => {
    const later = insertExpense(context.db, { date: '2026-10-15', amountMinor: 10_000, categoryId: FOOD });

    const res = await request(context.app).get('/api/v1/expenses?month=2026-10');

    expect(res.body.items.map((e: { id: number }) => e.id)).toEqual([4, later, 3, 2]);
  });

  it('filters by category', async () => {
    const res = await request(context.app).get(`/api/v1/expenses?month=2026-10&categoryId=${FOOD}`);

    expect(res.status).toBe(200);
    expect(res.body.items.map((e: { note: string }) => e.note)).toEqual(['Last day', 'First day']);
  });

  it('returns an empty list and a zero total for a month without expenses', async () => {
    const res = await request(context.app).get('/api/v1/expenses?month=2025-01');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], monthTotalMinor: 0 });
  });

  it.each(['', '2026-13', '2026-1', '10-2026', '2026-10-01'])(
    'rejects month=%j with 400 VALIDATION_ERROR',
    async (month) => {
      const res = await request(context.app).get('/api/v1/expenses').query({ month });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toMatch(/month/);
    },
  );

  it('rejects a missing month with 400 VALIDATION_ERROR', async () => {
    const res = await request(context.app).get('/api/v1/expenses');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it.each(['abc', '0', '-1', '1.5'])('rejects categoryId=%j with 400 VALIDATION_ERROR', async (categoryId) => {
    const res = await request(context.app).get('/api/v1/expenses').query({ month: '2026-10', categoryId });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('unknown API routes', () => {
  it('return 404 NOT_FOUND in the standard error format', async () => {
    const { app } = createTestContext();

    const res = await request(app).get('/api/v1/nope');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'No route for GET /api/v1/nope' } });
  });
});
