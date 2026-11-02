import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../src/db/database.js';
import { seedSampleExpenses } from '../src/db/seed.js';
import { createCategoryRepository } from '../src/repositories/categoryRepository.js';
import { createExpenseRepository } from '../src/repositories/expenseRepository.js';
import { createCategoryService } from '../src/services/categoryService.js';

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

describe('seedCategories on restart', () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it('AC-26: keeps a renamed default category and a retired one after a restart', () => {
    dir = mkdtempSync(join(tmpdir(), 'spendly-'));
    const path = join(dir, 'test.db');
    const first = openDatabase(path);
    const service = createCategoryService(createCategoryRepository(first));
    service.renameCategory(1, 'Groceries');
    service.retireCategory(3);
    first.close();

    const second = openDatabase(path);
    const categories = createCategoryRepository(second).findAll();
    second.close();

    expect(categories.map((c) => [c.id, c.name, c.status])).toEqual([
      [1, 'Groceries', 'active'],
      [2, 'Transport', 'active'],
      [3, 'Housing', 'retired'],
      [4, 'Health', 'active'],
      [5, 'Entertainment', 'active'],
      [6, 'Other', 'active'],
    ]);
  });

  it('adds the status column to a database created before SPD-6, keeping every category active', () => {
    dir = mkdtempSync(join(tmpdir(), 'spendly-'));
    const path = join(dir, 'old.db');
    const old = new DatabaseSync(path);
    old.exec('CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE)');
    old.exec("INSERT INTO categories (id, name) VALUES (1, 'Food'), (2, 'Transport')");
    old.close();

    const db = openDatabase(path);
    const categories = createCategoryRepository(db).findAll();
    db.close();

    expect(categories).toEqual([
      { id: 1, name: 'Food', status: 'active', expenseCount: 0 },
      { id: 2, name: 'Transport', status: 'active', expenseCount: 0 },
    ]);
  });
});
