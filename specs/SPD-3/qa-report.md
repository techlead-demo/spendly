---
issue: SPD-3
result: pass
tested_sha: e7d83d2
run: 2
date: 2026-11-02
---

# QA report — SPD-3 (run 2)

## Result
PASS. All 45 ACs passed their cases and there is no in-scope defect. D-1 from run 1 is fixed: an Edit URL with id 0
or with an id beyond the safe integer range now shows "This expense no longer exists.". Lint, all unit/API tests and
all 89 e2e tests pass on the final commit.

The admin reported a CI failure. I found its likely cause in the SPD-5 test `e2e/over-budget.spec.ts`, which came in
unchanged from develop. The test had a race that made it fail 5 of 15 times without retries. It is a test
synchronisation problem, not an app problem. I fixed it in the test (see Notes), and it then passed 30 of 30 runs.

## Environment
Tested PR head e7d83d2 on feat/SPD-3 (base develop), plus this run's QA test changes. Web on :5111, API on :5112
(`WEB_PORT`/`API_PORT`). Automated runs used Playwright's `webServer` with `DB_PATH=:memory:` and the sample data.
Exploration ran on `npm run dev` with the default database. Browser: Chromium, viewport 1280×720.

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
| TC-10 | AC-10 | passed | |
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
| TC-31 | AC-31 | passed | |
| TC-32 | AC-32 | passed | |
| TC-33 | AC-33 | passed | |
| TC-34 | AC-34 | passed | |
| TC-35 | AC-35 | passed | |
| TC-36 | AC-36 | passed | |
| TC-37 | AC-37 | passed | UI and API |
| TC-38 | AC-38 | passed | |
| TC-39 | AC-39 | passed | |
| TC-40 | AC-40 | passed | network failure and 500 |
| TC-41 | AC-41 | passed | |
| TC-42 | AC-42 | passed | |
| TC-43 | AC-43 | passed | |
| TC-44 | AC-44 | passed | |
| TC-45 | AC-45 | passed | |
| TC-46 | — | passed | month boundaries |
| TC-47 | — | passed | |
| TC-48 | — | passed | leap day |
| TC-49 | — | passed | |
| TC-50 | AC-24 | passed | id 0; D-1 of run 1 fixed |
| TC-51 | — | passed | manual design comparison, see below |
| TC-52 | — | passed | |
| TC-53 | — | passed | |
| TC-54 | — | passed | includes the SPD-5 over-budget suites merged from develop |
| TC-55 | — | passed | new: banner follows delete, Undo and edit |
| TC-56 | — | passed | new: Cancel disabled during Save |
| TC-57 | AC-24 | passed | new: id 99999999999999999999 |
| TC-58 | AC-45 | passed | Engineer's server test for `/budgets/over` |

Suites on the final commit:
- `npm run lint`: passed.
- `npm test`: server 234 passed (12 files); web 236 passed (17 files).
- `npx playwright test`: 89 passed, 0 failed, 0 flaky.
- `npx playwright test e2e/over-budget.spec.ts --repeat-each=15 --retries=0`: 30 passed after the test fix. Before the fix, 5 of 30 failed.

## In-scope defects
None.

## Out-of-scope bugs (proposed)
None new. P-1 of run 1 (Note textarea font) is already filed as SPD-11.

## Design comparison
| Screen | Mockup / wireframe | Result |
|---|---|---|
| Expense list with Edit link | design/screens/expense-list.html | Matches (unchanged since run 1). With the SPD-5 banner merged in, the banner sits above the filters and the Edit column is unaffected. qa/TC-55-banner-before-delete.png |
| Edit expense form | design/screens/expense-form-edit.html | Matches (run 1, qa/TC-2-edit-form.png) |
| Delete confirmation | SPD-3/wireframes/edit-expense-delete-confirm.html | Matches (run 1, qa/TC-18-delete-dialog.png) |
| Undo toast / empty month | SPD-3/wireframes/expense-list-undo-toast.html | Matches: bottom-centre toast "Expense deleted." with "Undo". After deleting the only over-budget expense of 12/2026, the banner is gone. qa/TC-55-after-delete-toast.png |
| Not found | SPD-3/wireframes/edit-expense-not-found.html | Matches for ids 9999, 0 and 99999999999999999999: heading, error banner and "Back to expenses" only. qa/TC-57-unsafe-id-not-found.png |

## Notes
- **Flaky SPD-5 e2e test (fixed in this run, test only).** In `e2e/over-budget.spec.ts`, the first test clicks the
  "Expenses" link and then calls `showMonth`. `showMonth` immediately fills the field labelled "Month". Sometimes the
  Budgets screen is still shown at that moment, and its Month field already holds the test month. The fill then
  changes nothing, no `/budgets/over` request is sent, and `waitForResponse` times out after 30 s. The trace snapshot
  shows the list on 2026-11 after the timeout. The test file is identical on develop. App navigation works the same
  way as on develop: a `hashchange` listener sets state. I did not run develop itself, because this job may not switch
  branches. I added a wait for the "Expenses" heading before `showMonth`. This is the likely cause of the CI failure
  the admin reported. I could not read the CI log, so that link is not confirmed.
- The prompt calls this "QA run 1". The repository already has a run-1 report for this issue (cc9c4e2), so this
  report is numbered run 2.
- The spec front matter still says `status: draft` (version 4). I tested against version 4.
- The browser console shows only a 404 for `/favicon.ico`. It is cosmetic and not touched by this PR.
