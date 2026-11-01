import { describe, expect, it } from 'vitest';
import { openDatabase } from '../src/db/database.js';
import { seedSampleExpenses } from '../src/db/seed.js';
import { createExpenseRepository } from '../src/repositories/expenseRepository.js';

describe('seedSampleExpenses', () => {
  it('spreads sample expenses over the days before today, never after it', () => {
    const db = openDatabase(':memory:');
    const expenses = createExpenseRepository(db);

    seedSampleExpenses(db, new Date(2026, 0, 10));

    const december = expenses.findByMonth({ month: '2025-12' });
    const january = expenses.findByMonth({ month: '2026-01' });
    const all = [...expenses.findByMonth({ month: '2025-11' }), ...december, ...january];
    expect(all).toHaveLength(25);
    expect(december.length).toBeGreaterThan(0);
    expect(january.length).toBeGreaterThan(0);
    expect(all.every((e) => e.date >= '2025-11-14' && e.date <= '2026-01-10')).toBe(true);
  });
});
