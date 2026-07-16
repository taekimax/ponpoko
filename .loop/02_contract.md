# Contract

## Objective

Implement and evaluate the Bubble Bobble two-player WebRTC screen-streaming PoC exactly within `docs/plans/2026-07-16_bubble-bobble-webrtc-streaming-poc.md`, with the tighter target constraints recorded in `.loop/00_request.md`: iPhone 15 Pro Safari/Home Screen, no Android work, no forced workaround for unavailable real-device evidence, and no `done` result without real direct and TURN proof.

## Current Gate

Status: `needs-clarification`.

W0 is not complete. Before implementation code, dependency, or infrastructure changes, the user must approve in one response:

1. signaling provider and HTTPS/WSS domain;
2. coturn provider, cost ceiling, and DNS/secret owner;
3. QR dependency addition or dependency-free policy; and
4. two physical iPhones plus exact iOS/Safari and Safari-tab/Home-Screen test assignments.

Approval must be recorded in `.loop/05_decisions.md`. Remote unavailability for machine permission prompts is not authorization to bypass this gate. D011 separately authorizes only committing the W0 documentation and setting `origin/2p-bubble` as upstream; it does not authorize implementation, rebase, merge, a `main` push, Pages deployment, infrastructure, DNS, secrets, or a paid resource.

## Scope

- Implement W1 through W12 in strict ascending order after W0 is `done`.
- Maintain EmulatorJS 4.2.3 and add only app-owned, Bubble-Bobble-scoped code.
- Host alone loads and runs the ROM/core/emulator; guest receives media and sends constrained P2 state.
- Use WebRTC for media and DataChannel for P2 input/control.
- Preserve current 1P saves, startup behavior, service worker, ROM delivery, and catalog when the feature flag is off.
- Keep external signaling/TURN outside GitHub Pages and within the approved provider/domain/cost/ownership choices.

## Out of Scope

- EmulatorJS 4.3.0-pre upgrade, guest ROM execution, lockstep/rollback, generalized multiplayer, or unrelated refactoring.
- Android implementation/testing.
- Production HA, account systems, public rooms, offline discovery, continuous background play, or host migration.
- Unapproved dependency/framework changes, external services, paid resources, DNS changes, secrets, schemas, or security redesign.
- Architecture changes made only to simulate or bypass unavailable actual-iPhone or TURN evidence.

## P1-P14 Acceptance Contract

W0 establishes and W11 evaluates the full contract; focused work ownership is listed below.

| ID | Focused work | Required acceptance evidence |
|---|---|---|
| P1 | W6 | Guest network/runtime audit shows zero ROM/core/loader requests, zero ROM cache access, and no `EJS_emulator`. |
| P2 | W2, W3, W6, W7, W12 | Host uses one app tap or at most one additional OpenAL fallback tap; guest uses exactly one app CTA; no transport settings are required. |
| P3 | W7 | QR, share link, and code resolve to one invite; five-minute expiry and one-time reuse rejection pass. |
| P4 | W2, W6, W7 | Camera/microphone permission prompt count is zero; guest video and audible game audio start from the CTA. |
| P5 | W2, W5, W6 | 30 fps video and non-silent audio meet first-media watchdog and direct/relay soak metrics. |
| P6 | W1, W5, W6 | P1 and P2 can press/release independently; guest can affect only P2 left/right/action1/action3. |
| P7 | W3, W5, W9 | W5 proves readiness/start-command semantics against a test double with the real runtime unbound. W9 installs the safety guards and becomes the sole real Coin/Start binding owner; actual pre-bind/pre-ready calls are zero and one idempotent start follows readiness. |
| P8 | W3, W4, W5 | Forced relay connects automatically without a user ICE/TURN choice. |
| P9 | W3, W4, W5, W8 | Short disconnect recovery and 60-second reload recovery meet the documented success/time criteria without rescanning QR. |
| P10 | W1, W3, W5, W8 | The 1.5-second lease and every channel/page/session termination path release all P2 input within two seconds, with zero stuck inputs. |
| P11 | W9 | 2P reads/writes no 1P autosave; all lifecycle save spies are zero and checksum remains identical. |
| P12 | W3, W4, W5, W7, W8 | Origin/auth/TTL/rate/size/role restrictions pass; secrets, tokens, SDP, ICE, credentials, fragments, and full IPs are absent from logs. |
| P13 | W10, W12 | Required aggregate stats and random diagnostic ID exist without personal or raw signaling data. |
| P14 | W9, W12 | Feature-flag-off local/browser/catalog tests, save fixture, runtime behavior, and service-worker behavior remain unchanged. |

