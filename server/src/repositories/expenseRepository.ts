import type { DatabaseSync } from 'node:sqlite';
import { monthRange } from '../lib/dates.js';
import type { CategorySummary, Expense } from '../types.js';

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
  /** Count and total per category that has expenses in the month, ordered by category id. */
  sumByCategory(month: string): CategorySummary[];
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
  const findByMonth = db.prepare(
    `SELECT ${columns} FROM expenses WHERE date >= ? AND date < ? ${order}`,
  );
  const findByMonthAndCategory = db.prepare(
    `SELECT ${columns} FROM expenses WHERE date >= ? AND date < ? AND category_id = ? ${order}`,
  );
  const sumByMonth = db.prepare(
    'SELECT COALESCE(SUM(amount_minor), 0) AS total FROM expenses WHERE date >= ? AND date < ?',
  );
  const sumByCategory = db.prepare(
    `SELECT e.category_id, c.name AS category_name, COUNT(*) AS count, SUM(e.amount_minor) AS total_minor
     FROM expenses e JOIN categories c ON c.id = e.category_id
     WHERE e.date >= ? AND e.date < ?
     GROUP BY e.category_id, c.name
     ORDER BY e.category_id`,
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
  };
}
