# Architecture overview

## Components
| Component | Directory | Runtime | Role |
|---|---|---|---|
| Web app | `web/` | Browser; Vite dev server on `WEB_PORT` (5101) | React 18 single page, CSS Modules. Calls the API with `fetch` on relative `/api/v1/...` URLs. |
| API | `server/` | Node 24, TypeScript run by `tsx`, Express 4 on `API_PORT` (5102) | REST API under `/api/v1`, JSON only. |
| Database | `server/data/spendly.db` (`DB_PATH`) | SQLite through Node's built-in `node:sqlite` (`DatabaseSync`, synchronous) | One file; `:memory:` in tests and e2e. |
| E2E tests | `e2e/` | Playwright (Chromium) | Starts API (in-memory DB) and web via `webServer` in `playwright.config.ts`. |

npm workspaces: the root `package.json` has the shared scripts; `server/` and `web/` are workspaces with their own `package.json`, `tsconfig.json` and Vitest config.

## Directories
```
server/src/
  index.ts            entry: load config, open DB, seed a new DB, listen
  app.ts              createApp(db): wires repositories → services → routers, error handling
  config.ts           env → Config (API_PORT, DB_PATH)
  errors.ts           HttpError, validationError(), 404 and error middleware
  types.ts            API resource types (camelCase)
  routes/             one Express Router per resource: parse + validate input, call a service or repository, send JSON
  services/           business logic that spans repositories or applies business rules
  repositories/       all SQL; prepared statements; row (snake_case) → resource (camelCase)
  db/                 schema.ts, database.ts (openDatabase), seed.ts (categories + sample expenses), reset.ts
  lib/                pure helpers (dates)
server/test/          Vitest + Supertest tests, helpers.ts
web/src/
  main.tsx, App.tsx   entry and app shell (header with navigation + page). Hash navigation picks the screen
                      (`#/` Expenses, `#/summary` Summary, `#/budgets` Budgets, `#/expenses/<id>/edit` Edit
                      expense); the Expenses screen holds its view (list | add), the list filter and the undo toast
  pages/              one component per screen (ExpenseListPage, AddExpensePage, EditExpensePage, SummaryPage,
                      BudgetsPage)
  components/         reusable presentational components (ExpenseTable, ExpenseFormFields, DeleteExpenseDialog,
                      UndoToast, SummaryTable)
  api/                client.ts (fetch wrappers, ApiError) and types.ts (API shapes)
  lib/                pure helpers (money, dates, share, expenseForm validation, navigation hashes) with
                      co-located tests
  styles/global.css   imports project-context/design/tokens.css, base element styles
```

## Request flow
1. The browser loads the page from Vite (`http://localhost:5101`).
2. `ExpenseListPage` calls `fetchExpenses(month, categoryId)` → `GET /api/v1/expenses?month=2026-11&categoryId=1`.
3. Vite's dev proxy forwards `/api` to `http://localhost:${API_PORT}`.
4. Express: `routes/expenses.ts` validates the query (400 `VALIDATION_ERROR` on bad input) → `services/expenseService.ts` → `repositories/expenseRepository.ts` (SQL) → JSON response.
5. Thrown `HttpError`s and unexpected errors are turned into the standard error body by `errorHandler` in `errors.ts`.

## Startup and data
- `openDatabase(path)` creates the directory and file if needed, enables foreign keys, runs the idempotent schema (`CREATE TABLE IF NOT EXISTS`) and `migrate` (columns added later, e.g. `categories.retired`), and inserts the default categories when the `categories` table is empty.
- When the database file did not exist before startup (or is `:memory:`), `index.ts` inserts the sample expenses (`seedSampleExpenses`).
- There is no migration tool. Schema changes go into `db/schema.ts`; an existing local DB is rebuilt with `npm run db:reset` (see runbook).

## Navigation
Hash based, no router dependency: `#/` Expenses, `#/summary` Summary, `#/budgets` Budgets. The header links set the
hash; `App` follows `hashchange`. The Expenses screen switches between the list and the Add expense form with a view
state; it unmounts while another screen is shown, so coming back opens the list on the current month (BR-6).

The Edit expense form has its own hash `#/expenses/<id>/edit` (`lib/navigation.ts`), so a reload or a stale link
shows the "no longer exists" state. It belongs to the Expenses screen, so Cancel and Delete return to the list
with the filter it had. After a delete the Expenses screen shows the "Expense deleted." toast with Undo for
5 seconds; it closes when the user leaves the list.

## Clock
`createApp(db, { now })` takes the clock for rules that depend on today (BR-18: budgets only from the current month).
It defaults to the system clock; server tests pass a fixed date.

## Not present yet
No router library (see Navigation), no state library, no auth, no build/deploy pipeline beyond CI.
