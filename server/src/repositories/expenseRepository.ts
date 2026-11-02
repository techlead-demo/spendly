import type { DatabaseSync } from 'node:sqlite';
import { monthRange } from '../lib/dates.js';
import type { CategorySummary, Expense, NewExpense } from '../types.js';

interface ExpenseRow {
  id: number;
  date: string;
  amount_minor: number;
  category_id: number;
  note: string | null;
}

function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    date: row.date,
    amountMinor: row.amount_minor,
    categoryId: row.category_id,
    note: row.note,
  };
}

export interface ExpenseFilter {
  /** "YYYY-MM" */
  month: string;
  categoryId?: number;
}

/**
 * All reads except `restore` skip deleted expenses (BR-21): a deleted expense counts nowhere until it is restored.
 */
export interface ExpenseRepository {
  /** Expenses of the month, newest date first (ties: newest id first). */
  findByMonth(filter: ExpenseFilter): Expense[];
  sumByMonth(month: string): number;
  /** Count and total per category that has expenses in the month, ordered by category id. */
  sumByCategory(month: string): CategorySummary[];
  /** The expense, or undefined when it does not exist or is deleted. */
  findById(id: number): Expense | undefined;
  create(expense: NewExpense): Expense;
  /** Replaces the fields of a not-deleted expense; undefined when there is none with this id. */
  update(id: number, expense: NewExpense): Expense | undefined;
  /** Marks a not-deleted expense deleted; false when there is none with this id. */
  markDeleted(id: number): boolean;
  /** Clears the deleted mark (also when not set); undefined when the id was never recorded. */
  restore(id: number): Expense | undefined;
}

interface CategorySummaryRow {
  category_id: number;
  category_name: string;
  count: number;
  total_minor: number;
}

export function createExpenseRepository(db: DatabaseSync): ExpenseRepository {
  const columns = 'id, date, amount_minor, category_id, note';
  const order = 'ORDER BY date DESC, id DESC';
  const active = 'deleted = 0';
  const findByMonth = db.prepare(
    `SELECT ${columns} FROM expenses WHERE ${active} AND date >= ? AND date < ? ${order}`,
  );
  const findByMonthAndCategory = db.prepare(
    `SELECT ${columns} FROM expenses WHERE ${active} AND date >= ? AND date < ? AND category_id = ? ${order}`,
  );
  const sumByMonth = db.prepare(
    `SELECT COALESCE(SUM(amount_minor), 0) AS total FROM expenses WHERE ${active} AND date >= ? AND date < ?`,
  );
  const sumByCategory = db.prepare(
    `SELECT e.category_id, c.name AS category_name, COUNT(*) AS count, SUM(e.amount_minor) AS total_minor
     FROM expenses e JOIN categories c ON c.id = e.category_id
     WHERE e.deleted = 0 AND e.date >= ? AND e.date < ?
     GROUP BY e.category_id, c.name
     ORDER BY e.category_id`,
  );
  const findById = db.prepare(`SELECT ${columns} FROM expenses WHERE ${active} AND id = ?`);
  const insert = db.prepare(
    `INSERT INTO expenses (date, amount_minor, category_id, note) VALUES (?, ?, ?, ?) RETURNING ${columns}`,
  );
  const update = db.prepare(
    `UPDATE expenses SET date = ?, amount_minor = ?, category_id = ?, note = ?
     WHERE ${active} AND id = ? RETURNING ${columns}`,
  );
  const markDeleted = db.prepare(`UPDATE expenses SET deleted = 1 WHERE ${active} AND id = ?`);
  const restore = db.prepare(`UPDATE expenses SET deleted = 0 WHERE id = ? RETURNING ${columns}`);

  return {
    findByMonth({ month, categoryId }) {
      const { from, to } = monthRange(month);
      const rows =
        categoryId === undefined
          ? findByMonth.all(from, to)
          : findByMonthAndCategory.all(from, to, categoryId);
      return (rows as unknown as ExpenseRow[]).map(toExpense);
    },
    sumByMonth(month) {
      const { from, to } = monthRange(month);
      const { total } = sumByMonth.get(from, to) as { total: number };
      return total;
    },
    sumByCategory(month) {
      const { from, to } = monthRange(month);
      const rows = sumByCategory.all(from, to) as unknown as CategorySummaryRow[];
      return rows.map((row) => ({
        categoryId: row.category_id,
        categoryName: row.category_name,
        count: row.count,
        totalMinor: row.total_minor,
      }));
    },
    findById(id) {
      const row = findById.get(id) as unknown as ExpenseRow | undefined;
      return row && toExpense(row);
    },
    create({ date, amountMinor, categoryId, note }) {
      const row = insert.get(date, amountMinor, categoryId, note) as unknown as ExpenseRow;
      return toExpense(row);
    },
    update(id, { date, amountMinor, categoryId, note }) {
      const row = update.get(date, amountMinor, categoryId, note, id) as unknown as ExpenseRow | undefined;
      return row && toExpense(row);
    },
    markDeleted(id) {
      return Number(markDeleted.run(id).changes) > 0;
    },
    restore(id) {
      const row = restore.get(id) as unknown as ExpenseRow | undefined;
      return row && toExpense(row);
    },
  };
}
