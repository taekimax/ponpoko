# 2026-07-03 Bubble Bobble / Super Pang Review

## Mission

Make Bubble Bobble and Super Pang run from their own game-specific emulator configuration, interface text, and boot behavior while preserving Ponpoko behavior. Shared runtime, input, layout, and asset utilities should remain common.

## Constraints

- Do not modify Ponpoko gameplay semantics or the existing Ponpoko start-state flow.
- Keep shared code only for common concerns: catalog lookup, ROM path resolution, EmulatorJS shell defaults, input routing, boot overlay, and layout scaffolding.
- Keep game-specific concerns outside shared runtime branches where practical: ROM identity, title/copy, control profile, startup assist, start-state behavior, and debug resource expectations.
- Push to `main` and let GitHub Pages deploy from the existing workflow.
- Report completion through Hermes default/Telegram if available.

## Success Criteria

- `ponpoko`, `bublbobl1`, and `spangj` catalog entries resolve to the existing local ROM files.
- `configureEmulator()` applies shared defaults plus per-game settings without hardcoded non-shared branches for Bubble Bobble/Super Pang.
- Ponpoko still configures `/ponpoko/states/ponpoko-start.state?v=20260701` and keeps no gameplay startup assist.
- Bubble Bobble and Super Pang configure no Ponpoko state and receive the expected control/startup profiles.
- Build/test/smoke checks pass, then commit, push, and confirm GitHub Pages workflow/deployment.

## MVP Plan

| P# | title | priority | scope_in | scope_out | acceptance_check | risk | owner_candidate | status | handoff | handoff_payload |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | Shared/game-specific config boundary | must-ship | Add a typed per-game config layer consumed by EmulatorJS/startup paths | Native runtime implementation | `npm test -- tests/emulator.test.ts tests/startup-assist.test.ts` | medium | codex | done | P1->W1 | source_id=P1,target_owner=codex,affected_files=src/catalog.ts src/emulator.ts src/startup-assist.ts src/games,reason=define architecture boundary,required_action=extracted shared defaults and per-game settings |
| P2 | Bubble Bobble runtime path | must-ship | Fix Bubble Bobble ROM identity and verify no Ponpoko state leakage | New visual redesign | `npm test -- tests/catalog.test.ts tests/emulator.test.ts` | high | subagent-bubble | done | P2->W2 | source_id=P2,target_owner=subagent-bubble,affected_files=src/games/bubble-bobble.ts tests/game-config-bubble.test.ts,reason=game-specific config/controls,required_action=completed |
| P3 | Super Pang runtime path | must-ship | Fix Super Pang ROM identity and verify no Ponpoko state leakage | Alternate Pang romsets | `npm test -- tests/catalog.test.ts tests/emulator.test.ts tests/startup-assist.test.ts` | high | subagent-pang | done | P3->W3 | source_id=P3,target_owner=subagent-pang,affected_files=src/games/super-pang.ts tests/game-config-super-pang.test.ts,reason=game-specific config/controls,required_action=completed |
| P4 | Integration, deploy, report | must-ship | Run final gates, commit, push, confirm Pages deployment, send Telegram report | Manual iPhone retest beyond local automation | `npm test && npm run typecheck && npm run build && npm run smoke` plus GitHub deployment check | medium | codex | in_progress | P4->W4 | source_id=P4,target_owner=codex,affected_files=docs/reviews/2026-07-03_bubble_pang_review.md scripts/game-runtime-smoke.mjs package.json,reason=closure,required_action=verify and publish |

## Work Ledger

| W# | owner | status | changed_paths | verify_cmd | verify_result | handoff | handoff_payload |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W1 | codex | done | src/catalog.ts src/emulator.ts src/startup-assist.ts src/games/shared.ts src/games/ponpoko.ts src/games/index.ts | `npm test -- tests/emulator.test.ts tests/startup-assist.test.ts tests/catalog.test.ts` | pass: 3 files, 16 tests | none | none |
| W2 | subagent-bubble | done | src/games/bubble-bobble.ts tests/game-config-bubble.test.ts | `npm test -- tests/game-config-bubble.test.ts tests/catalog.test.ts tests/emulator.test.ts` | pass: 3 files, 17 tests | none | none |
| W3 | subagent-pang | done | src/games/super-pang.ts tests/game-config-super-pang.test.ts | `npm test -- tests/game-config-super-pang.test.ts tests/catalog.test.ts tests/emulator.test.ts tests/startup-assist.test.ts` | pass: 4 files, 19 tests | none | none |
| W4 | codex | in_progress | package.json scripts/game-runtime-smoke.mjs docs/reviews/2026-07-03_bubble_pang_review.md | final verification gates | pass locally; deploy pending | none | none |

