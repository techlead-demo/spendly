import type { DatabaseSync } from 'node:sqlite';
import type { Category } from '../types.js';

interface CategoryRow {
  id: number;
  name: string;
  retired: number;
  expense_count: number;
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    status: row.retired ? 'retired' : 'active',
    expenseCount: row.expense_count,
  };
}

export interface CategoryRepository {
  /** All categories in category order (id, BR-22). */
  findAll(): Category[];
  /** The category, or undefined when there is none with this id. */
  findById(id: number): Category | undefined;
  /** Adds an active category at the end of the category order. */
  create(name: string): Category;
  /** Undefined when there is no category with this id. */
  rename(id: number, name: string): Category | undefined;
  /** Undefined when there is no category with this id. */
  setRetired(id: number, retired: boolean): Category | undefined;
  countActive(): number;
}

export function createCategoryRepository(db: DatabaseSync): CategoryRepository {
  const select = `
    SELECT c.id, c.name, c.retired,
           (SELECT COUNT(*) FROM expenses e WHERE e.category_id = c.id AND e.deleted = 0) AS expense_count
      FROM categories c`;
  const findAll = db.prepare(`${select} ORDER BY c.id`);
  const findById = db.prepare(`${select} WHERE c.id = ?`);
  const insert = db.prepare('INSERT INTO categories (name) VALUES (?) RETURNING id');
  const rename = db.prepare('UPDATE categories SET name = ? WHERE id = ?');
  const setRetired = db.prepare('UPDATE categories SET retired = ? WHERE id = ?');
  const countActive = db.prepare('SELECT COUNT(*) AS count FROM categories WHERE retired = 0');

  function get(id: number): Category | undefined {
    const row = findById.get(id) as unknown as CategoryRow | undefined;
    return row && toCategory(row);
  }

  return {
    findAll: () => (findAll.all() as unknown as CategoryRow[]).map(toCategory),
    findById: get,
    create(name) {
      const { id } = insert.get(name) as { id: number };
      return get(id)!;
    },
    rename(id, name) {
      rename.run(name, id);
      return get(id);
    },
    setRetired(id, retired) {
      setRetired.run(retired ? 1 : 0, id);
      return get(id);
    },
    countActive() {
      const { count } = countActive.get() as { count: number };
      return count;
    },
  };
}
