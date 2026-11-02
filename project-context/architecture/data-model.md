# Data model

SQLite, schema in `server/src/db/schema.ts`. Columns are snake_case; the API uses camelCase.
Foreign keys are enforced (`PRAGMA foreign_keys = ON`).

## categories
| Column | Type | Constraints | API field |
|---|---|---|---|
| id | INTEGER | primary key; fixed values 1–6 | `id` |
| name | TEXT | not null, unique | `name` |

Fixed rows (inserted by `seedCategories` on every startup if missing):
1 Food, 2 Transport, 3 Housing, 4 Health, 5 Entertainment, 6 Other.

## expenses
| Column | Type | Constraints | API field |
|---|---|---|---|
| id | INTEGER | primary key, autoincrement | `id` |
| date | TEXT | not null, `YYYY-MM-DD` (CHECK on format), local date | `date` |
| amount_minor | INTEGER | not null, `> 0`; VND minor units (1 = 1 đồng) | `amountMinor` |
| category_id | INTEGER | not null, references `categories(id)` | `categoryId` |
| note | TEXT | nullable; `NULL` when there is no note; stored trimmed, at most 200 characters (BR-11, enforced by the expense service) | `note` (`string \| null`) |

Index: `idx_expenses_date` on `date`.

## Invariants
- Money is an integer; never store or compute it as a float.
- A month is queried as the half-open range `date >= 'YYYY-MM-01' AND date < '<next month>-01'` (`monthRange` in `server/src/lib/dates.ts`).
- Ordering of expense lists: `date DESC, id DESC`.

## Sample data
`seedSampleExpenses(db, today)` in `server/src/db/seed.ts`: 25 expenses across all categories, some without a note, dated 0 to 57 days before `today` (never in the future).
