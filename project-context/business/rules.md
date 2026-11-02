# Business rules

Rules are numbered and never renumbered; a removed rule keeps its number and is marked "Removed".
Specs, tests and reviews refer to them by ID.

- **BR-1** Amounts are positive whole numbers of VND (no decimals). The smallest valid amount is 1 đồng.
- **BR-2** Every expense has exactly one category, chosen from the existing categories.
- **BR-3** Every expense has a date (local calendar day). An expense belongs to the month of its date.
- **BR-4** The note is optional free text.
- **BR-5** Removed (replaced by BR-19, SPD-6). Was: The categories are fixed: Food, Transport, Housing, Health, Entertainment, Other. Users cannot add, rename or remove categories.
- **BR-6** The expense list shows one month at a time; it opens on the current month.
- **BR-7** The expense list is ordered by date, newest first; expenses on the same date are ordered newest-recorded first.
- **BR-8** The expense list can be filtered by one category or show all categories (default: all).
- **BR-9** Amounts are displayed in VND with `vi-VN` formatting, e.g. `6.500.000 ₫`.
- **BR-10** There is one user and no login.
- **BR-11** A note is at most 200 characters. Leading and trailing spaces are removed; a note that is empty after that is stored as no note.
- **BR-12** When an expense is recorded, its date defaults to today's local date; any valid calendar date, past or future, is accepted.
- **BR-13** The monthly summary groups a month's expenses by category: one row per category with at least one expense that month, showing the number of expenses and their total. Rows are ordered by total, largest first; equal totals follow the fixed category order. The month total is the sum of all rows and equals the expense list's month total for all categories.
- **BR-14** The monthly summary shows one month at a time; it opens on the current month.
- **BR-15** In the monthly summary, a category's share is its category total divided by the month total, as a percentage, rounded half up to one decimal place and shown in `vi-VN` format, e.g. `95,5%`. The footer shows `100,0%`. Rounded row shares are not adjusted to add up to 100,0%.
- **BR-16** A budget is the amount the user plans to spend in one category in one month. A budget set for a category from month M applies to M and every later month until the user sets or removes that category's budget from a later month onward. Changing a budget from month M never changes months before M and never overrides a budget set or removed from a later month. A category without a budget in effect for a month has no limit in that month.
- **BR-17** A budget amount follows BR-1 (whole VND, at least 1 đồng, no upper limit). Clearing a category's budget from month M removes it from M onward; the category has no limit until a later budget is set.
- **BR-18** Budgets can only be set, changed or removed from the current month or a later month. Budgets of past months can be viewed but not changed.
- **BR-19** Categories are a list the user manages. A new database starts with the default categories Food, Transport, Housing, Health, Entertainment, Other. The user can add categories, rename any category, and retire or restore any category; categories are never deleted. The category order is creation order: the default categories in the order above, then added categories, oldest first.
- **BR-20** A category name is trimmed of leading and trailing spaces, is 1 to 40 characters long, and is unique among all categories (active and retired), ignoring letter case.
- **BR-21** A category is active or retired. Only active categories can be chosen for a new expense and get budgets on the Budgets screen. Expenses already in a retired category keep it; the category still appears on them in the expense list, the category filter and the monthly summary. Retiring or restoring changes no expense and no stored budget. Renaming a category changes its name everywhere, including on past expenses.
- **BR-22** At least one category is always active.
