# Business rules

Rules are numbered and never renumbered; a removed rule keeps its number and is marked "Removed".
Specs, tests and reviews refer to them by ID.

- **BR-1** Amounts are positive whole numbers of VND (no decimals). The smallest valid amount is 1 đồng.
- **BR-2** Every expense has exactly one category, chosen from the existing categories.
- **BR-3** Every expense has a date (local calendar day). An expense belongs to the month of its date.
- **BR-4** The note is optional free text.
- **BR-5** The categories are fixed: Food, Transport, Housing, Health, Entertainment, Other. Users cannot add, rename or remove categories.
- **BR-6** The expense list shows one month at a time; it opens on the current month.
- **BR-7** The expense list is ordered by date, newest first; expenses on the same date are ordered newest-recorded first.
- **BR-8** The expense list can be filtered by one category or show all categories (default: all).
- **BR-9** Amounts are displayed in VND with `vi-VN` formatting, e.g. `6.500.000 ₫`.
- **BR-10** There is one user and no login.
- **BR-11** A note is at most 200 characters. Leading and trailing spaces are removed; a note that is empty after that is stored as no note.
- **BR-12** When an expense is recorded, its date defaults to today's local date; any valid calendar date, past or future, is accepted.
