---
issue: SPD-4
result: pass             # pass | fail
tested_sha: 215bb73
run: 2                   # QA run number for this issue
date: 2026-11-02
---

# QA report — SPD-4 (run 2)

## Result
PASS. All 29 ACs have at least one passing test. There are no in-scope defects and no out-of-scope bugs.

This is a re-test after revision 3, which merged develop (SPD-2 Summary) into feat/SPD-4 (merge f8b03aa, then 215bb73). Run 1 tested cb61287. The pipeline prompt calls this "QA run 1, loop 2". This report counts it as run 2 because a run 1 report already exists.

## Environment
Commit 215bb73 on feat/SPD-4 (base develop). Tests ran on that commit plus the QA test files only. No application code was changed.
- Web on :5111 and API on :5112 (`WEB_PORT` / `API_PORT`).
- Today is 2026-11-02 on the machine, so the spec's dates match the real clock.
- e2e: Playwright `webServer` with `DB_PATH=:memory:` and the sample data.
- Exploration: `npm run dev` with the default file DB (`server/data/spendly.db`).
- Browser: Chromium through the Playwright MCP browser.

## What changed since run 1
- The merge keeps both sides in `server/src/app.ts` (summary and budgets routers), `web/src/App.tsx` (three screens: Expenses, Summary, Budgets), `web/src/api/client.ts` and `web/src/App.test.tsx`.
- The SPD-4 Summary placeholder page was removed, and SPD-2's `SummaryPage` is used.
- SPD-2's header assertions in `e2e/summary.spec.ts` and `e2e/summary.qa.spec.ts` now expect the "Budgets" link, as SPD-4 AC-1 requires.
- New regression cases for the merge:
  - TC-39 (API): the summary response is unchanged when budgets are stored.
  - TC-40 (e2e): opening `#/budgets` directly, switching Budgets → Summary → Budgets (the Month picker resets to the current month), and an unknown hash falls back to Expenses.

## Results
| Case | AC | Status | Note |
|---|---|---|---|
| TC-1 | AC-1 | passed | e2e + unit: brand, Expenses / Summary / Budgets in order, no "Categories", `aria-current` follows the screen |
| TC-2 | AC-2 | passed | e2e: opened from the list, from Summary and from the Add expense form; Month = current month, `min` = current month |
| TC-3 | AC-3 | passed | unit + e2e |
| TC-4 | AC-4 | passed | e2e, survives a reload; also checked manually (qa/TC-4-saved-run2.png) |
| TC-5 | AC-5 | passed | e2e + API |
| TC-6 | AC-6 | passed | API chain |
| TC-7 | AC-7 | passed | API chain |
| TC-8 | AC-8 | passed | API chain |
| TC-9 | AC-9 | passed | API chain |
| TC-10 | AC-6..AC-9, AC-11 | passed | e2e chain through the screen |
| TC-11 | AC-10 | passed | unit + e2e |
| TC-12 | AC-11 | passed | unit |
| TC-13 | AC-12 | passed | unit + e2e |
| TC-14 | AC-13 | passed | unit |
| TC-15 | AC-14 | passed | unit |
| TC-16 | AC-15 | passed | e2e |
| TC-17 | AC-16 | passed | unit + e2e |
| TC-18 | AC-17 | passed | unit + e2e |
| TC-19 | AC-18 | passed | unit (fake date 2026-12-01) + API |
| TC-20 | AC-19 | passed | unit + e2e |
| TC-21 | AC-20 | passed | e2e |
| TC-22 | AC-21 | passed | unit |
| TC-23 | AC-22 | passed | e2e + unit |
| TC-24 | AC-23 | passed | e2e + unit |
| TC-25 | AC-23 | passed | unit |
| TC-26 | AC-24 | passed | API |
| TC-27 | AC-25 | passed | API |
| TC-28 | AC-26 | passed | API |
| TC-29 | AC-27 | passed | API |
| TC-30 | AC-28 | passed | API |
| TC-31 | AC-29 | passed | API, atomic |
| TC-32 | AC-29 | passed | API upper boundary |
| TC-33 | — | passed | Malformed bodies return 400, never 500 |
| TC-34 | — | passed | Year boundary |
| TC-35 | — | passed | "Budgets saved." clears on an edit and on a month change |
| TC-36 | — | passed | Manual comparison with the wireframe (see below) |
| TC-37 | — | passed | Categories and expenses endpoints unchanged |
| TC-38 | — | passed | SPD-1 flows and App tests are green |
| TC-39 | — | passed | New in run 2: summary endpoint unchanged by budgets |
| TC-40 | — | passed | New in run 2: Summary and Budgets navigation after the merge (qa/TC-40-summary-nav.png) |

Full suite (`npm test`): server 151 passed, web 151 passed, 0 failed.
E2E (`npx playwright test`): 37 passed, 0 failed. This includes the SPD-2 summary specs and the new TC-40.
Lint (`npm run lint`): passed.

## In-scope defects
None.

## Out-of-scope bugs (proposed)
None.

## Notes
- The spec front matter still says `status: draft`. A BA should update it. QA did not change the spec.
- The browser console shows a 404 for `/favicon.ico`. It comes from the base branch, has no functional effect, and is not proposed as a bug.

## Design comparison
| Screen | Mockup | Result |
|---|---|---|
| Header | specs/SPD-4/wireframes/budgets.html | Matches: "Spendly", Expenses / Summary / Budgets, and the active link is underlined on both Budgets and Summary (qa/TC-4-saved-run2.png, qa/TC-40-summary-nav.png) |
| Budgets, saved | specs/SPD-4/wireframes/budgets.html | Matches: "Budgets saved." next to Save. Cosmetic: the category name sits slightly higher than the centre of its input in each row. The spec does not require this alignment, so it is a note only |
| Budgets, other states | specs/SPD-4/wireframes/budgets.html | Not changed since run 1 (BudgetsPage code untouched by revision 3). See the run 1 screenshots qa/TC-3-initial.png, qa/TC-13-validation.png, qa/TC-18-past-month.png |
| Summary | project-context/design/screens/monthly-summary.html | SPD-2 screen renders as on develop, with the new Budgets link in the header |
