---
issue: SPD-1
title: Record an expense
type: story
status: draft            # draft | approved | implemented | cancelled
version: 1
design: [project-context/design/screens/expense-form.html, project-context/design/screens/expense-form-errors.html, project-context/design/screens/expense-list.html]
business_rules: [BR-1, BR-2, BR-3, BR-4, BR-5, BR-6, BR-7, BR-9, BR-11, BR-12]
---

# SPD-1 Record an expense

## Summary
The user can record a new expense (date, amount in VND, category, optional note) from an Add expense form.
The expense is saved, and the expense list immediately shows it in the month of its date. Until now, expenses only came from sample data.

## Background
Spendly has only a read-only expense list (see `project-context/business/overview.md`). This story adds the first write path.
It blocks SPD-3 (Edit and delete an expense) and SPD-7 (Recurring expenses), which build on the form and the create endpoint.
Most expenses are entered on the day they happen, so the date defaults to today.

## Scope
- In scope:
  - An "Add expense" button on the expense list that opens the Add expense form.
  - The Add expense form: Date, Amount, Category, Note, Save, Cancel. Includes validation and error states.
  - Saving a new expense through the API, then returning to the expense list showing the month of the saved expense.
  - A create-expense endpoint with server-side validation.
- Out of scope:
  - Editing and deleting expenses (SPD-3), recurring expenses (SPD-7).
  - The search bar and the per-row Edit links shown in `expense-list.html`.
  - The header navigation links (Expenses / Summary / Categories); the header keeps the brand only.
  - Managing categories (BR-5 still applies), budgets, monthly summary.
  - Amount input with thousands separators or arithmetic (see A-3).

## User stories
- As the user, I want to record an expense with its amount, date, category and an optional note, so that my spending list stays complete.

## Acceptance criteria
Today is 2026-11-02 in all examples unless stated otherwise.

Entry point and initial state
- **AC-1** Given the expense list is open, when the user looks at the title row, then a primary button "Add expense" is shown to the right of the "Expenses" heading.
- **AC-2** Given the expense list is open, when the user clicks "Add expense", then the "Add expense" form is shown with Date = today (`2026-11-02`), Amount empty with placeholder "0" and the suffix "₫", the hint "Whole đồng, no decimals.", Category showing "Choose a category" (nothing selected), and Note empty.
- **AC-3** Given the Add expense form is open, when the user opens the Category select, then it offers "Choose a category" followed by Food, Transport, Housing, Health, Entertainment, Other, in that order.

Main flow
- **AC-4** Given the form shows Date `2026-11-02`, Amount `85000`, Category Food and Note `Lunch`, when the user clicks Save, then the expense is stored with date `2026-11-02`, amount 85000 đồng, category Food and note "Lunch". The expense list then shows November 2026 with a row `02/11/2026 · Food · Lunch · 85.000 ₫`, and the month total increases by 85.000 ₫.
- **AC-5** Given the user saves an expense with Date `2026-09-15`, Amount `30000`, Category Transport and an empty note, when the list is shown after saving, then the month picker shows `2026-09`, the list contains a row `15/09/2026 · Transport · (no note) · 30.000 ₫`, and the stored note is empty (`null`).
- **AC-6** Given November 2026 already has an expense dated `2026-11-02`, when the user saves another expense dated `2026-11-02`, then the new expense is listed above the existing one (BR-7).
- **AC-7** Given the expense list was filtered to category Health, when the user saves a Food expense, then the list is shown with "All categories" selected so that the new expense is visible.
- **AC-8** Given the user enters Note `  Coffee  ` (with leading and trailing spaces), when the expense is saved, then the stored note is "Coffee". Given the note contains only spaces, then the stored note is empty (`null`) (BR-11).
- **AC-9** Given the user enters a future date `2026-12-24` with Amount `500000` and Category Other, when they click Save, then the expense is saved and the list shows December 2026 with that expense (BR-12).
- **AC-10** Given a Save request is in progress, when the user clicks Save again, then no second expense is created. The Save button is disabled until the request finishes.

