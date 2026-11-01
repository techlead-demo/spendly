import type { DatabaseSync } from 'node:sqlite';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db/database.js';

/** A fresh in-memory database (schema + default categories, no expenses) and an app on top of it. */
export function createTestContext() {
  const db = openDatabase(':memory:');
  return { db, app: createApp(db) };
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
