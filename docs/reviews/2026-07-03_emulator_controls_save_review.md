# 2026-07-03 Emulator Controls and Autosave Review

## Mission

Ship three user-visible fixes: desktop Chrome should show keyboard-first controls with assigned special keys, Bubble Bobble should enter gameplay without an EmulatorJS/MAME setup screen on iPhone, and every game should restore the latest autosaved emulator state after the browser closes and returns.

## Constraints and Assumptions

- Keep Ponpoko's working iPhone path intact, including its static start-state fallback.
- Do not re-enable EmulatorJS IndexedDB caches; autosave uses an app-owned store after runtime startup.
- Use one-minute autosave cadence and best-effort saves on hidden/pagehide/menu transitions.
- Keep mobile touch controls as the iPhone path; desktop Chrome gets keyboard controls instead of the mobile control panel.
- No tests, docs, or config files are deleted.

## Success Criteria

- Desktop Chrome media query shows a keyboard control panel with movement, action, coin, OK, and play/start keys, while hiding mobile touch controls.
- App keyboard routing sends coin and start/play inputs and sends OK as the MAME left/right acknowledgement sequence.
- Bubble Bobble receives the MAME warning acknowledgement before controls/startup assist enable, then receives coin/start startup assist.
- Runtime adapter can capture and load state bytes; app restores a saved state before normal startup assist and autosaves every 60 seconds while playing.
- `npm test`, `npm run typecheck`, `npm run build`, and relevant smoke checks pass or blockers are recorded.

## MVP Plan

| P# | title | priority | scope_in | scope_out | acceptance_check | risk | owner_candidate | status | handoff | handoff_payload |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | Desktop keyboard controls | must-ship | Keyboard bindings, desktop-only hint panel, desktop smoke assertion | Full UI redesign | `npm test -- tests/input-router.test.ts tests/controllers.test.ts` plus desktop smoke | medium | codex | done | P1->W1 | source_id=P1,target_owner=codex,affected_files=src/input.ts src/controllers.ts src/main.ts src/styles.css tests scripts,reason=desktop control behavior,required_action=implemented and verified |
| P2 | MAME startup acknowledgement | must-ship | Pre-control OK acknowledgement for MAME games, preserve Ponpoko reload | New ROM/state assets | `npm test -- tests/startup-assist.test.ts tests/emulator.test.ts` plus game smoke | high | codex | done | P2->W2 | source_id=P2,target_owner=codex,affected_files=src/main.ts src/input.ts tests scripts,reason=Bubble Bobble iPhone load screen,required_action=implemented and verified |
| P3 | Per-game autosave | must-ship | App-owned IndexedDB autosave, restore before startup assist, one-minute interval | Cloud sync or multiple slots | `npm test -- tests/native-emulator.test.ts tests/emulator.test.ts tests/state-storage.test.ts` plus build | high | codex | done | P3->W3 | source_id=P3,target_owner=codex,affected_files=src/native-emulator.ts src/emulator.ts src/state-storage.ts src/main.ts tests,reason=persist game progress,required_action=implemented and verified |

## Work Ledger

| W# | owner | status | changed_paths | verify_cmd | verify_result | handoff | handoff_payload |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W1 | codex | done | src/input.ts src/controllers.ts src/main.ts src/styles.css tests/input-router.test.ts tests/controllers.test.ts scripts/browser-smoke.mjs scripts/desktop-layout-smoke.mjs | `npm test -- tests/input-router.test.ts tests/controllers.test.ts && npm run desktop:smoke` | pass: focused tests included in 5-file targeted run; desktop smoke passed | none | none |
| W2 | codex | done | src/main.ts src/input.ts src/emulator.ts tests/emulator.test.ts scripts/game-runtime-smoke.mjs | `npm test -- tests/startup-assist.test.ts tests/emulator.test.ts && npm run games:smoke` | pass: game runtime smoke passed after selector fix F1 | none | none |
| W3 | codex | done | src/native-emulator.ts src/emulator.ts src/state-storage.ts src/main.ts tests/native-emulator.test.ts tests/emulator.test.ts tests/state-storage.test.ts | `npm test -- tests/native-emulator.test.ts tests/emulator.test.ts tests/state-storage.test.ts && npm run build` | pass: state adapter/storage tests, typecheck, and build passed | none | none |

## Implementation Ledger

