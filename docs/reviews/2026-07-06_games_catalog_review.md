# 2026-07-06 Games Catalog Review

## Objective

Remove Metal Slug (`mslug`) and Strikers 1945 (`s1945`) from the active games catalog and add Bubble Bobble (`bublbobl`) using the existing ROM in `roms/`.

## Implementation Ledger

| I# | Source ID | Owner | Status | Scope Boundaries | Verification |
| --- | --- | --- | --- | --- | --- |
| I1 | F1 user request | codex | done | Active catalog exports, catalog ROM manifest, catalog-dependent unit tests, runtime smoke fixture | Standard gates pass; original Bubble gameplay blocker resolved by user-provided `roms/bublbobl.zip` |
| I2 | F2 user ROM replacement | codex | done | Bubble Bobble ROM identity and verification evidence | Focused tests, full suite, build, package smoke, and Bubble gameplay smoke pass |

## Failure Groups

| F# | Signature | Root Cause | Fix Scope | Status |
| --- | --- | --- | --- | --- |
| F1 | `tests/vite-roms.test.ts` expected `/ponpoko/neogeo.zip` to resolve, received `null` | `CATALOG_PARENT_ROMS` is intentionally empty after removing Metal Slug from the active catalog | Updated Vite ROM path test to assert undeclared parent ROMs are not served | done |
| F2 | `GAME_RUNTIME_SMOKE_GAME=bublbobl1 npm run games:smoke` showed RetroArch Main Menu instead of gameplay | Previous `roms/bublbobl1.zip` contained only `a78-06.51` and `a78-05.52`, consistent with an incomplete clone/split archive | Superseded by user-provided `roms/bublbobl.zip` parent ROM set | done |

## Execution

| I# | Changed Paths | Verification Result | Status |
| --- | --- | --- | --- |
| I1 | `src/games/index.ts`, `scripts/catalog-roms.mjs`, `scripts/game-runtime-smoke.mjs`, `tests/catalog.test.ts`, `tests/controllers.test.ts`, `tests/emulator.test.ts`, `tests/root-roms.test.ts`, `tests/vite-roms.test.ts` | Red: `npm test -- tests/catalog.test.ts` failed because catalog still had 8 entries with `mslug` and `s1945`, and no Bubble Bobble active entry. Green: focused test set passed. Full suite, build, package smoke, and Bubble gameplay smoke now pass. | done |
| I2 | `src/games/shared.ts`, `src/games/bubble-bobble.ts`, `scripts/catalog-roms.mjs`, `scripts/game-runtime-smoke.mjs`, `tests/catalog.test.ts`, `tests/controllers.test.ts`, `tests/game-config-bubble.test.ts`, `tests/root-roms.test.ts`, `docs/reviews/2026-07-06_games_catalog_review.md` | Red: focused tests failed because implementation still used `bublbobl1` and `roms/bublbobl1.zip` was removed. Green: focused tests passed, 4 files / 28 tests. Final gates passed. | done |

## Deletion Impact Note

No tests/docs/config files were deleted. Removed catalog membership and build-manifest entries for `mslug.zip`, `s1945.zip`, and unused `neogeo.zip` parent copy. The user replaced `roms/bublbobl1.zip` with `roms/bublbobl.zip`; the catalog now targets the new parent ROM set.

## Verification

| Command | Result |
| --- | --- |
| `npm test -- tests/catalog.test.ts` before implementation | failed as expected: catalog had `mslug`/`s1945` and no `bublbobl1` |
| `npm test -- tests/catalog.test.ts tests/controllers.test.ts tests/emulator.test.ts tests/root-roms.test.ts tests/game-config-bubble.test.ts` | pass: 5 files / 44 tests |
| `npm test -- tests/catalog.test.ts tests/game-config-bubble.test.ts tests/controllers.test.ts tests/root-roms.test.ts` after `bublbobl.zip` update | pass: 4 files / 28 tests |
| `npm test -- tests/vite-roms.test.ts` | pass: 1 file / 5 tests |
| `npm run typecheck` | pass |
| `npm test` | pass: 20 files / 99 tests |
| `npm run prepare:roms` | pass: validates active catalog ROMs including `bublbobl.zip` |
| `npm run build` | pass: copies active catalog ROMs including `bublbobl.zip`; does not copy `mslug.zip`, `s1945.zip`, or `neogeo.zip` |
| `npm run smoke` | pass |
| `GAME_RUNTIME_SMOKE_GAME=bublbobl npm run games:smoke` | pass: Bubble Bobble boots on desktop/mobile, renders frames, and accepts mapped inputs |

## Closure

Catalog, build-manifest behavior, and Bubble Bobble runtime gameplay verification are delivered with `roms/bublbobl.zip`.
