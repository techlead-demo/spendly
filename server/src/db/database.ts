import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { migrate, schema } from './schema.js';
import { seedCategories } from './seed.js';

/**
 * Opens (or creates) the SQLite database, applies the schema and inserts the default categories into a new one.
 * Use ":memory:" for tests.
 */
export function openDatabase(path: string): DatabaseSync {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(schema);
  migrate(db);
  seedCategories(db);
  return db;
}
