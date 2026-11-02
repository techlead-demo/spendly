import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestContext, insertBudget, insertExpense } from './helpers.js';

const DEFAULTS = ['Food', 'Transport', 'Housing', 'Health', 'Entertainment', 'Other'];

function defaultItems(counts: Record<number, number> = {}) {
  return DEFAULTS.map((name, index) => ({
    id: index + 1,
    name,
    status: 'active',
    expenseCount: counts[index + 1] ?? 0,
  }));
}

type App = ReturnType<typeof createTestContext>['app'];

async function addCategory(app: App, name: string) {
  const res = await request(app).post('/api/v1/categories').send({ name });
  expect(res.status).toBe(201);
  return res.body as { id: number; name: string };
}

async function retire(app: App, id: number) {
  return request(app).post(`/api/v1/categories/${id}/retire`);
}

describe('GET /api/v1/categories', () => {
  it('returns the default categories ordered by id, active, with their expense counts', async () => {
    const { db, app } = createTestContext();
    insertExpense(db, { date: '2026-10-15', amountMinor: 45_000, categoryId: 1 });
    insertExpense(db, { date: '2026-11-01', amountMinor: 30_000, categoryId: 1 });

    const res = await request(app).get('/api/v1/categories');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: defaultItems({ 1: 2 }) });
  });

  it('AC-3: counts expenses over all months and leaves deleted expenses out', async () => {
    const { db, app } = createTestContext();
    insertExpense(db, { date: '2025-01-15', amountMinor: 45_000, categoryId: 1 });
    insertExpense(db, { date: '2026-11-02', amountMinor: 45_000, categoryId: 1 });
    const deleted = insertExpense(db, { date: '2026-11-02', amountMinor: 45_000, categoryId: 1 });
    await request(app).delete(`/api/v1/expenses/${deleted}`);

    const res = await request(app).get('/api/v1/categories');

    expect(res.body.items[0]).toEqual({ id: 1, name: 'Food', status: 'active', expenseCount: 2 });
    expect(res.body.items[1].expenseCount).toBe(0);
  });

  it('AC-30: lists added and retired categories ordered by id with status and expense count', async () => {
    const { db, app } = createTestContext();
    for (let i = 0; i < 48; i += 1) {
      insertExpense(db, { date: '2026-10-15', amountMinor: 45_000, categoryId: 1 });
    }
    await addCategory(app, 'Coffee');
    await retire(app, 3);

    const res = await request(app).get('/api/v1/categories');

    expect(res.status).toBe(200);
    const expected = [...defaultItems({ 1: 48 }), { id: 7, name: 'Coffee', status: 'active', expenseCount: 0 }];
    expected[2] = { ...expected[2]!, status: 'retired' };
    expect(res.body).toEqual({ items: expected });
  });
});

