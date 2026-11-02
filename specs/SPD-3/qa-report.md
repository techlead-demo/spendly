---
issue: SPD-3
result: fail
tested_sha: 59cc874
run: 1
date: 2026-11-02
---

# QA report — SPD-3 (run 1)

## Result
FAIL: 1 in-scope defect (D-1, AC-24). It is minor: an Edit URL for id 0 shows the load error instead of the not-found state.
The other 44 ACs passed their cases. Lint and all unit/API tests pass. In e2e, every test passes except the failing test that reproduces D-1.

## Environment
Commit 59cc874 on feat/SPD-3 (base develop). Web on :5111, API on :5112 (`WEB_PORT`/`API_PORT`). Automated runs used
Playwright's `webServer` with `DB_PATH=:memory:` and the sample data. Exploration ran on `npm run dev` with the default
database. Chromium, viewport 1280×720.

## Results
| Case | AC | Status | Note |
|---|---|---|---|
| TC-1 | AC-1 | passed | |
| TC-2 | AC-2 | passed | |
| TC-3 | AC-3 | passed | |
| TC-4 | AC-4 | passed | |
| TC-5 | AC-5 | passed | |
| TC-6 | AC-6 | passed | |
| TC-7 | AC-7 | passed | |
| TC-8 | AC-8 | passed | |
| TC-9 | AC-9 | passed | |
| TC-10 | AC-10 | passed | Cancel stays enabled during Save; the spec does not require it to be disabled |
| TC-11 | AC-11 | passed | |
| TC-12 | AC-12 | passed | all six values |
| TC-13 | AC-13 | passed | |
| TC-14 | AC-14 | passed | |
| TC-15 | AC-15 | passed | |
| TC-16 | AC-16 | passed | typed and pasted |
| TC-17 | AC-17 | passed | |
| TC-18 | AC-18 | passed | |
| TC-19 | AC-19 | passed | |
| TC-20 | AC-20 | passed | |
| TC-21 | AC-21 | passed | |
| TC-22 | AC-22 | passed | |
| TC-23 | AC-23 | passed | |
| TC-24 | AC-24 | passed | id 9999 |
| TC-25 | AC-25 | passed | |
| TC-26 | AC-26 | passed | |
| TC-27 | AC-27 | passed | |
| TC-28 | AC-28 | passed | |
| TC-29 | AC-29 | passed | Engineer's server test |
| TC-30 | AC-30 | passed | Engineer's server test |
| TC-31 | AC-31 | passed | Engineer's matrix + 4 QA values + non-object body |
| TC-32 | AC-32 | passed | Engineer's server test |
| TC-33 | AC-33 | passed | Engineer's server test |
| TC-34 | AC-34 | passed | Engineer's server test |
| TC-35 | AC-35 | passed | |
| TC-36 | AC-36 | passed | toast closed after 4–6.5 s |
| TC-37 | AC-37 | passed | UI and API |
| TC-38 | AC-38 | passed | Summary, reload, Add expense, Edit on another row |
| TC-39 | AC-39 | passed | toast still open and Undo disabled 6 s after the click |
| TC-40 | AC-40 | passed | network failure and 500 |
| TC-41 | AC-41 | passed | |
| TC-42 | AC-42 | passed | |
| TC-43 | AC-43 | passed | |
| TC-44 | AC-44 | passed | |
| TC-45 | AC-45 | passed | |
| TC-46 | — | passed | month boundaries |
| TC-47 | — | passed | 9007199254740991 accepted |
| TC-48 | — | passed | leap day |
| TC-49 | — | passed | |
| TC-50 | AC-24 | failed | see D-1 |
| TC-51 | — | passed | manual design comparison, see below |
| TC-52 | — | passed | |
| TC-53 | — | passed | |
| TC-54 | — | passed | |

Suites on 59cc874 plus the QA tests:
- `npm run lint`: passed.
- `npm test`: server 207 passed (10 files, 17 of them in the new QA file); web 208 passed (14 files).
- `npx playwright test`: 81 passed, 1 failed (TC-50 / D-1, failed again on its retry).

## In-scope defects
### D-1 Edit URL with id 0 shows "Could not load the expense. Try again." instead of the not-found state
- AC: AC-24
- Steps: 1. Open `http://localhost:5111/#/expenses/0/edit` (a stale or hand-edited link; the route pattern accepts any digits).
- Expected (AC-24): an expense that does not exist shows the banner "This expense no longer exists." and "Back to expenses".
- Actual: the API answers 400 `VALIDATION_ERROR` for id 0. The screen treats that as a load failure and shows "Could not load the expense. Try again.", which no retry can fix.
- Cause area: `EditExpensePage` maps only 404 to not-found. `parseEditExpenseHash` (`/^#\/expenses\/(\d+)\/edit$/`) accepts ids that are not positive integers.
- Failing test: e2e/edit-expense.qa.spec.ts › "TC-50 (AC-24): an Edit link with id 0 shows "This expense no longer exists.""
- Evidence: qa/D-1-id-0-load-error.png
- Severity: minor. The app itself never links to id 0. The reviewer also flagged this in review 1.

## Out-of-scope bugs (proposed)
### P-1 The Note textarea uses the browser's monospace font instead of the design font
On develop, `web/src/styles/global.css` sets `font: inherit` for `button, input, select` but not for `textarea`. The Note
field of Add expense (and now of Edit expense) therefore uses Chromium's default monospace font. The mockups
(`expense-form.html`, `expense-form-edit.html`) inherit the design font for `textarea`. This PR did not cause it: the
rule is unchanged from develop. Steps: open Add expense or Edit expense and type in Note. Expected: Inter, like the other
fields. Actual: `getComputedStyle(textarea).fontFamily` is `monospace`. Evidence: qa/TC-2-edit-form.png (Note field).

## Design comparison
| Screen | Mockup / wireframe | Result |
|---|---|---|
| Expense list with Edit link | design/screens/expense-list.html | Matches: last column without header, link "Edit" on every row. Search bar out of scope (as specified). qa/TC-1-list-edit-link.png |
| Edit expense form | design/screens/expense-form-edit.html | Matches: heading, fields in order, plain-digit amount with ₫ suffix and hint, Save/Cancel left, Delete right in danger style. Header shows Expenses / Summary / Budgets (as specified). Note font differs, see P-1. qa/TC-2-edit-form.png |
| Delete confirmation | SPD-3/wireframes/edit-expense-delete-confirm.html | Matches: centred modal over a dimmed form, title, text, "Delete expense" (danger) then "Keep". qa/TC-18-delete-dialog.png |
| Undo toast / empty month | SPD-3/wireframes/expense-list-undo-toast.html | Matches: bottom-centre toast "Expense deleted." with a link-style "Undo"; the empty month shows "No expenses for this month." and 0 ₫. qa/TC-21-undo-toast-empty-month.png |
| Not found | SPD-3/wireframes/edit-expense-not-found.html | Matches for id 9999: heading, error banner and "Back to expenses" only. qa/TC-24-not-found.png |

## Notes
- The spec front matter still says `status: draft` (version 4), although its PR was merged. I tested against version 4 as approved.
- The browser console shows a 404 for `/favicon.ico`. The PR does not touch favicons and the 404 is cosmetic, so no bug is proposed.
