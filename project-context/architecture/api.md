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
| 400 | `VALIDATION_ERROR` | Missing or malformed input |
| 404 | `NOT_FOUND` | Unknown route or resource |
| 500 | `INTERNAL_ERROR` | Unexpected error (details only in the server log) |

## GET /api/v1/categories
All categories, ordered by `id`.

Response 200:
```json
{
  "items": [
    { "id": 1, "name": "Food" },
    { "id": 2, "name": "Transport" },
    { "id": 3, "name": "Housing" },
    { "id": 4, "name": "Health" },
    { "id": 5, "name": "Entertainment" },
    { "id": 6, "name": "Other" }
  ]
}
```

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

## GET /api/v1/summary
Monthly summary (BR-13): count and total per category for one month. Only categories with at least one expense in the month are listed, largest total first; equal totals follow the fixed category order (category `id`).

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