| I# | source_ids | owner | status | changed_paths | verify_cmd | verify_result | handoff | handoff_payload |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| I1 | P1 | codex | done | src/input.ts src/controllers.ts src/main.ts src/styles.css tests/input-router.test.ts tests/controllers.test.ts scripts/browser-smoke.mjs scripts/desktop-layout-smoke.mjs | `npm test -- tests/input-router.test.ts tests/controllers.test.ts` | pass in targeted run | none | none |
| I2 | P2 | codex | done | src/main.ts src/input.ts src/emulator.ts tests/emulator.test.ts scripts/game-runtime-smoke.mjs | `npm test -- tests/startup-assist.test.ts tests/emulator.test.ts` | pass in full suite; `games:smoke` pass | none | none |
| I3 | P3 | codex | done | src/native-emulator.ts src/emulator.ts src/state-storage.ts src/main.ts tests/native-emulator.test.ts tests/emulator.test.ts tests/state-storage.test.ts | `npm test -- tests/native-emulator.test.ts tests/emulator.test.ts tests/state-storage.test.ts` | pass in targeted run | none | none |

## Live Ledger

| checkpoint | W# | owner | status | elapsed | delta_since_last | next_action |
| --- | --- | --- | --- | --- | --- | --- |
| CP0 | W1 | codex | in_progress | 0m | current touch-first desktop layout and keyboard mismatch inspected | implement keyboard scheme |
| CP0 | W2 | codex | in_progress | 0m | Bubble/Super Pang skip Ponpoko prep and only use coin/start assist today | add shared MAME acknowledgement |
| CP0 | W3 | codex | in_progress | 0m | EmulatorJS exposes `gameManager.getState()`/`loadState()` | add adapter and app-owned storage |
| CP1 | W1 | codex | done | 35m | desktop keyboard routing, hints, topbar key labels, and desktop smoke assertions added | final gates |
| CP1 | W2 | codex | done | 40m | MAME warning acknowledgement moved into shared runtime prep before controls/startup assist | final gates |
| CP1 | W3 | codex | done | 45m | app-owned IndexedDB autosave, adapter state methods, restore-before-assist, and one-minute save loop added | final gates |

## Failure Groups

| F# | signature | failing_command | root_cause | changed_paths | rerun_result | status |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | `locator.waitFor strict mode violation: getByText('보글보글') resolved to 2 elements` | `npm run games:smoke` | Smoke waited on global game-title text; menu intro and game card both matched before the active topbar was scoped | scripts/game-runtime-smoke.mjs | `npm run games:smoke` pass | done |

## Verification Log

- `npm test -- tests/input-router.test.ts tests/controllers.test.ts tests/emulator.test.ts tests/native-emulator.test.ts tests/state-storage.test.ts`: pass, 5 files / 25 tests.
- `npm run typecheck`: pass.
- `npm test -- tests/state-storage.test.ts`: pass, 1 file / 2 tests.
- `npm test`: pass, 15 files / 56 tests.
- `npm run build`: pass, Vite production build and root ROM copy completed.
- `npm run desktop:smoke`: pass, desktop Chrome showed keyboard controls and hid mobile controls.
- `npm run games:smoke`: initial selector failure F1, then pass after scoped topbar selector.
- `npm run smoke`: pass, build paths, ROM hashes, EmulatorJS assets, and start states available.
- `npm run browser:smoke`: pass, Ponpoko WebKit path, Bubble/Super Pang runtime path, and Ponpoko prep-failure path all passed.
- Doc consistency check: pass, referenced scripts, paths, and ledger IDs exist.
- Test inventory note: no tests were deleted or renamed; final Vitest inventory is 15 files / 56 tests.
- Deletion Impact Note: no tests, docs, or config files were deleted.

## Closure Matrix

| CM# | scenario | criteria | outcome | action |
| --- | --- | --- | --- | --- |
| CM1 | all-green | all planned W# terminal and final gates pass | done | no action |
| CM2 | env-blocked | verification blocked by local environment | none | no action |
| CM3 | decision-blocked | unresolved product decision | none | no action |
| CM4 | stuck-recycled | worker stalled and recycled | none | no action |
| CM5 | no-findings | no actionable findings | not applicable | no action |
| CM6 | partial-delivery | deferred medium/low scope | none | no action |
| CM7 | coverage-regressed | test inventory drops beyond threshold | no regression; tests added only | no action |

## Deletion Impact Note

No tests, docs, or config files are targeted for deletion.
