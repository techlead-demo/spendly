import type { DatabaseSync } from 'node:sqlite';
import type { Budget } from '../types.js';

interface BudgetRow {
  category_id: number;
  amount_minor: number | null;
}

export interface BudgetRepository {
  /** BR-16: per category (ordered by id), the amount of the record with the latest start month not after `month`. */
  findInEffect(month: string): Budget[];
  /** Sets (amount) or removes (null) the budgets from `month` onward; all items or none are stored. */
  saveFrom(month: string, items: Budget[]): void;
}

export function createBudgetRepository(db: DatabaseSync): BudgetRepository {
  const findInEffect = db.prepare(`
    SELECT c.id AS category_id,
           (SELECT b.amount_minor FROM budgets b
             WHERE b.category_id = c.id AND b.from_month <= ?
             ORDER BY b.from_month DESC LIMIT 1) AS amount_minor
      FROM categories c
     ORDER BY c.id`);
  const upsert = db.prepare(`
    INSERT INTO budgets (category_id, from_month, amount_minor) VALUES (?, ?, ?)
    ON CONFLICT (category_id, from_month) DO UPDATE SET amount_minor = excluded.amount_minor`);

  return {
    findInEffect(month) {
      const rows = findInEffect.all(month) as unknown as BudgetRow[];
      return rows.map((row) => ({ categoryId: row.category_id, amountMinor: row.amount_minor }));
    },
    saveFrom(month, items) {
      db.exec('BEGIN');
      try {
        for (const item of items) {
          upsert.run(item.categoryId, month, item.amountMinor);
        }
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
