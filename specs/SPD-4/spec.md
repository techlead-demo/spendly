---
issue: SPD-4
title: Set a monthly budget per category
type: story
status: draft            # draft | approved | implemented | cancelled
version: 1
design: [specs/SPD-4/wireframes/budgets.html]
business_rules: [BR-1, BR-5, BR-9, BR-16, BR-17, BR-18]
---

# SPD-4 Set a monthly budget per category

## Summary
The user can open a new "Budgets" screen and set how much they plan to spend per category in a month. A budget carries forward automatically to every later month until the user changes or removes it, so the user does not have to set budgets up again each month. Categories without a budget have no limit.

## Background
Spendly shows the user where their money goes (`project-context/business/overview.md`). Budgets let them plan how much should go where.
This story only stores and edits budgets. It blocks SPD-5 (warn when a category exceeds its monthly budget; mockup `project-context/design/screens/expense-list-over-budget.html`) and SPD-8 (carry over unused budget). Both read "the budget in effect for a category in a month" as defined here (BR-16).
No mockup covers a budget screen (`project-context/design/README.md`), so this spec adds the wireframe `specs/SPD-4/wireframes/budgets.html`.
Related specs: SPD-1 (amount input and validation messages), SPD-2 (header navigation and month picker behaviour).

## Scope
- In scope:
  - A "Budgets" screen: a Month picker and one budget field per category, with Save.
  - A "Budgets" link in the header navigation.
  - Automatic carry-forward of budgets to later months (BR-16), removal by clearing the field (BR-17), and editing only the current and future months (BR-18). Past months are shown read-only.
  - Validation, empty, loading and error states.
  - API to read the budgets in effect for a month and to set or remove budgets from a month onward.
- Out of scope:
  - Over-budget warnings and spent-versus-budget figures (SPD-5).
  - Carrying unused budget over to the next month (SPD-8).
  - Budget columns on the monthly summary or the expense list.
  - A total of all budgets, budgets for several categories at once, yearly budgets.
  - Changing budgets of past months.
  - The "Categories" navigation link and category management.

## User stories
- As the user, I want to set how much I plan to spend per category each month, so that I can keep my spending under control.
- As the user, I want my budgets to stay in place from month to month, so that I do not have to set them up again every month.

## Acceptance criteria
Today is 2026-11-02 (current month `2026-11`) in all examples unless stated otherwise. "Shows X" for a category means its budget field on the Budgets screen contains X; "empty" means no budget (no limit).

Navigation
- **AC-1** Given the app is open, when the user looks at the header, then it shows the brand "Spendly" followed by the links "Expenses", "Summary" and "Budgets". The link of the current screen is shown as active.
- **AC-2** Given any screen is open, when the user clicks "Budgets", then the Budgets screen opens with the heading "Budgets" and the Month picker set to the current month (`2026-11`).

Main flow
- **AC-3** Given no budget has ever been set, when the Budgets screen shows `2026-11`, then it lists six rows in this order: Food, Transport, Housing, Health, Entertainment, Other (BR-5). Every budget field is empty with the placeholder "No limit" and the suffix "₫". The hint "A budget applies to this month and every later month until you change it. Leave it empty for no limit." is shown above the table.
- **AC-4** Given no budget has ever been set and the screen shows `2026-11`, when the user enters Food `700000` and Entertainment `300000` and clicks Save, then the status text "Budgets saved." is shown. After reloading the page, `2026-11` shows Food `700000`, Entertainment `300000`, and the other four fields are empty.
- **AC-5** Given the budgets of AC-4, when the user selects `2026-12`, and then `2027-06`, then both months show Food `700000` and Entertainment `300000` (carry-forward, BR-16).
- **AC-6** Given the budgets of AC-4, when the user selects `2027-01`, changes Food to `800000` and clicks Save, then `2026-11` and `2026-12` still show Food `700000`, and `2027-01` and `2027-02` show Food `800000`. Entertainment shows `300000` in all four months (BR-16).
- **AC-7** Given the budgets after AC-6, when the user selects `2026-12`, changes Food to `750000` and clicks Save, then Food shows `700000` in `2026-11`, `750000` in `2026-12`, and `800000` in `2027-01` and later. A budget set for a later month is kept when an earlier month is changed (BR-16).
- **AC-8** Given the budgets after AC-6, when the user selects `2027-03`, clears the Food field and clicks Save, then Food is empty in `2027-03` and every later month (e.g. `2027-04`, `2028-01`), and still shows `800000` in `2027-02` (BR-17).
- **AC-9** Given Food is empty from `2027-03` (AC-8), when the user selects `2027-05`, enters Food `600000` and clicks Save, then Food is empty in `2027-03` and `2027-04` and shows `600000` from `2027-05` onward.
- **AC-10** Given the screen shows `2026-11` with Food `700000`, when the user clicks Save without changing any field, then "Budgets saved." is shown and every month shows the same budgets as before.
- **AC-11** Given Food `700000` is in effect for `2026-11`, when the user changes only Entertainment and saves, then Food stays `700000` in `2026-11` and later. Saving changes only the categories whose value differs from the one shown.

