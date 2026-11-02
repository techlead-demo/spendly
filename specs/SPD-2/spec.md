---
issue: SPD-2
title: Show a monthly spending summary
type: story
status: draft            # draft | approved | implemented | cancelled
version: 2
design: [project-context/design/screens/monthly-summary.html, specs/SPD-2/wireframes/monthly-summary-share.html]
business_rules: [BR-2, BR-3, BR-5, BR-9, BR-13, BR-14, BR-15]
---

# SPD-2 Show a monthly spending summary

## Summary
The user can open a new "Summary" screen that shows one month's spending grouped by category. Each row shows the number of expenses, the total and its share (percentage) of the month total, and the footer shows the month total.
This lets the user see where their money goes without adding up the expense list themselves.

## Background
Spendly's purpose is to show the user "where their money goes each month" (`project-context/business/overview.md`). Today the user can only see the expense list and one month total.
The design already has a mockup for this screen: `project-context/design/screens/monthly-summary.html`. It also shows the app header navigation (Expenses / Summary / Categories), which the app does not have yet.
Related: SPD-1 (Record an expense) adds expenses that must show up in the summary.

## Scope
- In scope:
  - A "Summary" screen with a month picker and a table: Category, Expenses (count), Total, Share (percentage of the month total). A footer row "Month total" shows the total count, amount and 100,0%.
  - Header navigation links "Expenses" and "Summary" so the user can switch between the expense list and the summary.
  - Empty, loading and error states of the summary.
  - Getting the per-category counts and totals of a month from the API.
- Out of scope:
  - The "Categories" navigation link and the category management screen (`categories.html`).
  - Charts, budgets and comparisons with other months.
  - Clicking a summary row to open the filtered expense list.
  - Date ranges other than one calendar month; yearly summaries.
  - The search bar, Edit links and Add expense button in `expense-list.html` (other issues).

## User stories
- As the user, I want to see a month's spending per category, so that I understand where my money goes.

## Acceptance criteria
Today is 2026-11-02 in all examples unless stated otherwise.

Example data for November 2026 (used in AC-3 to AC-6):
| Date | Category | Amount |
|---|---|---|
| 2026-11-01 | Housing | 6.500.000 ₫ |
| 2026-11-01 | Food | 120.000 ₫ |
| 2026-11-02 | Food | 85.000 ₫ |
| 2026-11-02 | Transport | 50.000 ₫ |
| 2026-11-02 | Health | 50.000 ₫ |

Navigation
- **AC-1** Given the app is open, when the user looks at the header, then it shows the brand "Spendly" followed by the links "Expenses" and "Summary". The link of the current screen is shown as active.
- **AC-2** Given the expense list is open, when the user clicks "Summary", then the Summary screen opens with the heading "Summary" and the Month picker set to the current month (`2026-11`). Given the Summary screen is open, when the user clicks "Expenses", then the expense list opens.

Main flow
- **AC-3** Given the example data, when the Summary screen shows `2026-11`, then the table has the columns "Category", "Expenses" and "Total" and these rows in this order: `Housing · 1 · 6.500.000 ₫`, `Food · 2 · 205.000 ₫`, `Transport · 1 · 50.000 ₫`, `Health · 1 · 50.000 ₫` (BR-13).
- **AC-4** Given the example data, when the Summary screen shows `2026-11`, then the footer row reads `Month total · 5 · 6.805.000 ₫`. This is the same amount as the month total on the expense list for `2026-11` with "All categories".
- **AC-5** Given the example data, when the Summary screen shows `2026-11`, then Entertainment and Other (no expenses in November 2026) are not listed (BR-13).
- **AC-6** Given Transport and Health both total 50.000 ₫ in the example data, when the summary is shown, then Transport is listed before Health. Categories with the same total are ordered by the fixed category order: Food, Transport, Housing, Health, Entertainment, Other (BR-13).
- **AC-7** Given the Summary screen shows `2026-11`, when the user changes the Month picker to `2026-10`, then the table shows the per-category totals and the month total of October 2026 only. An expense dated `2026-10-31` is counted in October, and one dated `2026-11-01` is not (BR-3).
- **AC-8** Given the user records a new expense of 30.000 ₫, Food, dated `2026-11-02` (SPD-1), when they open the Summary screen for `2026-11`, then the Food row's count goes up by 1 and its total by 30.000 ₫, and the month total goes up by 30.000 ₫.
- **AC-9** Given a month with a single expense of 1 ₫ in Other, when the summary is shown for that month, then the table has one row `Other · 1 · 1 ₫` and the footer `Month total · 1 · 1 ₫`.

