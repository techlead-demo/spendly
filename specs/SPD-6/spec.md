---
issue: SPD-6
title: Manage my own categories
type: story
status: draft            # draft | approved | implemented | cancelled
version: 1
design: [project-context/design/screens/categories.html, project-context/design/screens/expense-form.html, project-context/design/screens/expense-list.html]
business_rules: [BR-2, BR-5, BR-8, BR-13, BR-16, BR-19, BR-20, BR-21, BR-22]
---

# SPD-6 Manage my own categories

## Summary
The user gets a new "Categories" screen where they can add their own categories, rename any category, and retire categories they no longer use (and restore them later). Retired categories are no longer offered when recording an expense, but expenses already in them keep their category everywhere, so the categories match the user's life without losing history.

## Background
Until now the six categories were fixed (BR-5). This story replaces BR-5 with a user-managed list (BR-19 to BR-22). The six existing categories become the default categories of a new database.
The design is the mockup `project-context/design/screens/categories.html`. Its note says: active categories first, then retired ones; Rename turns the name cell into an input with Save / Cancel; retired categories are not offered in the add/edit expense form but still appear on existing expenses.
Related specs that read the category list: SPD-1 (Add expense form, `POST /api/v1/expenses`), SPD-2 (monthly summary, header navigation), SPD-4 (Budgets screen, which relied on BR-5 for the category order).

## Scope
- In scope:
  - A "Categories" screen (add, rename, retire, restore) and a "Categories" link in the header.
  - Category name validation (BR-20) and the rule that at least one category stays active (BR-22).
  - Effects on other screens: the Add expense form offers only active categories; the expense list, its category filter and the monthly summary keep showing retired categories for existing expenses; the Budgets screen lists active categories only.
  - API changes to list categories with their status and expense count, and to add, rename, retire and restore a category; `POST /api/v1/expenses` rejects a retired category.
- Out of scope:
  - Deleting a category, or moving expenses from one category to another (merging).
  - Reordering categories, category colours or icons.
  - The Edit expense form (`expense-form-edit.html`), which is not built yet; when it is, it follows BR-21.
  - Over-budget warnings for retired categories (SPD-5).
  - Updating `project-context/business/overview.md` "Current capabilities" (done when the feature ships).

## User stories
- As the user, I want to add my own categories, so that my expenses are grouped the way I think about my spending.
- As the user, I want to rename a category, so that its name matches what I use it for.
- As the user, I want to retire a category I no longer use, so that it stops cluttering the Add expense form while my old expenses keep it.

## Acceptance criteria
Today is 2026-11-02 in all examples. Unless stated otherwise the database has the six default categories Food (id 1), Transport (2), Housing (3), Health (4), Entertainment (5), Other (6), all active, and Food has 48 expenses.

Navigation
- **AC-1** Given the app is open, when the user looks at the header, then it shows the brand "Spendly" followed by the links "Expenses", "Summary", "Budgets" and "Categories". The link of the current screen is shown as active.
- **AC-2** Given any screen is open, when the user clicks "Categories", then the Categories screen opens with the heading "Categories", a field "New category" (placeholder "e.g. Pets", empty), a primary button "Add category", and a table with the columns "Name", "Expenses" and "Status" and an actions column without a heading.

List
- **AC-3** Given the default categories, when the Categories screen is shown, then it lists Food, Transport, Housing, Health, Entertainment, Other in that order, each with the badge "Active" and the actions "Rename · Retire". The "Expenses" column shows each category's number of expenses over all months, e.g. Food `48`; a category without expenses shows `0`.
- **AC-4** Given the user has added Coffee and Gym (in that order) and retired Housing and Gym, when the Categories screen is shown, then the order is Food, Transport, Health, Entertainment, Other, Coffee (active, by creation order), then Housing, Gym (retired, by creation order). Retired rows show the badge "Retired" and the actions "Rename · Restore" (BR-19, BR-21).