describe('POST /api/v1/categories', () => {
  it('AC-31, AC-7: adds an active category with the trimmed name and a new id', async () => {
    const { app } = createTestContext();

    const res = await request(app).post('/api/v1/categories').send({ name: '  Coffee  ' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 7, name: 'Coffee', status: 'active', expenseCount: 0 });
    const list = await request(app).get('/api/v1/categories');
    expect(list.body.items.map((c: { name: string }) => c.name)).toEqual([...DEFAULTS, 'Coffee']);
  });

  it('AC-31, AC-10: accepts a name of exactly 40 characters', async () => {
    const { app } = createTestContext();
    const name = 'x'.repeat(40);

    const res = await request(app).post('/api/v1/categories').send({ name: ` ${name} ` });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe(name);
  });

  it.each([
    ['a missing name', {}, 'name is required and must be a string'],
    ['a name that is not a string', { name: 12 }, 'name is required and must be a string'],
    ['an empty name', { name: '' }, 'Enter a category name.'],
    ['a name of only spaces', { name: '   ' }, 'Enter a category name.'],
    ['a name longer than 40 characters', { name: 'x'.repeat(41) }, 'A category name can have at most 40 characters.'],
    ['an existing name in lower case', { name: 'food' }, 'A category named "food" already exists.'],
    ['an existing name in upper case', { name: ' FOOD ' }, 'A category named "FOOD" already exists.'],
  ])('AC-31, AC-8, AC-9: rejects %s with 400 VALIDATION_ERROR and stores nothing', async (_label, body, message) => {
    const { app } = createTestContext();

    const res = await request(app).post('/api/v1/categories').send(body);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: 'VALIDATION_ERROR', message } });
    const list = await request(app).get('/api/v1/categories');
    expect(list.body.items).toHaveLength(6);
  });

  it('AC-9: rejects the name of a retired category ignoring letter case', async () => {
    const { app } = createTestContext();
    await retire(app, 1);

    const res = await request(app).post('/api/v1/categories').send({ name: 'FOOD' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('A category named "FOOD" already exists.');
  });

  it('rejects a body that is not an object', async () => {
    const { app } = createTestContext();

    const res = await request(app).post('/api/v1/categories').send([{ name: 'Coffee' }]);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PATCH /api/v1/categories/:id', () => {
  it('AC-32, AC-13: renames a category; expenses and the summary show the new name under the same id', async () => {
    const { db, app } = createTestContext();
    insertExpense(db, { date: '2026-10-15', amountMinor: 120_000, categoryId: 1, note: 'Lunch' });

    const res = await request(app).patch('/api/v1/categories/1').send({ name: ' Groceries ' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, name: 'Groceries', status: 'active', expenseCount: 1 });
    const expenses = await request(app).get('/api/v1/expenses').query({ month: '2026-10' });
    expect(expenses.body.items[0].categoryId).toBe(1);
    const summary = await request(app).get('/api/v1/summary').query({ month: '2026-10' });
    expect(summary.body.items).toEqual([
      { categoryId: 1, categoryName: 'Groceries', count: 1, totalMinor: 120_000 },
    ]);
  });

  it.each([
    ['another name ignoring case', 'transport', 'A category named "transport" already exists.'],
    ['another name', 'Transport', 'A category named "Transport" already exists.'],
    ['an empty name', '  ', 'Enter a category name.'],
    ['a name longer than 40 characters', 'y'.repeat(41), 'A category name can have at most 40 characters.'],
  ])('AC-32, AC-15: rejects %s with 400 VALIDATION_ERROR', async (_label, name, message) => {
    const { app } = createTestContext();

    const res = await request(app).patch('/api/v1/categories/1').send({ name });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: 'VALIDATION_ERROR', message } });
    const list = await request(app).get('/api/v1/categories');
    expect(list.body.items[0].name).toBe('Food');
  });

  it.each(['Food', 'food'])('AC-16: accepts its own name in any letter case (%s)', async (name) => {
    const { app } = createTestContext();

    const res = await request(app).patch('/api/v1/categories/1').send({ name });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe(name);
  });

  it('AC-17: a retired category keeps its status when renamed', async () => {
    const { app } = createTestContext();
    const gym = await addCategory(app, 'Gym');
    await retire(app, gym.id);

    const res = await request(app).patch(`/api/v1/categories/${gym.id}`).send({ name: 'Fitness' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: gym.id, name: 'Fitness', status: 'retired', expenseCount: 0 });
  });

  it('rejects a missing name', async () => {
    const { app } = createTestContext();

    const res = await request(app).patch('/api/v1/categories/1').send({});

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('name is required and must be a string');
  });
});

describe('POST /api/v1/categories/:id/retire and /restore', () => {
  it('AC-33, AC-18: retires a category; its expenses do not change', async () => {
    const { db, app } = createTestContext();
    const coffee = await addCategory(app, 'Coffee');
    insertExpense(db, { date: '2026-10-15', amountMinor: 30_000, categoryId: coffee.id });

    const res = await retire(app, coffee.id);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 7, name: 'Coffee', status: 'retired', expenseCount: 1 });
    const expenses = await request(app).get('/api/v1/expenses').query({ month: '2026-10' });
    expect(expenses.body.items).toHaveLength(1);
  });

  it('AC-33, AC-22: restores a retired category', async () => {
    const { app } = createTestContext();
    const coffee = await addCategory(app, 'Coffee');
    await retire(app, coffee.id);

    const res = await request(app).post(`/api/v1/categories/${coffee.id}/restore`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 7, name: 'Coffee', status: 'active', expenseCount: 0 });
  });

  it('AC-33: retiring a retired category and restoring an active one change nothing', async () => {
    const { app } = createTestContext();
    const coffee = await addCategory(app, 'Coffee');
    await retire(app, coffee.id);

    const retired = await retire(app, coffee.id);
    const restored = await request(app).post('/api/v1/categories/1/restore');

    expect(retired.status).toBe(200);
    expect(retired.body.status).toBe('retired');
    expect(restored.status).toBe(200);
    expect(restored.body.status).toBe('active');
  });

  it('AC-33, AC-23: retiring the only active category is rejected (BR-25)', async () => {
    const { app } = createTestContext();
    for (const id of [2, 3, 4, 5, 6]) {
      await retire(app, id);
    }

    const res = await retire(app, 1);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'At least one category must stay active.' },
    });
    const list = await request(app).get('/api/v1/categories');
    expect(list.body.items[0].status).toBe('active');
  });

  it('AC-33: the only active category being retired already is still 200', async () => {
    const { app } = createTestContext();
    for (const id of [2, 3, 4, 5, 6]) {
      await retire(app, id);
    }

    const res = await retire(app, 2);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('retired');
  });
});