Cancel
- **AC-11** Given the user has filled in some fields of the Add expense form, when they click Cancel, then no expense is stored and the expense list is shown with the month and category filter it had before "Add expense" was clicked.

Validation (form)
- **AC-12** Given the Amount is empty, `0`, `-5000`, `12,5` or `12.5`, when the user clicks Save, then nothing is saved. The banner "Please fix the highlighted fields." is shown at the top of the form, the Amount field is marked invalid, and "Enter a whole amount in đồng, greater than 0." is shown under it.
- **AC-13** Given the Date is cleared, when the user clicks Save, then nothing is saved, the banner is shown, the Date field is marked invalid and "Enter a valid date." is shown under it.
- **AC-14** Given no category is chosen, when the user clicks Save, then nothing is saved, the banner is shown, the Category field is marked invalid and "Choose a category." is shown under it.
- **AC-15** Given Date, Amount and Category are all invalid, when the user clicks Save, then all three field messages are shown at once, and focus moves to the Date field (the first invalid field in form order).
- **AC-16** Given the Note field, when the user types or pastes text, then it accepts at most 200 characters.
- **AC-17** Given validation errors are shown, when the user corrects all fields and clicks Save, then the expense is saved and the banner and field messages are gone.
- **AC-18** Given Amount is `1`, when the user saves with a valid date and category, then the expense is saved with amount 1 đồng and listed as `1 ₫` (BR-1 lower boundary).

Validation and errors (API)
- **AC-19** Given a create request with `{ "date": "2026-11-02", "amountMinor": 85000, "categoryId": 1, "note": "Lunch" }`, when it is sent to the create endpoint, then the response is 201 with the created expense `{ id, date, amountMinor, categoryId, note }`, and `GET /api/v1/expenses?month=2026-11` includes it.
- **AC-20** Given a create request where `amountMinor` is missing, `0`, `-1`, `12.5`, the string `"85000"`, or greater than 9007199254740991, when it is sent, then the response is 400 with code `VALIDATION_ERROR` and nothing is stored.
- **AC-21** Given a create request where `date` is missing, `2026-13-01`, `2026-02-30`, `02/11/2026` or `2026-11-2`, when it is sent, then the response is 400 `VALIDATION_ERROR` and nothing is stored.
- **AC-22** Given a create request where `categoryId` is missing, `0`, `"1"` or `99` (no such category), when it is sent, then the response is 400 `VALIDATION_ERROR` and nothing is stored (BR-2).
- **AC-23** Given a create request whose `note` is 201 characters long (after trimming) or is not a string or `null`, when it is sent, then the response is 400 `VALIDATION_ERROR`. A note of exactly 200 characters is accepted.
- **AC-24** Given the API rejects a Save with an error, when the form receives the response, then the form stays open with the entered values, and the banner at the top shows the API error `message`.
- **AC-25** Given the API cannot be reached, when the user clicks Save, then the form stays open with the entered values, and the banner shows "Could not save the expense. Try again."

## Business rules
- Existing: BR-1 (positive whole VND, minimum 1 đồng), BR-2 (exactly one existing category), BR-3 (local calendar date; belongs to its month), BR-4 (optional note), BR-5 (fixed categories), BR-6 (list shows one month), BR-7 (order: date desc, then newest recorded first), BR-9 (VND formatting).
- New **BR-11**: A note is at most 200 characters. Leading and trailing spaces are removed, and a note that is empty after that is stored as no note.
- New **BR-12**: When an expense is recorded, its date defaults to today's local date. Any valid calendar date, past or future, is accepted.

## UI
**Expense list** — `project-context/design/screens/expense-list.html`
- Add only the "Add expense" primary button in the title row, to the right of the "Expenses" heading. The search bar, Edit links and header navigation in the mockup stay out of scope.
- After a successful Save, the list shows the month of the saved expense with "All categories" selected (AC-4, AC-5, AC-7).

