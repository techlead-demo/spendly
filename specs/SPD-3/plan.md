---
issue: SPD-3
spec_version: 4
revision: 3
---

# Implementation plan — SPD-3

## Approach
Server: `expenses` gets a `deleted` flag (0/1). Deleting sets it, restoring clears it, so a restored expense keeps
its id and therefore its place in recording order (BR-7, BR-21); editing updates the row in place (BR-20). Every
read (list, month total, summary, get by id) excludes deleted rows. New routes on `/api/v1/expenses/:id`:
`GET`, `PUT` (same body parser as `POST`), `DELETE` (204) and `POST /:id/restore`. The id must be a positive
integer (400). `expenseService` throws 404 `NOT_FOUND` for unknown or deleted ids; restore is 404 only for an id
that was never recorded and is idempotent otherwise (A-10: no server time limit).

Web: the Edit expense screen has its own hash route `#/expenses/<id>/edit`, so a reload or stale link shows the
not-found state. The route belongs to the Expenses screen (`ExpensesScreen` in `App.tsx`), which keeps the list
filter, so Cancel and Delete return to the month and category the user came from; Save shows the saved month with
"All categories" (A-5). The form fields of the Add expense form move into a shared `ExpenseFormFields` component,
used by `AddExpensePage` and the new `EditExpensePage` (same fields, validation and messages as SPD-1).
`EditExpensePage` loads the expense, handles Loading / not found / load error, Save, Cancel and Delete with a
modal `DeleteExpenseDialog` (focus on "Keep", Tab trapped, Escape / outside click = Keep, all ignored while the
delete runs). After a delete, `ExpensesScreen` shows an `UndoToast` (polite live region) over the list for 5
seconds; "Undo" calls the restore endpoint and reloads the list. The toast closes when the user leaves the list.

## Changes
| Area | File(s) | Change |
|---|---|---|
| DB | server/src/db/schema.ts | `expenses.deleted INTEGER NOT NULL DEFAULT 0` |
| API | server/src/repositories/expenseRepository.ts | Exclude deleted rows; `findById`, `update`, `markDeleted`, `restore` |
| API | server/src/services/expenseService.ts, server/src/errors.ts | get/update/delete/restore with 404 `NOT_FOUND` (`notFoundError`) |
| API | server/src/routes/expenses.ts | `GET/PUT/DELETE /:id`, `POST /:id/restore`, id validation |
| Web | web/src/api/client.ts | `fetchExpense`, `updateExpense`, `deleteExpense`, `restoreExpense`; 204 support |
| Web | web/src/lib/navigation.ts | Edit route hash build/parse |
| Web | web/src/components/ExpenseTable.tsx | "Edit" link column |
| Web | web/src/components/ExpenseFormFields.tsx | Fields extracted from `AddExpensePage` |
| Web | web/src/components/DeleteExpenseDialog.tsx, UndoToast.tsx | Modal dialog, toast |
| Web | web/src/pages/EditExpensePage.tsx | Edit expense screen |
| Web | web/src/App.tsx, web/src/pages/ExpenseListPage.tsx | Edit route, toast and undo, list reload after restore |

## Data model changes
`expenses.deleted` (0 = active, 1 = deleted, kept for undo). Documented in `architecture/data-model.md`. An
existing local database needs `npm run db:reset` (no migration tool, see runbook).

## Acceptance criteria → tests
| AC | Test(s) |
|---|---|
| AC-1 | web/src/components/ExpenseTable.test.tsx; e2e/edit-expense.spec.ts |
| AC-2, AC-3 | web/src/pages/EditExpensePage.test.tsx; e2e/edit-expense.spec.ts (AC-2) |
| AC-4, AC-6, AC-9, AC-11 | web/src/App.test.tsx; e2e/edit-expense.spec.ts (AC-4, AC-6, AC-11) |
| AC-5 | server/test/editExpense.test.ts (summary rows); e2e/edit-expense.spec.ts |
| AC-7, AC-8, AC-17 | server/test/editExpense.test.ts; web/src/pages/EditExpensePage.test.tsx |
| AC-10, AC-12 – AC-16 | web/src/pages/EditExpensePage.test.tsx |
| AC-18, AC-19, AC-22 – AC-28 | web/src/pages/EditExpensePage.test.tsx |
| AC-20, AC-21 | web/src/App.test.tsx; e2e/edit-expense.spec.ts (AC-20) |
| AC-29 – AC-34, AC-42 – AC-45 | server/test/editExpense.test.ts |
| AC-35 – AC-41 | web/src/App.test.tsx; e2e/edit-expense.spec.ts (AC-35) |

## Context updates
`architecture/data-model.md`, `architecture/api.md`, `architecture/overview.md` (edit route, new files).

## Risks and notes
- The spec front matter says `status: draft`, although the task says it is approved.
- Existing local databases miss the new column until `npm run db:reset`.
- The 5-second window is enforced by the UI only (spec A-10).
- No new dependency.

## Revision 2
| Feedback item | Resolution |
|---|---|
| QA D-1 / review: Edit URL with id 0 shows the load error (AC-24) | Fixed. `EditExpensePage` shows the not-found state without a request for an id that is not a positive safe integer. The route keeps `\d+` so such links still open the Edit screen with "This expense no longer exists." (QA TC-50), instead of falling back to the list. |
| Review: Cancel enabled during Save (AC-11) | Fixed. Cancel is disabled while Save or Delete runs, and a Save that resolves after the page unmounted (e.g. header navigation) no longer calls `onSaved`. |
| Review: AC-41 keyboard test is weak | Fixed. The test asserts Undo is an enabled native button with tabIndex 0, no `tabindex` attribute, and in the document's tabbable elements. `userEvent.tab()` is not used because `@testing-library/user-event` is not a dependency and the fix does not justify adding one. |
| Review nit: plan maps AC-5 to App.test | Fixed. The mapping row now names server/test/editExpense.test.ts and e2e. |

## Revision 3
| Feedback item | Resolution |
|---|---|
| AI review 1: looks good, no findings | Nothing to change. |
| Admin (Jira): the PR has conflicts | Fixed. Merged `develop` (SPD-5 over-budget banner) into `feat/SPD-3`. The only conflict, in `web/src/App.test.tsx`, was the imports and the `./api/client` mock: both sides are kept (`fetchOverBudget` plus the SPD-3 client functions). |
| Merge integration (found while merging) | Fixed. The SPD-5 banner loaded only when the month changed, so after "Undo" restored an expense the list reloaded but the banner could stay stale. `ExpenseListPage` now reloads the banner on `reloadKey` too; new App.test "AC-35: Undo also reloads the over-budget banner of the month". |
