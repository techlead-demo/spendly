# Coding conventions

## General
- TypeScript everywhere, `strict` (plus `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`). No `any`; narrow `unknown` instead. `npm run lint` must pass.
- ES modules. Named exports only (no default exports, except config files that require one).
- Formatting: 2-space indent, single quotes, semicolons, trailing commas, lines up to ~110 characters. Match the surrounding code.
- Naming: `camelCase` variables and functions, `PascalCase` types and React components, `UPPER_SNAKE_CASE` module constants. Files: `camelCase.ts` for modules, `PascalCase.tsx` for components. Money variables end in `Minor`.
- Keep functions small and pure where possible; put pure helpers in `lib/` with a unit test.
- Comments explain why, not what. Short JSDoc on exported functions whose contract is not obvious.
- Do not leave `console.log`, commented-out code or TODOs without an issue key.

## Server (`server/src`)
- Layering: `routes/` → `services/` → `repositories/`. Each layer only calls the one below.
  - **routes**: one `xxxRouter(deps)` factory per resource, mounted in `app.ts` under `/api/v1/<resource>`. Parse and validate `req.params`, `req.query`, `req.body`; throw `validationError(message)` on bad input; call a service (or a repository for plain reads); `res.json(...)`. No SQL, no business rules.
  - **services**: `createXxxService(deps)` factories holding business logic and rules (BR-n). No `req`/`res`, no SQL.
  - **repositories**: `createXxxRepository(db)` factories; the only place with SQL. Prepare statements once in the factory, pass values as `?` parameters (never string-concatenate input), map snake_case rows to camelCase types from `types.ts`.
- Dependencies are passed in (`createApp(db)` wires them); no module-level database singletons. This keeps tests on in-memory databases.
- Errors: throw `HttpError` / `validationError()` from `errors.ts`; never send error bodies by hand. Unknown errors become 500 `INTERNAL_ERROR` in `errorHandler`. Error messages name the field and the expected format (`"month is required and must be YYYY-MM"`).
- Validation: required fields present, types right, formats checked (`YYYY-MM`, `YYYY-MM-DD`, positive integers for ids and `amountMinor`), referenced rows exist when the operation needs them.
- Responses: collections are `{ "items": [...] }` (plus extra top-level fields if needed); a single resource is the object itself. Create returns 201 with the created resource; delete returns 204.
- Dates: use `server/src/lib/dates.ts`; never `toISOString()` for local dates.
- Mutations that touch several rows run inside `BEGIN` / `COMMIT` (see `seedSampleExpenses`).

## Web (`web/src`)
- Function components and hooks only. One component per file; props typed with an `interface XxxProps`.
- `pages/` are screens (data loading and state); `components/` are presentational (props in, JSX out, no fetching).
- All HTTP goes through `api/client.ts`; add one typed function per endpoint there and the shapes to `api/types.ts`. Errors surface as `ApiError` (status, code, message).
- Styling: one `Xxx.module.css` per component, class names in camelCase, values from `project-context/design/tokens.css` variables. No inline styles except dynamic values; no global classes besides `styles/global.css`.
- Money: keep `amountMinor` integers in state; format only at render time with `formatMoney`. Parse user input to an integer (no decimals for VND).
- Dates: `lib/dates.ts` (`currentMonth`, `formatDate`); dates in state are `YYYY-MM-DD` strings.
- UI text is English and matches the mockup in `project-context/design/screens/`. Use semantic HTML (`<table>`, `<label>` around inputs, `<button>`), so elements are reachable by role and label in tests. Errors are shown in an element with `role="alert"`.
- Every screen handles loading, empty and error states.

## Do / don't
- Do keep `server/src/types.ts` and `web/src/api/types.ts` in sync with `project-context/architecture/api.md`.
- Don't add a dependency for something a few lines of code can do; record new dependencies in the plan.
- Don't read `process.env` outside `config.ts` (server) or `vite.config.ts` / `playwright.config.ts`.
