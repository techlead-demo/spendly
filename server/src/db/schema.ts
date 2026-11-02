import type { DatabaseSync } from 'node:sqlite';

/**
 * Database schema. Statements are idempotent and run on every startup.
 * Columns are snake_case; repositories map rows to camelCase objects.
 */
export const schema = `
-- BR-22/BR-24: categories are never deleted, so ids are never reused; retired = 1 hides a category from new choices.
CREATE TABLE IF NOT EXISTS categories (
  id      INTEGER PRIMARY KEY,
  name    TEXT    NOT NULL UNIQUE,
  retired INTEGER NOT NULL DEFAULT 0 CHECK (retired IN (0, 1))
);

CREATE TABLE IF NOT EXISTS expenses (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  date         TEXT    NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  category_id  INTEGER NOT NULL REFERENCES categories (id),
  note         TEXT,
  -- BR-21: a deleted expense is kept (1) so that Undo can restore it with the same id.
  deleted      INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (date);

-- BR-16/BR-17: a budget set (amount) or removed (NULL) for a category from from_month onward.
CREATE TABLE IF NOT EXISTS budgets (
  category_id  INTEGER NOT NULL REFERENCES categories (id),
  from_month   TEXT    NOT NULL CHECK (from_month GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  amount_minor INTEGER CHECK (amount_minor IS NULL OR amount_minor > 0),
  PRIMARY KEY (category_id, from_month)
);
`;

/** Indexes that depend on columns added by `migrate`, so they are created after it. */
const indexes = `
-- BR-23 backstop: names are unique ignoring (ASCII) letter case; the category service checks full case folding.
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_nocase ON categories (name COLLATE NOCASE);
`;

/** Brings a database created by an earlier version up to the current schema. Idempotent. */
export function migrate(db: DatabaseSync): void {
  const columns = db.prepare('PRAGMA table_info(categories)').all() as unknown as { name: string }[];
  if (!columns.some((column) => column.name === 'retired')) {
    // SPD-6: every existing category stays active.
    db.exec('ALTER TABLE categories ADD COLUMN retired INTEGER NOT NULL DEFAULT 0 CHECK (retired IN (0, 1))');
  }
  db.exec(indexes);
}
