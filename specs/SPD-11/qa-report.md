---
issue: SPD-11
result: pass
tested_sha: cff3d29
run: 1
date: 2026-11-03
---

# QA report — SPD-11 (run 1)

## Result
PASS — every AC covered by a passed case, no in-scope defect, lint, unit/API and e2e suites green.

## Environment
Commit cff3d29 on fix/SPD-11 (base develop), web on :5111, API on :5112. E2E: Playwright Chromium with
`DB_PATH=:memory:` (sample data). Exploration: `npm run dev` with the default sample database.

## Results
| Case | AC | Status | Note |
|---|---|---|---|
| TC-1 | AC-1 | passed | Engineer's test reused |
| TC-2 | AC-2 | passed | Engineer's test reused; 15px / 400 / 22.5px |
| TC-3 | AC-3 | passed | Engineer's test reused |
| TC-4 | AC-4 | passed | Engineer's test reused |
| TC-5 | AC-5 | passed | Same test as TC-1; develop's `global.css` lacks `textarea` in the `font: inherit` rule, so it reproduces the bug there |
| TC-6 | — | passed | New QA test |
| TC-7 | — | passed | Manual; computed font of Note = Amount on Add, Edit and error state |
| TC-8 | — | passed | New QA test |

Lint: passed. Unit/API: server 278 passed, web 288 passed. E2E: 100 passed, 0 failed (2 new QA tests included).

## In-scope defects
None.

## Out-of-scope bugs (proposed)
None. (Note only: the dev server answers 404 for `/favicon.ico`, a console error unrelated to this change.)

## Design comparison
| Screen | Mockup | Result |
|---|---|---|
| Add expense | design/screens/expense-form.html | Matches: Note text uses the form font (qa/TC-7-add-form.png) |
| Edit expense | design/screens/expense-form-edit.html | Matches (qa/TC-7-edit-form.png) |
| Add expense, errors | design/screens/expense-form-errors.html | Matches; banner and field errors unchanged (qa/TC-7-error-state.png) |

Inter is not installed on the test machine, so all controls render in the same system-ui fallback; the computed
`font-family` is the `--font-family` token value in every case.
