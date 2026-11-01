# Business overview

## Purpose
Spendly helps one person keep track of their day-to-day spending: what they spent, when, and on what kind of thing, so they can see where their money goes each month.

## Users
- A single user (the owner of the installation). There is no sign-up, login or sharing.
- The user lives in Vietnam and spends in VND. UI text is English; numbers and money are formatted for `vi-VN`.

## Current capabilities
- **Expense list** (the only screen): pick a month (default: the current month), optionally filter by one category, see the month's expenses newest first (date, category, note, amount) and the month total.
- **Categories**: a fixed list of six categories: Food, Transport, Housing, Health, Entertainment, Other.
- **Sample data**: a new database starts with about 25 sample expenses from the last two months up to today.

Expenses cannot yet be created, edited or deleted from the app; they come from the sample data.

## Main flow
1. The user opens the app and sees this month's expenses and the month total.
2. The user switches month to look back, or picks a category to see only that kind of spending.

## Out of scope
- Multiple users, accounts, authentication, sharing.
- Currencies other than VND; exchange rates.
- Income, bank accounts, transfers, bank or card integration.
- Mobile apps and offline sync.
