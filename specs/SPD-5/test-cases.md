---
issue: SPD-5
spec_version: 1
---

# Test cases — SPD-5

Default data ("the data above", spec): month `2026-11`, today 2026-11-02. Budgets in effect: Food 700.000 ₫,
Entertainment 300.000 ₫, Housing 6.500.000 ₫; Transport, Health, Other none. Totals: Food 785.000 ₫,
Entertainment 350.000 ₫, Housing 6.500.000 ₫, Transport 200.000 ₫, Health 75.000 ₫, Other 0 ₫.

QA test files: `server/test/overBudget.qa.test.ts`, `web/src/pages/ExpenseListPage.qa.test.tsx`,
`e2e/over-budget.qa.spec.ts`. Where the Engineer's tests already cover a case exactly, they are reused
(`server/test/overBudget.test.ts`, `web/src/pages/ExpenseListPage.test.tsx`, `web/src/lib/overBudget.test.ts`,
`e2e/over-budget.spec.ts`).

| ID | AC | Title | Type | Steps | Expected | Automated test |
|---|---|---|---|---|---|---|
| TC-1 | AC-1 | API lists the over-budget categories of the default data | automated | 1. Insert default budgets from 2026-11 and default expenses 2. `GET /api/v1/budgets/over?month=2026-11` | 200, `items` = Food (785000/700000/85000), Entertainment (350000/300000/50000), in that order | server/test/overBudget.test.ts › "AC-1, AC-2: lists the categories over budget, largest amount over first" |
| TC-2 | AC-1 | Banner heading, lines and position | automated | 1. Mock API with default data 2. Render expense list on 2026-11 | `role="alert"` banner with ⚠, bold heading "2 categories are over budget this month" and the two lines in order; after the title row, before the Month and Category filters | web/src/pages/ExpenseListPage.qa.test.tsx › "TC-2 (AC-1) …"; e2e/over-budget.qa.spec.ts › "TC-13 (AC-12), TC-16 (AC-15) …" (current month, real API) |
| TC-3 | AC-2 | Equal to budget and no budget are not listed | automated | Same data as TC-1 | Housing (6.500.000 = budget), Transport, Health, Other not in `items` | server/test/overBudget.qa.test.ts › "TC-3 (AC-2) …" |
| TC-4 | AC-3 | Singular heading | automated | Only Food over (Food 785.000/700.000, Entertainment 250.000/300.000); render list | Heading "1 category is over budget this month", only line Food… 85.000 ₫ over | server/test/overBudget.test.ts › "AC-3: …"; web/src/pages/ExpenseListPage.test.tsx › "AC-3: …" |
| TC-5 | AC-4 | Ordered by amount over, largest first | automated | Food 785.000/700.000, Entertainment 450.000/300.000 | Entertainment (150.000 over) before Food (85.000 over) | server/test/overBudget.test.ts › "AC-4: …" |
| TC-6 | AC-5 | Ties follow fixed category order | automated | Food 185.000/100.000, Entertainment 385.000/300.000 (both 85.000 over; Entertainment has the larger total, so neither total order nor insertion order can explain the result) | Food before Entertainment | server/test/overBudget.qa.test.ts › "TC-6 (AC-5) …" |
| TC-7 | AC-6 | 1 ₫ over boundary | automated | Food budget 700.000, total 700.001 | API: Food over 1; UI line "Food: 700.001 ₫ spent of 700.000 ₫ budget, 1 ₫ over" | server/test/overBudget.test.ts › "AC-6: …"; web/src/pages/ExpenseListPage.qa.test.tsx › "TC-7 (AC-6) …" |
| TC-8 | AC-7 | No category over budget | automated | Food 700.000/700.000, Entertainment 350.000 with no budget | API `items: []`; UI no `alert`, list shown as before | server/test/overBudget.test.ts › "AC-7: …"; web/src/pages/ExpenseListPage.test.tsx › "AC-7, AC-8: …"; e2e/over-budget.qa.spec.ts › "TC-15 (AC-14) …" (first step) |
| TC-9 | AC-8 | No budget ever set | automated | Expenses in 2026-10 and 2027-01, no budgets | API `items: []` for both months | server/test/overBudget.qa.test.ts › "TC-9 (AC-8) …" |
| TC-10 | AC-9 | Month without expenses | automated | Default budgets, no expenses in the month | API `items: []`; UI empty list state (0 ₫), no banner | server/test/overBudget.test.ts › "AC-9: …"; web/src/pages/ExpenseListPage.qa.test.tsx › "TC-10 (AC-9) …" |
| TC-11 | AC-10 | Past month uses budget in effect and "in MM/YYYY" heading | automated | Food 700.000 from 2026-10, Food total 2026-10 = 900.000; select 2026-10 | API Food 900000/700000/200000; UI heading "1 category is over budget in 10/2026", line "Food: 900.000 ₫ spent of 700.000 ₫ budget, 200.000 ₫ over" | server/test/overBudget.test.ts › "AC-10: …"; web/src/pages/ExpenseListPage.test.tsx › "AC-10: …"; web/src/pages/ExpenseListPage.qa.test.tsx › "TC-14 (AC-13) …" |
| TC-12 | AC-11 | Budget change from a later month | automated | Food 700.000 from 2026-11, 800.000 from 2026-12; Food total 785.000 in 2026-11 and 2026-12 | 2026-12: Food not listed; 2026-11: Food listed 785000/700000 | server/test/overBudget.test.ts › "AC-11: …"; also explored in the browser (screenshot qa/TC-12-december.png) |
| TC-13 | AC-12 | Category filter does not change the banner | automated | Default data; select category "Transport" (and "Entertainment") | Same heading and same two lines; banner request carries only the month | web/src/pages/ExpenseListPage.qa.test.tsx › "TC-13 (AC-12) …"; e2e/over-budget.qa.spec.ts › "TC-13 (AC-12), TC-16 (AC-15) …" |
| TC-14 | AC-13 | Clearing the Month picker keeps the banner | automated | Default data on 2026-11; clear the Month input; then pick 2026-10 | Banner of 2026-11 remains while cleared; then October banner | web/src/pages/ExpenseListPage.test.tsx › "AC-13: …"; web/src/pages/ExpenseListPage.qa.test.tsx › "TC-14 (AC-13) …" |
| TC-15 | AC-14 | Adding an expense shows the banner | automated | Current month: Food budget = Food total + 50.000, no other budgets; no banner; Add expense Food 100.000 dated today; back on list | "1 category is over budget this month", Food spent = total + 100.000, budget = total + 50.000, 50.000 ₫ over | e2e/over-budget.qa.spec.ts › "TC-15 (AC-14) …" |
| TC-16 | AC-15 | Raising the budget on Budgets screen removes Food | automated | Current month: Food 85.000 over, Entertainment 50.000 over; Budgets screen: Food = total + 100.000, Save; open Expenses | Only Entertainment listed, heading "1 category is over budget this month" | e2e/over-budget.qa.spec.ts › "TC-13 (AC-12), TC-16 (AC-15) …" |
| TC-17 | AC-16 | Future-dated expense in the month counts | automated | Food budget 700.000; Food expenses 2026-11-02 600.000 and 2026-11-28 185.000 | Food spent 785000, over 85000 | server/test/overBudget.qa.test.ts › "TC-17 (AC-16) …" |
| TC-18 | AC-17 | No banner while loading, no stale banner | automated | a) banner data never resolves; b) switch month while the old month's answer is still pending, then it arrives | a) no `alert`, no heading text; b) the old month's banner is not shown for the new month | web/src/pages/ExpenseListPage.test.tsx › "AC-17: …"; web/src/pages/ExpenseListPage.qa.test.tsx › "TC-18 (AC-17) …" |
| TC-19 | AC-18 | Banner data fails, list still works | automated | Banner data rejects (500 / network); expenses resolve | Expenses and month total shown; no `alert`, no error text | web/src/pages/ExpenseListPage.test.tsx › "AC-18: … %s" (both variants) |
| TC-20 | — | Month validation of the new endpoint | automated | `GET /api/v1/budgets/over` with no month, `''`, `2026-13`, `2026-1`, `11/2026`, `2026-11-01`, `2026-00` | 400 `VALIDATION_ERROR` "month is required and must be YYYY-MM" | server/test/overBudget.test.ts › "rejects month=%j …"; server/test/overBudget.qa.test.ts › "TC-20 …" |
| TC-21 | — | Month boundaries | automated | Food budget 100.000 from 2026-10; Food expenses 2026-10-31 500.000, 2026-11-01 60.000, 2026-11-30 60.000, 2026-12-01 500.000 | 2026-11: Food spent 120000, over 20000 | server/test/overBudget.qa.test.ts › "TC-21 …" |
| TC-22 | — | Banner has no close button and no links | automated | Default data; render list | Banner contains no `button` and no `link` | web/src/pages/ExpenseListPage.qa.test.tsx › "TC-22 …" |
| TC-23 | — | Future month heading, year boundary | automated | Data over budget for 2027-01; select 2027-01 | Heading "1 category is over budget in 01/2027" | web/src/pages/ExpenseListPage.qa.test.tsx › "TC-23 …" |
| TC-24 | — | Budget removed from a month onward | automated | Food 100.000 from 2026-10, removed (null) from 2026-11; Food total 500.000 in both months | 2026-11 `items: []`; 2026-10 Food listed | server/test/overBudget.qa.test.ts › "TC-24 …" |
| TC-25 | — | Design comparison with the mockup | manual | Run the app, open the expense list on 2026-11 with the spec's data, compare with `expense-list-over-budget.html` | Warning colours, ⚠ mark, bold heading, bullet list, between title row and filters | — (screenshot `specs/SPD-5/qa/TC-25-banner.png`) |
| TC-26 | — | Regression: existing screens and journeys (expense list, add expense, summary, budgets) | automated | Full `npm test` and `npx playwright test` on the PR head (touched: `budgetService`, `app.ts` wiring, `ExpenseListPage`, `App.test.tsx`, `api/client.ts`) | All existing tests pass | all existing suites |