describe('unknown and malformed category ids', () => {
  it.each([
    ['rename', 'patch', '/api/v1/categories/99'],
    ['retire', 'post', '/api/v1/categories/99/retire'],
    ['restore', 'post', '/api/v1/categories/99/restore'],
  ] as const)('AC-34: %s of an unknown id is 404 NOT_FOUND', async (_label, method, path) => {
    const { app } = createTestContext();

    const res = await request(app)[method](path).send({ name: 'Coffee' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'category 99 does not exist' } });
  });

  it.each(['0', 'abc', '-1', '1.5'])('AC-34: a malformed id (%s) is 400 VALIDATION_ERROR', async (id) => {
    const { app } = createTestContext();

    const results = await Promise.all([
      request(app).patch(`/api/v1/categories/${id}`).send({ name: 'Coffee' }),
      request(app).post(`/api/v1/categories/${id}/retire`),
      request(app).post(`/api/v1/categories/${id}/restore`),
    ]);

    for (const res of results) {
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: { code: 'VALIDATION_ERROR', message: 'id must be a positive integer' } });
    }
  });
});

describe('retired categories and expenses (BR-24)', () => {
  async function gymContext() {
    const context = createTestContext();
    await addCategory(context.app, 'Coffee');
    const gym = await addCategory(context.app, 'Gym');
    expect(gym.id).toBe(8);
    return context;
  }

  it('AC-35: POST /expenses rejects a retired category and accepts it again after a restore', async () => {
    const { app } = await gymContext();
    await retire(app, 8);
    const body = { date: '2026-11-02', amountMinor: 120_000, categoryId: 8, note: 'Gym' };

    const rejected = await request(app).post('/api/v1/expenses').send(body);

    expect(rejected.status).toBe(400);
    expect(rejected.body).toEqual({ error: { code: 'VALIDATION_ERROR', message: 'categoryId 8 is retired' } });
    const list = await request(app).get('/api/v1/expenses').query({ month: '2026-11' });
    expect(list.body.items).toEqual([]);

    await request(app).post('/api/v1/categories/8/restore');
    const accepted = await request(app).post('/api/v1/expenses').send(body);

    expect(accepted.status).toBe(201);
    expect(accepted.body.categoryId).toBe(8);
  });

  it('AC-20, AC-21: expenses of a retired category stay in the list, the filter, the total and the summary', async () => {
    const { db, app } = await gymContext();
    for (const date of ['2026-10-03', '2026-10-10', '2026-10-17']) {
      insertExpense(db, { date, amountMinor: 100_000, categoryId: 8 });
    }
    insertExpense(db, { date: '2026-10-20', amountMinor: 50_000, categoryId: 1 });

    await retire(app, 8);

    const all = await request(app).get('/api/v1/expenses').query({ month: '2026-10' });
    expect(all.body.items).toHaveLength(4);
    expect(all.body.monthTotalMinor).toBe(350_000);
    const filtered = await request(app).get('/api/v1/expenses').query({ month: '2026-10', categoryId: 8 });
    expect(filtered.body.items).toHaveLength(3);
    const summary = await request(app).get('/api/v1/summary').query({ month: '2026-10' });
    expect(summary.body.items[0]).toEqual({ categoryId: 8, categoryName: 'Gym', count: 3, totalMinor: 300_000 });
  });

  it('AC-38: PUT keeps an expense in its own retired category but rejects another retired category', async () => {
    const { db, app } = await gymContext();
    const g = insertExpense(db, { date: '2026-10-15', amountMinor: 120_000, categoryId: 8, note: 'Gym' });
    await retire(app, 8);
    await retire(app, 4);

    const kept = await request(app)
      .put(`/api/v1/expenses/${g}`)
      .send({ date: '2026-10-15', amountMinor: 150_000, categoryId: 8, note: 'Gym' });
    const rejected = await request(app)
      .put(`/api/v1/expenses/${g}`)
      .send({ date: '2026-10-15', amountMinor: 999_000, categoryId: 4, note: 'Gym' });

    expect(kept.status).toBe(200);
    expect(kept.body).toEqual({ id: g, date: '2026-10-15', amountMinor: 150_000, categoryId: 8, note: 'Gym' });
    expect(rejected.status).toBe(400);
    expect(rejected.body).toEqual({ error: { code: 'VALIDATION_ERROR', message: 'categoryId 4 is retired' } });
    const stored = await request(app).get(`/api/v1/expenses/${g}`);
    expect(stored.body.amountMinor).toBe(150_000);
    expect(stored.body.categoryId).toBe(8);
  });

  it('AC-37: an expense moved out of a retired category cannot be moved back', async () => {
    const { db, app } = await gymContext();
    const g = insertExpense(db, { date: '2026-10-15', amountMinor: 120_000, categoryId: 8 });
    await retire(app, 8);
    const body = { date: '2026-10-15', amountMinor: 120_000, note: null };

    const moved = await request(app).put(`/api/v1/expenses/${g}`).send({ ...body, categoryId: 1 });
    const back = await request(app).put(`/api/v1/expenses/${g}`).send({ ...body, categoryId: 8 });

    expect(moved.status).toBe(200);
    expect(back.status).toBe(400);
    expect(back.body.error.message).toBe('categoryId 8 is retired');
  });

  it('AC-38: a deleted expense of a retired category is restored into it', async () => {
    const { db, app } = await gymContext();
    const g = insertExpense(db, { date: '2026-10-15', amountMinor: 120_000, categoryId: 8 });
    await retire(app, 8);
    await request(app).delete(`/api/v1/expenses/${g}`);

    const res = await request(app).post(`/api/v1/expenses/${g}/restore`);

    expect(res.status).toBe(200);
    expect(res.body.categoryId).toBe(8);
  });
});