Empty, loading and error states
- **AC-10** Given a month without expenses (e.g. `2020-01`), when the Summary screen shows that month, then no table is shown and the text "No expenses for this month." is shown instead.
- **AC-11** Given the summary of a month is being loaded, when the data has not arrived yet, then the text "Loading…" is shown in place of the table.
- **AC-12** Given the API cannot be reached or returns an error, when the Summary screen loads a month, then the alert "Could not load the summary. Try again." is shown and no table is shown.
- **AC-13** Given the Summary screen shows `2026-11`, when the user clears the Month picker, then the summary of `2026-11` stays on screen and no request is sent, as on the expense list.

API
- **AC-14** Given the example data, when the summary for month `2026-11` is requested from the API, then the response is 200 and has one item per category with at least one expense, in the BR-13 order. Each item has the category id, the expense count and the total in `amountMinor` units, e.g. Food: count 2, total 205000. The response also has the month count 5 and the month total 6805000.
- **AC-15** Given a summary request where `month` is missing, `2026-13`, `2026-1` or `11/2026`, when it is sent, then the response is 400 with code `VALIDATION_ERROR`.
- **AC-16** Given a summary request for a month without expenses (`2020-01`), when it is sent, then the response is 200 with no items, month count 0 and month total 0.

Share of the month total
- **AC-17** Given the example data, when the Summary screen shows `2026-11`, then the table has a fourth column "Share" after "Total", and the rows show `Housing · 95,5%`, `Food · 3,0%`, `Transport · 0,7%`, `Health · 0,7%`. The footer row shows `100,0%` in the Share column (BR-15).
- **AC-18** Given a month with exactly two expenses, Food 1.999 ₫ and Other 1 ₫ (month total 2.000 ₫), when the summary is shown, then Food shows `100,0%` (99,95% rounded half up) and Other shows `0,1%` (0,05% rounded half up), and the footer shows `100,0%`. The rows are not adjusted to add up to 100,0% (BR-15).
- **AC-19** Given a month with Housing 6.805.000 ₫ and Other 1 ₫, when the summary is shown, then the Other row is listed with `0,0%` (BR-13, BR-15).
- **AC-20** Given the single-expense month of AC-9 (`Other · 1 · 1 ₫`), when the summary is shown, then the Other row and the footer both show `100,0%`.

## Business rules
- Existing: BR-2 (every expense has exactly one category), BR-3 (an expense belongs to the month of its date), BR-5 (fixed categories and their order), BR-9 (VND formatting).
- New **BR-13**: The monthly summary groups the expenses of one month by category. Each category with at least one expense that month gets one row with the number of expenses and their total. Categories without expenses are not shown. Rows are ordered by total, largest first; equal totals follow the fixed category order. The month total is the sum of all rows and equals the expense list's month total for "All categories".
- New **BR-14**: The monthly summary shows one month at a time and opens on the current month.
- New **BR-15**: In the monthly summary, a category's share is its category total divided by the month total, as a percentage. It is rounded half up to one decimal place and shown in `vi-VN` format with one decimal, e.g. `95,5%`, `0,0%`. The footer always shows `100,0%`. Rounded row shares are shown as computed, even when they do not add up to exactly 100,0%.

