# Runbook

Every command below is a single command run from the repository root.

## Requirements
- Node 24 (`.nvmrc`), npm 10 or later. No database server or native build tools are needed.
- Playwright Chromium for e2e tests: `npx playwright install chromium` (once per machine; CI adds `--with-deps`).

## Install
```
npm ci
```

## Ports and environment
| Variable | Default | Used by |
|---|---|---|
| `WEB_PORT` | `5101` | Vite dev server, Playwright `baseURL` |
| `API_PORT` | `5102` | Express API; Vite proxies `/api` to it |
| `DB_PATH` | `server/data/spendly.db` | SQLite file; `:memory:` for a throw-away database |

## Run
```
npm run dev
```
Starts the API (`tsx watch`, http://localhost:5102/api/v1) and the web app (http://localhost:5101) together. Each part alone: `npm run dev --workspace server`, `npm run dev --workspace web`.

## Lint (type-check)
```
npm run lint
```
TypeScript `--noEmit` for the root (Playwright config and e2e), `server` and `web`.

## Unit and API tests
```
npm test
```
Vitest in `server` (Supertest against an in-memory DB) and `web` (jsdom). One workspace: `npm test --workspace server`.

## End-to-end tests
```
npx playwright test
```
Playwright starts the API with `DB_PATH=:memory:` and the web dev server on `API_PORT` / `WEB_PORT`, then runs `e2e/` in Chromium. `e2e/categories.spec.ts` runs in its own Playwright project (`categories`) after all other tests, because it adds, renames and retires categories in the shared database. If servers are already running on those ports (outside CI) they are reused. List tests without running: `npx playwright test --list`. Report after a failure: `npx playwright show-report`.

## Seed data
- A new database (missing file, or `:memory:`) gets the six default categories and 25 sample expenses dated 0 to 57 days before today.
- Default categories are inserted only when the `categories` table is empty, and sample expenses only when the database is new, so added, renamed and retired categories survive a restart.
- An existing database from before SPD-6 is migrated at startup (column `categories.retired`); no reset is needed.

## Reset the database
```
npm run db:reset
```
Deletes the file at `DB_PATH` (default `server/data/spendly.db`) and recreates it with the schema and sample data. Run it after a schema change, then restart the API.

## Troubleshooting
| Symptom | Fix |
|---|---|
| `Port 5101 is already in use` / `EADDRINUSE :5102` | Stop the other process, or set `WEB_PORT` / `API_PORT` to free ports. |
| Web shows "Could not load expenses" | The API is not running or runs on a different `API_PORT` than the web app was started with. |
| `no such column` / `no such table` after pulling | The schema changed: `npm run db:reset`. |
| Playwright: `Executable doesn't exist` | `npx playwright install chromium`. |
| `node:sqlite` not found | Node is older than 24: switch to Node 24. |
| `npm test` fails with `Cannot find module` after pulling | Dependencies changed: run `npm ci`. |
| An e2e test fails | Run it alone: `npx playwright test e2e/<file>`; screenshots and traces are in `test-results/`. |