**Add expense form** — `project-context/design/screens/expense-form.html` (initial state), `project-context/design/screens/expense-form-errors.html` (validation errors)
- Heading "Add expense". Fields, in this order:
  - Date: date input, defaults to today.
  - Amount: numeric input, placeholder "0", suffix "₫", hint "Whole đồng, no decimals.".
  - Category: select with "Choose a category" and the six categories.
  - Note (optional): textarea, 2 rows, max 200 characters.
- Buttons: "Save" (primary) and "Cancel".
- Validation runs on Save, not while typing. Error state as in `expense-form-errors.html`:
  - The banner "Please fix the highlighted fields." is shown.
  - Each invalid field gets the invalid style and its message underneath. Messages:
    - Date: "Enter a valid date."
    - Amount: "Enter a whole amount in đồng, greater than 0."
    - Category: "Choose a category."
  - Focus moves to the first invalid field.
- API error: the banner shows the API `message` (AC-24). Network failure: the banner shows "Could not save the expense. Try again." (AC-25). Both use the mockup's error banner style.
- Saving state: the Save button is disabled while the request is in progress (AC-10).
- Loading the categories: the select shows the six categories once they load. If they cannot be loaded, the banner shows "Could not load categories. Try again." and Save stays available, but it fails with "Choose a category.".
- Differences from the mockups:
  - The header shows only the brand (no navigation links).
  - The note error "Keep the note under 200 characters." cannot occur in the UI, because the textarea limits input to 200 characters. The API still enforces the limit (AC-23).
  - The two messages "Could not save the expense. Try again." and "Could not load categories. Try again." are new (not in the mockups).
  - The mockups do not say which category filter the list shows after Save; this spec decides "All categories" (A-5).

## Data and API impact
- Data: no schema change. New rows go into the existing `expenses` table. The note is stored trimmed, or `NULL` when empty.
- API: a new create-expense endpoint under `/api/v1/expenses` that takes `date`, `amountMinor`, `categoryId` and an optional `note` (`string | null`).
  - It validates the input per AC-19–AC-23 and returns 201 with the created expense.
  - Errors use the standard error body.
  - `project-context/architecture/api.md` must document the endpoint.
- Existing `GET /api/v1/categories` and `GET /api/v1/expenses` are unchanged.

## Assumptions
- A-1 Future dates are allowed (BR-12). The issue and the error mockup list no "future date" message, and recurring or prepaid expenses (SPD-7) may need them. Adding a restriction later is easy.
- A-2 Amounts have no business upper limit. The API only rejects values above 9007199254740991, the largest integer that can be sent safely as JSON. Real expenses never come close to that.
- A-3 The Amount field accepts digits only, with leading and trailing spaces ignored. Thousands separators (`85.000`), spaces inside the number, and decimals are rejected with the amount message. This avoids ambiguity with the `vi-VN` grouping dot, and the hint "Whole đồng, no decimals." already says so. Accepting separators later is easy.
- A-4 A note of up to and including 200 characters is valid (the mockup's `maxlength="200"`). Spaces at the start and end are trimmed, and a blank note is stored as no note (BR-11).
- A-5 After Save, the list shows "All categories", so the new expense is always visible, as the issue requires ("appear in the list straight away").
- A-6 Cancel returns to the list with the month and category filter it had before. No confirmation is asked, even if fields were filled in.
- A-7 The texts "Could not save the expense. Try again." and "Could not load categories. Try again." are new. Wording only.
- A-8 Validation runs when Save is clicked; messages are not shown while typing (as the error mockup note says: "shown after Save").

## Questions and answers
| # | Question | Answer | Source |
|---|---|---|---|
| — | None | — | — |

## Changelog
| Version | Change |
|---|---|
| 1 | Initial spec |
