---
issue: SPD-5
result: pass
tested_sha: 9639aee
run: 1
date: 2026-11-02
---

# QA report — SPD-5 (run 1)

## Result
PASS — all 18 acceptance criteria have passing cases, no in-scope defect, and lint, unit/API and e2e suites are green.

## Environment
Commit 9639aee on feat/SPD-5 (base develop). Automated runs: Vitest (server, web) and Playwright with its own
`DB_PATH=:memory:` API on :5112 and web on :5111. Exploration: `npm run dev` (web :5111, API :5112, file database),
the spec's 2026-11 data recreated through the API, Chromium via the Playwright browser tools. Today = 2026-11-02.

## Results
| Case | AC | Status | Note |
|---|---|---|---|
| TC-1 | AC-1 | passed | Engineer's API test reused |
| TC-2 | AC-1 | passed | Also seen in the browser |
| TC-3 | AC-2 | passed | |
| TC-4 | AC-3 | passed | |
| TC-5 | AC-4 | passed | |
| TC-6 | AC-5 | passed | Tie where the later category has the larger total |
| TC-7 | AC-6 | passed | |
| TC-8 | AC-7 | passed | |
| TC-9 | AC-8 | passed | |
| TC-10 | AC-9 | passed | |
| TC-11 | AC-10 | passed | |
| TC-12 | AC-11 | passed | Also explored: 2026-12 shows only Entertainment, "in 12/2026" |
| TC-13 | AC-12 | passed | |
| TC-14 | AC-13 | passed | |
| TC-15 | AC-14 | passed | e2e on the current month ("this month") |
| TC-16 | AC-15 | passed | e2e on the current month via the Budgets screen |
| TC-17 | AC-16 | passed | |
| TC-18 | AC-17 | passed | Includes a stale-response race |
| TC-19 | AC-18 | passed | Engineer's test reused (500 and network error) |
| TC-20 | — | passed | |
| TC-21 | — | passed | |
| TC-22 | — | passed | |
| TC-23 | — | passed | |
| TC-24 | — | passed | |
| TC-25 | — | passed | Manual design comparison |
| TC-26 | — | passed | Regression: all existing suites |

Lint: passed. Unit/API: server 177 passed (10 files), web 175 passed (15 files). E2E: 41 passed, 0 failed.

## In-scope defects
None.

## Out-of-scope bugs (proposed)
None.

## Notes
- `specs/SPD-5/spec.md` front matter still says `status: draft` although the spec was merged (PR #8) and is used as
  approved. The BA should update it; this does not affect the tests.
- The expense list's existing load error ("Could not load expenses: …") also uses `role="alert"`. If both the
  expenses and the banner fail or succeed at once there could be two alerts; the spec does not cover this and it was
  not observed as a problem.
- Browser console on load: only a 404 for `/favicon.ico` (pre-existing, unrelated).

## Design comparison
| Screen | Mockup | Result |
|---|---|---|
| Expense list, over budget | design/screens/expense-list-over-budget.html | Matches: warning colours from tokens, ⚠ mark, bold heading, bullet lines, between the title row and the Month/Category filters, no close button or links. Search bar, Edit links and "Categories" link absent as the spec allows (out of scope). Screenshot qa/TC-25-banner.png |
| Expense list, other month | spec A-2 | Heading "1 category is over budget in 12/2026" as specified. Screenshot qa/TC-12-december.png |
