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

-- BR-16/BR-17: a budget set (amount) or removed (NULL) for a category from from_month onward.
CREATE TABLE IF NOT EXISTS budgets (
  category_id  INTEGER NOT NULL REFERENCES categories (id),
  from_month   TEXT    NOT NULL CHECK (from_month GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  amount_minor INTEGER CHECK (amount_minor IS NULL OR amount_minor > 0),
  PRIMARY KEY (category_id, from_month)
);
`;
