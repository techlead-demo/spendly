import type { DatabaseSync } from 'node:sqlite';
import type { Category } from '../types.js';

export interface CategoryRepository {
  findAll(): Category[];
}

export function createCategoryRepository(db: DatabaseSync): CategoryRepository {
  const findAll = db.prepare('SELECT id, name FROM categories ORDER BY id');

  return {
    findAll: () => findAll.all() as unknown as Category[],
  };
}
