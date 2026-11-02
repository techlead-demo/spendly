---
issue: SPD-3
title: Edit and delete an expense
type: story
status: draft            # draft | approved | implemented | cancelled
version: 1
design: [project-context/design/screens/expense-list.html, project-context/design/screens/expense-form-edit.html, project-context/design/screens/expense-form-errors.html, specs/SPD-3/wireframes/edit-expense-delete-confirm.html, specs/SPD-3/wireframes/edit-expense-not-found.html]
business_rules: [BR-1, BR-2, BR-3, BR-4, BR-5, BR-6, BR-7, BR-9, BR-11, BR-12, BR-13, BR-19, BR-20]
---

# SPD-3 Edit and delete an expense

## Summary
The user can open any expense from the expense list, change its date, amount, category or note, or delete it.
The expense list, the month total and the monthly summary then reflect the change, so the totals are right.

## Background
SPD-1 (Done) added the Add expense form and `POST /api/v1/expenses`. This story reuses that form, its fields and its validation (issue: "Editing uses the same fields as recording an expense").
The mockups `expense-list.html` (an "Edit" link per row) and `expense-form-edit.html` (Edit expense form with Delete) already design the flow. They do not show a delete confirmation or a "not found" state; this spec adds wireframes for both.
Related specs: SPD-1 (form, validation messages, API validation), SPD-2 (monthly summary, BR-13), SPD-4 (header navigation Expenses / Summary / Budgets).

## Scope
- In scope:
  - An "Edit" link on every row of the expense list.
  - The Edit expense form: the SPD-1 form pre-filled with the expense, with Save, Cancel and Delete.
  - Delete with a confirmation step; deletion is permanent.
  - Read, update and delete endpoints for one expense, with the same validation as create.
- Out of scope:
  - Undo or restore of a deleted expense; a trash or history of changes.
  - Deleting or editing several expenses at once.
  - The search bar in `expense-list.html`, the over-budget banner (SPD-5) and category management.
  - Any limit on which expenses can be changed (see A-3).

## User stories
- As the user, I want to correct an expense I entered by mistake, so that my totals are right.
- As the user, I want to remove an expense I entered by mistake, so that it no longer counts in my totals.

## Acceptance criteria
Today is 2026-11-02 in all examples. The example expense is E: id 7, date `2026-11-02`, amount 280000, category Food, note "Groceries at Co.opmart".

Entry point and initial state
- **AC-1** Given the expense list shows at least one expense, when the user looks at a row, then the last column shows a link "Edit" for that expense. A month without expenses still shows "No expenses for this month." and no Edit link.
- **AC-2** Given the expense list shows E, when the user clicks "Edit" on E's row, then the "Edit expense" form is shown with Date `2026-11-02`, Amount `280000` (plain digits, suffix "₫", hint "Whole đồng, no decimals."), Category Food selected, Note "Groceries at Co.opmart", and the buttons "Save", "Cancel" and "Delete".
- **AC-3** Given an expense without a note, when the user opens it with "Edit", then the Note field is empty.

Edit: main flow
- **AC-4** Given the Edit expense form for E, when the user changes Amount to `250000` and Note to `Groceries` and clicks Save, then E is stored with amount 250000 and note "Groceries" (id, date and category unchanged). The expense list shows November 2026 with "All categories", E's row reads `02/11/2026 · Food · Groceries · 250.000 ₫`, and the month total is 30.000 ₫ lower than before.
- **AC-5** Given the Edit expense form for E, when the user changes Category to Transport and saves, then E is listed as Transport, and the monthly summary for November 2026 shows its 280.000 ₫ under Transport instead of Food (count and total of both rows updated, BR-13).
- **AC-6** Given the Edit expense form for E, when the user changes Date to `2026-10-28` and saves, then the list shows `2026-10` with "All categories" and contains E dated `28/10/2026`; November 2026 no longer contains E and its month total is 280.000 ₫ lower; October's month total is 280.000 ₫ higher (BR-3).
- **AC-7** Given two expenses on `2026-11-02`, E (id 7, recorded first) and F (id 9, recorded later), so the list shows F above E, when the user edits E's amount and saves, then F is still listed above E (BR-19: editing keeps recording order).
- **AC-8** Given the user changes the Note of E to `  Market  `, when they save, then the stored note is "Market"; given they clear the Note or enter only spaces, then the stored note is empty (`null`) and the row shows no note (BR-11).
- **AC-9** Given the Edit expense form, when the user saves without changing anything, then the request succeeds, E is unchanged and the list is shown as in AC-4.
- **AC-10** Given a Save request is in progress, when the user clicks Save again, then only one update is sent. Save and Delete are disabled until the request finishes.