Add
- **AC-5** Given the Categories screen, when the user types `Coffee` in "New category" and clicks "Add category" (or presses Enter), then Coffee is added as the last active row with Expenses `0` and the badge "Active", and the "New category" field is cleared. After reloading the page Coffee is still listed.
- **AC-6** Given Coffee has been added, when the user opens the Add expense form, then the Category select offers "Choose a category", Food, Transport, Housing, Health, Entertainment, Other, Coffee, in that order, and an expense saved with Category Coffee is listed on the expense list with category "Coffee".
- **AC-7** Given the user types `  Coffee  ` (with leading and trailing spaces), when they click "Add category", then the category is stored as "Coffee" (BR-20).
- **AC-8** Given the "New category" field is empty or contains only spaces, when the user clicks "Add category", then nothing is added, the field is marked invalid and "Enter a category name." is shown under it.
- **AC-9** Given a category Food exists (active or retired), when the user adds `food` or `FOOD`, then nothing is added, the field is marked invalid and `A category named "food" already exists.` is shown under it (the name as typed, trimmed) (BR-20).
- **AC-10** Given the "New category" field, when the user types or pastes text, then it accepts at most 40 characters. A name of exactly 40 characters is added (BR-20).
- **AC-11** Given a validation message is shown under "New category", when the user changes the field, then the message and the invalid mark disappear.

Rename
- **AC-12** Given the Food row, when the user clicks "Rename", then the name cell becomes a text input containing "Food" with the buttons "Save" and "Cancel", and the input has focus. Only one row can be renamed at a time: clicking "Rename" on another row cancels the first rename.
- **AC-13** Given Food is being renamed, when the user changes the name to `Groceries` and clicks "Save" (or presses Enter), then the row shows "Groceries" in the same position with the same expense count and status. Expenses recorded before the rename show "Groceries" on the expense list in every month, the category filter offers "Groceries", and the monthly summary shows a "Groceries" row (BR-21).
- **AC-14** Given Food is being renamed and the user has typed `Groceries`, when they click "Cancel" (or press Escape), then the row shows "Food" again and nothing is stored.
- **AC-15** Given Food is being renamed, when the user saves the name `Transport` or `transport`, then nothing is stored, the input stays open and is marked invalid, and `A category named "Transport" already exists.` (respectively `"transport"`) is shown under it. When the user saves an empty name or only spaces, "Enter a category name." is shown instead (BR-20).
- **AC-16** Given Food is being renamed, when the user saves `Food` unchanged or `food` (only the letter case of its own name differs), then the rename is accepted and the row shows the saved name (`Food` or `food`).
- **AC-17** Given Gym is retired, when the user renames it to `Fitness`, then the row shows "Fitness" and stays retired.

Retire and restore
- **AC-18** Given Gym is active and has 6 expenses (3 in October 2026, 3 in November 2026), when the user clicks "Retire" on the Gym row, then without a confirmation the row moves to the retired part of the list with the badge "Retired", the actions "Rename · Restore", and Expenses still `6`. Nothing about the 6 expenses changes.
- **AC-19** Given Gym is retired, when the user opens the Add expense form, then the Category select does not offer Gym (BR-21).
- **AC-20** Given Gym is retired, when the expense list shows `2026-10`, then the 3 Gym expenses are listed with category "Gym", the month total includes them, and the category filter still offers "Gym"; selecting it shows the 3 Gym expenses (BR-8, BR-21).
- **AC-21** Given Gym is retired, when the monthly summary shows `2026-10`, then it has a "Gym" row with count `3` and their total, as before the retirement (BR-13, BR-21).
- **AC-22** Given Gym is retired, when the user clicks "Restore" on its row, then Gym moves back to the active part of the list at its creation-order position with the badge "Active", and the Add expense form offers Gym again.
- **AC-23** Given Food is the only active category (all others are retired), when the user clicks "Retire" on Food, then Food stays active and the alert "At least one category must stay active." is shown above the table (BR-22).

Other screens
- **AC-24** Given Gym is retired and Coffee is active, when the Budgets screen shows `2026-11`, then it lists one row per active category in the category order (BR-19): Food, Transport, Housing, Health, Entertainment, Other, Coffee. Gym is not listed. A newly added category has an empty budget field (no limit).
- **AC-25** Given Gym has a budget of `500000` in effect for `2026-11`, when the user retires Gym and later restores it, then the Budgets screen again shows Gym `500000` for `2026-11`. Retiring and restoring do not change stored budgets.
- **AC-26** Given Food was renamed to "Groceries", when the app is restarted, then the Categories screen still shows "Groceries" and no new "Food" category is created; a retired default category also stays retired after a restart.

