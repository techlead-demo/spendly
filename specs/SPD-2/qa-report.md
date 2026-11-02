---
issue: SPD-2
result: pass
tested_sha: bc0ad6f
run: 2
date: 2026-11-02
---

# QA report — SPD-2 (run 2)

## Result
PASS — all 20 ACs covered by passing cases, no in-scope defects; lint, unit/API and e2e suites green after the
merge of develop (SPD-1 "Record an expense").

## Environment
Commit bc0ad6f on feat/SPD-2 (base develop, includes SPD-1), plus the QA tests of this run. Node 24.
Automated e2e: Playwright `webServer` with web on :5111, API on :5112, `DB_PATH=:memory:` (runbook sample data).
Exploration: `npm run dev` on the same ports, Chromium via Playwright browser tools. Today = 2026-11-02.
The pipeline labelled this job "QA run 1"; it is the second QA run of SPD-2 (run 1 passed on 2d74a05 / e1bd140).

## Results
| Case | AC | Status | Note |
|---|---|---|---|
| TC-1 | AC-1 | passed | |
| TC-2 | AC-2 | passed | |
| TC-3 | AC-3 | passed | |
| TC-4 | AC-3 | passed | |
| TC-5 | AC-4 | passed | |
| TC-6 | AC-4 | passed | |
| TC-7 | AC-5 | passed | |
| TC-8 | AC-6 | passed | |
| TC-9 | AC-7 | passed | |
| TC-10 | AC-7 | passed | |
| TC-11 | AC-8 | passed | now end to end through the Add expense form, plus API level |
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
| TC-27 | — | passed | includes the SPD-1 suites merged from develop |
| TC-28 | — | passed | manual, see design comparison |
| TC-29 | AC-7 | passed | new: expense on 2026-10-31 recorded with the form |
| TC-30 | AC-2 | passed | new: header navigation from the Add expense form |

Lint (`npm run lint`): passed. Unit/API (`npm test`): server 72 passed, web 76 passed, 0 failed.
E2E (`npx playwright test`): 21 passed, 0 failed.

New QA tests in this run: `e2e/summary.qa.spec.ts` › "TC-11 (AC-8)", "TC-29 (AC-7)", "TC-30 (AC-2)".

## In-scope defects
None.

## Out-of-scope bugs (proposed)
None.

## Notes
- With the Add expense form open, clicking the header link "Expenses" does nothing: the URL is already `#/`, so no
  `hashchange` fires and the form stays open (the link is shown as active). No AC defines this; the form's Cancel
  button returns to the list, and going via "Summary" → "Expenses" opens the list (TC-30). Worth a decision by the
  BA/PO if the header link should also leave the form.
- The spec's front matter still says `status: draft` (version 2). Tested against version 2.

## Design comparison
| Screen | Mockup | Result |
|---|---|---|
| Header | design/screens/monthly-summary.html | Matches: brand, "Expenses" / "Summary", active link underlined; "Categories" omitted as the spec requires |
| Summary (November 2026, after recording Food 30.000 ₫) | monthly-summary.html + specs/SPD-2/wireframes/monthly-summary-share.html | Matches: heading, Month field, columns Category / Expenses / Total / Share, numbers right-aligned, bold footer with 100,0%; shares 87,0% / 13,0% are correct (qa/TC-11-summary-after-add.png) |
| Summary (October 2026) | same | Matches (qa/TC-28-summary-october.png, run 1) |
| Summary, empty month | mockup note | Matches: "No expenses for this month." instead of the table (qa/TC-13-empty-month.png, run 1) |
| Summary, error | — (new text) | Alert text matches; the alert has no border unlike the mockup's `.banner.error` (cosmetic, note only) |