Cancel
- **AC-11** Given the list showed October 2026 filtered to Food and the user opened an expense with "Edit" and changed some fields, when they click Cancel, then nothing is stored and the list is shown on October 2026 filtered to Food. No confirmation is asked.

Edit: validation
- **AC-12** Given the Edit expense form, when the user sets Amount to empty, `0`, `-5000`, `12,5`, `12.5` or `280.000` and clicks Save, then nothing is stored, the banner "Please fix the highlighted fields." is shown, the Amount field is marked invalid and "Enter a whole amount in đồng, greater than 0." is shown under it (BR-1).
- **AC-13** Given the Edit expense form, when the user clears the Date and clicks Save, then nothing is stored, the banner is shown and "Enter a valid date." is shown under Date.
- **AC-14** Given the Edit expense form, when the user selects "Choose a category" and clicks Save, then nothing is stored, the banner is shown and "Choose a category." is shown under Category (BR-2).
- **AC-15** Given Date, Amount and Category are all invalid, when the user clicks Save, then all three messages are shown at once and focus moves to Date.
- **AC-16** Given the Note field, when the user types or pastes text, then it accepts at most 200 characters (BR-11).
- **AC-17** Given Amount is `1`, when the user saves, then the expense is stored with amount 1 and listed as `1 ₫`.

Delete
- **AC-18** Given the Edit expense form for E, when the user clicks "Delete", then nothing is deleted yet; the row Save / Cancel / Delete is replaced by the warning "Delete this expense? This cannot be undone." with the buttons "Delete expense" and "Keep", and focus moves to "Keep".
- **AC-19** Given the delete confirmation is shown, when the user clicks "Keep", then nothing is deleted and the form shows Save / Cancel / Delete again with the field values as they were.
- **AC-20** Given the list showed November 2026 filtered to Food and the user opened E with "Edit", when they click "Delete" and then "Delete expense", then E is removed permanently (BR-20). The list is shown on November 2026 filtered to Food, E's row is gone and the month total is 280.000 ₫ lower; the monthly summary for November 2026 counts one Food expense fewer and 280.000 ₫ less.
- **AC-21** Given E is the only expense of November 2026, when the user deletes it, then the list shows "No expenses for this month." and a month total of 0 ₫.
- **AC-22** Given the user edited some fields before clicking "Delete", when they confirm with "Delete expense", then the expense is deleted and the edits are not saved.
- **AC-23** Given a delete request is in progress, when the user clicks "Delete expense" again, then only one delete request is sent; both confirmation buttons are disabled until it finishes.

Not found and errors (UI)
- **AC-24** Given the Edit expense screen is opened for an expense that does not exist (e.g. id 9999, or deleted in another tab), when it loads, then no form is shown; the card shows the error banner "This expense no longer exists." and the link "Back to expenses", which opens the expense list on the current month with "All categories".
- **AC-25** Given the expense was deleted elsewhere while the Edit expense form was open, when the user clicks Save or confirms Delete, then the API answers 404 and the screen shows the state of AC-24.
- **AC-26** Given the API rejects a Save with a 400 error, when the form receives the response, then the form stays open with the entered values and the banner shows the API error `message`.
- **AC-27** Given the API cannot be reached, when the user clicks Save, then the form stays open with the entered values and the banner shows "Could not save the expense. Try again."; when the user confirms Delete, then the expense is kept, the form shows Save / Cancel / Delete again and the banner shows "Could not delete the expense. Try again."
- **AC-28** Given the API cannot be reached when the Edit expense screen opens, when it loads, then the card shows the error banner "Could not load the expense. Try again." and the link "Back to expenses".

