/**
 * Database schema. Statements are idempotent and run on every startup.
 * Columns are snake_case; repositories map rows to camelCase objects.
 */
export const schema = `
CREATE TABLE IF NOT EXISTS categories (
  id   INTEGER PRIMARY KEY,
  name TEXT    NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS expenses (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  date         TEXT    NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  category_id  INTEGER NOT NULL REFERENCES categories (id),
  note         TEXT
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (date);
`;
