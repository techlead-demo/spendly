---
issue: SPD-11
spec_version: 1
---

# Test cases — SPD-11

| ID | AC | Title | Type | Steps | Expected | Automated test |
|---|---|---|---|---|---|---|
| TC-1 | AC-1 | Add form: Note font-family equals Amount's | automated | 1. Open `/` 2. Click "Add expense" 3. Read computed `font-family` of the Note textarea and the Amount input | Equal; starts with `Inter`; not `monospace` | e2e/note-font.spec.ts › "AC-1, AC-5: the Note textarea uses the Amount input font family, not monospace" |
| TC-2 | AC-2 | Add form: Note size, weight, line height equal Amount's | automated | 1. Open Add expense 2. Read computed `font-size`, `font-weight`, `line-height` of Note and Amount | Equal; `font-size` = `15px`, `font-weight` = `400` | e2e/note-font.spec.ts › "AC-2: the Note textarea has the Amount input font size, weight and line height" |
| TC-3 | AC-3 | Edit form: Note font equals Amount's | automated | 1. Create an expense with Note "Groceries at Co.opmart …" (API, 2026-11-02, 280.000 ₫, Food) 2. Open `/`, month 2026-11, click "Edit" on its row 3. Compare computed family, size, weight, line height of Note and Amount | All four equal; Note shows the stored note | e2e/note-font.spec.ts › "AC-3: the Note textarea of the Edit expense form matches the Amount input font" |
| TC-4 | AC-4 | Validation-error state keeps the font | automated | 1. Open Add expense 2. Amount empty, Note "Taxi" 3. Click Save | Banner "Please fix the highlighted fields." visible; Note `font-family` equals Amount's, not `monospace` | e2e/note-font.spec.ts › "AC-4: in the validation-error state the Note textarea keeps the Amount input font family" |
| TC-5 | AC-5 | Regression: Note is not monospace | automated | 1. Open Add expense 2. Read computed `font-family` of Note | Not `monospace`; equals Amount's. On develop `global.css` has no `textarea` in the `font: inherit` rule (`git show develop:web/src/styles/global.css`), so the test reproduces the bug | e2e/note-font.spec.ts › "AC-1, AC-5: the Note textarea uses the Amount input font family, not monospace" |
| TC-6 | — | Boundary: a 200-character Note keeps the design font and the limit | automated | 1. Open Add expense 2. Fill Note with "Groceries " × 20 (200 chars) 3. Read computed font of Note | Value has 200 chars; family, size, weight, line height equal Amount's | e2e/note-font-qa.spec.ts › "TC-6: a 200-character Note keeps the design font and the length limit" |
| TC-7 | — | Visual comparison with mockups (Add, Edit, error state) | manual | Open each form in the browser, type "Groceries" / "Taxi", compare with `expense-form.html`, `expense-form-edit.html`, `expense-form-errors.html` | Note text renders in the same font as the other controls; no other visual change | specs/SPD-11/qa/TC-7-*.png |
| TC-8 | — | Regression (touched rule in global.css): Date, Category and Save still inherit the font | automated | 1. Open Add expense 2. Read computed `font-family` of Date, Category, Save and Amount | All equal; Amount's starts with `Inter` | e2e/note-font-qa.spec.ts › "TC-8: Date, Category and Save still inherit the design font family" |