Validation
- **AC-12** Given the user enters a Food budget of `0`, `-5000`, `12,5`, `12.5`, `700.000` or `abc`, when they click Save, then nothing is saved for any category. The banner "Please fix the highlighted fields." is shown above the table, the Food field is marked invalid, and "Enter a whole amount in đồng, greater than 0." is shown under it (BR-17).
- **AC-13** Given Food and Transport are both invalid, when the user clicks Save, then both fields show the message, nothing is saved, and focus moves to the Food field (the first invalid field in table order).
- **AC-14** Given validation errors are shown, when the user corrects the fields and clicks Save, then the budgets are saved, "Budgets saved." is shown, and the banner and field messages are gone.
- **AC-15** Given the user enters Food `1`, when they click Save, then Food is saved as 1 đồng and shows `1` (BR-1 lower boundary).
- **AC-16** Given the user enters Food `  700000  ` (with leading and trailing spaces), when they click Save, then Food is saved as `700000`. Given a field contains only spaces, then it is treated as empty (no budget).

Months
- **AC-17** Given Food `700000` has been in effect since `2026-10`, when the user selects `2026-10` (a month before the current month), then the screen shows Food `700000` with all six fields disabled, no Save button, and the text "Past months cannot be changed." in place of the hint (BR-18).
- **AC-18** Given Food `700000` was set for `2026-11`, when today becomes 2026-12-01, then the Budgets screen opens on `2026-12` and shows Food `700000`, and `2026-11` is shown read-only with Food `700000` (BR-16, BR-18).
- **AC-19** Given the user has unsaved edits in `2026-11`, when they change the Month picker to `2026-12`, then the edits are discarded and the fields show the budgets in effect for `2026-12`.
- **AC-20** Given the screen shows `2026-11`, when the user clears the Month picker, then the budgets of `2026-11` stay on screen and no request is sent, as on the expense list.

Loading and error states
- **AC-21** Given the budgets of a month are being loaded, when the data has not arrived yet, then the text "Loading…" is shown in place of the table.
- **AC-22** Given the API cannot be reached or returns an error when loading, then the alert "Could not load the budgets. Try again." is shown and no table is shown.
- **AC-23** Given the API cannot be reached or returns an error when saving, then the alert "Could not save the budgets. Try again." is shown above the table, the user's edits stay in the fields, and "Budgets saved." is not shown. If the API returns a 400 error, its message is shown instead.

API
- **AC-24** Given the budgets of AC-4, when the budgets for month `2026-12` are requested from the API, then the response is 200 with six items in the fixed category order. Each item has the category id and `amountMinor`, which is the budget in effect for that month or `null` when there is none. For example, Food has 700000 and Transport has `null`.
- **AC-25** Given a budgets read request where `month` is missing, `2026-13`, `2026-1` or `11/2026`, when it is sent, then the response is 400 with code `VALIDATION_ERROR`.
- **AC-26** Given a set-budgets request for month `2027-01` with Food `amountMinor` 800000, when it is sent, then the response is 200 (or 204) and a read for `2027-01` returns Food 800000, while a read for `2026-12` returns Food unchanged (BR-16).
- **AC-27** Given a set-budgets request for month `2027-03` with Food `amountMinor` `null`, when it is sent, then reads for `2027-03` and later return Food `null`, and a read for `2027-02` is unchanged (BR-17).
- **AC-28** Given a set-budgets request for month `2026-10` (before the current month `2026-11`), when it is sent, then the response is 400 with code `VALIDATION_ERROR` and nothing is stored (BR-18). A request for `2026-11` is accepted.
- **AC-29** Given a set-budgets request where an `amountMinor` is `0`, `-1`, `12.5`, the string `"700000"`, or greater than 9007199254740991, or where a category id does not exist, or where `month` is invalid as in AC-25, when it is sent, then the response is 400 with code `VALIDATION_ERROR` and no budget of the request is stored.

## Business rules
- Existing: BR-1 (positive whole VND amounts, at least 1 đồng), BR-5 (fixed categories and their order), BR-9 (VND formatting).
- New **BR-16**: A budget is the amount the user plans to spend in one category in one month. A budget set for a category from month M applies to M and every later month, until the user sets or removes that category's budget from a later month onward. Changing a budget from month M never changes months before M, and never overrides a budget the user set or removed from a later month. A category without a budget in effect for a month has no limit in that month.
- New **BR-17**: A budget amount follows BR-1: a whole number of VND, at least 1 đồng, with no upper limit. Clearing a category's budget from month M removes it from M onward, so the category has no limit from M until a later budget is set.
- New **BR-18**: Budgets can only be set, changed or removed from the current month or a later month. Budgets in effect for past months can be viewed but not changed.

## UI
**App header**: `specs/SPD-4/wireframes/budgets.html` (based on the header in `project-context/design/screens/monthly-summary.html`)
- The header shows the brand "Spendly" followed by the links "Expenses", "Summary" and "Budgets". The active link is underlined, as in the mockups.
- Difference from the mockups: the "Budgets" link is new, and "Categories" is still not shown (as in SPD-2).