## W0-W12 Completion Contract

| Work | Requirement mapping | Entry gate | Completion evidence |
|---|---|---|---|
| W0 | P1-P14 | `.loop/` initialized | Four open user approval groups recorded, branch disposition already recorded in D011, contract diff reviewed; status `done`. |
| W1 | P6, P10 | W0 `done` | Player-aware unit tests and P1/P2 simultaneous press/release smoke pass. |
| W2 | P2, P4, P5 | W1 `done`; W0-approved device matrix recorded | Local capture-spike harness/adapter and automated checks are implemented first. Closure additionally requires the actual post-ROM OpenAL context to produce changing audio level and tester-audible output, working video, and a host path of one tap or one fallback tap. API existence or track count alone is insufficient. |
| W3 | P2, P7, P8, P9, P10, P12 | W2 actual-iPhone Gate 1A passed | Protocol/reducer/reconnect/invalid/foreign-epoch/out-of-order tests pass. W3 must not start or be called complete before W2 passes. |
| W4 | P3, P8, P9, P12 | W3 `done`; provider/domain/cost/DNS/secret approvals active | Expiry, rate-limit, production-origin, auth redaction, and forced-relay integration pass. |
| W5 | P5, P6, P7, P8, P9, P10, P12 | W4 `done` | Two-browser host integration passes for media, safe P2, readiness, and start-command semantics using a Coin/Start test double only. The real game-runtime port remains unbound and actual Coin/Start call count is zero. |
| W6 | P1, P2, P4, P5, P6 | W5 `done` | Guest audit shows zero ROM/core/loader/cache/EJS access and WebKit playback/controls pass. |
| W7 | P2, P3, P4, P12 | W6 `done`; QR policy approved | QR/share/code success plus expiry, reuse, fragment removal, and permission-prompt tests pass. |
| W8 | P9, P10, P12 | W7 `done` | Fault injection, input lease, epoch reset, payload/rate limit, foreground, and ICE-restart matrix pass. |
| W9 | P7, P11, P14 | W8 `done`; real Coin/Start runtime still unbound | In one guarded initialization path, set `twoPlayerSessionMode` before `startGame()`, install startup-assist/autosave/lifecycle-save guards, then first bind the real runtime. Pre-bind and pre-ready actual Coin/Start calls are zero; post-readiness idempotent start occurs once; lifecycle saves are zero and the 1P checksum is identical. |
| W10 | P13 | W9 `done` | Required stats schema and sensitive-field redaction tests pass. |
| W11 | P1-P14 | W10 `done`; two approved actual iPhones and live TURN available | Direct 10, forced relay 10, disconnect/reload matrix, and both 20-minute soaks have complete artifacts and meet all Go thresholds. |
| W12 | P2, P13, P14 | W11 `done` | Pages/live checks, service-worker cache/update behavior, full flag-off regressions, health/TURN/redaction checks, and rollback check pass. |

### W2 implementation versus closure

- Physical-device execution is known to be unavailable during the development stage; this does not prohibit a bounded W2 implementation after W0 is `done` and W1 is `done`.
- Allowed W2 work is the minimal reproducible capture-spike harness, 4.2.3 capture adapter, one-time host audio fallback path, and local unit/build/browser checks required to execute the future device spike.
- The first physical W2 validation remains ROM load followed by creation of the real EmulatorJS OpenAL context, non-silent energy, and tester-audible guest output.
- Synthetic tones, mocked stats, desktop API presence, track count, or architectural substitution are not device evidence.
- If local W2 work is complete but the physical spike cannot run, the Evaluator assigns W2 `partial` or `blocked`, records the exact future execution procedure and missing evidence, and stops the pipeline before W3.

## Mandatory Safety Invariants

### Input ownership

- Active input state is keyed by `(player, input)`, never only by input.
- Local host input remains P1; all remote input is applied as `player=1` regardless of any network data.
- Guest outbound allowlist is exactly P2 full-state input, `ready`, `ping`, and `leave`.
- Guest payloads cannot create Coin, Start, role, player, or pause. Invalid payloads are rejected and P2 is neutralized; repeated violation closes the connection.
- Host outbound control allowlist is exactly session state, start acknowledgement, pause, end, and ping acknowledgement.
- Host `TwoPlayerSessionController` is the sole Coin/Start producer.

