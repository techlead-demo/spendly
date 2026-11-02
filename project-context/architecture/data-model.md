# Data model

SQLite, schema in `server/src/db/schema.ts`. Columns are snake_case; the API uses camelCase.
Foreign keys are enforced (`PRAGMA foreign_keys = ON`).

## categories
| Column | Type | Constraints | API field |
|---|---|---|---|
| id | INTEGER | primary key; 1–6 are the default categories, added categories get the next id | `id` |
| name | TEXT | not null, unique; trimmed, 1–40 characters, unique ignoring letter case (BR-23) | `name` |
| retired | INTEGER | not null, default `0`, `0` or `1`; `1` = retired (BR-24) | `status` (`"active"` / `"retired"`) |

Index: `idx_categories_name_nocase` (unique) on `name COLLATE NOCASE`, a backstop of BR-23 for ASCII letter case;
`categoryService` checks uniqueness with full Unicode case folding before writing.

Categories are never deleted, so ids are never reused; the category order (BR-22) is `id`. Renaming changes the
row in place, so every expense (which refers to `category_id`) shows the new name. Retiring or restoring only flips
`retired`; no expense or budget changes. `GET /api/v1/categories` derives `expenseCount` from the non-deleted
expenses of the category.

Default rows, inserted by `seedCategories` only when the table is empty (a new database), so a renamed or retired
default category stays as the user left it after a restart: 1 Food, 2 Transport, 3 Housing, 4 Health,
5 Entertainment, 6 Other. A database from before SPD-6 gets the `retired` column (all categories active) from
`migrate` in `server/src/db/schema.ts` at startup.

## expenses
| Column | Type | Constraints | API field |
|---|---|---|---|
| id | INTEGER | primary key, autoincrement | `id` |
| date | TEXT | not null, `YYYY-MM-DD` (CHECK on format), local date | `date` |
| amount_minor | INTEGER | not null, `> 0`; VND minor units (1 = 1 đồng) | `amountMinor` |
| category_id | INTEGER | not null, references `categories(id)` | `categoryId` |
| note | TEXT | nullable; `NULL` when there is no note; stored trimmed, at most 200 characters (BR-11, enforced by the `POST /api/v1/expenses` and `PUT /api/v1/expenses/:id` routes) | `note` (`string \| null`) |
| deleted | INTEGER | not null, default `0`, `0` or `1`; `1` = deleted by the user, kept so Undo can restore it (BR-21) | not exposed |

Index: `idx_expenses_date` on `date`.

Edits update the row in place, so an edited expense keeps its `id` and its place in recording order (BR-20).
A delete sets `deleted = 1`; a restore sets it back to `0` (same `id`, values and order). Every read in
`expenseRepository` (lists, month total, summary, get by id) skips deleted rows; only the restore statement sees
them. Deleted rows are never purged (out of scope of SPD-3).

## budgets
One row per change of a category's budget: set (amount) or removed (`NULL`) from `from_month` onward (BR-16, BR-17).
| Column | Type | Constraints | API field |
|---|---|---|---|
| category_id | INTEGER | not null, references `categories(id)` | `categoryId` |
| from_month | TEXT | not null, `YYYY-MM` (CHECK on format); first month the row applies to | `month` of `PUT /api/v1/budgets` |
| amount_minor | INTEGER | nullable, `> 0` when set; VND minor units; `NULL` = budget removed (no limit) | `amountMinor` (`number \| null`) |

Primary key: `(category_id, from_month)`. Setting or removing a budget from month M upserts the row `(category, M)`;
rows of other months are never changed.

**Budget in effect** for a category in month X: `amount_minor` of that category's row with the greatest
`from_month <= X`; no such row (or a `NULL` amount) means no budget. `budgetRepository.findInEffect` implements this;
SPD-5 and SPD-8 must use the same rule.

## Invariants
- Money is an integer; never store or compute it as a float.
- A month is queried as the half-open range `date >= 'YYYY-MM-01' AND date < '<next month>-01'` (`monthRange` in `server/src/lib/dates.ts`).
- Ordering of expense lists: `date DESC, id DESC`.
- Deleted expenses (`deleted = 1`) count in no list, total or summary.
- At least one category is active (BR-25); a new expense, a changed expense category and a budget need an active
  category (BR-24, enforced by the services).

## Sample data
`seedSampleExpenses(db, today)` in `server/src/db/seed.ts`: 25 expenses across all categories, some without a note, dated 0 to 57 days before `today` (never in the future).
