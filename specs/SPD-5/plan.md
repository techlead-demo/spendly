---
issue: SPD-5
spec_version: 1
revision: 0
---

# Implementation plan — SPD-5

## Approach
The API gets one read endpoint, `GET /api/v1/budgets/over?month=YYYY-MM`. The spec leaves the choice open; the
endpoint keeps the new rule BR-19 in a server service, as the layering convention asks for business rules. One
request also replaces two (summary and budgets). `budgetService.getOverBudget(month)` combines the existing
`expenseRepository.sumByCategory` (BR-13 category totals, unfiltered) with `budgetRepository.findInEffect` (BR-16).
It keeps categories whose total is strictly greater than their budget, and sorts them by amount over, descending.
Ties keep category order because `sumByCategory` is ordered by id and the sort is stable. No SQL and no stored data
are added.

The expense list page loads the endpoint for the selected month, separately from the expenses. It depends on
`month` only, so the category filter does not change the banner (AC-12). An empty month is skipped as for the list,
so the banner stays (AC-13). The banner is cleared when the month changes, so nothing is shown while loading
(AC-17), and a failed request leaves it out without an error (AC-18). A new presentational `OverBudgetBanner`
component renders the mockup's warning banner between the title row and the filters. Pure helpers in
`lib/overBudget.ts` build the heading ("this month" or "in MM/YYYY", singular or plural) and the lines with
`formatMoney`.

## Changes
| Area | File(s) | Change |
|---|---|---|
| API | server/src/routes/budgets.ts | New `GET /api/v1/budgets/over?month=` (month validated like the other endpoints) |
| API | server/src/services/budgetService.ts, server/src/app.ts | `getOverBudget` (BR-19); the service gets the expense repository |
| API | server/src/types.ts | `OverBudgetCategory`, `MonthOverBudget` |
| Web | web/src/api/client.ts, web/src/api/types.ts | `fetchOverBudget(month)` and the response types |
| Web | web/src/lib/overBudget.ts | Heading and line text |
| Web | web/src/components/OverBudgetBanner.tsx (+ .module.css) | Warning banner per `design/screens/expense-list-over-budget.html` |
| Web | web/src/pages/ExpenseListPage.tsx | Loads the banner data per month; renders the banner above the filters |
| Tests | server/test/overBudget.test.ts, web/src/lib/overBudget.test.ts, web/src/pages/ExpenseListPage.test.tsx, e2e/over-budget.spec.ts | New; `web/src/App.test.tsx` mocks `fetchOverBudget` |

## Data model changes
None.

## Acceptance criteria → tests
| AC | Test(s) |
|---|---|
| AC-1 | server/test/overBudget.test.ts › "AC-1, AC-2: …"; web/src/pages/ExpenseListPage.test.tsx › "AC-1: …"; web/src/lib/overBudget.test.ts › "AC-1: …"; e2e/over-budget.spec.ts › "AC-1, AC-2, AC-10, AC-12, AC-15: …" |
| AC-2 | server/test/overBudget.test.ts › "AC-1, AC-2: …"; e2e/over-budget.spec.ts › "AC-1, AC-2, …" |
| AC-3 | server › "AC-3: …"; ExpenseListPage.test.tsx › "AC-3: …"; overBudget.test.ts › "AC-3: …" |
| AC-4 | server › "AC-4: …" |
| AC-5 | server › "AC-5: …" |
| AC-6 | server › "AC-6: …"; overBudget.test.ts › "AC-6: …" |
| AC-7 | server › "AC-7: …"; ExpenseListPage.test.tsx › "AC-7, AC-8: …"; e2e › "AC-7, AC-14: …" |
| AC-8 | server › "AC-8: …"; ExpenseListPage.test.tsx › "AC-7, AC-8: …" |
| AC-9 | server › "AC-9: …"; ExpenseListPage.test.tsx › "AC-9: …" |
| AC-10 | server › "AC-10: …"; ExpenseListPage.test.tsx › "AC-10: …"; overBudget.test.ts › "AC-10: …"; e2e › "AC-1, AC-2, AC-10, …" |
| AC-11 | server › "AC-11: …"; ExpenseListPage.test.tsx › "AC-11, AC-17: …" |
| AC-12 | ExpenseListPage.test.tsx › "AC-12: …"; e2e › "…, AC-12, AC-15: …" |
| AC-13 | ExpenseListPage.test.tsx › "AC-13: …" |
| AC-14 | server › "AC-14: …"; e2e › "AC-7, AC-14: …" |
| AC-15 | server › "AC-15: …"; e2e › "…, AC-15: …" |
| AC-16 | server › "AC-16: …" |
| AC-17 | ExpenseListPage.test.tsx › "AC-17: …", "AC-11, AC-17: …" |
| AC-18 | ExpenseListPage.test.tsx › "AC-18: … (error / unreachable)" |

## Context updates
- project-context/architecture/api.md: new `GET /api/v1/budgets/over`.
- BR-19 is already in project-context/business/rules.md; no change needed.

## Risks and notes
- The e2e tests use a random far-future year for their own budgets and expenses, so the shared e2e database (sample
  data, other tests) does not change their totals. The "this month" heading is covered by unit tests only, because
  an e2e test would need a budget in the current month, which carries forward and would affect other tests.
- The spec's front matter still says `status: draft`, although the spec was merged as approved. The BA should update it.