describe('retired categories and budgets (BR-24)', () => {
  const now = () => new Date(2026, 10, 2, 9, 30);

  it('AC-24, AC-36: GET /budgets lists active categories only, in category order, new ones without a budget', async () => {
    const { app } = createTestContext({ now });
    await addCategory(app, 'Coffee');
    await addCategory(app, 'Gym');
    await retire(app, 8);

    const res = await request(app).get('/api/v1/budgets').query({ month: '2026-11' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      month: '2026-11',
      items: [1, 2, 3, 4, 5, 6, 7].map((categoryId) => ({ categoryId, amountMinor: null })),
    });
  });

  it('AC-36: PUT /budgets with a retired category is rejected and stores nothing', async () => {
    const { app } = createTestContext({ now });
    await addCategory(app, 'Coffee');
    await addCategory(app, 'Gym');
    await retire(app, 8);

    const res = await request(app)
      .put('/api/v1/budgets')
      .send({ month: '2026-11', items: [{ categoryId: 1, amountMinor: 700_000 }, { categoryId: 8, amountMinor: 500_000 }] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: 'VALIDATION_ERROR', message: 'categoryId 8 is retired' } });
    const budgets = await request(app).get('/api/v1/budgets').query({ month: '2026-11' });
    expect(budgets.body.items[0]).toEqual({ categoryId: 1, amountMinor: null });
  });

  it('AC-25: retiring and restoring keep the stored budget', async () => {
    const { db, app } = createTestContext({ now });
    await addCategory(app, 'Coffee');
    await addCategory(app, 'Gym');
    insertBudget(db, { categoryId: 8, fromMonth: '2026-11', amountMinor: 500_000 });

    await retire(app, 8);
    const whileRetired = await request(app).get('/api/v1/budgets').query({ month: '2026-11' });
    await request(app).post('/api/v1/categories/8/restore');
    const restored = await request(app).get('/api/v1/budgets').query({ month: '2026-11' });

    expect(whileRetired.body.items.map((b: { categoryId: number }) => b.categoryId)).not.toContain(8);
    expect(restored.body.items).toContainEqual({ categoryId: 8, amountMinor: 500_000 });
  });
});
