---
issue: SPD-6
spec_version: 3
revision: 2
---

# Implementation plan — SPD-6

## Approach
Server: categories get a `retired` flag (0/1). A new `categoryService` holds BR-22 to BR-25 (name trimming,
length, case-insensitive uniqueness, "at least one active"); `routes/categories.ts` validates the input shape and ids.
The category list returns `status` (`active` / `retired`) and `expenseCount` (non-deleted expenses over all months).
The expense service rejects a retired category on create, and on update unless it is the expense's current
category (BR-24); restore is unchanged. The budget service returns active categories only from `GET /budgets` and
rejects retired categories in `PUT /budgets`; the over-budget warning (SPD-5) is not changed.
Seeding of the default categories only runs on an empty `categories` table, so a renamed or retired default
stays as it is after a restart (AC-26). Existing databases get the new column through a small idempotent
migration at startup (`ALTER TABLE … ADD COLUMN` when missing), so no `db:reset` is needed.

Web: a new `CategoriesPage` (header link "Categories", hash `#/categories`) following
`design/screens/categories.html`. Pure helpers in `web/src/lib/categories.ts` order the management list (active
first, then retired), pick the categories an expense form offers (active, plus the edited expense's own retired
category last) and validate a name (BR-23). The Add and Edit expense forms use that helper; the expense list,
filter and summary keep using all categories; the Budgets screen already renders the rows the API returns.

No new dependency.

## Changes
| Area | File(s) | Change |
|---|---|---|
| DB | server/src/db/schema.ts, database.ts, seed.ts | `retired` column + migration; case-insensitive unique name index; seed defaults only into an empty table |
| API | server/src/repositories/categoryRepository.ts | List with status and expense count, find by id, create, rename, set retired, count active |
| API | server/src/services/categoryService.ts (new) | BR-23 name rules, BR-25, 404 for unknown ids |
| API | server/src/routes/categories.ts | `POST /categories`, `PATCH /categories/:id`, `POST /categories/:id/retire`, `POST /categories/:id/restore` |
| API | server/src/services/expenseService.ts, budgetService.ts | Retired category checks (BR-24); budgets list active only |
| Web | web/src/api/client.ts, types.ts | Category status/count, new client functions |
| Web | web/src/lib/categories.ts (new) | Ordering, form options, name validation |
| Web | web/src/pages/CategoriesPage.tsx + .module.css (new) | Categories screen |
| Web | web/src/App.tsx | "Categories" link and screen |
| Web | web/src/pages/AddExpensePage.tsx, EditExpensePage.tsx | Category select offers active categories (+ own retired one when editing) |

## Data model changes
`categories.retired INTEGER NOT NULL DEFAULT 0 CHECK (retired IN (0, 1))`; unique index on `name COLLATE NOCASE`
as a backstop of BR-23 (the service checks with full Unicode case folding first). Ids come from `INTEGER PRIMARY
KEY`; categories are never deleted, so ids are never reused. `data-model.md` updated.

## Acceptance criteria → tests
| AC | Test(s) |
|---|---|
| AC-1, AC-2 | web/src/App.test.tsx › "SPD-6 AC-1 …", "SPD-6 AC-2 …"; e2e/categories.spec.ts |
| AC-3 – AC-17, AC-23, AC-27 – AC-29 | web/src/pages/CategoriesPage.test.tsx (one test per AC); web/src/lib/categories.test.ts |
| AC-5, AC-6, AC-13, AC-18 – AC-22 | e2e/categories.spec.ts (journeys through the real API) |
| AC-6, AC-19, AC-22 | web/src/pages/AddExpensePage.test.tsx › "SPD-6 …" |
| AC-24, AC-25, AC-36 | server/test/categories.test.ts › budgets tests; web/src/pages/BudgetsPage.test.tsx |
| AC-26 | server/test/seed.test.ts › "AC-26 …" |
| AC-30 – AC-35, AC-38 | server/test/categories.test.ts |
| AC-37 | web/src/pages/EditExpensePage.test.tsx › "SPD-6 AC-37 …"; server/test/categories.test.ts |

## Context updates
- project-context/architecture/api.md (category endpoints, retired checks, budgets active only)
- project-context/architecture/data-model.md (categories.retired, seeding)
- project-context/architecture/overview.md (startup: migrate, seed defaults into an empty table)
- project-context/runbook.md (seed data, migration, `categories` Playwright project)
- project-context/conventions/testing.md (test data: categories are no longer fixed; e2e tests that change categories)

## Risks and notes
- Header tests of SPD-2/SPD-4 (including QA's `e2e/budgets-qa.spec.ts` and `e2e/summary.qa.spec.ts`, which asserted
  that "Categories" is absent) assert the exact header links; they are updated to the links SPD-6 AC-1 requires.
- Other e2e tests count exactly seven category options (six defaults). E2E tests that add categories therefore
  run in a separate Playwright project `categories` that depends on the main one, i.e. after all other tests.
- AC-23 (BR-25 alert) is not run end-to-end: it would leave all categories but one retired in the shared database.
  It is covered by the API and component tests.
- Web `Category` gains `status` and `expenseCount`; test fixtures are updated accordingly.
- `project-context/business/overview.md` is not changed (out of scope per the spec).

## Revision 2
| Feedback item | Resolution |
|---|---|
| AI review nit + admin Jira comment: stale SPD-2/SPD-4 header test titles in `web/src/App.test.tsx` | Fixed: both titles now name Expenses, Summary, Budgets and Categories. Rechecked all other header/link test titles in `web/src` and `e2e`; none lists the links by name. |
| AI review nit: Rename stays enabled while a save is in flight (`CategoriesPage.tsx`) | Fixed: Rename is disabled while busy, like Retire/Restore; new test in `CategoriesPage.test.tsx`. |
| Found while running the checks: `e2e/categories.spec.ts` AC-13 was flaky (the month was typed into the previous screen's Month field before the Summary screen rendered) | Fixed: the e2e journeys wait for the target screen's heading before filling the Month field. |
