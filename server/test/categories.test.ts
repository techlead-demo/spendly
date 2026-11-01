import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestContext } from './helpers.js';

describe('GET /api/v1/categories', () => {
  it('returns the default categories ordered by id', async () => {
    const { app } = createTestContext();

    const res = await request(app).get('/api/v1/categories');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      items: [
        { id: 1, name: 'Food' },
        { id: 2, name: 'Transport' },
        { id: 3, name: 'Housing' },
        { id: 4, name: 'Health' },
        { id: 5, name: 'Entertainment' },
        { id: 6, name: 'Other' },
      ],
    });
  });
});
