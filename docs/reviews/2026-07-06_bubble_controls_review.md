# 2026-07-06 Bubble Controls Review

## Objective

Fix Bubble Bobble controls after real iPhone testing showed the visible Jump button fired bubbles and the Shoot button did not respond. The corrected requirement is a separate Jump action button, not exposing the D-pad Up action as that button. Inspect and align desktop keyboard hints with the corrected mobile action mapping.

## Implementation Ledger

| I# | Source ID | Owner | Status | Scope Boundaries | Verification |
| --- | --- | --- | --- | --- | --- |
| I1 | F1 user report | codex | done | Bubble Bobble controller profile, keyboard hints, runtime smoke fixture, focused tests | Focused tests, full suite, build, package smoke, and Bubble gameplay smoke pass |
| I2 | F2 user correction | codex | done | Dedicated Bubble Bobble jump action, active profile keyboard routing, desktop key array, runtime smoke fixture, focused tests | Red focused test failed for missing `jumpUp` routing; focused tests, full suite, build, package smoke, and Bubble gameplay smoke pass |
| I3 | F3 desktop Chrome report | codex | done | Prevent EmulatorJS native keyboard leakage for profile-handled keys, block inactive Bubble desktop keys, bump PWA cache version, runtime smoke fixture | Red focused tests failed because native listeners still saw `W`/`E`; focused tests, full suite, build, package smoke, and Bubble gameplay smoke pass |

## Root Cause

Bubble Bobble originally used the generic `platformFire` profile. That profile labels button 1 as jump and maps it to `action1`, but the `bublbobl` ROM uses `action1` for bubble shot. The first local correction reused the `up` control action for the visible Jump button, which made the button look like D-pad Up and produced an Up-arrow desktop hint. The corrected model keeps a separate `jumpUp` action for the visible Jump button while routing that action to the emulator's `up` input.

The desktop Chrome follow-up was not only stale cache. A fresh deployed Chromium context loaded the current `index-B0J2Fc6b.js` bundle and still showed EmulatorJS native keyboard handling leaking through: `W` sent both app `up` and EmulatorJS button 2, while `E` sent EmulatorJS button 3. The app router now consumes handled profile keys in capture phase and consumes inactive profile button keys without sending hidden inputs.

## Execution

| I# | Changed Paths | Verification Result | Status |
| --- | --- | --- | --- |
| I1 | `src/controllers.ts`, `src/games/shared.ts`, `src/games/bubble-bobble.ts`, `scripts/game-runtime-smoke.mjs`, `tests/catalog.test.ts`, `tests/controllers.test.ts`, `tests/game-config-bubble.test.ts`, `docs/reviews/2026-07-06_bubble_controls_review.md` | Red: focused tests failed because Bubble still used `platformFire`. Green: focused tests passed, 3 files / 23 tests. | done |
| I2 | `src/controllers.ts`, `src/input.ts`, `src/main.ts`, `scripts/game-runtime-smoke.mjs`, `tests/controllers.test.ts`, `tests/input-router.test.ts`, `docs/reviews/2026-07-06_bubble_controls_review.md` | Red: focused tests failed because Bubble still exposed `up` and `InputRouter` had no active profile routing. Green: focused tests passed, 4 files / 29 tests. Final gates passed. | done |
| I3 | `src/input.ts`, `scripts/game-runtime-smoke.mjs`, `tests/input-router.test.ts`, `public/service-worker.js`, `docs/reviews/2026-07-06_bubble_controls_review.md` | Red: focused tests failed because native key listeners still received Bubble `W` and `E`. Green: focused tests passed, 2 files / 19 tests. Final gates passed. | done |

## Deletion Impact Note

No files were deleted.

## Verification

| Command | Result |
| --- | --- |
| `npm test -- tests/controllers.test.ts tests/game-config-bubble.test.ts` before implementation | failed as expected: Bubble still used `platformFire` |
| `npm test -- tests/controllers.test.ts tests/input-router.test.ts` before I2 implementation | failed as expected: Bubble still used `up` as the visible jump action and profile keyboard routing was missing |
| `npm test -- tests/controllers.test.ts tests/input-router.test.ts tests/game-config-bubble.test.ts tests/catalog.test.ts` | pass: 4 files / 29 tests |
| `npm run build` | pass |
| `GAME_RUNTIME_SMOKE_GAME=bublbobl npm run games:smoke` | pass: Bubble Bobble boots on desktop/mobile, renders frames, and accepts mapped inputs |
| `npm run typecheck` | pass |
| `npm test` | pass: 20 files / 103 tests |
| `npm run smoke` | pass |
| live deployed probe before I3 | reproduced desktop Chrome leak in a fresh context: `W` sent inputs 1 and 4; `E` sent input 8; mobile WebKit Jump tap sent input 4 |

## Closure

Bubble Bobble now uses a dedicated `bubbleBobble` controller profile. Button 1 / Q is bubble shot. Button 2 / W is a separate Jump action that sends the emulator `up` input, while the D-pad Up arrow remains part of movement. Desktop handled profile keys are consumed before EmulatorJS native keyboard listeners, so inactive `E` no longer sends a hidden button input.
