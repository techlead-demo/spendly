---
issue: SPD-4
result: pass             # pass | fail
tested_sha: cb61287
run: 1                   # QA run number for this issue
date: 2026-11-02
---

# QA report — SPD-4 (run 1)

## Result
PASS. All 29 ACs have at least one passing test, and there are no in-scope defects or out-of-scope bugs.

## Environment
Commit cb61287 on feat/SPD-4 (base develop). Tests ran on that commit plus the QA test files only; no application code was changed.
- Web on :5111 and API on :5112 (`WEB_PORT` / `API_PORT`).
- Today is 2026-11-02 on the machine, so the spec's dates match the real clock.
- e2e: Playwright `webServer` with `DB_PATH=:memory:` and the sample data.
- Exploration: `npm run dev` with the default file DB (`server/data/spendly.db`).
- Chromium through the Playwright MCP browser.

## Results
| Case | AC | Status | Note |
|---|---|---|---|
| TC-1 | AC-1 | passed | e2e: brand, three links in order, no "Categories", `aria-current` follows the screen (Expenses, Summary, Budgets) |
| TC-2 | AC-2 | passed | e2e: opened from the list, from Summary and from the Add expense form; Month = current month, `min` = current month |
| TC-3 | AC-3 | passed | unit (fresh data) + e2e (layout, placeholder, "₫", hint) |
| TC-4 | AC-4 | passed | e2e on the real current month, survives a reload |
| TC-5 | AC-5 | passed | e2e (+1 and +7 months) + API |
| TC-6 | AC-6 | passed | API chain through PUT only |
| TC-7 | AC-7 | passed | API chain; an earlier change keeps later records |
| TC-8 | AC-8 | passed | API chain |
| TC-9 | AC-9 | passed | API chain |
| TC-10 | AC-6..AC-9, AC-11 | passed | e2e chain through the screen (own far-future year) |
| TC-11 | AC-10 | passed | unit: no request is sent; e2e: no non-empty PUT, values unchanged |
| TC-12 | AC-11 | passed | unit: only Entertainment is sent |
| TC-13 | AC-12 | passed | unit: all six values plus `00`, `1e5`, `+5000`; e2e: `700.000` stores nothing |
| TC-14 | AC-13 | passed | Focus goes to Food, the first invalid field in table order, even when Transport had focus |
| TC-15 | AC-14 | passed | |
| TC-16 | AC-15 | passed | e2e: 1 đồng is stored and read back after a reload |
| TC-17 | AC-16 | passed | unit + e2e (trimmed value; a field of only spaces is no budget) |
| TC-18 | AC-17 | passed | unit (budget since 2026-10, mocked: the API cannot create a past budget) + e2e (previous month is read-only) |
| TC-19 | AC-18 | passed | unit (fake date 2026-12-01) + API (clock moved to 2026-12-01: a write to 2026-11 is rejected and the 2026-11 budget still applies to 2026-12) |
| TC-20 | AC-19 | passed | unit + e2e |
| TC-21 | AC-20 | passed | e2e: no `/budgets` request after the Month picker is cleared |
| TC-22 | AC-21 | passed | unit: on first load and on a month change |
| TC-23 | AC-22 | passed | e2e: connection refused; unit: 500 on a month change |
| TC-24 | AC-23 | passed | e2e: 500 on save keeps the edits; unit: a retry clears the alert |
| TC-25 | AC-23 | passed | unit: the 400 message is shown above the table |
| TC-26 | AC-24 | passed | |
| TC-27 | AC-25 | passed | Also `2026-00`, `" 2026-11"`, a repeated parameter |
| TC-28 | AC-26 | passed | |
| TC-29 | AC-27 | passed | |
| TC-30 | AC-28 | passed | Also checked on the last minute of 2026-11 |
| TC-31 | AC-29 | passed | Invalid item second or first; nothing stored (atomic) |
| TC-32 | AC-29 | passed | 9007199254740991 is accepted and read back exactly |
| TC-33 | — | passed | Malformed bodies and malformed JSON return 400, never 500 |
| TC-34 | — | passed | Year boundary |
| TC-35 | — | passed | "Budgets saved." clears on a month change; a double click on Save sends one request |
| TC-36 | — | passed | Manual comparison with the wireframe (see below) |
| TC-37 | — | passed | Existing endpoints unchanged |
| TC-38 | — | passed | Existing SPD-1 flows and App tests are green |

Full suite (`npm test`): server 124 passed, web 118 passed, 0 failed. QA added 44 server tests and 27 web tests.
E2E (`npx playwright test`): 23 passed, 0 failed (11 of them are new QA tests). Lint (`npm run lint`): passed.

## In-scope defects
None.

## Out-of-scope bugs (proposed)
None.

## Notes
- The spec front matter still says `status: draft`, although the task treats the spec as approved. The Engineer's plan notes the same thing. A BA should update it; QA did not change the spec.
- The browser console shows a 404 for `/favicon.ico`. This pull request does not touch `web/index.html` or any static assets, and the 404 has no functional effect, so it is not proposed as a bug.

## Design comparison
| Screen | Mockup | Result |
|---|---|---|
| Header | specs/SPD-4/wireframes/budgets.html | Matches: "Spendly", Expenses / Summary / Budgets, active link underlined (qa/TC-1-expenses-nav.png) |
| Budgets, initial | specs/SPD-4/wireframes/budgets.html | Matches: heading, Month field, hint, columns, "No limit" with "₫", Save (qa/TC-3-initial.png) |
| Budgets, validation error | specs/SPD-4/wireframes/budgets.html | Matches: the banner is above the table and the message is under the invalid field (qa/TC-13-validation.png). Cosmetic: the "Monthly budget" column gets narrower while a field message is shown (auto table layout); the spec does not require a width, so this is a note only |
| Budgets, saved | wireframe note | Matches: "Budgets saved." next to Save (qa/TC-4-saved.png) |
| Budgets, past month | wireframe note | Matches: fields disabled, no Save, "Past months cannot be changed." in place of the hint (qa/TC-18-past-month.png) |
