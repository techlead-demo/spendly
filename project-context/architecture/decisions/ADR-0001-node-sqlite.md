# ADR-0001: SQLite through Node's built-in `node:sqlite`

- Status: accepted
- Date: 2026-11-02

## Context
The API needs a small embedded database with no server to run. The common choice, `better-sqlite3`, is a native module that must be compiled or downloaded for each Node version; that is slow and fragile in fresh clones and CI on Node 24.

## Decision
Use Node's built-in `node:sqlite` module (`DatabaseSync`). Access is synchronous, like `better-sqlite3`. All SQL stays in `server/src/repositories/` and uses prepared statements. Tests and e2e use `:memory:` databases.

## Consequences
- No native dependency; `npm ci` needs no build tools. Requires Node 24 or later.
- No ORM or migration tool: the schema is idempotent SQL in `server/src/db/schema.ts`; local databases are rebuilt with `npm run db:reset` after a schema change.
- Row objects come back with snake_case column names; repositories map them to camelCase resources.
