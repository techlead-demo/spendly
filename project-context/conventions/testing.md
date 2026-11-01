# Testing conventions

Every acceptance criterion has at least one automated test, and the test name or the plan says which AC it covers.

## Levels
| Level | Tool | Location | Run | Use for |
|---|---|---|---|---|
| API / server unit | Vitest + Supertest | `server/test/*.test.ts` | `npm test` | Every endpoint: success, filtering, ordering, validation errors (400), not found (404), business rules |
| Web unit / component | Vitest + Testing Library (jsdom) | `web/src/**/X.test.ts(x)` next to the file | `npm test` | Pure helpers in `lib/`, presentational components, form validation |
| End-to-end | Playwright (Chromium) | `e2e/*.spec.ts` | `npx playwright test` | One or two user journeys per feature through the real UI and API |

`npm test` runs both workspaces. Run one workspace with `npm test --workspace server` (or `web`); one file with `npm test --workspace server -- test/expenses.test.ts`.

## Server tests
- Build a fresh app per test with `createTestContext()` from `server/test/helpers.ts`: in-memory DB with schema and the fixed categories, **no** sample expenses.
- Insert exactly the data the test needs with `insertExpense(db, {...})` (add similar helpers for new tables). Use fixed dates (e.g. `2026-10-15`), not "today".
- Call the API with Supertest: `await request(app).get('/api/v1/expenses').query({ month: '2026-10' })`.
- Assert status and the full body (`toEqual`) for the main case; assert `error.code` for errors.
- Cover month boundaries (first and last day of the month, neighbouring months) for anything grouped by month.
- Structure: `describe('<METHOD> <path>')`, `it('<behaviour in plain English>')`, arrange / act / assert separated by blank lines.

## Web tests
- Test behaviour visible to the user: query by role, label or text (`getByRole('cell', ...)`, `getByLabelText`), not by CSS class.
- Components get data through props; no network in unit tests. For pages, mock `api/client.ts` functions with `vi.mock`.
- Normalise the non-breaking space that `Intl` puts before `₫` when comparing money text.

## E2E tests
- The Playwright `webServer` starts the API with `DB_PATH=:memory:` (fresh sample data each run) and the Vite dev server, on `API_PORT` / `WEB_PORT`.
- Sample data dates are relative to today; assert on stable facts (notes such as "Monthly rent", counts), not on exact totals or dates.
- Tests that create data must not depend on test order; create what you need inside the test and find it by its unique note.
- Use role and label locators and web-first assertions (`await expect(locator).toBeVisible()`); no fixed `waitForTimeout`.
- Name files after the screen or feature: `e2e/expense-list.spec.ts`.

## Test data
- Fixed categories: 1 Food, 2 Transport, 3 Housing, 4 Health, 5 Entertainment, 6 Other.
- Amounts are realistic VND integers (`45_000`, `6_500_000`), never floats.