## Implementation Ledger

| I# | source_ids | owner | status | changed_paths | verify_cmd | verify_result | handoff | handoff_payload |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| I1 | P1 | codex | done | src/catalog.ts src/emulator.ts src/startup-assist.ts src/games/shared.ts src/games/ponpoko.ts src/games/index.ts | `npm test -- tests/emulator.test.ts tests/startup-assist.test.ts tests/catalog.test.ts` | pass | none | none |
| I2 | P2 | subagent-bubble | done | src/games/bubble-bobble.ts tests/game-config-bubble.test.ts | `npm test -- tests/game-config-bubble.test.ts tests/catalog.test.ts tests/emulator.test.ts` | pass | none | none |
| I3 | P3 | subagent-pang | done | src/games/super-pang.ts tests/game-config-super-pang.test.ts | `npm test -- tests/game-config-super-pang.test.ts tests/catalog.test.ts tests/emulator.test.ts tests/startup-assist.test.ts` | pass | none | none |
| I4 | P4 | codex | in_progress | package.json scripts/game-runtime-smoke.mjs docs/reviews/2026-07-03_bubble_pang_review.md | final verification gates | pass locally; deploy pending | none | none |

## Live Ledger

| checkpoint | W# | owner | status | elapsed | delta_since_last | next_action |
| --- | --- | --- | --- | --- | --- | --- |
| CP0 | W1 | codex | in_progress | 0m | repo structure inspected; shared/per-game boundary selected | implement common config |
| CP0 | W2 | subagent-bubble | in_progress | 0m | assigned Bubble Bobble-only patch scope | spawn worker |
| CP0 | W3 | subagent-pang | in_progress | 0m | assigned Super Pang-only patch scope | spawn worker |
| CP0 | W4 | codex | pending | 0m | final gate defined | wait for implementation |
| CP1 | W1 | codex | done | 8m | shared `src/games` architecture added; EmulatorJS config/debug/startup now read from game entries | run integration gates |
| CP1 | W2 | subagent-bubble | done | 9m | Bubble Bobble config test added and verified | integrate |
| CP1 | W3 | subagent-pang | done | 9m | Super Pang config test added and verified | integrate |
| CP1 | W4 | codex | in_progress | 18m | `games:smoke` added; unit/type/build/static/browser/runtime smoke passed locally | commit and deploy |

## Refactor Invariants

| S# | invariant | owner | status | changed_paths | lock_check_cmd | lock_check_result | verify_cmd | verify_result | handoff | handoff_payload |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | Ponpoko keeps id `ponpoko`, ROM `ponpoko.zip`, start state URL, bottom controls, and no gameplay startup assist | codex | done | src/games/ponpoko.ts src/emulator.ts src/startup-assist.ts | `npm test -- tests/catalog.test.ts tests/emulator.test.ts tests/startup-assist.test.ts` | pass | `npm run browser:smoke` | pass | none | none |

## Verification Log

- Baseline test inventory before new game-config tests: `npm test` reported 10 files / 39 tests.
- Final test inventory after additions: `npm test` reported 12 files / 45 tests. Delta: +2 files / +6 tests.
- `npm test`: pass, 12 files / 45 tests.
- `npm run typecheck`: pass.
- `npm run build`: pass, Vite production bundle created under `dist/`.
- `npm run smoke`: pass, build paths, external ROM files, local EmulatorJS assets, and start states available.
- `npm run games:smoke`: pass, Bubble Bobble and Super Pang boot in WebKit, render frames, and accept mapped inputs.
- `npm run browser:smoke`: pass, Ponpoko WebKit ROM fetch, active gameplay, keyboard/touch input, overlay hit tests, no scroll, and menu disposal verified.
- `npm run desktop:smoke`: pass, desktop stage/canvas aspect and controls layout verified.
- Doc consistency check: pass, referenced source/test/script/review paths and npm scripts exist.
- Deletion Impact Note: no tests, docs, or config files were deleted.

## Closure Matrix

| CM# | scenario | criteria | outcome | action |
| --- | --- | --- | --- | --- |
| CM1 | all-green | all planned W# terminal and final gates pass | local pass; deployment pending | commit, push, confirm Pages |
| CM2 | env-blocked | external deployment or notification tooling unavailable | pending | record exact blocker if GitHub/Hermes fail |
| CM3 | decision-blocked | user decision required | none | continue |
| CM4 | stuck-recycled | worker stalls past policy | none | no action |
| CM5 | no-findings | no actionable issues found | not applicable | no action |
| CM6 | partial-delivery | medium/low backlog deferred | none | no action |
| CM7 | coverage-regressed | test inventory drops beyond allowed threshold | no regression; +6 tests | no action |
