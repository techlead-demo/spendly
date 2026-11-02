---
issue: SPD-5
title: Warn when a category exceeds its monthly budget
type: story
status: draft            # draft | approved | implemented | cancelled
version: 1
design: [project-context/design/screens/expense-list-over-budget.html]
business_rules: [BR-3, BR-5, BR-6, BR-8, BR-9, BR-13, BR-16, BR-19]
---

# SPD-5 Warn when a category exceeds its monthly budget

## Summary
The expense list shows a warning banner when one or more categories have spent more than their budget in the selected month. The banner names each category that is over budget, with what was spent, the budget, and how much over it is. This lets the user react before the month ends.

## Background
SPD-4 (Done) lets the user set a monthly budget per category. A budget carries forward to later months (BR-16), and the API reads it with `GET /api/v1/budgets`. This story is the first one that compares spending with those budgets.
The design is the mockup `project-context/design/screens/expense-list-over-budget.html`. Its note says: "One line per category over its budget for the selected month, ordered by amount over (largest first). The banner is not shown when no category is over budget."
"Spent" is the category total of the month, as defined for the monthly summary (BR-13, SPD-2).
Related specs: SPD-1 (Add expense, so spending can change while the list is open), SPD-2 (category totals), SPD-4 (budgets).

## Scope
- In scope:
  - An over-budget warning banner on the expense list for the selected month.
  - The rule that decides when a category is over budget and by how much (BR-19).
  - Banner behaviour when the month, the category filter or the expenses change, plus its loading and error behaviour.
- Out of scope:
  - Warnings on other screens (monthly summary, Budgets screen, Add expense form), notifications, emails.
  - "Near budget" warnings (for example at 80 %), or showing spent against budget for categories that are not over.
  - Dismissing or snoozing the banner.
  - Carrying unused budget over (SPD-8).
  - The other mockup elements that are not implemented yet: the search bar, Edit links and the "Categories" navigation link.

## User stories
- As the user, I want to be warned on the expense list when a category has gone over its budget for the month, so that I can react before the month ends.

## Acceptance criteria
Today is 2026-11-02 (current month `2026-11`) in all examples unless stated otherwise.
Unless stated otherwise, the data for `2026-11` is:
- Budgets in effect: Food 700.000 ₫, Entertainment 300.000 ₫, Housing 6.500.000 ₫. Transport, Health and Other have no budget.
- Category totals: Food 785.000 ₫, Entertainment 350.000 ₫, Housing 6.500.000 ₫, Transport 200.000 ₫, Health 75.000 ₫, Other 0 ₫.

Main flow
- **AC-1** Given the data above, when the user opens the expense list on `2026-11`, then a warning banner is shown above the Month and Category filters. Its heading is "2 categories are over budget this month", followed by two lines in this order:
  - "Food: 785.000 ₫ spent of 700.000 ₫ budget, 85.000 ₫ over"
  - "Entertainment: 350.000 ₫ spent of 300.000 ₫ budget, 50.000 ₫ over"
- **AC-2** Given the data above, when the banner is shown, then Housing is not listed: its spending equals its budget (6.500.000 ₫), which is not over (BR-19). Transport and Health are not listed either: they have no budget, so they have no limit (BR-16).
- **AC-3** Given Food is the only category over budget (Food 785.000 ₫ of 700.000 ₫, Entertainment 250.000 ₫ of 300.000 ₫), when the expense list shows `2026-11`, then the heading is "1 category is over budget this month" and the only line is "Food: 785.000 ₫ spent of 700.000 ₫ budget, 85.000 ₫ over".
- **AC-4** Given Food is 785.000 ₫ of 700.000 ₫ (85.000 ₫ over) and Entertainment is 450.000 ₫ of 300.000 ₫ (150.000 ₫ over), when the banner is shown, then Entertainment is listed first and Food second (largest amount over first).
- **AC-5** Given Food is 785.000 ₫ of 700.000 ₫ and Entertainment is 385.000 ₫ of 300.000 ₫ (both 85.000 ₫ over), when the banner is shown, then Food is listed before Entertainment (equal amounts over follow the fixed category order, BR-5).
- **AC-6** Given Food has a budget of 700.000 ₫ and a total of 700.001 ₫, when the expense list shows `2026-11`, then the banner lists "Food: 700.001 ₫ spent of 700.000 ₫ budget, 1 ₫ over" (BR-19 boundary).

No warning
- **AC-7** Given no category's total is greater than its budget in `2026-11` (for example Food 700.000 ₫ of 700.000 ₫, Entertainment 350.000 ₫ with no budget), when the expense list shows `2026-11`, then no banner is shown and the list looks as it did before this story.
- **AC-8** Given no budget has ever been set, when the expense list shows any month, then no banner is shown.
- **AC-9** Given `2026-11` has no expenses, when the expense list shows `2026-11`, then no banner is shown, and the empty list looks as it did before this story.

Months and filters
- **AC-10** Given Food has had a budget of 700.000 ₫ in effect since `2026-10` and Food's total in `2026-10` is 900.000 ₫, when the user selects `2026-10`, then the banner heading is "1 category is over budget in 10/2026" and its line is "Food: 900.000 ₫ spent of 700.000 ₫ budget, 200.000 ₫ over". The comparison uses the budget in effect for the selected month (BR-16).
- **AC-11** Given the user has changed the Food budget to 800.000 ₫ from `2026-12` and Food's total in `2026-12` is 785.000 ₫, when the user selects `2026-12`, then Food is not listed for `2026-12`, and it is still listed for `2026-11` (785.000 ₫ of 700.000 ₫).
- **AC-12** Given the data above, when the user selects the category filter "Transport", then the banner is still shown with the same heading and the same two lines (Food and Entertainment). The banner always covers all categories, whatever the category filter is (BR-8).
- **AC-13** Given the expense list shows `2026-11` with the banner, when the user clears the Month picker, then the expenses and the banner of `2026-11` stay on screen, as for the list itself.