## UI
**App header** — `project-context/design/screens/monthly-summary.html`, `project-context/design/screens/expense-list.html`
- The header shows the brand "Spendly" followed by the links "Expenses" and "Summary", styled as in the mockup. The active link is underlined.
- Difference from the mockups: the "Categories" link is not shown, because that screen does not exist yet.

**Summary screen** — `project-context/design/screens/monthly-summary.html`
- Heading "Summary". Toolbar with a single field: "Month" (`<input type="month">`), defaulting to the current month.
- Table columns: "Category", "Expenses" (right-aligned count), "Total" (right-aligned, `formatMoney`, e.g. `6.500.000 ₫`), "Share" (right-aligned, e.g. `95,5%`, BR-15) — see `specs/SPD-2/wireframes/monthly-summary-share.html`.
- Footer row: "Month total", the total count, the total amount and `100,0%`, in bold as in the mockup.
- States:
  - Empty month: "No expenses for this month." instead of the table (from the mockup note).
  - Loading: "Loading…" instead of the table.
  - Error: alert "Could not load the summary. Try again." instead of the table.
  - Cleared month: the previous summary stays on screen.
- Differences from the mockup:
  - No "Categories" navigation link (see above).
  - The "Share" column is new (wireframe `specs/SPD-2/wireframes/monthly-summary-share.html`).
  - The loading and error texts are new; the mockup does not show them.

## Data and API impact
- Data: no schema change. The summary is computed from the existing expenses and categories.
- API: the web app needs, for one month (`YYYY-MM`), the expense count and the total in `amountMinor` per category, plus the month count and total. The month is validated like `GET /api/v1/expenses` (400 `VALIDATION_ERROR`).
  - The Engineer decides whether this becomes a new endpoint under `/api/v1` (e.g. a summary resource) or an extension of an existing one. Existing responses must not change.
  - `project-context/architecture/api.md` must document the result.
- Totals are integer minor units (`amountMinor`), never floats.
- Shares (BR-15) are derived from the integer category and month totals; nothing new is stored. The Engineer decides whether the API returns them or the web app computes them, but the result must match AC-17 to AC-20 exactly, including the half-up cases in AC-18.

## Assumptions
- A-1 Categories with no expenses in the month are hidden (BR-13). The mockup only shows categories that have spending, and the mockup note talks about "spending … grouped by category". Showing zero rows later is easy.
- A-2 Equal totals are ordered by the fixed category order (Food, Transport, Housing, Health, Entertainment, Other). The mockup does not show a tie, and this order is already used in the category select.
- A-3 The Summary screen always opens on the current month (BR-14), as the expense list does (BR-6). The selected month is not carried over between the two screens. This is simple and easy to change later.
- A-4 The header shows only the links "Expenses" and "Summary". "Categories" is left out until category management exists, so it does not lead to a screen that is not there.
- A-5 The summary has no category filter: it always covers all categories. The mockup has only a Month field.
- A-6 The texts "Loading…" and "Could not load the summary. Try again." are new. This is wording only.
- A-7 Clearing the Month picker keeps the last summary on screen, the same as the expense list does today.
- A-8 Shares are shown as a separate "Share" column after "Total", with one decimal place, rounded half up, in `vi-VN` format (`95,5%`), and the footer shows `100,0%` (BR-15). Rows are not adjusted to add up to 100,0%. The reviewer asked for percentages without giving a format, and the column label, precision and rounding are presentation choices that are easy to change.

## Questions and answers
| # | Question | Answer | Source |
|---|---|---|---|
| — | None | — | — |

## Changelog
| Version | Change |
|---|---|
| 1 | Initial spec |
| 2 | Added each category's share of the month total, as the PR review by longnt-techleadjsc-vn asked ("Show percentages of the month total too"): new "Share" column, AC-17 to AC-20, BR-15, A-8, a new wireframe `monthly-summary-share.html`, and "Percentages" removed from Out of scope. |
