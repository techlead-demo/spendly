import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, insertExpense } from './helpers.js';

const FOOD = 1;
const TRANSPORT = 2;
const OTHER = 6;

const valid = { date: '2026-11-02', amountMinor: 85_000, categoryId: FOOD, note: 'Lunch' };

describe('POST /api/v1/expenses', () => {
  let context: ReturnType<typeof createTestContext>;

  beforeEach(() => {
    context = createTestContext();
  });

  function countExpenses(): number {
    const row = context.db.prepare('SELECT COUNT(*) AS n FROM expenses').get() as { n: number };
    return row.n;
  }

  function post(body: unknown) {
    return request(context.app).post('/api/v1/expenses').send(body as object);
  }

  it('AC-19: creates the expense, returns 201 with it, and lists it in its month', async () => {
    const res = await post(valid);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, date: '2026-11-02', amountMinor: 85_000, categoryId: FOOD, note: 'Lunch' });
    const list = await request(context.app).get('/api/v1/expenses?month=2026-11');
    expect(list.body).toEqual({ items: [res.body], monthTotalMinor: 85_000 });
  });

  it('AC-5: stores a missing or empty note as null', async () => {
    const withoutNote = await post({ date: '2026-09-15', amountMinor: 30_000, categoryId: TRANSPORT });
    const emptyNote = await post({ date: '2026-09-15', amountMinor: 30_000, categoryId: TRANSPORT, note: '' });
    const nullNote = await post({ date: '2026-09-15', amountMinor: 30_000, categoryId: TRANSPORT, note: null });

    expect([withoutNote.status, emptyNote.status, nullNote.status]).toEqual([201, 201, 201]);
    expect([withoutNote.body.note, emptyNote.body.note, nullNote.body.note]).toEqual([null, null, null]);
  });

  it('AC-6: lists a new expense above an existing one on the same date', async () => {
    const existing = insertExpense(context.db, { date: '2026-11-02', amountMinor: 20_000, categoryId: FOOD });

    const res = await post(valid);

    const list = await request(context.app).get('/api/v1/expenses?month=2026-11');
    expect(list.body.items.map((e: { id: number }) => e.id)).toEqual([res.body.id, existing]);
  });

  it('AC-8: trims the note and stores a note of only spaces as null', async () => {
    const coffee = await post({ ...valid, note: '  Coffee  ' });
    const blank = await post({ ...valid, note: '    ' });

    expect(coffee.body.note).toBe('Coffee');
    expect(blank.body.note).toBeNull();
    const notes = context.db.prepare('SELECT note FROM expenses ORDER BY id').all() as { note: string | null }[];
    expect(notes).toEqual([{ note: 'Coffee' }, { note: null }]);
  });

  it('AC-9: accepts a future date', async () => {
    const res = await post({ date: '2026-12-24', amountMinor: 500_000, categoryId: OTHER });

    expect(res.status).toBe(201);
    const list = await request(context.app).get('/api/v1/expenses?month=2026-12');
    expect(list.body.items).toEqual([res.body]);
  });

  it('AC-18: accepts the smallest amount of 1 đồng', async () => {
    const res = await post({ ...valid, amountMinor: 1 });

    expect(res.status).toBe(201);
    expect(res.body.amountMinor).toBe(1);
  });

  it.each([
    ['missing', undefined],
    ['0', 0],
    ['-1', -1],
    ['12.5', 12.5],
    ['the string "85000"', '85000'],
    ['greater than 9007199254740991', 9_007_199_254_740_992],
  ])('AC-20: rejects amountMinor %s with 400 VALIDATION_ERROR', async (_label, amountMinor) => {
    const res = await post({ ...valid, amountMinor });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toMatch(/amountMinor/);
    expect(countExpenses()).toBe(0);
  });

  it('AC-20: accepts the largest safe amount 9007199254740991', async () => {
    const res = await post({ ...valid, amountMinor: Number.MAX_SAFE_INTEGER });

    expect(res.status).toBe(201);
    expect(res.body.amountMinor).toBe(Number.MAX_SAFE_INTEGER);
  });

  it.each([undefined, '2026-13-01', '2026-02-30', '02/11/2026', '2026-11-2'])(
    'AC-21: rejects date %j with 400 VALIDATION_ERROR',
    async (date) => {
      const res = await post({ ...valid, date });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toMatch(/date/);
      expect(countExpenses()).toBe(0);
    },
  );

  it.each([undefined, 0, '1', 99])('AC-22: rejects categoryId %j with 400 VALIDATION_ERROR', async (categoryId) => {
    const res = await post({ ...valid, categoryId });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toMatch(/categoryId/);
    expect(countExpenses()).toBe(0);
  });

  it.each([
    ['201 characters', 'x'.repeat(201)],
    ['201 characters after trimming', `  ${'x'.repeat(201)}  `],
    ['a number', 42],
    ['an object', { text: 'Lunch' }],
  ])('AC-23: rejects a note of %s with 400 VALIDATION_ERROR', async (_label, note) => {
    const res = await post({ ...valid, note });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toMatch(/note/);
    expect(countExpenses()).toBe(0);
  });

  it('AC-23: accepts a note of exactly 200 characters (after trimming)', async () => {
    const note = 'x'.repeat(200);

    const res = await post({ ...valid, note: ` ${note} ` });

    expect(res.status).toBe(201);
    expect(res.body.note).toBe(note);
  });

  it('rejects a body that is not a JSON object with 400 VALIDATION_ERROR', async () => {
    const res = await request(context.app)
      .post('/api/v1/expenses')
      .set('Content-Type', 'application/json')
      .send('[1, 2]');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
