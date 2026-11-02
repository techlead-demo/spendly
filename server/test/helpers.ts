import type { DatabaseSync } from 'node:sqlite';
import { createApp, type AppOptions } from '../src/app.js';
import { openDatabase } from '../src/db/database.js';

/** A fresh in-memory database (schema + default categories, no expenses) and an app on top of it. */
export function createTestContext(options?: AppOptions) {
  const db = openDatabase(':memory:');
  return { db, app: createApp(db, options) };
}

/** Inserts a budget record (set from `fromMonth` onward, or removed when `amountMinor` is null). */
export function insertBudget(
  db: DatabaseSync,
  budget: { categoryId: number; fromMonth: string; amountMinor: number | null },
): void {
  db.prepare('INSERT INTO budgets (category_id, from_month, amount_minor) VALUES (?, ?, ?)').run(
    budget.categoryId,
    budget.fromMonth,
    budget.amountMinor,
  );
}

export interface ExpenseFixture {
  date: string;
  amountMinor: number;
  categoryId: number;
  note?: string | null;
}

/** Inserts an expense directly into the database and returns its id. */
export function insertExpense(db: DatabaseSync, expense: ExpenseFixture): number {
  const result = db
    .prepare('INSERT INTO expenses (date, amount_minor, category_id, note) VALUES (?, ?, ?, ?)')
    .run(expense.date, expense.amountMinor, expense.categoryId, expense.note ?? null);
  return Number(result.lastInsertRowid);
}
