# 2026-07-09 Simultaneous Controls Review

## Plan

I1 | source_ids(F1) | owner | status | scope | verify_cmd
- I1 | F1 simultaneous direction plus action input | Codex | done | `src/main.ts`, `src/emulator.ts`, `tests/input-router.test.ts`, `tests/emulator.test.ts`, `scripts/browser-smoke.mjs`, `scripts/game-runtime-smoke.mjs` | `npm test -- --run tests/input-router.test.ts tests/emulator.test.ts`
- I2 | F1 game-specific onscreen button mapping audit | Codex | done | `tests/controllers.test.ts`, `scripts/game-runtime-smoke.mjs` | `npm test -- --run tests/controllers.test.ts`

## Progress

- CP1 | W1 | Codex | in_progress | 2026-07-09 | I1/I2 context read; no repo-local `AGENTS.md`; no `.loop/` directory found | Implement minimal input guard and tests.
- CP2 | W1 | Codex | done | 2026-07-09 | I1 implemented PointerEvent-first mobile controls and duplicate runtime press guard; added desktop/mobile chord tests | Run full verification.
- CP3 | W1 | Codex | done | 2026-07-09 | I2 added catalog-wide button/action/key/input matrix and expanded runtime smoke active button coverage | Close.

## Verification

- `npm test -- --run tests/input-router.test.ts tests/emulator.test.ts tests/controllers.test.ts` -> passed, 3 files / 38 tests.
- `npm test` -> passed, 20 files / 106 tests.
- `npm run typecheck` -> passed.
- `npm run build` -> passed.
- `npm run browser:smoke` -> passed:
  - `browser-smoke.mjs`: WebKit Ponpoko keyboard/touch input, including left plus jump chord.
  - `game-runtime-smoke.mjs`: catalog games boot on desktop/mobile and accept mapped inputs.
  - `ponpoko-prep-failure-smoke.mjs`: boot overlay failure path.
- `node -e '...'` doc consistency check -> passed; commands and paths above match `package.json`, changed scripts, and changed test files.

## Closure

I# | source_ids(P#/R#/A#/F#) | owner | status | changed_paths | verify_cmd | verify_result | handoff | handoff_payload
- I1 | F1 | Codex | done | `src/main.ts`, `src/emulator.ts`, `tests/input-router.test.ts`, `tests/emulator.test.ts`, `scripts/browser-smoke.mjs`, `scripts/game-runtime-smoke.mjs` | `npm run browser:smoke` | passed | none | none
- I2 | F1 | Codex | done | `tests/controllers.test.ts`, `scripts/game-runtime-smoke.mjs` | `npm test -- --run tests/controllers.test.ts` | passed | none | none

## Residual Risk

- This repo has no `.loop/` directory. For future non-trivial work, initialize loop files with the `loop-init` skill so project-local spec/contract/plan files are authoritative.
