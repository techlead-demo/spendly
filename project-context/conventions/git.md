# Git conventions

## Branches
| Branch | Purpose |
|---|---|
| `develop` | Default and integration branch. Protected: changes only through pull requests with one approval. |
| `main` | Releases. |
| `spec/<KEY>` | Spec for issue `<KEY>` (e.g. `spec/SPD-42`): `specs/<KEY>/spec.md` and business context changes. |
| `feat/<KEY>` | Code for a Story or Task. |
| `fix/<KEY>` | Code for a Bug. |

Branches start from `develop` and merge back into `develop`.

## Commits
- Format: `<KEY>: <imperative summary>`, e.g. `SPD-42: validate the month query parameter`. Lower-case verb, no trailing period, about 72 characters max.
- QA commits: `<KEY>: QA run <n> — <result>`, e.g. `SPD-42: QA run 1 — fail`.
- Changes without an issue (scaffold, tooling): `chore: <summary>`.
- One logical change per commit; code, tests and the matching project-context update go in the same commit or PR.
- Never commit `.env` files, databases (`server/data/*.db`), `node_modules/`, build output or test reports.

## Pull requests
- Title: `<KEY>: <summary>` for code, `<KEY>: Spec — <title>` for specs.
- Target `develop`. CI (lint, unit tests, e2e) must pass.
- Description links the issue, the spec and plan, lists acceptance-criteria coverage, checks run and project-context files updated.
