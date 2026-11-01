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
