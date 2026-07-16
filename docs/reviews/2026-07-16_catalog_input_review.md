# 2026-07-16 Catalog Input Review

## Objective

Fix the reported Bubble Bobble jump failure and audit every active catalog game's desktop keyboard and mobile virtual-controller path. Preserve the existing UI footprint and runtime architecture unless evidence requires a broader input change.

## Success Criteria

- Bubble Bobble Shoot and Jump emit distinct emulator button inputs on desktop and mobile.
- Every active catalog game has a verified label -> action -> keyboard -> emulator-input mapping.
- Direction + action chords press and release independently on desktop Chromium and mobile WebKit paths.
- Focused tests, the full test suite, typecheck, build, and catalog runtime smoke pass.

## Work Ledger

| W# | Owner | Status | Scope | Completion Gate |
| --- | --- | --- | --- | --- |
| W1 | input_audit | done | Read-only input-path and catalog mapping audit | A1-A4 delivered with exact paths and upstream evidence |
| W2 | test_repro | done | Baseline inventory, test run, reproducibility and coverage gaps | F1-F2 reproduced; 106-test baseline captured |
| W3 | oss_research | done | Upstream EmulatorJS/libretro/MAME input definitions | MAME classic, Bubble, Puzzle, Ponpoko, SF2 mappings confirmed |
| W4 | codex | done | Integrate minimal fix, tests, and final validation | Required gates and desktop/mobile catalog smoke green |

## Audit Findings

| A# | Severity | Evidence | Impact | Fix Direction | Owner/Handoff | Status |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | High | Baseline `src/controllers.ts:156`, `src/input.ts:50`, and `scripts/game-runtime-smoke.mjs:54`; upstream Bubble metadata names Button1 `Bubble`, Button2 `Jump` | Bubble Jump/W emitted D-pad Up (4), which the game does not use | Route Bubble Jump to MAME Button2 / RetroPad A (8) on keyboard and pointer paths | codex / none | done |
| A2 | High | Baseline global button order `[0,1,8,9,10,11]`; MAME2003+ PAD_CLASSIC order is `[0,8,1,9,10,11]` | SF2 MP/HP were swapped; WOF second button was unreachable; shared MAME secondary inputs could be no-ops | Store the canonical `EmulatorInput` on each profile button and separate classic arcade from standard SNES layouts | codex / none | done |
| A3 | Medium | Baseline unit and runtime smoke expected Bubble input 4 and passed | Tests certified transport consistency while encoding the defect | Replace the duplicated action lookup with the runtime ID source and audit every active catalog button/chord | codex / none | done |
| A4 | Medium | Upstream driver direction declarations differ from simplified four-way UI profiles for several horizontal-play games | The UI can expose unused directions or intentionally suppress diagonals even though no required gameplay button is missing | Keep this patch button-focused; handle 2-way/driver-raw D-pad UX as a separate reviewed slice | codex / none | partial |

## Upstream Evidence

