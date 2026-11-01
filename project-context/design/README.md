# Design

- `tokens.css`: colours, spacing, typography, radii and layout sizes. The mockups and the web app (`web/src/styles/global.css`) import the same file; use its variables, never literal values.
- `screens/*.html`: static mockups, one file per screen or state. Open them directly in a browser. Layout, text, labels and messages are the design; the data in them is illustrative. The note under each mockup describes states not drawn (empty, no results, ...).

## Screens
| File | Screen / state | Feature | Status |
|---|---|---|---|
| `screens/expense-list.html` | Expense list: month and category filters, search bar (note text, amount range), table with Edit per row, month total, Add expense button | Browse expenses; search; entry point to add/edit | Implemented: month filter, category filter, table, month total. Not yet: search bar, Edit links, Add expense button |
| `screens/expense-list-over-budget.html` | Expense list with the over-budget warning banner | Budget warning | Not implemented |
| `screens/expense-form.html` | Add expense form (initial state) | Record an expense | Not implemented |
| `screens/expense-form-edit.html` | Edit expense form with Delete | Edit and delete an expense | Not implemented |
| `screens/expense-form-errors.html` | Add/edit form with validation errors | Record / edit an expense | Not implemented |
| `screens/monthly-summary.html` | Monthly summary by category | Monthly summary | Not implemented |
| `screens/categories.html` | Category management (add, rename, retire, restore) | Manage categories | Not implemented |

App shell (all screens): header with the "Spendly" brand and navigation links Expenses / Summary / Categories, content centred at `--content-max-width`. The current app has the header with the brand only (one page, no navigation yet).

## Screens without a mockup
Any screen not listed above has no design yet. The spec for such a feature includes a wireframe in `specs/<KEY>/wireframes/` that uses `tokens.css`; once approved it is the design for that feature.

## Rules
- Match the mockup's labels, messages, order of fields and states; differences must be listed in the spec's UI section.
- Money in the UI is formatted `6.500.000 ₫` (`formatMoney`); dates are shown `DD/MM/YYYY` (`formatDate`), month pickers use `<input type="month">`.