Loading and error states
- **AC-27** Given the categories are being loaded, when the data has not arrived yet, then "Loading…" is shown in place of the table.
- **AC-28** Given the API cannot be reached or returns an error when loading, then the alert "Could not load the categories. Try again." is shown and no table is shown.
- **AC-29** Given the API cannot be reached when the user adds, renames, retires or restores a category, then the alert "Could not save the category. Try again." is shown above the table, the list is unchanged, and the typed name stays in its input. If the API returns a 400 error, the message is shown under the name input (add, rename) or in the alert (retire, restore).

API
- **AC-30** Given Coffee (id 7) was added and Housing is retired, when the category list is requested from the API, then the response is 200 with all seven categories ordered by id; each item has `id`, `name`, its status (active or retired) and its number of expenses, e.g. Food 48, Coffee 0.
- **AC-31** Given an add request with name `  Coffee  `, when it is sent, then the response is 201 with the new category (new id, name "Coffee", active, 0 expenses). An add request whose name is missing, not a string, empty after trimming, longer than 40 characters after trimming, or equal to an existing name ignoring letter case (e.g. `food`) is answered with 400 `VALIDATION_ERROR` and nothing is stored. A name of exactly 40 characters is accepted.
- **AC-32** Given a rename request for Food (id 1) with name `Groceries`, when it is sent, then the response is 200 with the renamed category, and `GET /api/v1/expenses` and `GET /api/v1/summary` return Food's expenses under category id 1 with the name "Groceries" where names are returned. A rename to a name that breaks BR-20 (other than the category's own name in a different letter case) is answered with 400 `VALIDATION_ERROR`.
- **AC-33** Given a retire or restore request for category id 7, when it is sent, then the response is 200 with the category in its new status. Retiring an already retired category or restoring an active one is also 200 and changes nothing. Retiring the only active category is answered with 400 `VALIDATION_ERROR` and the message "At least one category must stay active." (BR-22).
- **AC-34** Given a rename, retire or restore request for a category id that does not exist (e.g. `99`), when it is sent, then the response is 404 `NOT_FOUND`. A malformed id (`0`, `abc`) is answered with 400 `VALIDATION_ERROR`.
- **AC-35** Given Gym (id 8) is retired, when a create-expense request with `categoryId` 8 is sent to `POST /api/v1/expenses`, then the response is 400 `VALIDATION_ERROR` with a message naming the category as retired (e.g. "categoryId 8 is retired"), and nothing is stored (BR-21). After Gym is restored, the same request returns 201.
- **AC-36** Given Gym (id 8) is retired, when a set-budgets request includes `categoryId` 8, then the response is 400 `VALIDATION_ERROR` and nothing of the request is stored; `GET /api/v1/budgets` returns items for active categories only, ordered by id.