### Epoch, order, and lease

- Each authenticated guest connection receives a server-issued `connectionEpoch`.
- A newly authenticated epoch first neutralizes P2 and resets its sequence high-water mark to `-1`.
- Reject previous/unknown epochs and sequences not greater than the accepted high-water mark.
- Send full state immediately on change and every 250 ms; after 1.5 seconds without a valid update, release all P2 input.
- Use a reliable ordered `control` channel and an unordered `input` channel with `maxRetransmits: 0`.
- Limit input payloads to 256 bytes, four buttons, and an average of 60 messages/second; limit control payloads to 1 KB and 10 messages/second.
- DataChannel close, peer failure, page visibility loss, `pagehide`, menu/back, and session end also release all P2 input.

### Start and save isolation

- W5-W8 own readiness/start-command protocol behavior only. Their production Coin/Start runtime port remains unbound, and all W5 integration verification uses a test double.
- Before W9, actual 2P game-runtime Coin/Start calls are forbidden and must remain exactly zero.
- W9 is the single real-runtime binding owner. As one guarded initialization path, it sets `twoPlayerSessionMode` before `startGame()`, installs startup-assist, autosave, and lifecycle-save guards, and only then binds the real Coin/Start runtime port.
- In 2P mode, `startStartupAssist()` and `startAutosave()` are never started.
- Before guest-ready, actual runtime Coin/Start calls are exactly zero.
- Runtime-ready, video track, audio track, both DataChannels, and guest-ready are all required before W9 permits one idempotent host start sequence.
- Reconnect never re-runs automatic start.
- In 2P mode, autosave load/write and manual save/load are unavailable; `saveActiveAutosave()` is a guarded no-op.
- Save calls across `visibilitychange`, `pagehide`, `pageshow`, menu, back, reconnect, and session end are exactly zero.
- Existing 1P schema/key and fixture checksum are unchanged.

### Media and user activation

- Use the existing EmulatorJS 4.2.3 canvas/OpenAL runtime only.
- Capture a 512x448 staging canvas at 30 fps; guest plays a muted autoplay inline video directly.
- Connect the actual post-ROM OpenAL context to a media destination and verify non-silent energy plus human-audible game sound.
- If the initial host tap cannot unlock that later-created context, show `방 열고 소리 켜기` exactly once after runtime readiness; never claim connected audio while silent.
- Guest uses one `참가하고 소리 켜기` CTA to resume audio and start connection; request no camera or microphone permission.

### Infrastructure and data

- GitHub Pages hosts only the frontend. Approved HTTPS/WSS signaling and coturn are separate.
- Never embed long-lived TURN secrets or fixed TURN accounts in JavaScript.
- TURN credential TTL is five minutes or less; invite TTL is five minutes; reconnect grace is 60 seconds; session maximum is 60 minutes.
- Authenticate WSS with the first application frame, not a URL query; process no other message before authentication and close after three seconds unauthenticated.
- Remove invitation fragments immediately and redact tokens, SDP, ICE, TURN credentials, fragments, and full IPs from logs/analytics.

### W11 staging preparation and W12 entry

- W12 full entry requires W11 status `done`.
- A staging build, endpoint, or flag setup strictly necessary to collect W11 actual-device evidence may be performed only as an explicitly logged W11 staging-preparation activity after its own approval requirements are satisfied.
- Such preparation is not W12 entry or completion and cannot include production release, final public service-worker rollout, or a W12 success claim.

## Required Verification

### Every applicable local slice

```sh
npm run typecheck
npm test
npm run build
GAME_RUNTIME_SMOKE_GAME=bublbobl npm run games:smoke
```

### Regression gates

Run with the 2P feature flag off:

```sh
npm run browser:smoke
npm run games:smoke
```

The second command is deliberately unfiltered. If tests are added, removed, or renamed, capture the repository's applicable baseline and final test inventory and report the delta; do not delete tests to pass a gate.

### Actual-device gates

