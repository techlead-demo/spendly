# Glossary

- **Expense**: one payment the user made: a date, an amount, a category and an optional note.
- **Amount**: the money value of an expense, always positive, in VND.
- **Minor unit**: the smallest unit of a currency. VND has no subunit, so 1 minor unit = 1 đồng. Amounts are stored and sent as integer minor units (`amountMinor`).
- **Category**: a kind of spending (Food, Transport, ...). Every expense has exactly one.
- **Note**: optional free text describing an expense ("Groceries at Co.opmart").
- **Date (expense date)**: the local calendar day the expense happened, `YYYY-MM-DD`, no time or time zone.
- **Month**: a calendar month, `YYYY-MM`. An expense belongs to the month of its date.
- **Current month**: the month of today's local date.
- **Expense list**: the screen listing a month's expenses.
- **Add expense form**: the screen where the user records a new expense (date, amount, category, optional note).
- **Category filter**: the expense list option that shows only one category ("All categories" shows every category).
- **Month total**: the total amount spent in the selected month, shown under the expense list.
- **Monthly summary**: the screen showing a month's spending grouped by category, with the number of expenses and the total per category and the month total.
- **Category total**: the total amount spent in one category in the selected month, shown in the monthly summary.
- **Share**: a category total as a percentage of the month total, shown in the monthly summary (e.g. `95,5%`).
- **Sample data**: the expenses a new database is created with, so the app is not empty on first use.
