# Spendly

Spendly is a small personal expense tracker: browse expenses by month and category and see the month total. Single user, amounts in VND.

- `web/` React 18 + Vite + TypeScript (CSS Modules)
- `server/` Express 4 + TypeScript REST API under `/api/v1`, SQLite through Node's built-in `node:sqlite`
- `e2e/` Playwright tests
- `project-context/` business rules, architecture, conventions, design mockups and the runbook
- `specs/` per-issue specs, plans, test cases and QA reports

## Run

Requires Node 24.

```bash
npm ci
npm run dev        # API on http://localhost:5102, web on http://localhost:5101
```

The API creates `server/data/spendly.db` with sample data on first start. `npm run db:reset` recreates it.

## Test

```bash
npm run lint             # TypeScript type-check
npm test                 # Vitest (server + web)
npx playwright test      # end-to-end; needs `npx playwright install chromium` once
```

More detail: [project-context/runbook.md](project-context/runbook.md). Working on the code: start with [CLAUDE.md](CLAUDE.md).
