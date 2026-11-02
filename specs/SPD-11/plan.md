---
issue: SPD-11
spec_version: 1
revision: 0
---

# Implementation plan — SPD-11

## Approach
The global stylesheet `web/src/styles/global.css` resets `font: inherit` on `button, input, select` but not on
`textarea`, so Chromium falls back to its UA default (`monospace`, 13px) for the Note field. Add `textarea` to that
rule, matching the mockups' base styles (`button, input, select, textarea { font: inherit; }`). This fixes family,
size, weight and line height together (spec A-1) and applies to every textarea in the app (A-2). No component or
token changes.

Computed fonts depend on real CSS layout, which jsdom does not provide, so the tests are Playwright e2e tests that
compare the Note textarea's computed font with the Amount input's (A-3). They were run before the fix and failed
with `monospace` (AC-5).

## Changes
| Area | File(s) | Change |
|---|---|---|
| Web | web/src/styles/global.css | Add `textarea` to the `font: inherit` rule |
| E2E | e2e/note-font.spec.ts | New tests for AC-1 … AC-5 |

## Data model changes
None.

## Acceptance criteria → tests
| AC | Test(s) |
|---|---|
| AC-1 | e2e/note-font.spec.ts › "AC-1, AC-5: the Note textarea uses the Amount input font family, not monospace" |
| AC-2 | e2e/note-font.spec.ts › "AC-2: the Note textarea has the Amount input font size, weight and line height" |
| AC-3 | e2e/note-font.spec.ts › "AC-3: the Note textarea of the Edit expense form matches the Amount input font" |
| AC-4 | e2e/note-font.spec.ts › "AC-4: in the validation-error state the Note textarea keeps the Amount input font family" |
| AC-5 | e2e/note-font.spec.ts › "AC-1, AC-5: …" (failed with `monospace` before the fix, passes after) |

## Context updates
None.

## Risks and notes
- The Note text becomes 15px instead of 13px, so the textarea grows slightly in height; this matches the mockups.
- The spec's front matter still says `status: draft` although the task says it is approved; left as is (BA's file).
