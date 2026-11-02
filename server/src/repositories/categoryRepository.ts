import type { DatabaseSync } from 'node:sqlite';
import type { Category } from '../types.js';

export interface CategoryRepository {
  findAll(): Category[];
  exists(id: number): boolean;
}

export function createCategoryRepository(db: DatabaseSync): CategoryRepository {
  const findAll = db.prepare('SELECT id, name FROM categories ORDER BY id');
  const findById = db.prepare('SELECT id FROM categories WHERE id = ?');

  return {
    findAll: () => findAll.all() as unknown as Category[],
    exists: (id) => findById.get(id) !== undefined,
  };
}
