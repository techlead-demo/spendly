import type { DatabaseSync } from 'node:sqlite';
import { toLocalDate } from '../lib/dates.js';

/** BR-22: the categories of a new database, in category order. The user can rename and retire them later. */
export const defaultCategories = [
  { id: 1, name: 'Food' },
  { id: 2, name: 'Transport' },
  { id: 3, name: 'Housing' },
  { id: 4, name: 'Health' },
  { id: 5, name: 'Entertainment' },
  { id: 6, name: 'Other' },
] as const;

interface SampleExpense {
  /** Days before today, so sample data always covers the last two months up to today. */
  daysAgo: number;
  amountMinor: number;
  categoryId: number;
  note: string | null;
}

const sampleExpenses: SampleExpense[] = [
  { daysAgo: 57, amountMinor: 6_500_000, categoryId: 3, note: 'Monthly rent' },
  { daysAgo: 56, amountMinor: 45_000, categoryId: 2, note: 'Grab to office' },
  { daysAgo: 55, amountMinor: 320_000, categoryId: 1, note: 'Groceries at Co.opmart' },
  { daysAgo: 53, amountMinor: 35_000, categoryId: 1, note: 'Coffee' },
  { daysAgo: 51, amountMinor: 250_000, categoryId: 4, note: 'Pharmacy' },
  { daysAgo: 49, amountMinor: 180_000, categoryId: 5, note: 'Cinema tickets' },
  { daysAgo: 46, amountMinor: 650_000, categoryId: 3, note: 'Electricity bill' },
  { daysAgo: 44, amountMinor: 120_000, categoryId: 1, note: 'Lunch with team' },
  { daysAgo: 42, amountMinor: 100_000, categoryId: 2, note: 'Fuel' },
  { daysAgo: 39, amountMinor: 90_000, categoryId: 6, note: null },
  { daysAgo: 36, amountMinor: 410_000, categoryId: 1, note: 'Groceries' },
  { daysAgo: 33, amountMinor: 500_000, categoryId: 4, note: 'Dentist check-up' },
  { daysAgo: 30, amountMinor: 260_000, categoryId: 5, note: 'Concert' },
  { daysAgo: 28, amountMinor: 6_500_000, categoryId: 3, note: 'Monthly rent' },
  { daysAgo: 27, amountMinor: 40_000, categoryId: 2, note: 'Grab to office' },
  { daysAgo: 26, amountMinor: 280_000, categoryId: 1, note: 'Groceries at Co.opmart' },
  { daysAgo: 24, amountMinor: 30_000, categoryId: 1, note: 'Coffee' },
  { daysAgo: 23, amountMinor: 150_000, categoryId: 5, note: 'Streaming subscription' },
  { daysAgo: 21, amountMinor: 95_000, categoryId: 1, note: 'Pho with friends' },
  { daysAgo: 18, amountMinor: 100_000, categoryId: 2, note: 'Fuel' },
  { daysAgo: 15, amountMinor: 75_000, categoryId: 4, note: 'Vitamins' },
  { daysAgo: 12, amountMinor: 220_000, categoryId: 6, note: 'Birthday gift' },
  { daysAgo: 8, amountMinor: 380_000, categoryId: 1, note: 'Groceries' },
  { daysAgo: 4, amountMinor: 60_000, categoryId: 2, note: 'Bus card top-up' },
  { daysAgo: 0, amountMinor: 200_000, categoryId: 5, note: 'Bowling night' },
];

/**
 * Inserts the default categories into a database without categories. A database that has categories is left
 * alone, so a renamed or retired default category stays as the user left it (SPD-6 AC-26).
 */
export function seedCategories(db: DatabaseSync): void {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM categories').get() as { count: number };
  if (count > 0) return;
  const insert = db.prepare('INSERT INTO categories (id, name) VALUES (?, ?)');
  for (const category of defaultCategories) {
    insert.run(category.id, category.name);
  }
}

/**
 * Inserts the sample expenses into a new database.
 * Dates are relative to `today` (0 to 57 days before it): none is in the future and at least one is today, so the current month is never empty.
 */
export function seedSampleExpenses(db: DatabaseSync, today: Date = new Date()): void {
  const insert = db.prepare(
    'INSERT INTO expenses (date, amount_minor, category_id, note) VALUES (?, ?, ?, ?)',
  );
  db.exec('BEGIN');
  try {
    for (const expense of sampleExpenses) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - expense.daysAgo);
      insert.run(toLocalDate(date), expense.amountMinor, expense.categoryId, expense.note);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
