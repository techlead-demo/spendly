---
issue: SPD-2
result: pass
tested_sha: e1bd140
run: 1
date: 2026-11-02
---

# QA report — SPD-2 (run 1)

## Result
PASS — all 20 ACs covered by passing cases, no in-scope defects, lint, unit/API and e2e suites green.

## Environment
Commit e1bd140 on feat/SPD-2 (base develop), Node 24. Automated e2e: Playwright `webServer` with web on :5111,
API on :5112, `DB_PATH=:memory:` (runbook sample data). Exploration: `npm run dev` on the same ports with the
runbook sample data, Chromium via Playwright browser tools. Today = 2026-11-02.

## Results
| Case | AC | Status | Note |
|---|---|---|---|
| TC-1 | AC-1 | passed | |
| TC-2 | AC-2 | passed | Engineer's tests reused; also checked manually (Summary reopens on 2026-11) |
| TC-3 | AC-3 | passed | Engineer's API test reused |
| TC-4 | AC-3 | passed | |
| TC-5 | AC-4 | passed | Engineer's API test reused |
| TC-6 | AC-4 | passed | |
| TC-7 | AC-5 | passed | |
| TC-8 | AC-6 | passed | |
| TC-9 | AC-7 | passed | |
| TC-10 | AC-7 | passed | e2e compares the UI with the grouping of `GET /api/v1/expenses` |
| TC-11 | AC-8 | passed | API level only: SPD-1 (record an expense) is not on develop, no UI to record one |
| TC-12 | AC-9 | passed | |
| TC-13 | AC-10 | passed | |
| TC-14 | AC-14 | passed | |
| TC-15 | AC-11 | passed | |
| TC-16 | AC-12 | passed | network failure and HTTP 500 |
| TC-17 | AC-13 | passed | |
| TC-18 | AC-15 | passed | |
| TC-19 | AC-16 | passed | |
| TC-20 | AC-17 | passed | |
| TC-21 | AC-18 | passed | |
| TC-22 | AC-19 | passed | |
| TC-23 | AC-20 | passed | |
| TC-24 | — | passed | |
| TC-25 | — | passed | |
| TC-26 | — | passed | |
| TC-27 | — | passed | |
| TC-28 | — | passed | manual, see design comparison |

Lint (`npm run lint`): passed. Unit/API (`npm test`): server 43 passed, web 35 passed, 0 failed.
E2E (`npx playwright test`): 10 passed, 0 failed.

New QA tests: `server/test/summary.qa.test.ts`, `web/src/pages/SummaryPage.qa.test.tsx`, `e2e/summary.qa.spec.ts`.

## In-scope defects
None.

## Out-of-scope bugs (proposed)
None.

## Notes
- The spec's front matter still says `status: draft` (version 2), although the pipeline treats it as the approved
  spec. Tested against version 2.
- AC-8 cannot be tested end to end until SPD-1 adds a way to record an expense; it is covered at API level.

## Design comparison
| Screen | Mockup | Result |
|---|---|---|
| Header | design/screens/monthly-summary.html | Matches: brand, "Expenses" / "Summary", active link underlined in primary colour; "Categories" omitted as the spec requires |
| Summary (October 2026) | monthly-summary.html + specs/SPD-2/wireframes/monthly-summary-share.html | Matches: heading, Month field, columns Category / Expenses / Total / Share, numbers right-aligned, bold muted footer with 100,0% (qa/TC-28-summary-october.png) |
| Summary, empty month | mockup note | Matches: "No expenses for this month." in a dashed card instead of the table (qa/TC-13-empty-month.png) |
| Summary, error | — (new text) | Alert text matches; the alert has no border unlike the mockup's `.banner.error` (cosmetic, note only) |
