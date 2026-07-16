# 2026-07-16 Strikers 1945 Review

## Objective

Add the existing `roms/s1945.zip` to the active catalog and make Strikers 1945 reliably playable through FBNeo on desktop and mobile. Preserve its vertical presentation while keeping gameplay, the isolated top menu, and the universal touch controller usable without overlap.

## Success Criteria

- The exact FBNeo-compatible Strikers 1945 archive is bound to the FBNeo core without an unrelated parent archive.
- Desktop Chromium and iPhone-sized mobile WebKit reach active gameplay and accept 8-way movement plus Shot/Bomb inputs mapped to EmulatorJS IDs `0/8`.
- The game is upright and uncropped in its portrait stage; the mobile stage, menu, D-pad, action buttons, and service buttons are visible, separated, and hit-testable at 375x667.
- Catalog, controller, ROM/CRC, build/package, typecheck, all-game browser regression, and independent evaluator gates pass.
- Only a successful implementation is committed, pushed to `main`, published through GitHub Pages, verified live, and cleaned of the worktree and generated residue.

## Source Plan

| P# | Requirement | Implementation | Verification | Status |
| --- | --- | --- | --- | --- |
| P1 | Correct FBNeo ROM identity | I1 activate the existing game config and build manifest; guard the archive entries | Catalog, root-ROM, build-copy, and upstream-definition checks | done |
| P2 | Correct shooter controls | I2 reuse the two-button 8-way profile with verified input IDs | Controller unit checks plus keyboard/touch and simultaneous-input smoke | done |
| P3 | Correct vertical presentation | I3 retain or minimally correct the vertical stage/control layout | Desktop/mobile geometry, hit-test, canvas, and screenshot checks | done |
| P4 | Runtime playability | I4 add Strikers-specific FBNeo runtime evidence | Advancing-frame, video, visible-gameplay, and input checks on both targets | done |
| P5 | Release closure | I5 final regression, evaluator, main push, Pages deployment, live readback, cleanup | Workflow result, live URL smoke, clean/synced repository | in_progress |

## Work Ledger

| W# | Owner | Status | Scope | Completion Gate |
| --- | --- | --- | --- | --- |
| W1 | s1945_planner | done | Read-only plan and historical repository evidence | P1-P5 scope and risks delivered |
| W2 | s1945_oss_rom | done | Read-only upstream FBNeo/ROM/input forensics | Exact archive, orientation, and input evidence delivered |
| W3 | codex | in_progress | Contract tests, implementation, runtime/UI verification, integration | I1-I5 green without scope drift |
| W4 | s1945_planner evaluator | done | Independent contract/diff/runtime evidence review | GO with no unresolved Critical, High, Medium, or Low findings |

## Baseline and Test Inventory

- Baseline inventory: `npx vitest list` -> 111 node IDs.
- Baseline suite: `npm test` -> 20 files / 111 tests passed.
- Red focused tests: `npm test -- tests/catalog.test.ts tests/controllers.test.ts tests/root-roms.test.ts` -> expected 5 failures across inactive catalog and build manifest; 27 checks passed, including the new archive-entry CRC guard.
- No `.loop/` workspace exists. The feature is isolated in a dedicated worktree and this review document is the durable spec, contract, plan, progress, and closure artifact for the scoped change.

## Implementation Ledger

| I# | Source IDs | Owner | Status | Scope Boundaries | Verification |
| --- | --- | --- | --- | --- | --- |
| I1 | P1 | codex | done | Activate only the existing S1945 config and ROM; do not replace emulator architecture | Focused catalog/ROM/build tests passed |
| I2 | P2 | codex | done | Reuse shared input routing; change mappings only if primary-source/runtime evidence requires it | Mapping matrix and desktop/mobile input smoke passed |
| I3 | P3 | codex | done | Touch only vertical layout rules needed by observed failures | Portrait geometry, edge visibility, layout, and screenshot review passed |
| I4 | P4 | codex | done | Add game-specific smoke evidence without weakening existing games | Desktop Chromium and mobile WebKit active-play checks passed |
| I5 | P5 | codex | in_progress | Release only after final green gates and evaluator GO | Commit, main push, Pages workflow, live smoke, cleanup |

## Audit Findings

| A# | Severity | Evidence | Impact | Resolution | Status |
| --- | --- | --- | --- | --- | --- |
| A1 | High | The verified S1945 config and ROM remained tracked but were absent from the active catalog and build manifest | The game could not be selected or published | Activate the existing config and exact ROM in the two source-of-truth lists | done |
| A2 | High | The vertical canvas used CSS `320/224` inside a `224/320` stage; the first desktop/mobile captures showed a black left half and clipped gameplay | A booting game was visually unplayable | Fit the canvas at `100%` with the portrait `224/320` ratio and enforce stage/canvas geometry plus left/right edge visibility | done |
| A3 | Medium | Historical commit `41b1185` expected Bomb on input `1`, while current FBNeo generic fire ordering is `0/8/1` | Reusing the old fixture would test the wrong button | Bind Shot/Bomb to `0/8` in controller and runtime checks | done |
| A4 | Medium | An attract/selection screenshot could pass without proving a started stage | False-positive playability evidence | Trigger Shot after Coin/Start, wait for the stage, and capture a scored single-player scene | done |
| A5 | Low | `s1945.jpg` is absent | The catalog uses the existing text thumbnail fallback | No gameplay asset was added | accepted |
| A6 | Medium | Independent clean smoke reached different valid randomized first-stage maps on desktop/mobile and exceeded the generic cross-target histogram threshold | A correct runtime could fail nondeterministically | Disable only S1945 cross-target scene equality while retaining per-target color, crop, geometry, input, screenshot, and cache gates | done |

