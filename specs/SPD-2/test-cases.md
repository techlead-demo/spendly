---
issue: SPD-2
spec_version: 2
---

# Test cases — SPD-2

Example data (spec, "Example data for November 2026"): 2026-11-01 Housing 6.500.000 ₫, 2026-11-01 Food 120.000 ₫,
2026-11-02 Food 85.000 ₫, 2026-11-02 Transport 50.000 ₫, 2026-11-02 Health 50.000 ₫.
Money text is compared with the non-breaking space before `₫` normalised to a normal space.
E2E runs on the runbook sample data (dates relative to today), so e2e expectations are derived from
`GET /api/v1/expenses` for the same month; exact example values are checked in API and web tests.
Where the Engineer's tests already cover a case they are reused (listed by their test name).

| ID | AC | Title | Type | Steps | Expected | Automated test |
|---|---|---|---|---|---|---|
| TC-1 | AC-1 | Header brand and links, active link | automated | 1. Open `/` and `/#/summary` 2. Read the header | "Spendly", then "Expenses", "Summary" (no "Categories"); the current screen's link has `aria-current="page"` and the underline, the other does not | e2e/summary.qa.spec.ts › "TC-1 (AC-1): …"; e2e/summary.spec.ts › "AC-1, AC-2: …"; web/src/App.test.tsx › "AC-1: …" |
| TC-2 | AC-2 | Navigate Expenses → Summary → Expenses | automated | 1. Open `/` 2. Click "Summary" 3. Check heading and Month 4. Click "Expenses" | Heading "Summary", Month = current month (`2026-11` on 2026-11-02); after "Expenses" the expense list (heading "Expenses") | e2e/summary.spec.ts › "AC-1, AC-2: …"; web/src/pages/SummaryPage.test.tsx › "AC-2: …" |
| TC-3 | AC-3 | Rows and order for the example data (API) | automated | Insert the example data; `GET /api/v1/summary?month=2026-11` | Items Housing(1, 6500000), Food(2, 205000), Transport(1, 50000), Health(1, 50000) in this order | server/test/summary.test.ts › "AC-14: …", "AC-3, AC-5: …" |
| TC-4 | AC-3 | Rows and columns for the example data (UI) | automated | Render the Summary page for `2026-11` with the example summary | Columns "Category", "Expenses", "Total", "Share"; rows `Housing · 1 · 6.500.000 ₫`, `Food · 2 · 205.000 ₫`, `Transport · 1 · 50.000 ₫`, `Health · 1 · 50.000 ₫` | web/src/pages/SummaryPage.qa.test.tsx › "TC-4, TC-6, TC-7, TC-20 …" |
| TC-5 | AC-4 | Footer equals expense-list month total (API) | automated | Example data; `GET` summary and `GET /api/v1/expenses?month=2026-11` | Month count 5, total 6805000, equal to the expense list total | server/test/summary.test.ts › "AC-4: …" |
| TC-6 | AC-4 | Footer row in the UI | automated | Render with example data; e2e: Summary for previous month vs expense list | Footer `Month total · 5 · 6.805.000 ₫ · 100,0%`; e2e footer equals the expense list's count and total | SummaryPage.qa.test.tsx › "TC-4, TC-6, …"; e2e/summary.qa.spec.ts › "TC-10 …"; e2e/summary.spec.ts › "AC-3, AC-4, AC-17: …" |
| TC-7 | AC-5 | Categories without expenses are hidden | automated | Example data, summary for `2026-11` (API and UI) | No Entertainment or Other row | server/test/summary.test.ts › "AC-3, AC-5: …"; SummaryPage.qa.test.tsx › "TC-4, TC-6, TC-7, …" |
| TC-8 | AC-6 | Tie order follows the fixed category order | automated | a) Health 50.000 recorded before Transport 50.000 in `2026-11`; b) all six categories at 10.000 ₫ recorded in reverse order in `2026-03` | a) Transport before Health; b) Food, Transport, Housing, Health, Entertainment, Other | server/test/summary.qa.test.ts › "TC-8 (AC-6): …" (2 tests) |
| TC-9 | AC-7 | Month boundary Sep/Oct/Nov (API) | automated | Insert Food on 2026-09-30, 2026-10-01, 2026-10-31, 2026-11-01; summary for `2026-10` and `2026-11` | October: count 2, total 55.000 (10-01 and 10-31 only); November: 2026-11-01 only | server/test/summary.qa.test.ts › "TC-9 (AC-7): …"; server/test/summary.test.ts › "AC-7: …" |
| TC-10 | AC-7 | Changing the Month picker shows that month only (UI) | automated | Open Summary (current month); fill Month with the previous month | A request for that month is sent; rows (name, count, total, share), order and footer equal the grouping of `GET /api/v1/expenses` for that month | e2e/summary.qa.spec.ts › "TC-10 (…AC-7…): …"; SummaryPage.test.tsx › "AC-7: …" |
| TC-11 | AC-8 | New expense updates the summary | automated | Record Food 30.000 ₫ on 2026-11-02 in a month that already has Food; get the summary before and after | Food count +1, Food total +30.000, month total +30.000. API level only: SPD-1 (create expense) is not on `develop`, so there is no UI to record an expense | server/test/summary.qa.test.ts › "TC-11 (AC-8): …"; server/test/summary.test.ts › "AC-8: …" |
| TC-12 | AC-9 | Single 1 ₫ expense | automated | Other 1 ₫ as the only expense of a month; API + UI | API: one item (6, count 1, total 1), month count 1, total 1. UI: row `Other · 1 · 1 ₫`, footer `Month total · 1 · 1 ₫` | server/test/summary.test.ts › "AC-9: …"; SummaryPage.qa.test.tsx › "TC-12, TC-23 …" |
| TC-13 | AC-10 | Empty month in the UI | automated | Open Summary, set Month to `2020-01` | No table; "No expenses for this month." | e2e/summary.spec.ts › "AC-10: …"; SummaryPage.test.tsx › "AC-10: …" |
| TC-14 | AC-14 | API response for the example data | automated | `GET /api/v1/summary?month=2026-11` | 200; items `{categoryId, categoryName, count, totalMinor}` in BR-13 order; `monthCount` 5, `monthTotalMinor` 6805000 | server/test/summary.test.ts › "AC-14: …" |
| TC-15 | AC-11 | Loading state | automated | Hold the summary response (e2e route / unresolved promise in unit) | "Loading…" shown, no table; table after the response | e2e/summary.qa.spec.ts › "TC-15 (AC-11): …"; SummaryPage.test.tsx › "AC-11: …" |
| TC-16 | AC-12 | Error state | automated | Summary request aborted (connection refused) or answered 500 | Alert "Could not load the summary. Try again."; no table | e2e/summary.qa.spec.ts › "TC-16 (AC-12): …" (2 tests); SummaryPage.test.tsx › "AC-12: …" (2 tests) |
| TC-17 | AC-13 | Clearing the Month picker keeps the summary | automated | Open Summary; clear Month | Month empty, same table rows still shown, no `/api/v1/summary` request sent | e2e/summary.qa.spec.ts › "TC-17 (AC-13): …"; SummaryPage.test.tsx › "AC-13: …" |
| TC-18 | AC-15 | Month validation | automated | `GET /api/v1/summary` with month missing, `""`, `2026-13`, `2026-1`, `11/2026`, `2026-11-01`, `2026-00`, `202611`, `"2026-11 "`, `abcd-ef`, repeated `month` | 400, `error.code` `VALIDATION_ERROR`, string message | server/test/summary.test.ts › "AC-15: …"; server/test/summary.qa.test.ts › "TC-18 (AC-15): …" |
| TC-19 | AC-16 | Empty month via API | automated | `GET /api/v1/summary?month=2020-01` | 200, `items: []`, `monthCount` 0, `monthTotalMinor` 0 | server/test/summary.test.ts › "AC-16: …" |
| TC-20 | AC-17 | Shares for the example data | automated | Render with example data | Share column after Total; 95,5%, 3,0%, 0,7%, 0,7%; footer 100,0% | SummaryPage.qa.test.tsx › "TC-4, TC-6, TC-7, TC-20 …"; web/src/lib/share.test.ts › "AC-17: …" |
| TC-21 | AC-18 | Half-up rounding at 99,95% and 0,05% | automated | Food 1.999 ₫ + Other 1 ₫ | Food 100,0%, Other 0,1%, footer 100,0% | SummaryPage.qa.test.tsx › "TC-21 (AC-18): …" |
| TC-22 | AC-19 | Tiny share shows 0,0% | automated | Housing 6.805.000 ₫ + Other 1 ₫ | Other listed, `1 ₫`, `0,0%` | SummaryPage.qa.test.tsx › "TC-22 (AC-19): …" |
| TC-23 | AC-20 | Single 1 ₫ row share | automated | Other 1 ₫ only | Row and footer 100,0% | SummaryPage.qa.test.tsx › "TC-12, TC-23 …" |
| TC-24 | — | Year boundary Dec/Jan (API) | automated | Transport 2026-12-31, Health 2027-01-01; summaries for `2026-12`, `2027-01` | Each month has only its own expense | server/test/summary.qa.test.ts › "TC-24: …" |
| TC-25 | — | Large totals stay exact integers | automated | Housing 9.000.000.000 ₫ ×3 + Food 1 ₫ in `2026-11` | API: total 27000000001; UI: `27.000.000.001 ₫`, Housing 100,0%, Food 0,0% | server/test/summary.qa.test.ts › "TC-25: …"; SummaryPage.qa.test.tsx › "TC-25: …" |
| TC-26 | — | Half-up at other .x5 boundaries | automated | Food/Other pairs 1/3, 1/7, 3/1.997, 9/1.991, 201/1.799, 1/2 | 25,0/75,0; 12,5/87,5; 0,2/99,9; 0,5/99,6; 10,1/90,0; 33,3/66,7 | SummaryPage.qa.test.tsx › "TC-26: …" (6 tests) |
| TC-27 | — | Regression: expense list and its API unchanged | automated | Existing expense-list tests; `GET /api/v1/expenses` keys | Pass; body keys stay `items`, `monthTotalMinor` | e2e/expense-list.spec.ts; server/test/expenses.test.ts; server/test/summary.qa.test.ts › "TC-27: …" |
| TC-28 | — | Design comparison | manual | Open `http://localhost:5111/#/summary`, compare with `monthly-summary.html` and `monthly-summary-share.html`; navigate Expenses ↔ Summary | Header, toolbar, table, right-aligned numbers, bold footer, active underline match; Summary reopens on the current month | specs/SPD-2/qa/TC-28-summary-october.png, TC-13-empty-month.png |