Changes to spending or budgets
- **AC-14** Given Food is 650.000 ₫ of 700.000 ₫ in `2026-11` and no banner is shown, when the user records a Food expense of 100.000 ₫ dated 2026-11-02 with Add expense and returns to the expense list on `2026-11`, then the banner shows "1 category is over budget this month" with the line "Food: 750.000 ₫ spent of 700.000 ₫ budget, 50.000 ₫ over".
- **AC-15** Given the data above, when the user raises the Food budget to 800.000 ₫ from `2026-11` on the Budgets screen and then opens the expense list on `2026-11`, then only Entertainment is listed, under the heading "1 category is over budget this month".
- **AC-16** Given Food has a budget of 700.000 ₫ for `2026-11` and its `2026-11` expenses include one dated 2026-11-28 (a future date, BR-12), when the totals are compared, then that expense counts towards Food's spending for `2026-11` (BR-3).

Loading and error states
- **AC-17** Given the data needed for the banner has not arrived yet, when the expense list is loading, then no banner is shown, and no partial or empty banner is shown either.
- **AC-18** Given the budgets or the category totals cannot be loaded (API unreachable or error) but the expenses load, when the expense list shows `2026-11`, then the expenses and month total are shown as usual, no banner is shown, and no extra error message is shown.

## Business rules
- Existing: BR-3 (an expense belongs to the month of its date), BR-5 (fixed category order), BR-6 (the list shows one month, opening on the current month), BR-8 (category filter), BR-9 (VND formatting), BR-13 (category total of a month), BR-16 (budget in effect; no budget means no limit).
- New **BR-19**: A category is over budget in a month when it has a budget in effect for that month (BR-16) and its category total for that month is greater than the budget. Spending equal to the budget is not over budget. The amount over is the category total minus the budget. A category without a budget in effect is never over budget.

## UI
**Expense list, over-budget banner**: `project-context/design/screens/expense-list-over-budget.html`
- A warning banner (`role="alert"`, warning colours from `tokens.css`, the "⚠" mark) between the title row and the Month and Category filters.
- Heading, in bold:
  - Selected month is the current month: "1 category is over budget this month" or "N categories are over budget this month" (N ≥ 2).
  - Any other month: "1 category is over budget in MM/YYYY" or "N categories are over budget in MM/YYYY", for example "in 10/2026".
- One bullet per over-budget category: "<Category>: <spent> spent of <budget> budget, <over> over", with amounts formatted as in BR-9 (for example "Food: 785.000 ₫ spent of 700.000 ₫ budget, 85.000 ₫ over"). The order is by amount over, largest first, and equal amounts follow the fixed category order.
- States:
  - No category over budget, no budgets, or no expenses: no banner, and no space is reserved for it.
  - Loading: no banner until its data has arrived.
  - Error loading budgets or totals: no banner and no error message. The list itself works as before.
- The banner has no close button and no links.
- Differences from the mockup:
  - The mockup always says "this month". For a month other than the current month, the heading says "in MM/YYYY" instead (A-2).
  - The mockup also shows the search bar, Edit links and the "Categories" link. They are not part of this story. The header stays as implemented (Expenses / Summary / Budgets), and the title row stays as implemented (the "Expenses" heading and the "Add expense" button).

## Data and API impact
- No new stored data. The banner is derived from existing data: the category totals of the selected month (as in `GET /api/v1/summary`) and the budgets in effect for that month (`GET /api/v1/budgets`).
- The banner must use the unfiltered category totals even when the list is filtered by category. `GET /api/v1/expenses?categoryId=…` alone is not enough.
- The Engineer decides whether the web app combines the existing endpoints or the API adds a read endpoint for over-budget categories. A new endpoint must be documented in `project-context/architecture/api.md`, validate `month` like `GET /api/v1/expenses`, and return amounts as integer minor units. Existing responses do not change.

## Assumptions
- A-1 "Exceeds" means strictly greater than the budget. Spending exactly the budget gives no warning (BR-19, AC-2, AC-6). This matches the word "exceeds" and the mockup's "over" amounts.
- A-2 The banner covers the month selected on the expense list, as the mockup note says, including past and future months. The heading says "this month" only for the current month, and "in MM/YYYY" otherwise, so the text is never wrong for another month. This is wording only and easy to change.
- A-3 The banner ignores the category filter and always lists every over-budget category (AC-12). It sits above the filters in the mockup and warns about the whole month.
- A-4 "Spent" is the category total of all expenses of the month, including expenses dated later in the month than today (BR-3, BR-13). This is the same figure the monthly summary shows.
- A-5 Lines are ordered by amount over, largest first (mockup note). Ties follow the fixed category order (BR-5), as in BR-13.
- A-6 If the budget or total data fails to load, the banner is silently left out and the list still works (AC-18). The warning is extra information and should not block the main screen.
- A-7 The banner cannot be dismissed. The mockup has no close control, and adding one later is easy.
- A-8 The singular heading "1 category is over budget …" is new wording. The mockup only shows the plural.

## Questions and answers
| # | Question | Answer | Source |
|---|---|---|---|
| — | None | — | — |

## Changelog
| Version | Change |
|---|---|
| 1 | Initial spec |