- W2 closure: actual iPhone ROM load, post-load OpenAL context, non-silent energy delta, human-audible guest output, muted `playsinline` video, and host one-tap/fallback-tap count. During development, preserve this as the future physical execution gate and report local harness results separately.
- Direct: 10 fresh rooms on the same primary iPhone pair; at least 9 first frames within 8 seconds and selected candidate pair is non-relay.
- Forced TURN: 10 fresh rooms; at least 9 first frames within 12 seconds and selected candidate pair includes `relay`.
- Soak: direct 20 minutes and forced relay 20 minutes; after 60-second warm-up average at least 28 fps, dropped frames under 5%, and no unrecovered freeze.
- Recovery: 20 independent forced disconnect input-release trials, 10 reconnect trials, and 10 reload recoveries; meet the planning document's time/success thresholds.
- Audio: both paths require inbound audio-energy change and a tester's audible-game-sound record, with zero permission prompts.
- Input/latency: P1/P2 combinations, direct ping RTT p95 at most 80 ms from at least 4,000 samples, and 40 high-speed-camera touch-to-display samples with p95 at most 200 ms.
- Record device model, exact iOS/Safari mode, path, timing, fps/drop, RTT, recovery, heat, and 20-minute battery change.

## Status and Completion Rules

Only these statuses are valid: `in_progress`, `done`, `partial`, `blocked`, `declined`, `needs-clarification`.

- No implementation starts until W0 is `done`.
- W1 must finish before local W2 implementation begins; W2 actual-iPhone Gate 1A must pass before W2 becomes `done` or W3 starts.
- A Generator implements but never self-grades final completion; an Evaluator checks this contract.
- Missing actual-iPhone or TURN evidence means the PoC cannot be `done`; use `partial` for a useful but incomplete result, or `blocked` when security/save/device feasibility prevents continuation.
- Any security or save-isolation failure makes the result `blocked` regardless of other metrics.
- Any unmet Go threshold makes the final result at most `partial` and requires the cause plus next experiment.
- Each slice report must list changed files, requirement IDs, exact verification run/results, and remaining risk.
- W2-W4 slice reports must additionally list consulted open-source projects/sources with URL and exact revision/version when available, state copied-code status (`yes` or `no`), and, if `yes`, record license compatibility, required attribution, and its applied location.
- The W2-W4 provenance report is evidence only. It does not authorize adding a dependency or copying code; separate W0/human approval and licensing review still apply.

## Technical Constraints

- Search existing code before creating types, config, schemas, clients, or utilities.
- Do not duplicate responsibilities or perform unrelated refactors/formatting.
- Add no dependency, framework, service, DNS, secret, or paid resource without the corresponding approval.
- Do not copy third-party code merely because its source was consulted; copied code requires explicit approval plus documented license and attribution handling.
- Keep every diff minimal and traceable to P#, W#, a verification need, or an approved decision.
- Update `.loop/04_progress.md` and append `.loop/06_log.md` after every meaningful slice.
- Do not rely on chat as project truth; record decisions and evidence in `.loop/`.
- Do not fake, emulate, or infer actual-iPhone/TURN success from desktop API presence.

## Evaluation Method

- Contract checklist and requirement/work traceability review.
- Targeted diff and duplicate-responsibility review.
- Typecheck, unit/integration tests, production build, Bubble Bobble runtime smoke, and both feature-flag-off smoke suites.
- W5 readiness/start-command integration against a test double, followed only in W9 by real-runtime binding/order verification.
- Actual-iPhone W2 Gate 1A, direct/forced-relay trials, recovery matrix, and soaks.
- Save checksum, lifecycle spies, guest request audit, service-worker behavior, redaction, and rollback checks.

## Restart Conditions

- The same implementation failure repeats more than twice without new evidence.
- Work starts out of W1 -> W2 -> W3 -> W4-W12 order.
- W3+ expands before the W2 actual-iPhone audio gate passes.
- Input/player, start ownership, save isolation, guest-lightweight, or feature-flag invariants are violated.
- W5-W8 bind/call the real Coin/Start runtime, or W9 binds it before setting 2P mode and installing every required guard.
- Full W12 work starts before W11 is `done`.
- The design starts requiring a 4.3.0-pre upgrade, broad refactor, speculative abstraction, or unapproved dependency/infrastructure.
- Rewriting the current slice is demonstrably smaller and safer than patching it.

## Human Review Required

- Any destructive file operation.
- Any dependency or framework change, including QR generation.
- Any third-party code copy or new license/attribution obligation.
- Any signaling/TURN provider, paid resource, domain, DNS, or secret operation.
- Any schema/database/auth/security change beyond the approved contract.
- Any broad architecture rewrite, irreversible migration, or work outside the requested scope.
