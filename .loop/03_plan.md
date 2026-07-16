# Plan

## Sprint Goal

Move the Bubble Bobble two-player WebRTC PoC from planning `done` to a locally and physically evaluated implementation while preserving the W0 approval gate, strict W1 -> W2 -> W3 sequence, W2 actual-iPhone audio gate, and honest `partial`/`blocked` closure when required evidence is unavailable.

## Current Gate

- W0 status: `needs-clarification`.
- Implementation code changes: prohibited until W0 becomes `done`.
- Next action: after the docs-only remote handoff, obtain the four still-open approval groups in `.loop/00_request.md` in one user response and record them in `.loop/05_decisions.md`.

## P1-P14 to W0-W12 Traceability

| Requirement | Planned work |
|---|---|
| P1 | W0, W6, W11 |
| P2 | W0, W2, W3, W6, W7, W11, W12 |
| P3 | W0, W4, W7, W11 |
| P4 | W0, W2, W6, W7, W11 |
| P5 | W0, W2, W5, W6, W11 |
| P6 | W0, W1, W5, W6, W11 |
| P7 | W0, W3, W5, W9, W11 |
| P8 | W0, W3, W4, W5, W11 |
| P9 | W0, W3, W4, W5, W8, W11 |
| P10 | W0, W1, W3, W5, W8, W11 |
| P11 | W0, W9, W11 |
| P12 | W0, W3, W4, W5, W7, W8, W11 |
| P13 | W0, W10, W11, W12 |
| P14 | W0, W9, W11, W12 |

## Work Items

| Work | Source requirements | Task and output | Verify before closure |
|---|---|---|---|
| W0 | P1-P14 | Synchronize `.loop/`; publish the authorized docs-only `2p-bubble` handoff while keeping `main` untouched; obtain signaling provider/domain, coturn provider/cost/DNS-secret owner, QR dependency, and two-iPhone iOS/Safari approvals. | Branch record plus four open approvals and contract diff; no code/dependency/infra/main change. |
| W1 | P6, P10 | Extend only the existing input boundary to accept player identity and key active state by `(player,input)`. Preserve P1 behavior and force future remote application to P2. | Unit tests plus simultaneous P1/P2 press/release runtime smoke; required local commands. |
| W2 | P2, P4, P5 | Because physical execution is unavailable during development, implement only the smallest reproducible capture-spike harness and 4.2.3 `StreamCaptureAdapter` for 30 fps staging-canvas video and OpenAL media audio. Add one-time `방 열고 소리 켜기` only if the original host activation cannot unlock the later context. The first later physical validation remains the actual-iPhone spike. | Local harness/adapter tests and commands are progress evidence; W2 closure additionally requires actual post-ROM OpenAL energy change, audible guest sound, video playback, zero permission prompts, and tap counts. |
| W3 | P2, P7, P8, P9, P10, P12 | Define typed protocol and state reducer: role/direction allowlists, `connectionEpoch`, sequence high-water mark, idempotent readiness/start acknowledgements, payload/rate bounds, reconnect states. | Reducer, invalid direction/message, foreign/stale epoch, out-of-order, duplicate, and reconnect unit tests. |
| W4 | P3, P8, P9, P12 | Implement the approved minimal room/join/ICE/WSS/delete/health signaling contract and approved coturn REST credentials outside Pages. | Five-minute expiry, one-time invite, rate limits, production-origin allowlist, auth-first WSS, log redaction, forced-relay integration. |
| W5 | P5, P6, P7, P8, P9, P10, P12 | Implement host `PeerSession`, media senders, two DataChannels, P2 application, and the readiness/start-command contract. Keep the real game-runtime Coin/Start port unbound through W8. | Two-browser integration with a Coin/Start test double only; actual runtime Coin/Start calls remain zero; safe player/allowlist/lease, first-media watchdog, local commands. |
| W6 | P1, P2, P4, P5, P6 | Implement guest-only route/viewer, muted inline video, resumed audio graph, P2 controls, and single CTA. | Request/runtime audit proves ROM/core/loader/cache/EJS zero; WebKit playback and control integration. |
| W7 | P2, P3, P4, P12 | Implement the approved QR approach, native share link, manual code, invite exchange, fragment removal, and invitation UI. | All three paths, expiry/reuse, second guest, fragment/redaction, permission-prompt and tap-count tests. |
| W8 | P9, P10, P12 | Add full-state heartbeat, 1.5-second neutral lease, epoch reset, bounded ICE restart/recreation, reload grace, and foreground recovery. | Fault-injection and payload/rate-limit matrix, lifecycle releases, reconnect/reload tests. |
| W9 | P7, P11, P14 | As the single real-runtime binding owner, atomically set `twoPlayerSessionMode` before `startGame()`, install startup-assist/autosave/lifecycle-save guards, then first bind Coin/Start; start once only after readiness and hide save/load. | Pre-bind and guest-ready pre-start actual-runtime spies zero; binding order proven; lifecycle save spies zero; real start once; before/after 1P checksum; flag-off checks. |
| W10 | P13 | Add development-only summarized stats, diagnostic ID, and redacted event records. | Stats schema and redaction tests; no raw reports or sensitive identifiers. |
| W11 | P1-P14 | Execute and archive the approved actual-device direct/relay, disconnect/reload, input, audio, performance, heat/battery, and soak matrix. If evidence collection needs staging setup, keep it limited, separately logged, and owned by W11. | Every quantitative criterion in `.loop/02_contract.md`; artifact table has no missing fields; status `done` before W12 full entry. |
| W12 | P2, P13, P14 | Only after W11 is `done`, deploy behind the feature flag, update service-worker cache version as needed, verify old-shell invite handling, CI/Pages health, rollback, and complete flag-off regressions. | All local commands; flag-off browser and unfiltered games smoke; live QR/direct/relay; signaling health, TURN allocation, redaction, rollback. |

