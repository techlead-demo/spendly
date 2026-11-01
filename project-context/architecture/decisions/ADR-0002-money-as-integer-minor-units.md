# ADR-0002: Money as integer minor units

- Status: accepted
- Date: 2026-11-02

## Context
Floating-point numbers cannot represent many decimal amounts exactly, so sums drift. Spendly uses VND, which has no subunit, but the rule must not depend on that.

## Decision
Every amount is an integer number of minor units of the currency, named `...Minor` (`amountMinor`, `monthTotalMinor`) in code, JSON and SQL (`amount_minor`). For VND, 1 minor unit = 1 đồng. Arithmetic is done on integers; formatting happens only in the web app (`formatMoney` in `web/src/lib/money.ts`, `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`). User input is parsed to an integer before it is sent to the API.

## Consequences
- Sums and comparisons are exact.
- Adding a currency with decimals would only change parsing and formatting, not storage.
