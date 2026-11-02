import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, insertBudget, insertExpense } from './helpers.js';

const FOOD = 1;
const TRANSPORT = 2;

const E = { date: '2026-11-02', amountMinor: 280_000, categoryId: FOOD, note: 'Groceries at Co.opmart' };
const valid = { date: '2026-11-02', amountMinor: 250_000, categoryId: FOOD, note: 'Groceries' };

let context: ReturnType<typeof createTestContext>;
let id: number;

beforeEach(() => {
  context = createTestContext();
  id = insertExpense(context.db, E);
});

function storedRows() {
  return context.db
    .prepare('SELECT id, date, amount_minor, category_id, note, deleted FROM expenses ORDER BY id')
    .all();
}

function listIds(month: string) {
  return request(context.app)
    .get('/api/v1/expenses')
    .query({ month })
    .then((res) => res.body.items.map((e: { id: number }) => e.id));
}

describe('GET /api/v1/expenses/:id', () => {
  it('AC-29: returns the expense', async () => {
    const res = await request(context.app).get(`/api/v1/expenses/${id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id, ...E });
  });
});

describe('PUT /api/v1/expenses/:id', () => {
  function put(body: unknown, expenseId: number | string = id) {
    return request(context.app).put(`/api/v1/expenses/${expenseId}`).send(body as object);
  }

  it('AC-30: replaces the fields, trims the note and moves the expense to its new month', async () => {
    const res = await put({ date: '2026-10-28', amountMinor: 250_000, categoryId: TRANSPORT, note: ' Bus ' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id, date: '2026-10-28', amountMinor: 250_000, categoryId: TRANSPORT, note: 'Bus' });
    expect(await listIds('2026-10')).toEqual([id]);
    expect(await listIds('2026-11')).toEqual([]);
  });

  it('AC-4: keeps id, date and category and updates the month total', async () => {
    const res = await put(valid);

    expect(res.body).toEqual({ id, ...valid });
    const list = await request(context.app).get('/api/v1/expenses?month=2026-11');
    expect(list.body).toEqual({ items: [{ id, ...valid }], monthTotalMinor: 250_000 });
  });

  it('AC-5: a category change moves the amount between summary rows (BR-13)', async () => {
    insertExpense(context.db, { date: '2026-11-05', amountMinor: 50_000, categoryId: FOOD });

    await put({ ...E, categoryId: TRANSPORT });

    const summary = await request(context.app).get('/api/v1/summary?month=2026-11');
    expect(summary.body.items).toEqual([
      { categoryId: TRANSPORT, categoryName: 'Transport', count: 1, totalMinor: 280_000 },
      { categoryId: FOOD, categoryName: 'Food', count: 1, totalMinor: 50_000 },
    ]);
  });

  it('AC-7: an edited expense keeps its place in recording order (BR-20)', async () => {
    const f = insertExpense(context.db, { date: '2026-11-02', amountMinor: 20_000, categoryId: FOOD });

    await put({ ...E, amountMinor: 300_000 });

    expect(await listIds('2026-11')).toEqual([f, id]);
  });

  it('AC-8: trims the note and stores a blank note as null (BR-11)', async () => {
    const market = await put({ ...E, note: '  Market  ' });
    expect(market.body.note).toBe('Market');

    const blank = await put({ ...E, note: '   ' });
    const empty = await put({ ...E, note: '' });

    expect([blank.body.note, empty.body.note]).toEqual([null, null]);
    expect((await request(context.app).get(`/api/v1/expenses/${id}`)).body.note).toBeNull();
  });

  it('AC-9: an unchanged body succeeds and leaves the expense unchanged', async () => {
    const res = await put(E);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id, ...E });
  });

  it('AC-17: accepts an amount of 1 đồng', async () => {
    const res = await put({ ...E, amountMinor: 1 });

    expect(res.status).toBe(200);
    expect(res.body.amountMinor).toBe(1);
  });

  it.each([
    ['amountMinor missing', { amountMinor: undefined }],
    ['amountMinor 0', { amountMinor: 0 }],
    ['amountMinor -1', { amountMinor: -1 }],
    ['amountMinor 12.5', { amountMinor: 12.5 }],
    ['amountMinor "85000"', { amountMinor: '85000' }],
    ['amountMinor above 9007199254740991', { amountMinor: 9_007_199_254_740_992 }],
    ['date missing', { date: undefined }],
    ['date 2026-02-30', { date: '2026-02-30' }],
    ['date 2026-11-2', { date: '2026-11-2' }],
    ['categoryId missing', { categoryId: undefined }],
    ['categoryId "1"', { categoryId: '1' }],
    ['categoryId 99', { categoryId: 99 }],
    ['note of 201 characters after trimming', { note: ` ${'x'.repeat(201)} ` }],
    ['note not a string', { note: 42 }],
  ])('AC-31: rejects %s with 400 VALIDATION_ERROR and keeps the expense', async (_label, change) => {
    const before = storedRows();

    const res = await put({ ...valid, ...change });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(storedRows()).toEqual(before);
  });

  it('AC-31: accepts a note of exactly 200 characters and a null note', async () => {
    const note = 'x'.repeat(200);

    const long = await put({ ...valid, note });
    const nullNote = await put({ ...valid, note: null });

    expect(long.status).toBe(200);
    expect(long.body.note).toBe(note);
    expect(nullNote.status).toBe(200);
    expect(nullNote.body.note).toBeNull();
  });
});

describe('DELETE /api/v1/expenses/:id', () => {
  it('AC-32: returns 204 without a body; the expense is then not found', async () => {
    const res = await request(context.app).delete(`/api/v1/expenses/${id}`);

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    const get = await request(context.app).get(`/api/v1/expenses/${id}`);
    expect(get.status).toBe(404);
    expect(get.body.error.code).toBe('NOT_FOUND');
  });

  it('AC-20: a deleted expense no longer counts in the list, month total and summary (BR-21)', async () => {
    const other = insertExpense(context.db, { date: '2026-11-05', amountMinor: 50_000, categoryId: FOOD });

    await request(context.app).delete(`/api/v1/expenses/${id}`);

    const list = await request(context.app).get('/api/v1/expenses?month=2026-11');
    expect(list.body).toEqual({
      items: [{ id: other, date: '2026-11-05', amountMinor: 50_000, categoryId: FOOD, note: null }],
      monthTotalMinor: 50_000,
    });
    const summary = await request(context.app).get('/api/v1/summary?month=2026-11');
    expect(summary.body).toMatchObject({ monthCount: 1, monthTotalMinor: 50_000 });
    expect(summary.body.items).toEqual([{ categoryId: FOOD, categoryName: 'Food', count: 1, totalMinor: 50_000 }]);
  });

  it('AC-45: a deleted expense stops counting in the over-budget check and counts again after restore (BR-21)', async () => {
    insertBudget(context.db, { categoryId: FOOD, fromMonth: '2026-11', amountMinor: 200_000 });
    const overFood = () =>
      request(context.app)
        .get('/api/v1/budgets/over?month=2026-11')
        .then((res) => res.body.items.map((item: { categoryId: number }) => item.categoryId));
    expect(await overFood()).toEqual([FOOD]);

    await request(context.app).delete(`/api/v1/expenses/${id}`);
    expect(await overFood()).toEqual([]);

    await request(context.app).post(`/api/v1/expenses/${id}/restore`);
    expect(await overFood()).toEqual([FOOD]);
  });
});

describe('unknown and deleted expenses', () => {
  it.each(['get', 'put', 'delete'] as const)('AC-33: %s of an unknown id returns 404 NOT_FOUND', async (method) => {
    const before = storedRows();

    const res = await request(context.app)[method]('/api/v1/expenses/9999').send(valid);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(storedRows()).toEqual(before);
  });

  it.each(['get', 'put', 'delete'] as const)('AC-45: %s of a deleted expense returns 404 NOT_FOUND', async (method) => {
    await request(context.app).delete(`/api/v1/expenses/${id}`);
    const before = storedRows();

    const res = await request(context.app)[method](`/api/v1/expenses/${id}`).send(valid);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(storedRows()).toEqual(before);
    expect(await listIds('2026-11')).toEqual([]);
    const summary = await request(context.app).get('/api/v1/summary?month=2026-11');
    expect(summary.body).toMatchObject({ items: [], monthCount: 0, monthTotalMinor: 0 });
  });

  it.each(['0', '-1', 'abc', '1.5'])('AC-34: rejects the id %j with 400 VALIDATION_ERROR', async (badId) => {
    const responses = await Promise.all([
      request(context.app).get(`/api/v1/expenses/${badId}`),
      request(context.app).put(`/api/v1/expenses/${badId}`).send(valid),
      request(context.app).delete(`/api/v1/expenses/${badId}`),
      request(context.app).post(`/api/v1/expenses/${badId}/restore`),
    ]);

    expect(responses.map((res) => res.status)).toEqual([400, 400, 400, 400]);
    expect(responses.map((res) => res.body.error.code)).toEqual(Array(4).fill('VALIDATION_ERROR'));
  });
});

describe('POST /api/v1/expenses/:id/restore', () => {
  it('AC-42: restores a deleted expense with its id and values; lists and summary include it again', async () => {
    await request(context.app).delete(`/api/v1/expenses/${id}`);

    const res = await request(context.app).post(`/api/v1/expenses/${id}/restore`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id, ...E });
    expect((await request(context.app).get(`/api/v1/expenses/${id}`)).status).toBe(200);
    expect(await listIds('2026-11')).toEqual([id]);
    const summary = await request(context.app).get('/api/v1/summary?month=2026-11');
    expect(summary.body).toMatchObject({ monthCount: 1, monthTotalMinor: 280_000 });
  });

  it('AC-37: a restored expense keeps its place in recording order (BR-7, BR-21)', async () => {
    const f = insertExpense(context.db, { date: '2026-11-02', amountMinor: 20_000, categoryId: FOOD });
    await request(context.app).delete(`/api/v1/expenses/${id}`);

    await request(context.app).post(`/api/v1/expenses/${id}/restore`);

    expect(await listIds('2026-11')).toEqual([f, id]);
  });

  it('AC-22: restores the values stored before the delete', async () => {
    await request(context.app).delete(`/api/v1/expenses/${id}`);

    const res = await request(context.app).post(`/api/v1/expenses/${id}/restore`);

    expect(res.body).toEqual({ id, ...E });
  });

  it('AC-43: restoring an expense that is not deleted returns it unchanged', async () => {
    const res = await request(context.app).post(`/api/v1/expenses/${id}/restore`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id, ...E });
    expect(await listIds('2026-11')).toEqual([id]);
  });

  it('AC-44: returns 404 NOT_FOUND for an id that was never recorded', async () => {
    const res = await request(context.app).post('/api/v1/expenses/9999/restore');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
