---
issue: SPD-2
spec_version: 2
revision: 0
---

# Implementation plan — SPD-2

## Approach
- **API**: a new read-only resource `GET /api/v1/summary?month=YYYY-MM` (existing responses unchanged). The repository
  groups the month's expenses by category in SQL (`COUNT`, `SUM`, joined to `categories` for the name), ordered by
  category id. The expense service applies BR-13: a stable sort by total descending (ties keep the fixed category
  order) and the month count and total as the sum of the rows. The month is validated like `GET /api/v1/expenses`.
- **Shares (BR-15)** are computed in the web app (`web/src/lib/share.ts`) from the integer totals: tenths of a
  percent = `(part * 2000 + total) / (2 * total)` in BigInt integer division, i.e. exact half-up rounding, formatted
  with `Intl` `vi-VN` and one decimal. The footer always shows `100,0%`.
- **Web**: `SummaryPage` (month picker, loading / empty / error states, cleared month keeps the last summary) and a
  presentational `SummaryTable` following `monthly-summary.html` plus the "Share" column of the wireframe.
- **Navigation**: the header gets "Expenses" and "Summary" links. With only two screens, `App.tsx` switches on
  `location.hash` (`#/`, `#/summary`) instead of adding a router dependency. The active link gets the mockup's
  underline and `aria-current="page"`. Each screen remounts on navigation and so opens on the current month (BR-14).

## Changes
| Area | File(s) | Change |
|---|---|---|
| API | server/src/routes/summary.ts, server/src/app.ts | New `GET /api/v1/summary` router |
| API | server/src/services/expenseService.ts | `summarizeMonth(month)` (BR-13 ordering, month count and total) |
| API | server/src/repositories/expenseRepository.ts | `sumByCategory(month)` grouped query |
| API | server/src/types.ts | `CategorySummary`, `MonthlySummary` |
| Web | web/src/App.tsx, App.module.css | Header navigation, hash-based screen switch |
| Web | web/src/pages/SummaryPage.tsx (+ .module.css) | New Summary screen |
| Web | web/src/components/SummaryTable.tsx (+ .module.css) | Table with Share column and footer |
| Web | web/src/lib/share.ts | BR-15 share formatting |
| Web | web/src/api/client.ts, types.ts | `fetchSummary`, summary shapes |

## Data model changes
None. The summary is computed from `expenses` and `categories`.

## Acceptance criteria → tests
| AC | Test(s) |
|---|---|
| AC-1 | web/src/App.test.tsx › "AC-1: …"; e2e/summary.spec.ts › "AC-1, AC-2: …" |
| AC-2 | web/src/App.test.tsx › "AC-2: …"; web/src/pages/SummaryPage.test.tsx › "AC-2: …"; e2e/summary.spec.ts › "AC-1, AC-2: …" |
| AC-3 | server/test/summary.test.ts › "AC-14: …", "AC-3, AC-5: …"; web/src/components/SummaryTable.test.tsx › "AC-3, AC-5: …"; e2e/summary.spec.ts › "AC-3, AC-4, AC-17: …" |
| AC-4 | server/test/summary.test.ts › "AC-4: …"; SummaryTable.test.tsx › "AC-4: …"; e2e › "AC-3, AC-4, AC-17: …" |
| AC-5 | server/test/summary.test.ts › "AC-3, AC-5: …"; SummaryTable.test.tsx › "AC-3, AC-5: …" |
| AC-6 | server/test/summary.test.ts › "AC-6: …" |
| AC-7 | server/test/summary.test.ts › "AC-7: …"; SummaryPage.test.tsx › "AC-7: …" |
| AC-8 | server/test/summary.test.ts › "AC-8: …" |
| AC-9 | server/test/summary.test.ts › "AC-9: …"; SummaryTable.test.tsx › "AC-9, AC-20: …" |
| AC-10 | SummaryPage.test.tsx › "AC-10: …"; SummaryTable.test.tsx › "AC-10: …"; e2e › "AC-10: …" |
| AC-11 | SummaryPage.test.tsx › "AC-11: …" |
| AC-12 | SummaryPage.test.tsx › "AC-12: …" (API error and network error) |
| AC-13 | SummaryPage.test.tsx › "AC-13: …" |
| AC-14 | server/test/summary.test.ts › "AC-14: …" |
| AC-15 | server/test/summary.test.ts › "AC-15: …" |
| AC-16 | server/test/summary.test.ts › "AC-16: …" |
| AC-17 | web/src/lib/share.test.ts › "AC-17: …"; SummaryTable.test.tsx › "AC-17: …"; e2e › "AC-3, AC-4, AC-17: …" |
| AC-18 | share.test.ts › "AC-18: …"; SummaryTable.test.tsx › "AC-18: …" |
| AC-19 | share.test.ts › "AC-19: …"; SummaryTable.test.tsx › "AC-19: …" |
| AC-20 | share.test.ts › "AC-20: …"; SummaryTable.test.tsx › "AC-9, AC-20: …" |

## Context updates
- project-context/architecture/api.md: new `GET /api/v1/summary`.
- project-context/architecture/overview.md: SummaryPage, SummaryTable, share helper, hash navigation.

## Risks and notes
- AC-8 depends on SPD-1 (record an expense), which is not implemented on `develop` yet (no create endpoint or form).
  It is tested at the API level by inserting the expense directly; an e2e journey can follow once SPD-1 lands.
- The summary items carry `categoryName` in addition to the id, count and total the spec asks for, so the screen
  needs one request and has a single loading / error state.
- Hash navigation: deep links are `/#/summary`. If more screens come, a router library may be worth an ADR.
- No new dependencies.
