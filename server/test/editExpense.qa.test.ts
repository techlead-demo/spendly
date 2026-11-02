import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, insertExpense } from './helpers.js';

const FOOD = 1;
const TRANSPORT = 2;

const E = { date: '2026-11-02', amountMinor: 280_000, categoryId: FOOD, note: 'Groceries at Co.opmart' };

// QA cases for SPD-3 (specs/SPD-3/test-cases.md) that the Engineer's editExpense.test.ts does not cover.
let context: ReturnType<typeof createTestContext>;
let id: number;

beforeEach(() => {
  context = createTestContext();
  id = insertExpense(context.db, E);
});

function put(body: unknown, expenseId: number | string = id) {
  return request(context.app).put(`/api/v1/expenses/${expenseId}`).send(body as object);
}

function listIds(month: string): Promise<number[]> {
  return request(context.app)
    .get('/api/v1/expenses')
    .query({ month })
    .then((res) => res.body.items.map((e: { id: number }) => e.id));
}

function storedRows() {
  return context.db.prepare('SELECT * FROM expenses ORDER BY id').all();
}

describe('PUT /api/v1/expenses/:id (QA)', () => {
  it('TC-46: a date moved to the last day of the previous month belongs to that month only', async () => {
    await put({ ...E, date: '2026-10-31' });

    expect(await listIds('2026-10')).toEqual([id]);
    expect(await listIds('2026-11')).toEqual([]);
  });

  it('TC-46: the first and last day of the month belong to that month, not the next one', async () => {
    await put({ ...E, date: '2026-11-01' });
    expect(await listIds('2026-11')).toEqual([id]);

    await put({ ...E, date: '2026-11-30' });

    expect(await listIds('2026-11')).toEqual([id]);
    expect(await listIds('2026-12')).toEqual([]);
  });

  it('TC-47: accepts the largest safe amount 9007199254740991', async () => {
    const res = await put({ ...E, amountMinor: Number.MAX_SAFE_INTEGER });

    expect(res.status).toBe(200);
    expect(res.body.amountMinor).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('TC-48: accepts a leap day and rejects 29 February of a non-leap year', async () => {
    const leap = await put({ ...E, date: '2028-02-29' });
    const notLeap = await put({ ...E, date: '2026-02-29' });

    expect(leap.status).toBe(200);
    expect(leap.body.date).toBe('2028-02-29');
    expect(notLeap.status).toBe(400);
    expect(notLeap.body.error.code).toBe('VALIDATION_ERROR');
  });

  it.each([
    ['date 2026-13-01', { date: '2026-13-01' }],
    ['date 02/11/2026', { date: '02/11/2026' }],
    ['categoryId 0', { categoryId: 0 }],
    ['note an object', { note: { text: 'x' } }],
  ])('TC-31 (AC-31): rejects %s (SPD-1 create rules) and keeps the expense', async (_label, change) => {
    const before = storedRows();

    const res = await put({ ...E, ...change });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(storedRows()).toEqual(before);
  });

  it('TC-49: a body with a valid date and an invalid amount changes nothing', async () => {
    const res = await put({ ...E, date: '2026-10-01', amountMinor: 0 });

    expect(res.status).toBe(400);
    expect((await request(context.app).get(`/api/v1/expenses/${id}`)).body).toEqual({ id, ...E });
  });

  it('TC-31 (AC-31): rejects a body that is not a JSON object', async () => {
    const res = await request(context.app)
      .put(`/api/v1/expenses/${id}`)
      .set('Content-Type', 'application/json')
      .send('[1,2]');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('DELETE and restore (QA)', () => {
  it('TC-45 (AC-45): a second DELETE of the same expense returns 404 and restore still works', async () => {
    await request(context.app).delete(`/api/v1/expenses/${id}`);

    const second = await request(context.app).delete(`/api/v1/expenses/${id}`);
    const restored = await request(context.app).post(`/api/v1/expenses/${id}/restore`);

    expect(second.status).toBe(404);
    expect(second.body.error.code).toBe('NOT_FOUND');
    expect(restored.status).toBe(200);
    expect(restored.body).toEqual({ id, ...E });
  });

  it('TC-45 (AC-45): a PUT on a deleted expense does not change what Undo restores', async () => {
    await request(context.app).delete(`/api/v1/expenses/${id}`);

    const res = await put({ ...E, amountMinor: 1, categoryId: TRANSPORT });
    const restored = await request(context.app).post(`/api/v1/expenses/${id}/restore`);

    expect(res.status).toBe(404);
    expect(restored.body).toEqual({ id, ...E });
  });

  it('TC-43 (AC-43): restoring twice is idempotent', async () => {
    await request(context.app).delete(`/api/v1/expenses/${id}`);

    const first = await request(context.app).post(`/api/v1/expenses/${id}/restore`);
    const second = await request(context.app).post(`/api/v1/expenses/${id}/restore`);

    expect(first.body).toEqual({ id, ...E });
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ id, ...E });
    expect(await listIds('2026-11')).toEqual([id]);
  });

  it('TC-44 (AC-44): restore of an unknown id stores nothing', async () => {
    const before = storedRows();

    const res = await request(context.app).post('/api/v1/expenses/9999/restore');

    expect(res.status).toBe(404);
    expect(storedRows()).toEqual(before);
  });

  it('TC-42 (AC-42): a restored expense counts in the month total and summary again', async () => {
    insertExpense(context.db, { date: '2026-11-05', amountMinor: 20_000, categoryId: FOOD });
    await request(context.app).delete(`/api/v1/expenses/${id}`);

    await request(context.app).post(`/api/v1/expenses/${id}/restore`);

    const list = await request(context.app).get('/api/v1/expenses').query({ month: '2026-11' });
    const summary = await request(context.app).get('/api/v1/summary').query({ month: '2026-11' });
    expect(list.body.monthTotalMinor).toBe(300_000);
    expect(summary.body.items).toEqual([{ categoryId: FOOD, categoryName: 'Food', count: 2, totalMinor: 300_000 }]);
  });

  it('TC-20 (AC-20): a deleted expense is excluded from the category-filtered list', async () => {
    await request(context.app).delete(`/api/v1/expenses/${id}`);

    const res = await request(context.app).get('/api/v1/expenses').query({ month: '2026-11', categoryId: FOOD });

    expect(res.body).toEqual({ items: [], monthTotalMinor: 0 });
  });
});
