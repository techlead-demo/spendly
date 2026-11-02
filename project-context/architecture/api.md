# API

Base path `/api/v1`. JSON request and response bodies, camelCase fields. No authentication.
Money is `amountMinor` (integer VND minor units). Dates are `YYYY-MM-DD`, months `YYYY-MM` (local).

## Errors
All errors use this body and a matching status:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "month is required and must be YYYY-MM" } }
```

| Status | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or malformed input, including a request body that is not valid JSON |
| 404 | `NOT_FOUND` | Unknown route or resource |
| 500 | `INTERNAL_ERROR` | Unexpected error (details only in the server log) |

## GET /api/v1/categories
All categories, active and retired, ordered by `id` (the category order, BR-22).

Response 200:
```json
{
  "items": [
    { "id": 1, "name": "Food", "status": "active", "expenseCount": 48 },
    { "id": 2, "name": "Transport", "status": "active", "expenseCount": 31 },
    { "id": 3, "name": "Housing", "status": "retired", "expenseCount": 12 },
    { "id": 7, "name": "Coffee", "status": "active", "expenseCount": 0 }
  ]
}
```

| Field | Type | Meaning |
|---|---|---|
| `id` | integer | Never reused; categories are never deleted |
| `name` | string | Trimmed, 1 to 40 characters, unique ignoring letter case (BR-23) |
| `status` | `"active" \| "retired"` | BR-24: only active categories can be chosen for a new expense and get budgets |
| `expenseCount` | integer | Expenses in the category over all months; deleted expenses (BR-21) are not counted |

## /api/v1/categories (changes)
Add, rename, retire and restore a category (SPD-6, BR-22 to BR-25). Each returns the category in the shape above.
For `:id`, a value that is not a positive integer (`0`, `abc`) gives 400 `VALIDATION_ERROR`
(`id must be a positive integer`); an unknown id gives 404 `NOT_FOUND` (`category 99 does not exist`).

Name rules (BR-23), checked by `POST` and `PATCH`; the messages are meant to be shown to the user:
| Input | 400 `VALIDATION_ERROR` message |
|---|---|
| `name` missing or not a string | `name is required and must be a string` |
| Empty after trimming | `Enter a category name.` |
| Longer than 40 characters after trimming | `A category name can have at most 40 characters.` |
| Equal to another category's name ignoring letter case (active or retired) | `A category named "food" already exists.` (the trimmed name as sent) |

### POST /api/v1/categories
Body `{ "name": "  Coffee  " }`. Response 201: the new category, active, at the end of the category order
(`{ "id": 7, "name": "Coffee", "status": "active", "expenseCount": 0 }`).

### PATCH /api/v1/categories/:id
Body `{ "name": "Groceries" }`. Renames the category everywhere, also on past expenses (they refer to the id). Its
own name in another letter case is allowed (`Food` → `food`). Response 200: the renamed category; the status stays.

### POST /api/v1/categories/:id/retire
No body. Response 200: the category, `status: "retired"`; also when it was retired already (no change). Expenses and
budgets do not change. Retiring the only active category: 400 `VALIDATION_ERROR`
`At least one category must stay active.` (BR-25).

### POST /api/v1/categories/:id/restore
No body. Response 200: the category, `status: "active"`; also when it was active already (no change).

## GET /api/v1/expenses
Expenses of one month, ordered by `date` descending, then `id` descending.

Query parameters:
| Name | Required | Format | Notes |
|---|---|---|---|
| `month` | yes | `YYYY-MM` | 400 `VALIDATION_ERROR` if missing or malformed |
| `categoryId` | no | positive integer | Only expenses of this category. 400 `VALIDATION_ERROR` if not a positive integer; an unknown id returns no items |

Request: `GET /api/v1/expenses?month=2026-10`

Response 200:
```json
{
  "items": [
    { "id": 12, "date": "2026-10-31", "amountMinor": 120000, "categoryId": 1, "note": "Lunch with team" },
    { "id": 11, "date": "2026-10-15", "amountMinor": 30000, "categoryId": 2, "note": null },
    { "id": 9, "date": "2026-10-01", "amountMinor": 6500000, "categoryId": 3, "note": "Monthly rent" }
  ],
  "monthTotalMinor": 6650000
}
```

| Field | Type | Meaning |
|---|---|---|
| `items` | Expense[] | `{ id, date, amountMinor, categoryId, note }`, `note` is `string \| null` |
| `monthTotalMinor` | integer | Total for the month, VND minor units; `0` when there are no expenses |

Errors: `GET /api/v1/expenses?month=2026-13` → 400
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "month is required and must be YYYY-MM" } }
```

