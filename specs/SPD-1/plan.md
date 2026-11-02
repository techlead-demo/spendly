---
issue: SPD-1
spec_version: 1
revision: 2
---

# Implementation plan — SPD-1

## Approach
**API.** New `POST /api/v1/expenses`. The route checks the request shape (types and formats: `date` is a real
calendar date `YYYY-MM-DD`, `amountMinor` a safe positive integer, `categoryId` a positive integer, `note` a
string, `null` or absent) and BR-11 (trim the note, blank → `null`, at most 200 characters; moved from the service
in revision 2). The expense service applies BR-2 (the category must exist), both as 400 `VALIDATION_ERROR`, then the repository
inserts the row and returns it. Response 201 with the created expense.

**Web.** `App` keeps a small view state (`list` | `add`) and the list filter (month + category), lifted out of
`ExpenseListPage` so that Cancel can return to the filter the list had (AC-11) and Save can switch to the month
of the saved expense with "All categories" (AC-4, AC-5, AC-7). There is no router yet (see architecture
overview), so a view state is enough. The new `AddExpensePage` follows `expense-form.html` /
`expense-form-errors.html`: it loads the categories, validates on Save with the pure helper
`lib/expenseForm.ts` (unit-tested), focuses the first invalid field, disables Save while the request runs and
shows API or network errors in the banner. Amount is a text input with `inputMode="numeric"` (as in the
mockup) so that `12,5` and `12.5` reach validation and get the amount message (A-3).

No new dependencies.

## Changes
| Area | File(s) | Change |
|---|---|---|
| API | server/src/lib/dates.ts | `isDate()` (real calendar date check) |
| API | server/src/routes/expenses.ts | `POST /` with body validation |
| API | server/src/services/expenseService.ts | `createExpense` applying BR-2, BR-11 |
| API | server/src/repositories/expenseRepository.ts, categoryRepository.ts | `create`, `exists` |
| API | server/src/app.ts, server/src/types.ts | Wiring, `NewExpense` type |
| Web | web/src/api/client.ts, types.ts | `createExpense()`, `NewExpense` |
| Web | web/src/lib/dates.ts, lib/expenseForm.ts | `today()`, `isDate()`, form validation (`validateExpenseForm`) |
| Web | web/src/App.tsx | View state + list filter |
| Web | web/src/pages/ExpenseListPage.tsx | Filter from props, "Add expense" button |
| Web | web/src/pages/AddExpensePage.tsx (+ .module.css) | The Add expense form |
| E2E | e2e/add-expense.spec.ts | Add, cancel, validation, error journeys |

## Data model changes
None (no schema change). `data-model.md` notes that the note is stored trimmed and at most 200 characters.

## Acceptance criteria → tests
| AC | Test(s) |
|---|---|
| AC-1 | web/src/App.test.tsx › "AC-1: …"; e2e/add-expense.spec.ts › "AC-1, AC-4: …" |
| AC-2 | web/src/pages/AddExpensePage.test.tsx › "AC-2: …"; web/src/App.test.tsx › "AC-2: …" |
| AC-3 | web/src/pages/AddExpensePage.test.tsx › "AC-3: …" |
| AC-4 | e2e/add-expense.spec.ts › "AC-1, AC-4: …"; AddExpensePage.test.tsx › "AC-4: …" |
| AC-5 | e2e/add-expense.spec.ts › "AC-5, AC-7: …"; web/src/App.test.tsx › "AC-5, AC-7: …"; server/test/createExpense.test.ts › "AC-5: …" |
| AC-6 | server/test/createExpense.test.ts › "AC-6: …" |
| AC-7 | e2e/add-expense.spec.ts › "AC-5, AC-7: …"; web/src/App.test.tsx › "AC-5, AC-7: …" |
| AC-8 | server/test/createExpense.test.ts › "AC-8: …"; web/src/lib/expenseForm.test.ts › "AC-8: …" |
| AC-9 | e2e/add-expense.spec.ts › "AC-9: …"; server/test/createExpense.test.ts › "AC-9: …" |
| AC-10 | web/src/pages/AddExpensePage.test.tsx › "AC-10: …" |
| AC-11 | web/src/App.test.tsx › "AC-11: …"; AddExpensePage.test.tsx › "AC-11: …"; e2e/add-expense.spec.ts › "AC-11: …" |
| AC-12 | web/src/lib/expenseForm.test.ts › "AC-12: …"; AddExpensePage.test.tsx › "AC-12: …" |
| AC-13 | expenseForm.test.ts › "AC-13: …"; AddExpensePage.test.tsx › "AC-13: …" |
| AC-14 | expenseForm.test.ts › "AC-14: …"; AddExpensePage.test.tsx › "AC-14: …" |
| AC-15 | AddExpensePage.test.tsx › "AC-15: …"; expenseForm.test.ts › "AC-15: …"; e2e/add-expense.spec.ts › "AC-15, AC-17: …" |
| AC-16 | AddExpensePage.test.tsx › "AC-16: …"; e2e/add-expense.spec.ts › "AC-16: …" |
| AC-17 | AddExpensePage.test.tsx › "AC-17: …"; e2e/add-expense.spec.ts › "AC-15, AC-17: …" |
| AC-18 | server/test/createExpense.test.ts › "AC-18: …"; expenseForm.test.ts › "AC-18: …" |
| AC-19 | server/test/createExpense.test.ts › "AC-19: …" |
| AC-20 | server/test/createExpense.test.ts › "AC-20: …" |
| AC-21 | server/test/createExpense.test.ts › "AC-21: …" |
| AC-22 | server/test/createExpense.test.ts › "AC-22: …" |
| AC-23 | server/test/createExpense.test.ts › "AC-23: …" |
| AC-24 | AddExpensePage.test.tsx › "AC-24: …" |
| AC-25 | AddExpensePage.test.tsx › "AC-25: …"; e2e/add-expense.spec.ts › "AC-25: …" |

## Context updates
- project-context/architecture/api.md: `POST /api/v1/expenses`.
- project-context/architecture/data-model.md: note length and trimming.
- project-context/architecture/overview.md: web view state (list / add) in `App`.

## Risks and notes
- The spec front matter still says `status: draft`; the task states develop holds the approved spec, so it is
  implemented as version 1.
- The form lives in `AddExpensePage` (state + layout). SPD-3 (edit) may extract a shared form component.
- A response that is not the standard error body (e.g. the dev proxy failing because the API is down) is treated
  like a network failure (AC-25 message).

## Revision 2
| Feedback item | Resolution |
|---|---|
| [major] Malformed JSON body returns 500 INTERNAL_ERROR | Fixed: `errorHandler` maps `express.json()` errors (4xx with a `type`) to 400 `VALIDATION_ERROR` ("request body must be valid JSON" for `entity.parse.failed`). New Supertest case sends `{"date":`. `api.md` error table updated. |
| [minor] Note length (BR-11) validated in the service, not at the route | Fixed: trimming, the 200-character check and blank → `null` moved to `parseNewExpense` in the route; the service keeps only the category-exists check (BR-2, needs the repository). `data-model.md` updated. Existing AC-8/AC-23 API tests unchanged and passing. |
| [nit] `isDate` rejects years 0000–0099 | Declined: the human reviewer asked to ignore the nits; no practical impact for expenses. |
| [nit] Whitespace change in `formatDate` doc comment | Declined: the human reviewer asked to ignore the nits. |