- [MAME2003+ PAD_CLASSIC maps arcade Button1..6 to B, A, Y, X, L, R](https://github.com/libretro/mame2003-plus-libretro/blob/2cca4441706b952c2eaf8264713b53fd5452e0bd/src/mame2003/mame2003.c#L1049-L1060), which are EmulatorJS/libretro IDs `[0,8,1,9,10,11]`.
- [Bubble Bobble control metadata](https://github.com/libretro/mame2003-plus-libretro/blob/2cca4441706b952c2eaf8264713b53fd5452e0bd/src/controls.c#L4004-L4022) defines Button1 as Bubble and Button2 as Jump.
- [Puzzle Bobble metadata](https://github.com/libretro/mame2003-plus-libretro/blob/2cca4441706b952c2eaf8264713b53fd5452e0bd/src/controls.c#L12116-L12133) exposes only Button1 Shoot.
- [Ponpoko metadata](https://github.com/libretro/mame2003-plus-libretro/blob/2cca4441706b952c2eaf8264713b53fd5452e0bd/src/controls.c#L11846-L11863) confirms Button1 Jump; [SF2 metadata](https://github.com/libretro/mame2003-plus-libretro/blob/2cca4441706b952c2eaf8264713b53fd5452e0bd/src/controls.c#L14787-L14814) confirms the six logical arcade buttons.
- [Current MAME Pang/Super Pang input source](https://github.com/mamedev/mame/blob/d88ad4b6c00ae763716d104863b9226b98753800/src/mame/capcom/mitchell.cpp#L1248-L1266) marks Button2 as service-only and unused in gameplay; [WOF includes the two-button CPS1 profile](https://github.com/mamedev/mame/blob/d88ad4b6c00ae763716d104863b9226b98753800/src/mame/capcom/cps1.cpp#L892-L905).

## Failure Groups

| F# | Signature / Reproducer | Scope | Owner | Status |
| --- | --- | --- | --- | --- |
| F1 | Executable router repro emitted `up` for both mobile `jumpUp` and desktop `KeyW` | Bubble-specific semantic mapping plus shared routing | codex | done |
| F2 | Baseline 106/106 tests and Bubble desktop/mobile smoke passed while explicitly expecting the wrong input 4 | False-positive test oracle | codex | done |

## Implementation Ledger

| I# | Source IDs | Owner | Status | Scope Boundaries | Verification |
| --- | --- | --- | --- | --- | --- |
| I1 | A1, A2, F1 | codex | done | Add per-button `EmulatorInput`; keep MAME classic and SNES standard layouts distinct; remove the global `jumpUp -> up` fallback | Focused tests, typecheck, Bubble runtime smoke |
| I2 | A2, A3, user catalog-wide audit | codex | done | Correct active controls for Bubble, Puzzle Bobble, Super Pang, SF2, and WOF without changing ROM/runtime architecture | 107 unit tests and full catalog desktop/mobile smoke |
| I3 | A3, F2 | codex | done | Exercise every active action in direction chords, cancellation/blur release, and bump the PWA cache version | `npm run browser:smoke`, `npm run smoke`, service-worker tests |

## Planned Verification

| Stage | Command | Status |
| --- | --- | --- |
| Baseline inventory | `npx vitest list` | pass: 106 node IDs |
| Baseline suite | `npm test` | pass: 20 files / 106 tests; false positive documented as F2 |
| Red focused | `npm test -- tests/controllers.test.ts tests/input-router.test.ts` | expected fail: 5 failures exposed old Up and shared-order behavior |
| Focused green | `npm test -- tests/controllers.test.ts tests/input-router.test.ts tests/emulator.test.ts tests/catalog.test.ts tests/game-config-bubble.test.ts tests/game-config-puzzle-bobble.test.ts` | pass: 6 files / 54 tests |
| Final inventory/suite | `npm test` | pass: 20 files / 107 tests; delta `+1`, no removals/renames |
| Type safety | `npm run typecheck` | pass |
| Build | `npm run build` | pass; production asset `index-DpEMJuXw.js` |
| Bubble runtime | `GAME_RUNTIME_SMOKE_GAME=bublbobl npm run games:smoke` | pass: desktop Chromium + mobile WebKit, exact Button2 jump and chords/cancellation |
| Catalog runtime | `npm run games:smoke` | pass: all 7 active games on desktop Chromium + mobile WebKit |
| Browser integration | `npm run browser:smoke` | pass: Ponpoko browser flow, full catalog runtime, prep-failure regression |
| Package/layout | `npm run smoke`; `npm run desktop:smoke`; `npm run prepare:roms` | pass |
| Documentation consistency | Verify referenced package scripts, changed paths, cache version, and test inventory against repository sources | pass |
| Diff | `git diff --check` | pass |

## Deletion Impact Note

No test, documentation, or configuration file deletion is planned.

## Progress Log

`CP0 | W1-W4 | delegated owners + codex | in_progress | 0m | audit and baseline started | confirm root cause and red test`

`CP1 | W1-W3 | delegated owners | done | <3m | A1-A4, F1-F2, upstream mapping delivered | integrate implementation`

`CP2 | W4 | codex | done | <10m | 107 tests, build, Bubble and full catalog browser checks green | finalize review artifact`

## Closure

Delivered the catalog-wide button-input fix with one app-owned keyboard/pointer route and explicit per-profile RetroPad inputs. Bubble Jump now emits input 8 on desktop and mobile; MAME and SNES button orderings are no longer conflated. No files were deleted. Real-device iPhone validation remains external; mobile verification used Playwright WebKit with an iPhone-sized touch context.