**Budgets screen**: `specs/SPD-4/wireframes/budgets.html`
- Heading "Budgets". Toolbar with a single field "Month" (`<input type="month">`) that defaults to the current month. Its `min` is the current month, but an earlier month that is typed in is shown read-only (AC-17).
- Hint under the toolbar: "A budget applies to this month and every later month until you change it. Leave it empty for no limit."
- Table with the columns "Category" and "Monthly budget". There is one row per category in the fixed order (BR-5). Each budget field is a numeric text input with the placeholder "No limit" and the suffix "₫". It shows the budget in effect as plain digits (e.g. `700000`), or is empty.
- A "Save" primary button under the table. It saves all six fields of the selected month at once.
- Validation (after Save): the banner "Please fix the highlighted fields." above the table. Each invalid field is marked invalid and has the message "Enter a whole amount in đồng, greater than 0." under it. Focus moves to the first invalid field. The banner and message are the same as in `project-context/design/screens/expense-form-errors.html`.
- States:
  - Saved: the status text "Budgets saved." next to Save. It disappears when a field or the month changes.
  - Past month: all fields are disabled, there is no Save button, and the text "Past months cannot be changed." replaces the hint.
  - Loading: "Loading…" instead of the table.
  - Load error: the alert "Could not load the budgets. Try again." instead of the table.
  - Save error: the alert "Could not save the budgets. Try again." above the table, or the API's message for a 400 error. The edits are kept.
  - Cleared month: the previous month's budgets stay on screen.
- There is no empty state: the table always has six rows. "No budget" is an empty field.

## Data and API impact
- Data: new stored data for budgets. Each record is a category, the month a budget takes effect from (`YYYY-MM`), and either an amount in integer minor units or "no budget" (a removal). The budget in effect for a category in month X comes from that category's record with the latest start month that is not after X. If no such record exists, there is no budget. The Engineer decides the exact schema, and `project-context/architecture/data-model.md` must document it. Expenses and categories do not change.
- API (under `/api/v1`, documented in `project-context/architecture/api.md`):
  - Read: for a month `YYYY-MM`, the budget in effect per category (all six, fixed order, `amountMinor` or `null`). The month is validated as in `GET /api/v1/expenses`.
  - Write: for a month `YYYY-MM`, set or remove the budget of one or more categories from that month onward. All of the request is stored, or none of it. The write rejects months before the current month (server local date) with 400 `VALIDATION_ERROR`.
  - Existing responses do not change. SPD-5 and SPD-8 will read the budget in effect through the same rule (BR-16).
- Amounts are integer minor units (`amountMinor`), never floats.

## Assumptions
- A-1 Budgets are edited on a new "Budgets" screen that has a "Budgets" header link, using the wireframe `specs/SPD-4/wireframes/budgets.html`. No mockup exists for this, and the layout follows the existing screens.
- A-2 The screen saves all six categories of a month with one Save button. Only the categories whose value differs from the budget in effect are stored as changes (AC-10, AC-11). Saving an unchanged value therefore does not stop a later month's budget from applying.
- A-3 Past months can be selected and shown read-only, with the text "Past months cannot be changed.", instead of being blocked completely. This lets the user see what applied before, and it is easy to remove.
- A-4 Budget inputs use the same rules as the expense Amount field in SPD-1: digits only, leading and trailing spaces ignored, no thousands separators. They also use the same message "Enter a whole amount in đồng, greater than 0." and the same banner. The field shows plain digits, not formatted money.
- A-5 Changing the month discards unsaved edits without asking. This is simple and easy to change to a confirmation later.
- A-6 "Current month" for the write rule (BR-18) is the server's local date. The app runs for one user on one machine, so the server and browser dates agree.
- A-7 The texts "Budgets saved.", "Past months cannot be changed.", "Loading…", "Could not load the budgets. Try again.", "Could not save the budgets. Try again.", the hint text, and the placeholder "No limit" are new wording.
- A-8 The API has no business upper limit for amounts. Like SPD-1, it rejects only values above 9007199254740991.

## Questions and answers
| # | Question | Answer | Source |
|---|---|---|---|
| Q1 | How should budgets get reused across months: automatic carry-forward, or a manual "Copy budgets from previous month" action? | Automatic carry-forward: a budget set for month M applies to M and every later month until the user changes or removes it from some later month onward. Earlier months are never affected. | suggested default accepted by admin, 2026-11-02 |
| Q2 | What budget amounts are valid, and how does the user remove a budget so the category has no limit again? | A whole VND amount of at least 1 đồng (BR-1), with no upper limit. Clearing the amount removes the budget from the chosen month onward, and the category then has no limit. | suggested default accepted by admin, 2026-11-02 |
| Q3 | Can the user set or change budgets for past months as well as the current and future months? | Only current and future months. | Jira comment by admin, 2026-11-02 |

## Changelog
| Version | Change |
|---|---|
| 1 | Initial spec |