API
- **AC-29** Given E exists, when `GET /api/v1/expenses/7` is sent, then the response is 200 with `{ "id": 7, "date": "2026-11-02", "amountMinor": 280000, "categoryId": 1, "note": "Groceries at Co.opmart" }`.
- **AC-30** Given E exists, when `PUT /api/v1/expenses/7` is sent with `{ "date": "2026-10-28", "amountMinor": 250000, "categoryId": 2, "note": " Bus " }`, then the response is 200 with `{ "id": 7, "date": "2026-10-28", "amountMinor": 250000, "categoryId": 2, "note": "Bus" }`, and `GET /api/v1/expenses?month=2026-10` includes it while `?month=2026-11` does not.
- **AC-31** Given E exists, when a `PUT /api/v1/expenses/7` body breaks any create rule of SPD-1 (AC-20–AC-23: `amountMinor` missing, `0`, `-1`, `12.5`, `"85000"` or above 9007199254740991; `date` missing, `2026-02-30` or `2026-11-2`; `categoryId` missing, `"1"` or `99`; `note` of 201 characters after trimming or not a string or `null`), then the response is 400 `VALIDATION_ERROR` and E is unchanged. A note of exactly 200 characters is accepted.
- **AC-32** Given E exists, when `DELETE /api/v1/expenses/7` is sent, then the response is 204 with no body, and a following `GET /api/v1/expenses/7` returns 404 `NOT_FOUND`.
- **AC-33** Given no expense with id 9999 exists, when `GET`, `PUT` (with a valid body) or `DELETE /api/v1/expenses/9999` is sent, then the response is 404 with code `NOT_FOUND`, and nothing is stored or deleted.
- **AC-34** Given an id that is not a positive integer (`0`, `-1`, `abc`, `1.5`), when `GET`, `PUT` or `DELETE /api/v1/expenses/<id>` is sent, then the response is 400 `VALIDATION_ERROR`.

## Business rules
- Existing: BR-1 (positive whole VND), BR-2 (one existing category), BR-3 (date; belongs to its month), BR-4 and BR-11 (optional note, max 200, trimmed), BR-5 (fixed categories), BR-6 (one month), BR-7 (order), BR-9 (VND format), BR-12 (any valid date, past or future, is accepted; the "defaults to today" part applies to new expenses only), BR-13 (summary totals follow the stored expenses).
- New **BR-19**: Any expense can be edited, whatever its month. Editing can change the date, amount, category and note under the same rules as recording (BR-1–BR-4, BR-11, BR-12). An edited expense keeps its identity and its place in recording order (BR-7).
- New **BR-20**: Deleting an expense removes it permanently, after the user confirms. A deleted expense no longer counts in any list, total or summary, and cannot be restored.

## UI
**Expense list**: `project-context/design/screens/expense-list.html`
- Add the last column with the link "Edit" on every row, as in the mockup. The column has no header text.
- After Save, the list shows the month of the saved date with "All categories" (AC-4, AC-6). After Delete or Cancel, the list shows the month and category filter it had before "Edit" was clicked (AC-11, AC-20).
- Empty month: unchanged ("No expenses for this month.", month total 0 ₫).
- Differences from the mockup: the search bar stays out of scope; the header shows Expenses / Summary / Budgets as implemented by SPD-4.

**Edit expense form**: `project-context/design/screens/expense-form-edit.html`; errors as in `project-context/design/screens/expense-form-errors.html`
- Heading "Edit expense". Fields and order as in the Add expense form (SPD-1): Date, Amount (suffix "₫", hint "Whole đồng, no decimals."), Category ("Choose a category" + the six categories), Note (optional, textarea, 2 rows, max 200 characters). Pre-filled with the expense.
- Buttons: "Save" (primary), "Cancel", then, right-aligned, "Delete" (danger style).
- Validation runs on Save, with the same banner "Please fix the highlighted fields.", field messages and focus behaviour as SPD-1 (AC-12–AC-15).
- Saving state: Save and Delete disabled during the request (AC-10).
- API error: banner with the API `message` (AC-26). Network failure on Save: "Could not save the expense. Try again." (AC-27).
- Loading: "Loading…" in the card until the expense is loaded.
- Differences from the mockup:
  - The Amount shows plain digits (`280000`), not `380.000` as in the mockup, because the field rejects thousands separators (SPD-1 A-3). See A-1.
  - The header shows Expenses / Summary / Budgets (SPD-4) instead of Expenses / Summary / Categories.
  - The note error "Keep the note under 200 characters." cannot occur in the UI (textarea limit); the API still enforces it.

