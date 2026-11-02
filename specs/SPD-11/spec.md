---
issue: SPD-11
title: Note textarea uses the browser's monospace font instead of the design font
type: bug
status: draft            # draft | approved | implemented | cancelled
version: 1
design:
  - project-context/design/screens/expense-form.html
  - project-context/design/screens/expense-form-edit.html
  - project-context/design/screens/expense-form-errors.html
business_rules: []
---

# SPD-11 Note textarea uses the browser's monospace font instead of the design font

## Summary
The Note field of the Add expense and Edit expense forms shows its text in the browser's default monospace font,
while every other field uses the design font (`--font-family`, Inter …). The form looks inconsistent with the
mockups; no data or behaviour is affected.

## Steps to reproduce
1. Open the app and click "Add expense" (or "Edit" on any expense row).
2. Type `Groceries` into Note.
3. Compare its font with the Amount field, or run `getComputedStyle(document.querySelector('textarea')).fontFamily` in the browser console.

## Expected
The Note text uses the same font as the other form controls: the design font family `var(--font-family)`, size
`var(--font-size-md)` (15px), regular weight and `var(--line-height)`, as in the mockups
`project-context/design/screens/expense-form.html` and `expense-form-edit.html`, whose base styles set
`button, input, select, textarea { font: inherit; }`.

## Actual
The computed `fontFamily` of the Note textarea is `monospace` (Chromium default). Evidence from the issue:
`specs/SPD-3/qa/TC-2-edit-form.png` (Note field); the app's global styles apply `font: inherit` to button, input
and select but not to textarea.

## Scope of fix
- In scope: the Note textarea of the Add expense form, the Edit expense form and the form's validation-error
  state inherit the app's font (family, size, weight, line height) like the other controls. Any other textarea
  in the web app gets the same font.
- Out of scope: other visual changes to the forms (size, padding, rows, resize behaviour, colours); changes to
  the Note's validation or length limit (BR-4, BR-11); changes to the mockups or tokens.

## Acceptance criteria
- **AC-1** Given the Add expense form is open, when the computed style of the Note textarea is read, then its
  `font-family` equals the computed `font-family` of the Amount input (the `--font-family` value, starting with
  `Inter`) and is not `monospace`.
- **AC-2** Given the Add expense form is open, when the computed styles of the Note textarea and the Amount input
  are compared, then `font-size` (`15px`), `font-weight` (`400`) and `line-height` are equal.
- **AC-3** Given an expense with Note "Groceries at Co.opmart" and the user clicks "Edit" on its row, when the
  computed style of the Note textarea of the Edit expense form is read, then its `font-family`, `font-size`,
  `font-weight` and `line-height` equal those of the Amount input on the same form.
- **AC-4** Given the Add expense form with Amount empty and Note "Taxi", when the user clicks Save and the banner
  "Please fix the highlighted fields." is shown, then the computed `font-family` of the Note textarea still equals
  that of the Amount input.
- **AC-5** A regression test reproduces the bug (Note textarea `font-family` differs from the Amount input's /
  is `monospace`) and passes after the fix.

## Assumptions
- A-1 The fix aligns the whole font shorthand (family, size, weight, line height), not only the family, because
  the mockups use `font: inherit` for textarea; this only affects how the Note text looks.
- A-2 The fix applies to every textarea in the web app, matching the mockups' global rule; today the Note field
  is the only textarea, so no other screen changes.
- A-3 The comparison in the tests is against the Amount input's computed style rather than a hard-coded font
  name, so the tests stay valid if `--font-family` changes in `tokens.css`; low impact because both read the same token.
- A-4 The issue was proposed by the QA agent and has not been explicitly confirmed by a human; this spec treats it
  as confirmed. The reviewer can close it instead at Spec Review.

## Questions and answers
| # | Question | Answer | Source |
|---|---|---|---|
| — | None | — | — |

## Changelog
| Version | Change |
|---|---|
| 1 | Initial spec |