## Execution Order and Concrete Gates

1. W0 approval and contract lock -> Verify: D011 records branch disposition, all four remaining approval groups are recorded, and W0 is `done`.
2. W1 player-aware input -> Verify: independent P1/P2 press/release plus local test/build/runtime commands pass.
3. W2 local spike harness/adapter -> Verify: focused tests and applicable local commands pass, and the future physical procedure is reproducible. Do not treat synthetic/desktop evidence as device proof.
4. W2 actual-iPhone Gate 1A -> Verify: real post-ROM OpenAL track is non-silent and audible, video plays, and the host needs no more than one fallback tap. If execution is unavailable or fails, close current progress as `partial` or `blocked` and do not start W3.
5. W3 protocol/state machine -> Verify: invalid, stale, duplicate, reconnect, and order tests pass.
6. W4 signaling/TURN -> Verify: approved deployed service passes security and forced-relay integration.
7. W5 host peer/readiness contract -> Verify: media/data and safe P2 two-browser integration passes against a Coin/Start test double; real runtime remains unbound and its call count is zero.
8. W6 guest viewer -> Verify: ROM/core/loader/cache/EJS requests are zero and WebKit playback works.
9. W7 invitation UX -> Verify: QR/share/code, expiry, reuse, fragment, and tap metrics pass.
10. W8 lifecycle/recovery -> Verify: lease, neutralization, fault, reload, and foreground matrix passes.
11. W9 guarded real-runtime binding/start/save isolation -> Verify: mode and all guards precede the first real bind, pre-bind/pre-ready actual start calls and lifecycle saves are zero, one post-ready start occurs, and checksum matches.
12. W10 diagnostics -> Verify: required metrics and redaction tests pass.
13. W11 actual-device matrix -> Verify: direct 10, relay 10, recovery trials, and both soaks meet Go thresholds.
14. Only after W11 is `done`, W12 deploy/regression/rollback -> Verify: live health plus all flag-off/browser/catalog/service-worker checks pass.

## Slice Workflow

For each W# after W0:

1. Generator searches existing responsibility and implements only that row.
2. Generator runs the row's focused checks and the applicable required local commands.
3. Generator updates `.loop/04_progress.md` and appends `.loop/06_log.md` with changed files, P#/W# mapping, exact results, and remaining risk.
   For W2-W4, also record consulted OSS/source URLs and revision/version, copied-code `yes`/`no`, and any license/attribution disposition. This is not permission to add a dependency or copy code.
4. Evaluator reviews the diff against `.loop/02_contract.md`; only the Evaluator assigns slice closure.
5. Advance only after the prior slice is `done`, except that an honest terminal `partial` or `blocked` ends the current effort.

## Dependencies

- W0: explicit user choices for provider/domain/cost/ownership/dependency/device matrix; `2p-bubble` handoff disposition is already recorded in D011.
- W2 closure and W11: two actual iPhones with the approved iOS/Safari tab/Home Screen combinations and a tester able to confirm audible sound. Local W2 harness/adapter implementation does not depend on immediate device access.
- W4 onward: approved and reachable signaling/TURN services plus safe secret/DNS handling.
- W11: forced-relay capability, stable test networks, diagnostic artifacts, and any narrowly approved staging preparation needed only to gather evidence.
- W12: W11 status `done`, then Pages/CI/release and rollback access.

## Risks

- Actual post-ROM OpenAL capture may remain silent on iOS despite API/track presence; W2 is an early closure/stop gate.
- Remote development prevents physical execution and OS interaction. Implement the minimal future test harness, but do not bypass the gate or substitute desktop evidence.
- TURN cost or ownership may remain unapproved; keep status `needs-clarification` and do not provision.
- A remote input or save-isolation defect is safety-critical and makes the result `blocked`.
- Service-worker cache drift can make a correct deployment appear stale; validate fresh and old-shell paths without disturbing 1P behavior.
- Branch context differs from the original request: work remains on `2p-bubble` with `origin/2p-bubble` as the handoff target. Do not merge or push to `main` without a later verified release decision.

## Limited W11 Staging Preparation

- When W11 evidence cannot be collected without a staging build, endpoint, or flag setup, define and approve that preparation as a bounded W11 sub-activity.
- Do not call it W12, do not perform production completion or final public service-worker rollout, and do not claim W12 entry or success.
- W12 full work begins only after the Evaluator assigns W11 `done`.

## Deferred Items

- EmulatorJS 4.3.0-pre adoption.
- Android Chrome comparison.
- 60 fps experiment.
- Multiplayer generalization, background-play guarantees, host migration, public rooms, accounts, and production scaling.
- Any refactor not required by a specific P#/W#.
