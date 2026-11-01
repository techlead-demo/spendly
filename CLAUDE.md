# Spendly

Personal expense tracker for a single user. Web app (React) + REST API (Express) + SQLite.
Currency is VND. There is no login: every request acts for the one user.

## Read before working
- Business: project-context/business/overview.md, rules.md, glossary.md
- Architecture: project-context/architecture/overview.md (then data-model.md / api.md as needed; decisions/ for ADRs)
- Conventions: project-context/conventions/coding.md, testing.md, git.md
- Design: project-context/design/README.md (tokens.css + screens/*.html mockups)
- How to run and test: project-context/runbook.md

## Non-negotiable rules
- Money is stored and transferred as integer minor units (`amountMinor`), never floats. VND has no decimals: 1 minor unit = 1 đồng. Format only in the UI, with `formatMoney` (Intl `vi-VN`, `VND`).
- JSON fields are camelCase. Database columns are snake_case; repositories map between them.
- API base path is `/api/v1`. Errors are `{ "error": { "code": string, "message": string } }` with a matching HTTP status (400 validation, 404 not found, 500 unexpected).
- Dates are local calendar dates as `YYYY-MM-DD` strings; months are `YYYY-MM`. Never convert them through UTC (`toISOString()`).
- Validate every request input at the route; reject bad input with 400 `VALIDATION_ERROR`.
- SQL lives only in `server/src/repositories/`; always use prepared statements with `?` parameters.
- UI styles use CSS Modules and the variables in `project-context/design/tokens.css`; no hard-coded colours, sizes or fonts.
- Every acceptance criterion has at least one automated test (Vitest/Supertest or Playwright).
- `npm run lint` and `npm test` must pass before you commit.
- If you change the data model, API, a business rule, a command or a convention, update the matching project-context file in the same change.
- Do not add a dependency without a reason recorded in the plan (and an ADR in `architecture/decisions/` if it changes the architecture).

## Layout
- web/     React 18 + Vite + TypeScript, CSS Modules
- server/  Express 4 + TypeScript (run with tsx), SQLite via Node's built-in `node:sqlite`
- e2e/     Playwright tests
- project-context/  business, architecture, conventions, design, runbook
- specs/   per-issue specs, plans, test cases, QA reports (`specs/<KEY>/`)

## Commands
See project-context/runbook.md. Quick: `npm ci`, `npm run lint`, `npm test`, `npx playwright test`, `npm run dev`.
Ports come from `WEB_PORT` (default 5101) and `API_PORT` (default 5102).
