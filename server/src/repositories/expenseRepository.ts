import type { DatabaseSync } from 'node:sqlite';
import { monthRange } from '../lib/dates.js';
import type { Expense, NewExpense } from '../types.js';

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

export interface ExpenseRepository {
  /** Expenses of the month, newest date first (ties: newest id first). */
  findByMonth(filter: ExpenseFilter): Expense[];
  sumByMonth(month: string): number;
  create(expense: NewExpense): Expense;
}

export function createExpenseRepository(db: DatabaseSync): ExpenseRepository {
  const columns = 'id, date, amount_minor, category_id, note';
  const order = 'ORDER BY date DESC, id DESC';
  const findByMonth = db.prepare(
    `SELECT ${columns} FROM expenses WHERE date >= ? AND date < ? ${order}`,
  );
  const findByMonthAndCategory = db.prepare(
    `SELECT ${columns} FROM expenses WHERE date >= ? AND date < ? AND category_id = ? ${order}`,
  );
  const sumByMonth = db.prepare(
    'SELECT COALESCE(SUM(amount_minor), 0) AS total FROM expenses WHERE date >= ? AND date < ?',
  );
  const insert = db.prepare(
    `INSERT INTO expenses (date, amount_minor, category_id, note) VALUES (?, ?, ?, ?) RETURNING ${columns}`,
  );

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
    create({ date, amountMinor, categoryId, note }) {
      const row = insert.get(date, amountMinor, categoryId, note) as unknown as ExpenseRow;
      return toExpense(row);
    },
  };
}