## POST /api/v1/expenses
Records one expense (BR-1, BR-2, BR-3, BR-11, BR-12).

Request body:
| Field | Required | Type | Rules |
|---|---|---|---|
| `date` | yes | string | Existing calendar date `YYYY-MM-DD` (`2026-02-30`, `2026-11-2` are rejected); past and future dates are accepted |
| `amountMinor` | yes | integer (JSON number) | `1` to `9007199254740991`; strings and decimals are rejected |
| `categoryId` | yes | integer (JSON number) | Id of an existing, active category (BR-24): a retired one gives `categoryId 8 is retired` |
| `note` | no | `string \| null` | Trimmed; at most 200 characters after trimming; empty after trimming is stored as `null` |

Request:
```json
{ "date": "2026-11-02", "amountMinor": 85000, "categoryId": 1, "note": "  Lunch " }
```

Response 201: the created expense.
```json
{ "id": 26, "date": "2026-11-02", "amountMinor": 85000, "categoryId": 1, "note": "Lunch" }
```

Errors: 400 `VALIDATION_ERROR` for any rule above, nothing is stored; the message names the field, e.g.
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "categoryId 99 does not exist" } }
```

## /api/v1/expenses/:id
One expense (SPD-3, BR-20, BR-21). For every endpoint below, `id` must be a positive integer, otherwise 400
`VALIDATION_ERROR` (`id must be a positive integer`). An unknown or deleted expense gives 404 `NOT_FOUND`
(`expense 9999 does not exist`), except for `restore`. Deleted expenses are excluded from `GET /api/v1/expenses`
and `GET /api/v1/summary`.

### GET /api/v1/expenses/:id
Response 200: the expense.
```json
{ "id": 7, "date": "2026-11-02", "amountMinor": 280000, "categoryId": 1, "note": "Groceries at Co.opmart" }
```

### PUT /api/v1/expenses/:id
Replaces `date`, `amountMinor`, `categoryId` and `note`. Same body and validation as `POST /api/v1/expenses`
(400 `VALIDATION_ERROR`, nothing changed). The expense keeps its `id` and its place in recording order (BR-20).
The body is validated before the id is looked up. A retired `categoryId` is accepted only when it is the
expense's current category (BR-24); another retired category gives 400 `categoryId 4 is retired`.

Request:
```json
{ "date": "2026-10-28", "amountMinor": 250000, "categoryId": 2, "note": " Bus " }
```

Response 200: the updated expense.
```json
{ "id": 7, "date": "2026-10-28", "amountMinor": 250000, "categoryId": 2, "note": "Bus" }
```

### DELETE /api/v1/expenses/:id
Marks the expense deleted (BR-21). Response 204 with no body.

### POST /api/v1/expenses/:id/restore
Undoes a delete: the expense comes back with the same `id`, values and place in recording order. No body.
Response 200: the expense, also when it was not deleted (idempotent), and also when its category is retired now
(BR-24). 404 `NOT_FOUND` only for an id that was never recorded. The server sets no time limit; the 5-second Undo window is enforced by the web app (SPD-3 A-10).

## GET /api/v1/summary
Monthly summary (BR-13): count and total per category for one month. Only categories with at least one expense in the month are listed (retired ones too), largest total first; equal totals follow the category order (category `id`, BR-22). `categoryName` is the category's current name.

Query parameters:
| Name | Required | Format | Notes |
|---|---|---|---|
| `month` | yes | `YYYY-MM` | 400 `VALIDATION_ERROR` if missing or malformed (same rule as `GET /api/v1/expenses`) |

Request: `GET /api/v1/summary?month=2026-11`

Response 200:
```json
{
  "month": "2026-11",
  "items": [
    { "categoryId": 3, "categoryName": "Housing", "count": 1, "totalMinor": 6500000 },
    { "categoryId": 1, "categoryName": "Food", "count": 2, "totalMinor": 205000 },
    { "categoryId": 2, "categoryName": "Transport", "count": 1, "totalMinor": 50000 },
    { "categoryId": 4, "categoryName": "Health", "count": 1, "totalMinor": 50000 }
  ],
  "monthCount": 5,
  "monthTotalMinor": 6805000
}
```

| Field | Type | Meaning |
|---|---|---|
| `month` | string | The requested month, `YYYY-MM` |
| `items` | CategorySummary[] | `{ categoryId, categoryName, count, totalMinor }`; empty for a month without expenses |
| `monthCount` | integer | Number of expenses in the month; `0` when there are none |
| `monthTotalMinor` | integer | Sum of all `totalMinor`, VND minor units; equals `monthTotalMinor` of `GET /api/v1/expenses` for the month |

Shares of the month total (BR-15) are not returned; the web app derives them from `totalMinor` and `monthTotalMinor` (`web/src/lib/share.ts`).

Errors: `GET /api/v1/summary?month=2026-1` → 400 `VALIDATION_ERROR` with the message above.

## GET /api/v1/budgets
The budget in effect for every category in one month (BR-16): the budget set or removed for that category from the
latest start month that is not after `month`. Active categories only (BR-24), ordered by `id`; budgets stored for a
retired category are kept and listed again once it is restored.

Query parameters:
| Name | Required | Format | Notes |
|---|---|---|---|
| `month` | yes | `YYYY-MM` | 400 `VALIDATION_ERROR` if missing or malformed (same check as `GET /api/v1/expenses`) |

Request: `GET /api/v1/budgets?month=2026-12`

Response 200:
```json
{
  "month": "2026-12",
  "items": [
    { "categoryId": 1, "amountMinor": 700000 },
    { "categoryId": 2, "amountMinor": null },
    { "categoryId": 3, "amountMinor": null },
    { "categoryId": 4, "amountMinor": null },
    { "categoryId": 5, "amountMinor": 300000 },
    { "categoryId": 6, "amountMinor": null }
  ]
}
```

| Field | Type | Meaning |
|---|---|---|
| `month` | string | The requested month |
| `items` | Budget[] | `{ categoryId, amountMinor }`; `amountMinor` is an integer (VND minor units) or `null` for no budget (no limit) |

## GET /api/v1/budgets/over
The categories over budget in one month (BR-19): a budget is in effect for the month (BR-16) and the category total of
the month (BR-13, all expenses dated in the month) is greater than it. Equal to the budget is not over; a category
without a budget is never listed. Ordered by `overMinor` descending; equal amounts follow the category order
(category `id`, BR-22). Retired categories are not filtered out (SPD-6 A-7). The web app shows these in the over-budget banner of the expense list (SPD-5).

Query parameters:
| Name | Required | Format | Notes |
|---|---|---|---|
| `month` | yes | `YYYY-MM` | 400 `VALIDATION_ERROR` if missing or malformed (same check as `GET /api/v1/expenses`) |

Request: `GET /api/v1/budgets/over?month=2026-11`

Response 200:
```json
{
  "month": "2026-11",
  "items": [
    { "categoryId": 1, "categoryName": "Food", "spentMinor": 785000, "budgetMinor": 700000, "overMinor": 85000 },
    { "categoryId": 5, "categoryName": "Entertainment", "spentMinor": 350000, "budgetMinor": 300000, "overMinor": 50000 }
  ]
}
```

| Field | Type | Meaning |
|---|---|---|
| `month` | string | The requested month |
| `items` | OverBudgetCategory[] | `{ categoryId, categoryName, spentMinor, budgetMinor, overMinor }`, integers in VND minor units; `overMinor = spentMinor - budgetMinor` (≥ 1). Empty when no category is over budget |

Errors: `GET /api/v1/budgets/over?month=2026-13` → 400 `VALIDATION_ERROR` with the message `month is required and must be YYYY-MM`.

## PUT /api/v1/budgets
Sets or removes the budget of one or more categories from `month` onward (BR-16, BR-17, BR-18). Earlier months and
budgets set or removed from a later month are not changed. Categories not listed keep their budgets. All items are
stored, or none.

Request body:
| Field | Required | Type | Rules |
|---|---|---|---|
| `month` | yes | string | `YYYY-MM`; the current month (server local date) or later |
| `items` | yes | array | At least one item; each category at most once |
| `items[].categoryId` | yes | integer (JSON number) | Id of an existing, active category (BR-24): a retired one gives `categoryId 8 is retired` |
| `items[].amountMinor` | yes | integer or `null` | `1` to `9007199254740991` sets the budget; `null` removes it. Strings and decimals are rejected |

Request:
```json
{ "month": "2027-01", "items": [{ "categoryId": 1, "amountMinor": 800000 }, { "categoryId": 5, "amountMinor": null }] }
```

Response 200: the budgets of `month` after the change, as in `GET /api/v1/budgets`.

Errors: 400 `VALIDATION_ERROR` for any rule above, nothing is stored, e.g.
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "month must be the current month (2026-11) or later" } }
```