## Business rules
- Changed: **BR-5** (fixed categories) is marked "Removed" and replaced by **BR-19**.
- New **BR-19**: Categories are a list the user manages. A new database starts with the default categories Food, Transport, Housing, Health, Entertainment, Other. The user can add categories, rename any category, and retire or restore any category; categories are never deleted. The category order is creation order: the default categories in the order above, then added categories, oldest first.
- New **BR-20**: A category name is trimmed of leading and trailing spaces, is 1 to 40 characters long, and is unique among all categories (active and retired), ignoring letter case.
- New **BR-21**: A category is active or retired. Only active categories can be chosen for a new expense and get budgets on the Budgets screen. Expenses already in a retired category keep it; the category still appears on them in the expense list, the category filter and the monthly summary. Retiring or restoring changes no expense and no stored budget. Renaming a category changes its name everywhere, including on past expenses.
- New **BR-22**: At least one category is always active.
- Existing, unchanged: BR-2 (every expense has exactly one category; with BR-21 a new expense's category must be active), BR-8 (category filter), BR-13 (summary rows; "fixed category order" for equal totals is now the category order of BR-19), BR-16 (budget in effect).

## UI
**App header**: `project-context/design/screens/categories.html`
- Brand "Spendly", then the links "Expenses", "Summary", "Budgets", "Categories".
- Difference from the mockup: the mockup has no "Budgets" link (added by SPD-4); it stays between "Summary" and "Categories".

**Categories screen**: `project-context/design/screens/categories.html`
- Heading "Categories". Toolbar: field "New category" (text, placeholder "e.g. Pets", max 40 characters) and primary button "Add category". Enter in the field submits.
- Table columns: "Name", "Expenses" (right-aligned count over all months), "Status" (badge "Active" or "Retired"), and an unlabelled actions column: "Rename · Retire" for active rows, "Rename · Restore" for retired rows.
- Order: active categories in category order (BR-19), then retired categories in category order.
- Rename: the name cell becomes a text input (max 40 characters) prefilled with the name, with "Save" and "Cancel" buttons; Enter saves, Escape cancels; one row at a time.
- Validation messages (under the input that caused them, input marked invalid, as `.fieldError` in the mockup): "Enter a category name." and `A category named "<name>" already exists.`
- States:
  - Loading: "Loading…" instead of the table.
  - Load error: alert "Could not load the categories. Try again." instead of the table.
  - Save error: alert "Could not save the category. Try again." above the table (`.banner.error` style); a 400 message from the API for retire/restore is shown in the same alert, e.g. "At least one category must stay active."
  - There is no empty state: at least one category is always active (BR-22).
- Differences from the mockup: none in layout. The mockup does not draw the rename input, the validation messages or the load/save error states; they use the mockup's `.control`, `.fieldError` and `.banner.error` styles.

**Add expense form**: `project-context/design/screens/expense-form.html`
- The Category select offers "Choose a category" and then the active categories in category order. Retired categories are not offered. No other change to SPD-1.

**Expense list**: `project-context/design/screens/expense-list.html`
- The category filter offers "All categories" and then all categories, active and retired, in category order, with plain names. Rows show the category's current name. No other change.

**Monthly summary** (SPD-2) and **Budgets screen** (SPD-4): no layout change. The summary shows rows for retired categories that have expenses in the month. The Budgets screen lists active categories only, in category order, so it can have more or fewer than six rows.

## Data and API impact
- Data: each category gets a status (active or retired). Added categories get new ids; ids are never reused. Category names are unique ignoring letter case. Expenses and budgets do not change when a category is renamed, retired or restored. Default-category seeding at startup must only create the defaults in a new database: it must not re-create a renamed default or re-activate a retired one (AC-26). `data-model.md` documents the change.
- API (under `/api/v1`, documented in `api.md`):
  - `GET /api/v1/categories`: also returns each category's status and number of expenses; still all categories, ordered by id.
  - New operations to add a category, rename it, retire it and restore it, with the validation of AC-31 to AC-34.
  - `POST /api/v1/expenses`: rejects a retired `categoryId` with 400 `VALIDATION_ERROR`.
  - `GET /api/v1/budgets`: returns active categories only (it returned all six before). `PUT /api/v1/budgets`: rejects retired categories.
  - `GET /api/v1/expenses` and `GET /api/v1/summary`: no change in shape; they keep returning expenses in retired categories.

## Assumptions
- A-1 The six default categories can be renamed and retired like added ones, as the mockup shows Rename and Retire on every row and the issue asks to "rename or retire the ones I no longer use".
- A-2 Category names are limited to 40 characters (the mockup's `maxlength="40"`), trimmed, and unique ignoring letter case among active and retired categories, so a retired name cannot be reused for a new category; the user restores or renames it instead.
- A-3 Retire takes effect without a confirmation dialog, because Restore undoes it and no data changes.
- A-4 At least one category must stay active (BR-22); otherwise no expense could be recorded. This only blocks an edge case.
- A-5 Renaming changes the name on all past expenses (expenses refer to the category, not to a copy of its name). The issue's "keep their category" refers to retiring.
- A-6 The expense list's category filter keeps offering retired categories with plain names, so the user can still find their old expenses; retired categories are not marked or grouped there.
- A-7 The Budgets screen and `GET /api/v1/budgets` list only active categories; budgets stored for a retired category are kept and shown again when it is restored. Over-budget behaviour for retired categories is left to SPD-5.
- A-8 The "Expenses" column counts the category's expenses over all months.
- A-9 New categories are added at the end of the category order; there is no reordering. Equal totals in the monthly summary follow this order.
- A-10 There is no limit on the number of categories.
- A-11 The texts "Enter a category name.", `A category named "<name>" already exists.`, "At least one category must stay active.", "Loading…", "Could not load the categories. Try again." and "Could not save the category. Try again." are new wording in the style of SPD-1 and SPD-4.
- A-12 The header keeps the "Budgets" link from SPD-4 and adds "Categories" last, as in the mockup.

## Questions and answers
| # | Question | Answer | Source |
|---|---|---|---|
| — | None: the issue and the mockup `categories.html` answer the behaviour; the remaining points are assumptions A-1 to A-12. | — | — |

## Changelog
| Version | Change |
|---|---|
| 1 | Initial spec |
