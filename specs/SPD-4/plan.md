---
issue: SPD-4
spec_version: 1
revision: 0
---

# Implementation plan — SPD-4

## Approach
Budgets are stored as "change records": one row per category and start month with an amount, or `NULL` for a
removal. The budget in effect for a category in month X is the row with the latest `from_month <= X` (BR-16);
no row means no budget. Setting or clearing a budget from month M upserts the row `(category, M)` only, so earlier
months and rows of later months are untouched (BR-16, BR-17).

Server: `GET /api/v1/budgets?month=YYYY-MM` returns all six categories in id order with `amountMinor` or `null`.
`PUT /api/v1/budgets` with `{ month, items: [{ categoryId, amountMinor | null }] }` sets or removes the listed
categories from `month` onward in one transaction and returns the budgets of `month`. The route validates the shape
(`YYYY-MM`, positive safe integers or `null`, no duplicate categories); `budgetService` applies BR-18 (month not
before the current month, from an injectable clock `now` passed to `createApp`) and checks that every category
exists before anything is written, so a request is stored completely or not at all.

Web: header navigation (hash based, the same pattern as the SPD-2 branch: `#/`, `#/summary`, `#/budgets`) with
"Expenses", "Summary" and "Budgets". A new `BudgetsPage` follows the wireframe: Month picker (default and `min` =
current month), hint, table with one numeric input per category, Save, status text and the loading, load-error,
save-error, validation and past-month (read-only) states. Pure validation in `lib/budgetForm.ts` reuses
`parseAmountMinor` of SPD-1, so the input rules and the message are the same; only the categories whose value
differs from the budget in effect are sent (A-2). When nothing changed, Save shows "Budgets saved." without a request.

## Changes
| Area | File(s) | Change |
|---|---|---|
| DB | server/src/db/schema.ts | New table `budgets` |
| API | server/src/repositories/budgetRepository.ts | Budgets in effect for a month; upsert records in a transaction |
| API | server/src/services/budgetService.ts | BR-18 (current month or later), category existence |
| API | server/src/routes/budgets.ts | `GET` and `PUT /api/v1/budgets`, input validation |
| API | server/src/app.ts, server/src/types.ts, server/src/lib/dates.ts | Wiring, `now` option, budget types |
| Web | web/src/App.tsx, App.module.css | Header navigation Expenses / Summary / Budgets |
| Web | web/src/pages/SummaryPlaceholderPage.tsx | Placeholder for the Summary link until SPD-2 is merged |
| Web | web/src/pages/BudgetsPage.tsx, BudgetsPage.module.css | Budgets screen per `specs/SPD-4/wireframes/budgets.html` |
| Web | web/src/lib/budgetForm.ts, web/src/api/client.ts, types.ts | Validation/diff helper, `fetchBudgets`, `saveBudgets` |

## Data model changes
New table `budgets (category_id, from_month, amount_minor NULL)`, primary key `(category_id, from_month)`;
documented in `project-context/architecture/data-model.md`. Expenses and categories unchanged.

## Acceptance criteria → tests
| AC | Test(s) |
|---|---|
| AC-1, AC-2 | web/src/App.test.tsx; e2e/budgets.spec.ts |
| AC-3 – AC-11, AC-15, AC-16 | web/src/pages/BudgetsPage.test.tsx; server/test/budgets.test.ts (carry-forward rules); e2e/budgets.spec.ts (AC-4 – AC-9 journey) |
| AC-12 – AC-14 | web/src/lib/budgetForm.test.ts; web/src/pages/BudgetsPage.test.tsx; e2e/budgets.spec.ts |
| AC-17 – AC-23 | web/src/pages/BudgetsPage.test.tsx |
| AC-24 – AC-29 | server/test/budgets.test.ts |

## Context updates
`architecture/data-model.md`, `architecture/api.md`, `architecture/overview.md` (navigation, new files).

## Risks and notes
- SPD-2 (header navigation and the Summary screen) is not merged into `develop` yet. AC-1 needs a "Summary" link,
  so this branch adds the same hash navigation as the SPD-2 branch and a small Summary placeholder page. When
  SPD-2 is merged, `App.tsx` will conflict: keep SPD-2's `SummaryPage`, the expense add/list views of SPD-1 and the
  Budgets link of this change, and delete `SummaryPlaceholderPage.tsx`.
- The spec front matter still says `status: draft`, although the task says it is approved.
- e2e tests share one in-memory database; the budgets journey uses months several years ahead so it does not
  depend on today's date or on other tests.
- No new dependency.

## Revision 2
| Feedback item | Resolution |
|---|---|
| AI review: a save that finishes after a month change can overwrite the new month's data (`BudgetsPage.tsx` line 96) | Fixed. Each month load increments a `loadId` ref; the save keeps the id it started with and ignores its response or error if the id changed. Test: "AC-19: a save that finishes after a month change does not replace the new month". |
| AI review: after a failed categories load, changing the month leaves the page on "Loading…" (`BudgetsPage.tsx` line 48) | Fixed. The categories error is kept in its own `categoriesFailed` state, which a month change does not reset, so the load error stays (AC-22). Test: "AC-22: keeps the load error after a month change when the categories failed to load". |
| Human reviewer: "Need to fix these minors" | Fixed by the two items above. |