**Delete confirmation**: `specs/SPD-3/wireframes/edit-expense-delete-confirm.html` (new; no mockup covers it)
- Clicking "Delete" replaces the action row with a warning banner "Delete this expense? This cannot be undone." and the buttons "Delete expense" (danger) and "Keep". Focus moves to "Keep".
- "Keep" restores the action row (AC-19). "Delete expense" deletes and returns to the list (AC-20).
- Deleting state: both buttons disabled (AC-23). Network failure: error banner "Could not delete the expense. Try again." and the action row returns (AC-27).

**Expense not found / load error**: `specs/SPD-3/wireframes/edit-expense-not-found.html` (new)
- Heading "Edit expense"; the card shows only the error banner and the link "Back to expenses".
- Messages: "This expense no longer exists." (404, AC-24, AC-25); "Could not load the expense. Try again." (other load failures, AC-28).

## Data and API impact
- Data: no schema change. Updates change the existing row in `expenses` (same id); deletes remove the row. The note is stored trimmed, or `NULL` when empty.
- API (all under `/api/v1/expenses/:id`, id a positive integer, 400 `VALIDATION_ERROR` otherwise, 404 `NOT_FOUND` for an unknown id):
  - `GET` returns one expense `{ id, date, amountMinor, categoryId, note }`.
  - `PUT` replaces date, amount, category and note; same body and validation as `POST /api/v1/expenses`; returns 200 with the updated expense.
  - `DELETE` removes the expense; returns 204.
- `GET /api/v1/expenses` and `GET /api/v1/summary` are unchanged and reflect edits and deletes. `project-context/architecture/api.md` must document the new endpoints.
- The web app needs a route for the Edit expense screen that identifies the expense (so a reload or a stale link can show the not-found state).

## Assumptions
- A-1 The Amount field is pre-filled with plain digits (`280000`), not the formatted `380.000` shown in the mockup. Otherwise saving an unchanged expense would fail the SPD-1 amount rule (no separators). Display only.
- A-2 Delete asks for confirmation inline on the form (wireframe `edit-expense-delete-confirm.html`) because deletion is permanent and one misclick would lose data. The wording and the inline placement are easy to change.
- A-3 Every expense can be edited or deleted, including past months. No rule limits this for expenses (unlike budgets, BR-18), and the purpose is correcting mistakes, which are often found later.
- A-4 Deletion is a hard delete with no undo. There is no restore screen, so a soft delete would make no visible difference. An undo can be added later.
- A-5 After Save the list shows the month of the saved date with "All categories", the same as after Add in SPD-1, so the edited expense is always visible. After Delete or Cancel the list keeps the month and filter the user came from.
- A-6 An edited expense keeps its place in recording order (BR-7 "newest-recorded first" means the time it was recorded, not last edited). This only affects order between expenses on the same date.
- A-7 Cancel asks no confirmation, even when fields were changed (same as SPD-1 A-6).
- A-8 New texts: "Delete this expense? This cannot be undone.", "Delete expense", "Keep", "This expense no longer exists.", "Could not load the expense. Try again.", "Could not delete the expense. Try again.", "Back to expenses". Wording only.
- A-9 Budgets are not touched by edits or deletes. Budget usage is derived from expenses, so it follows automatically when SPD-5 adds warnings.

## Questions and answers
| # | Question | Answer | Source |
|---|---|---|---|
| — | None | — | — |

## Changelog
| Version | Change |
|---|---|
| 1 | Initial spec |