## Upstream Evidence

- [FBNeo Psikyo driver](https://github.com/finalburnneo/FBNeo/blob/1b7bfec4757ff0e3fe9dd40c105f7dabec6d4762/src/burn/drv/psikyo/d_psikyo.cpp#L2250-L2287) defines the World parent set, exact ROM names/sizes/CRCs, no parent/BIOS archive, vertical `224x320`, and `3:4` presentation.
- [MAME Psikyo driver](https://github.com/mamedev/mame/blob/a8acf5e8e91f72ebfb241b42c31eb70e441b12ab/src/mame/psikyo/psikyo.cpp#L1749-L1775) independently matches the archive and marks `4-u59.bin` as `NO_DUMP`, so its absence from the ZIP is expected.
- [FBNeo libretro input mapping](https://github.com/libretro/FBNeo/blob/808243ba2a95061e6bd2a86829dc54b46dfded99/src/burner/libretro/retro_input.cpp#L57-L80) maps generic Fire 1/2 to RetroPad B/A, which the app exposes as EmulatorJS IDs `0/8`.
- The vendored `fbneo-legacy-wasm.data` hash `9dbb6242c028f4179549f324688b654353881beb552292f939bc6171a0828b5f` is byte-identical to the EmulatorJS stable core; its embedded WASM contains the S1945 driver name and all ten ROM CRC constants.

## Failure Groups

| F# | Reproducer | Resolution | Status |
| --- | --- | --- | --- |
| F1 | Focused red suite reported five failures for the inactive catalog and manifest | Added only the existing config import/catalog item and manifest ROM | done |
| F2 | Initial S1945 stage captures showed about half black canvas; measured canvas `948x664` inside stage `466x666` | Corrected vertical canvas to portrait fit; final canvas `464x664` inside stage `466x666` | done |
| F3 | The first capture stopped on aircraft selection | Send the verified Shot input and wait five seconds before gameplay evidence | done |
| F4 | Evaluator rerun failed because S1945 randomized different valid first-stage maps across browser targets | Keep deterministic per-target visual/crop checks and remove only the invalid cross-scene equality assumption for S1945 | done |

## Verification

| Gate | Result |
| --- | --- |
| Baseline inventory/suite | pass: 111 node IDs; 20 files / 111 tests |
| Red focused tests | expected fail: 5 failures exposed inactive catalog/manifest; 27 checks passed |
| Focused green | pass: catalog/controller/root-ROM/Vite checks, 4 files / 37 tests |
| Final inventory/full suite | pass: 20 files / 113 tests; net delta `+2`. Two obsolete exclusion IDs were replaced and four requirement IDs were added; no test files were deleted |
| Typecheck/build/package | pass: typecheck, build, ROM prepare/copy/hash smoke, desktop layout smoke |
| S1945 desktop/mobile runtime | pass: Chromium and iPhone-sized WebKit, 600+ frames, FBNeo 320x224 API output in a 224:320 stage, actual scored play, 8-way + Shot/Bomb `0/8` |
| Vertical graphics/layout | pass: coherent tiles/sprites; edge visibility 97.4%-99.3%; mobile 375x667 menu `14-54`, stage `64-433`, controls `443-653`, 44px service buttons, no overlap/interception |
| ROM cache reuse | pass on both targets: cold network request `1`, warm `0`, CacheStorage ROM entries `0` |
| Catalog-wide browser regression | pass: app smoke, all 9 games on desktop Chromium/mobile WebKit, and prep-failure recovery |
| Independent evaluator | GO: isolated combined-target rerun passed with desktop 87/mobile 76 color bins, edge visibility 86.6%-93.3%, cache reuse, focused 37/37, full 113/113, typecheck, build/package; no unresolved findings |
| Pages/live/cleanup | pending |

## Deletion Impact Note

No tracked test, documentation, or configuration file is planned for deletion. Generated build output, browser profiles/screenshots, temporary test inventories, and the dedicated worktree may be removed after release verification; rollback before release is deletion of this session branch/worktree without touching `main`.

## Progress Log

`CP0 | W1-W3 | delegated read-only owners + codex | in_progress | clean origin-based worktree; 111/111 baseline green; existing inactive config and ROM SHA located | establish red contract tests`

`CP1 | I1-I3 | codex | in_progress | focused contract suite failed in the expected 5 inactive catalog/manifest locations; ZIP entry/CRC checks green | activate existing config and manifest, then run FBNeo/UI evidence`

`CP2 | I1-I4 | codex | done | 113/113 tests, build/package, actual S1945 play, portrait canvas, controls, inputs, cache reuse, and all-game regression green | independent evaluator review`

`CP3 | I4 | evaluator + codex | in_progress | evaluator reproduced a nondeterministic cross-target histogram failure on two valid randomized stages | scope the visual oracle to deterministic per-target evidence and rerun`

`CP4 | I4 | evaluator + codex | done | clean combined reruns passed with independently different valid maps; all per-target visual, geometry, input, and cache gates green; evaluator GO | complete final catalog-wide rerun, then release I5`
