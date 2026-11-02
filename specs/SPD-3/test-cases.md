---
issue: SPD-3
spec_version: 4
---

# Test cases — SPD-3

Derived from `specs/SPD-3/spec.md` (version 4) and its wireframes. E2E tests create their own expenses through the API with a
unique note (the e2e database holds relative sample data), so "E" below is such an expense in the current month unless stated.
API tests use a fresh in-memory database with fixed dates (E: 2026-11-02, 280000, Food, "Groceries at Co.opmart").

QA test files: `server/test/editExpense.qa.test.ts` (API), `e2e/edit-expense.qa.spec.ts` (UI, "e2e ›" below).
"server ›" means the Engineer's `server/test/editExpense.test.ts` › "AC-n: …" (reused, not duplicated), plus the QA
additions in `server/test/editExpense.qa.test.ts` › "TC-n …" where they exist (TC-20, TC-31, TC-42–TC-49).

| ID | AC | Title | Type | Steps | Expected | Automated test |
|---|---|---|---|---|---|---|
| TC-1 | AC-1 | Edit link on every row; none in an empty month | automated | 1. Open list on a month with expenses 2. Open an empty month (2031-03) | Every row's last cell is a link "Edit"; empty month shows "No expenses for this month." and no Edit link | e2e/edit-expense.qa.spec.ts › "TC-1 (AC-1) …" |
| TC-2 | AC-2 | Edit form pre-filled | automated | Create E (2026-11-02, 280000, Food, unique note); click Edit on its row | Heading "Edit expense"; Date 2026-11-02, Amount `280000`, suffix ₫, hint "Whole đồng, no decimals.", Category Food, Note; buttons Save, Cancel, Delete | e2e › "TC-2 (AC-2) …" |
| TC-3 | AC-3 | No note → empty Note field | automated | Create expense without note; open with Edit | Note field empty | e2e › "TC-3 (AC-3) …" |
| TC-4 | AC-4 | Change amount and note | automated | Edit E: Amount 250000, Note "Groceries <id>"; Save | List on 2026-11 with All categories; row `02/11/2026 · Food · Groceries… · 250.000 ₫`; month total 30.000 ₫ lower; API returns id/date/category unchanged | e2e › "TC-4 (AC-4) …" |
| TC-5 | AC-5 | Change category moves summary | automated | Edit E: Category Transport; Save; open Summary 2026-11 | Row shows Transport; summary Food count −1 and total −280.000, Transport count +1 and total +280.000 | e2e › "TC-5 (AC-5) …"; server › "TC-5 (AC-5) …" |
| TC-6 | AC-6 | Change date to previous month | automated | Edit E: Date 2026-10-28; Save | List on 2026-10, All categories, E dated 28/10/2026; Nov total −280.000, Oct total +280.000; Nov no longer lists E | e2e › "TC-6 (AC-6) …" |
| TC-7 | AC-7 | Editing keeps recording order | automated | E (recorded first) and F (later), both 2026-11-02; edit E's amount | F still above E (UI and API) | e2e › "TC-7 (AC-7) …"; server › "TC-7 (AC-7) …" |
| TC-8 | AC-8 | Note trimmed / blank → null | automated | Save Note `  Market  `; then Note `   `; then empty | Stored "Market"; then `null` twice; row shows no note | e2e › "TC-8 (AC-8) …"; server › "TC-8 (AC-8) …" |
| TC-9 | AC-9 | Save without changes | automated | Open E, Save | PUT 200, E unchanged, list on E's month with All categories | e2e › "TC-9 (AC-9) …" |
| TC-10 | AC-10 | Double Save sends one PUT | automated | Delay PUT 1.5 s; click Save twice | Exactly one PUT; Save and Delete disabled while pending | e2e › "TC-10 (AC-10) …" |
| TC-11 | AC-11 | Cancel keeps month and filter | automated | List 2026-10 + Food; Edit an October Food expense; change amount and note; Cancel | No confirmation; list on 2026-10 filtered to Food; expense unchanged | e2e › "TC-11 (AC-11) …" |
| TC-12 | AC-12 | Invalid amounts | automated | For each of ``, `0`, `-5000`, `12,5`, `12.5`, `280.000`: set Amount, Save | Banner "Please fix the highlighted fields.", Amount aria-invalid, "Enter a whole amount in đồng, greater than 0."; no PUT sent; E unchanged | e2e › "TC-12 (AC-12) …" |
| TC-13 | AC-13 | Date cleared | automated | Clear Date, Save | Banner + "Enter a valid date."; nothing stored | e2e › "TC-13 (AC-13) …" |
| TC-14 | AC-14 | No category | automated | Select "Choose a category", Save | Banner + "Choose a category."; nothing stored | e2e › "TC-14 (AC-14) …" |
| TC-15 | AC-15 | All three invalid | automated | Clear Date, Amount `0`, no category; Save | Three messages, focus on Date | e2e › "TC-15 (AC-15) …" |
| TC-16 | AC-16 | Note max 200 chars | automated | Type 205 chars into Note | Value has 200 chars | e2e › "TC-16 (AC-16) …" |
| TC-17 | AC-17 | Amount 1 (lower boundary) | automated | Amount `1`, Save | Stored 1, row shows `1 ₫` | e2e › "TC-17 (AC-17) …" |
| TC-18 | AC-18 | Delete dialog opens | automated | Open E, click Delete | Nothing deleted; dialog "Delete this expense?" with text "02/11/2026 · Food · 280.000 ₫ will be removed. You can undo this for 5 seconds.", buttons "Delete expense", "Keep"; Keep focused; Tab/Shift+Tab stay in dialog; form behind not usable | e2e › "TC-18 (AC-18) …" |
| TC-19 | AC-19 | Keep / Escape / outside click | automated | Edit Amount to 111, open dialog; close with Keep; again with Escape; again with a click on the backdrop | Dialog closes each time; focus on Delete; Amount still 111; expense not deleted | e2e › "TC-19 (AC-19) …" |
| TC-20 | AC-20 | Confirm delete keeps filter, toast | automated | List 2026-11 + Food; Edit E; Delete → Delete expense | List on 2026-11 + Food; E gone; total −280.000; toast "Expense deleted." + Undo; summary Food count −1, total −280.000 | e2e › "TC-20 (AC-20) …" |
| TC-21 | AC-21 | Delete only expense of month | automated | E is the only expense of 2031-01; delete it | "No expenses for this month.", total 0 ₫, toast with Undo | e2e › "TC-21 (AC-21) …" |
| TC-22 | AC-22 | Edits discarded on delete; Undo restores pre-edit values | automated | Open E, change Amount and Note, Delete → Delete expense, Undo | Expense restored with its original amount and note | e2e › "TC-22 (AC-22) …" |
| TC-23 | AC-23 | Delete in progress | automated | Delay DELETE 1.5 s; click Delete expense twice, press Escape | One DELETE; both buttons disabled; dialog stays open until done | e2e › "TC-23 (AC-23) …" |
| TC-24 | AC-24 | Not-found screen | automated | Open `#/expenses/9999/edit`; click "Back to expenses" | Heading "Edit expense", no form; banner "This expense no longer exists."; link opens list on current month, All categories | e2e › "TC-24 (AC-24) …" |
| TC-25 | AC-25 | Deleted elsewhere: Save and Delete | automated | Open E; DELETE E via API; click Save. Repeat with another expense and confirm Delete | Not-found state each time; dialog closed | e2e › "TC-25 (AC-25) …" |
| TC-26 | AC-26 | API 400 on Save | automated | Route PUT → 400 `{error:{code:'VALIDATION_ERROR',message:'Server says no.'}}`; Save | Form stays, values kept, banner "Server says no." | e2e › "TC-26 (AC-26) …" |
| TC-27 | AC-27 | Network failure on Save and Delete | automated | Abort PUT; Save. Abort DELETE; confirm Delete | "Could not save the expense. Try again." / dialog closes, "Could not delete the expense. Try again.", values kept, expense kept | e2e › "TC-27 (AC-27) …" |
| TC-28 | AC-28 | Network failure on load | automated | Abort GET `/expenses/<id>`; open Edit URL | Banner "Could not load the expense. Try again." + "Back to expenses" | e2e › "TC-28 (AC-28) …" |
| TC-29 | AC-29 | GET one expense | automated | GET /api/v1/expenses/:id | 200 full body | server › "TC-29 (AC-29) …" |
| TC-30 | AC-30 | PUT replaces values | automated | PUT `{date:'2026-10-28',amountMinor:250000,categoryId:2,note:' Bus '}` | 200 with note "Bus"; listed in 2026-10, not 2026-11 | server › "TC-30 (AC-30) …" |
| TC-31 | AC-31 | PUT validation matrix | automated | Each invalid body of AC-31 | 400 VALIDATION_ERROR, E unchanged; note of exactly 200 chars accepted | server › "TC-31 (AC-31) …" |
| TC-32 | AC-32 | DELETE | automated | DELETE then GET | 204 empty body; GET 404 NOT_FOUND | server › "TC-32 (AC-32) …" |
| TC-33 | AC-33 | Unknown id 9999 | automated | GET / PUT valid / DELETE 9999 | 404 NOT_FOUND; nothing created or deleted | server › "TC-33 (AC-33) …" |
| TC-34 | AC-34 | Invalid ids | automated | `0`, `-1`, `abc`, `1.5` on GET, PUT, DELETE, POST restore | 400 VALIDATION_ERROR | server › "TC-34 (AC-34) …" |
| TC-35 | AC-35 | Undo restores | automated | List 2026-11 + Food; delete E; click Undo | Toast closes; list stays Nov + Food; E back in previous position, same values; total back; summary counts it | e2e › "TC-35 (AC-35) …" |
| TC-36 | AC-36 | Toast closes after 5 s | automated | Delete E; do nothing | Toast visible ≥ 4 s and hidden within ~6.5 s; E stays deleted | e2e › "TC-36 (AC-36) …" |
| TC-37 | AC-37 | Undo keeps recording order | automated | E then F on same date; delete E, Undo | F above E (UI); API list order F, E | e2e › "TC-37 (AC-37) …"; server › "TC-37 (AC-37) …" |
| TC-38 | AC-38 | Leaving the list closes the toast | automated | Delete E; click Summary; back. Delete another; reload | Toast gone; E still deleted; summary does not count it | e2e › "TC-38 (AC-38) …" |
| TC-39 | AC-39 | Undo in progress | automated | Delay restore 6.5 s; click Undo twice | Undo disabled; one POST restore; toast still visible after 5 s; closes after the response | e2e › "TC-39 (AC-39) …" |
| TC-40 | AC-40 | Restore fails | automated | Abort restore; click Undo | Toast "Could not restore the expense." without Undo; closes ≈5 s later; E stays deleted | e2e › "TC-40 (AC-40) …" |
| TC-41 | AC-41 | Toast accessibility | automated | Delete E; inspect toast; Tab to Undo | role="status" (polite); Undo reached by Tab and activated with Enter | e2e › "TC-41 (AC-41) …" |
| TC-42 | AC-42 | Restore after delete | automated | DELETE then POST restore | 200 full body; GET 200; list and summary include it | server › "TC-42 (AC-42) …" |
| TC-43 | AC-43 | Restore is idempotent | automated | POST restore on a non-deleted expense | 200, E unchanged | server › "TC-43 (AC-43) …" |
| TC-44 | AC-44 | Restore unknown id | automated | POST /9999/restore | 404 NOT_FOUND | server › "TC-44 (AC-44) …" |
| TC-45 | AC-45 | Deleted expense is gone | automated | DELETE E; GET, PUT, DELETE E | 404 each; list and summary exclude E; PUT did not change stored values (restore shows original) | server › "TC-45 (AC-45) …" |
| TC-46 | — | Month boundaries on PUT | automated | PUT date 2026-10-31, then 2026-11-01, then 2026-11-30 | Listed in 2026-10 / 2026-11 / 2026-11 only | server › "TC-46 …" |
| TC-47 | — | Amount upper boundary | automated | PUT amountMinor 9007199254740991 | 200; 9007199254740992 → 400 | server › "TC-47 …" |
| TC-48 | — | Leap day | automated | PUT 2028-02-29 | 200; 2026-02-29 → 400 | server › "TC-48 …" |
| TC-49 | — | Validation never partially updates | automated | PUT valid date + invalid amount | 400; date unchanged | server › "TC-49 …" |
| TC-50 | AC-24 | Edit URL for id 0 (an expense that cannot exist) | automated | Open `#/expenses/0/edit` | Not-found state of AC-24: "This expense no longer exists." + "Back to expenses" | e2e › "TC-50 (AC-24) …" (reproduced D-1 of run 1) |
| TC-51 | — | Design comparison | manual | Compare list, edit form, dialog, toast, not-found with mockups/wireframes | Layout, labels and states match | (exploratory, screenshots in qa/) |
| TC-52 | — | Regression (route): reload on the Edit screen | automated | Open `#/expenses/<id>/edit`, reload | Same expense pre-filled again | e2e › "TC-52 …" |
| TC-53 | — | Regression (form refactor): Add expense still works | automated | Existing SPD-1 journeys: add, month switch, cancel, validation, 200-char note, offline | All pass; rows now end with "Edit" | e2e/add-expense.spec.ts (Engineer, reused) |
| TC-54 | — | Regression: list, summary, budgets and over-budget screens unaffected | automated | Existing SPD-2/SPD-4/SPD-5 e2e and unit suites | All pass | e2e/summary*.spec.ts, e2e/budgets*.spec.ts, e2e/over-budget*.spec.ts |
| TC-55 | — | Regression (develop merge, SPD-5 banner): the over-budget banner follows delete, Undo and edit | automated | Far-future month, Food budget 100.000 ₫, Food expense 150.000 ₫; list shows the banner; Edit → Delete → Delete expense; Undo; Edit → Amount 90000 → Save | Banner with Food shown; gone after the delete; back after Undo; gone after the edit | e2e › "TC-55 …" |
| TC-56 | — | Regression (revision 2): Cancel disabled during Save | automated | Delay PUT 1.5 s; change Amount to 260000; Save | Cancel disabled while the request runs; list then shows 260.000 ₫ | e2e › "TC-56 …" |
| TC-57 | AC-24 | Edit URL with an id beyond the safe integer range | automated | Open `#/expenses/99999999999999999999/edit` | Not-found state: "This expense no longer exists." + "Back to expenses" | e2e › "TC-57 (AC-24) …" |
| TC-58 | AC-45 | Deleted expense leaves the over-budget check | automated | Food budget, Food expense over it; DELETE; GET /budgets/over; restore; GET again | Food not listed after the delete; listed again after restore | server/test/editExpense.test.ts › "AC-45: a deleted expense stops counting in the over-budget check …" (Engineer, reused) |
