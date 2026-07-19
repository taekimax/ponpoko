# Contract

## Objective

Implement and evaluate the Bubble Bobble two-player WebRTC screen-streaming PoC exactly within `docs/plans/2026-07-16_bubble-bobble-webrtc-streaming-poc.md`, with the tighter target constraints recorded in `.loop/00_request.md`: iPhone 16 Pro Max plus iPhone 15 Pro Safari/Home Screen support, no Android work, no forced workaround for unavailable real-device evidence, and no `done` result without real direct and TURN proof.

## Current Gate

Status: W0 and W1 `done`; bounded local W2 implementation independently accepted and assigned `partial`. Initial system-Safari diagnostics produced black received video, and the first false-ready correction still rendered black on Phone A while honestly reporting `failed`. The WebGL-to-video-to-512x448 bridge then passed local checks and bounded same-page Safari runs on Phone A without fallback and on Phone B's iPhone 15 Pro Max/iOS 26.5.2 proxy after exactly one permitted `방 열고 소리 켜기` tap. D021's later A-to-B LAN runs proved moving cross-device receiver video, initial game audio, zero permission prompts, one guest CTA, and one host fallback. D022 preserved strict initial audible acquisition and added silence/loss labels, but its fresh physical run falsely classified a quiet waiting screen as `수신 출력 무음`. D023 replaces any-positive-energy mismatch with interval-normalized inbound RMS, improves receiver RMS precision, and keeps ambiguous statistics from revoking readiness; local verification and independent evaluation passed. No post-D023 physical run exists. W2 cannot become `done`, and W3 remains blocked, until actual-iPhone Gate 1A supplies correct post-correction natural-silence behavior plus the remaining approved secure-origin/Home Screen coverage.

The user's 2026-07-18 continuation instruction directs resolution of all four remaining W0 choices and progression only after evaluation. D013-D017 record:

1. Cloudflare Workers Free plus SQLite-backed Durable Objects at `https://ponpoko-2p.taekimax.workers.dev`, with WSS at `/v1/session`;
2. Cloudflare Realtime TURN, USD 0 monthly authorization, an 800 GB fail-closed issuance cutoff, no custom TURN DNS, and user-owned encrypted Worker secrets;
3. exact-pinned `uqr@0.1.3` when W7 begins, with no in-app scanner; and
4. the historical two-iPhone 15 Pro matrix later superseded by D019 for device inventory.

D019 fixes the current support pair to Phone A iPhone 16 Pro Max and Phone B iPhone 15 Pro, both on iOS 26.5.2. Build numbers may remain unconfirmed only for the 2026-07-19 practical compatibility diagnostic; formal evidence still requires Settings readback, an approved secure origin, Home Screen/Safari coverage, and actual Phone A-to-B playback/audibility. D021 later supersedes D019's swapped-role requirement for W2 only; D019's exact W11 product pair and direct/TURN matrix remain unchanged.

D020 keeps the iPhone 15 Pro as the product support target but accepts the tested iPhone 15 Pro Max as Phone B's practical proxy for W2 media-path compatibility and cross-device Gate 1A evidence. Exact-model repetition is not required unless a device-specific failure relevant to this path appears.

D021 authorizes and implements a temporary W2-only same-Wi-Fi LAN HTTP harness with Mac process-memory signaling for a sender-only Phone A host to a ROM/emulator-free receiver-only D020 Phone B proxy guest. It uses non-trickle local ICE with `iceServers: []`; process-lifetime nonreused signaling revisions; observed-revision offer compare-and-set with one bounded active-host conflict retry; revision-conditional deletion; a two-second ready lease with 500 ms guest heartbeat and false revocation; strict initial AV acquisition; monotonic video transport/content and audio RTP freshness; D023's interval-normalized packet/energy/output classification for post-acquisition natural silence; a fresh continuous two-second material-inbound-energy/receiver-output mismatch timer; immediate track/AudioContext revocation; async generation fencing; a five-second silent watchdog with one fallback; recovery from a residual answered generation; and structural guest pre-routing. The corrected implementation and readiness stabilization passed final independent evaluation. For this W2 objective the user explicitly waived the swapped orientation because no material role-relevant device difference is expected; revisit it only if a later device-specific issue appears. This does not authorize W3 protocol/product routing, Tailscale, a public tunnel, Pages, TURN, DNS, secrets, dependencies, or external infrastructure. LAN HTTP is not secure-context or Home Screen evidence. The physical A-to-B runs passed moving video and initial guest audio; D022 then failed on natural silence, while D023 remains locally accepted but physically unverified, so W2 stays `partial` and W3 blocked.

D023 keeps D022's strict acquisition and two-second RTP/output-loss boundaries but computes inbound interval RMS as `sqrt(ΔtotalAudioEnergy / ΔtotalSamplesDuration)` instead of treating every positive energy delta as material. Receiver output RMS uses float time-domain samples when available and a conservative byte-resolution fallback otherwise. Missing, non-finite, zero-duration, or reset energy statistics interrupt mismatch continuity and render only a recent-normal grace state; they do not bypass RTP, video, track, or AudioContext failure gates.

The independent Evaluator accepted these selections for local entry with no Critical, High, or Medium blocker. They do not assert that infrastructure or phones currently exist, do not authorize provisioning or dependency installation ahead of its slice, and do not replace W2/W4/W7/W11 entry evidence. D011 continues to prohibit a `main` push, Pages deployment, rebase, merge, DNS/secret mutation, or paid resource.

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
| W0 | P1-P14 | `.loop/` initialized | D013-D017 record the four selected targets and branch boundary; independent contract-diff evaluation passes; status `done`. |
| W1 | P6, P10 | W0 `done` | Player-aware unit tests and P1/P2 simultaneous press/release smoke pass. |
| W2 | P2, P4, P5 | W1 `done`; W0-approved device matrix recorded | Local capture-spike harness/adapter and automated checks are implemented first. Closure additionally requires the actual post-ROM OpenAL context to produce changing audio level and tester-audible output, working video, and a host path of one tap or one fallback tap. API existence or track count alone is insufficient. |
| W3 | P2, P7, P8, P9, P10, P12 | W2 actual-iPhone Gate 1A passed | Protocol/reducer/reconnect/invalid/foreign-epoch/out-of-order tests pass. W3 must not start or be called complete before W2 passes. |
| W4 | P3, P8, P9, P12 | W3 `done`; the D013-D014 Cloudflare account/domain/cost/secret prerequisites are live and reverified | Expiry, rate-limit, production-origin, auth redaction, credential-revocation, 800 GB cutoff, and forced-relay integration pass. |
| W5 | P5, P6, P7, P8, P9, P10, P12 | W4 `done` | Two-browser host integration passes for media, safe P2, readiness, and start-command semantics using a Coin/Start test double only. The real game-runtime port remains unbound and actual Coin/Start call count is zero. |
| W6 | P1, P2, P4, P5, P6 | W5 `done` | Guest audit shows zero ROM/core/loader/cache/EJS access and WebKit playback/controls pass. |
| W7 | P2, P3, P4, P12 | W6 `done`; QR policy approved | QR/share/code success plus expiry, reuse, fragment removal, and permission-prompt tests pass. |
| W8 | P9, P10, P12 | W7 `done` | Fault injection, input lease, epoch reset, payload/rate limit, foreground, and ICE-restart matrix pass. |
| W9 | P7, P11, P14 | W8 `done`; real Coin/Start runtime still unbound | In one guarded initialization path, set `twoPlayerSessionMode` before `startGame()`, install startup-assist/autosave/lifecycle-save guards, then first bind the real runtime. Pre-bind and pre-ready actual Coin/Start calls are zero; post-readiness idempotent start occurs once; lifecycle saves are zero and the 1P checksum is identical. |
| W10 | P13 | W9 `done` | Required stats schema and sensitive-field redaction tests pass. |
| W11 | P1-P14 | W10 `done`; two approved actual iPhones and live TURN available | Direct 10, forced relay 10, disconnect/reload matrix, and both 20-minute soaks have complete artifacts and meet all Go thresholds. |
| W12 | P2, P13, P14 | W11 `done` | Pages/live checks, service-worker cache/update behavior, full flag-off regressions, health/TURN/redaction checks, and rollback check pass. |

### W2 implementation versus closure

- Physical-device execution was unavailable during the initial development stage; this did not prohibit a bounded W2 implementation after W0 and W1 became `done`.
- Allowed W2 work is the minimal reproducible capture-spike harness, 4.2.3 capture adapter, one-time host audio fallback path, and local unit/build/browser checks required to execute the future device spike.
- A practical direct-LAN HTTP same-page Safari diagnostic later confirmed query/build access, no permission prompts, live tracks/contexts, rising counters, and same-device audible audio, but both received previews were black. This is failed compatibility evidence, not Gate 1A proof.
- After the display-buffer bridge and WebKit play-race correction, Phone A passed the same-page visual check without fallback and the D020-accepted iPhone 15 Pro Max Phone B proxy passed after one fallback tap. This completes the practical per-device Safari compatibility question; no run isolated receiver-only audio or sent media between devices.
- D021's two physical A-to-B LAN runs sent moving video between devices and initially produced guest-observed game audio with no permission prompt. In the final run, a later quiet interval made the prior continuous-RMS gate revoke readiness. The user subsequently clarified that this game legitimately has silent waiting and intermittent quiet play intervals, while the old panel did not show whether RTP packets and inbound energy continued. Treat that interval as inconclusive, not as failed receiver audio and not as Gate 1A closure. No recording file was transferred into the workspace.
- Synthetic tones, mocked stats, desktop API presence, track count, LAN HTTP behavior, or architectural substitution are not secure cross-device evidence.
- W2 evidence still requires the real EmulatorJS OpenAL context, non-silent energy, working Phone B guest video, tester-audible guest output, and approved secure-origin/Home Screen coverage using the D019 targets or D020's accepted proxy. D021 waives only the swapped-orientation repeat for this W2 objective; the A-host-to-B-guest direction remains required, and the waiver must be revisited if a device-specific issue appears.
- Until those fields pass, the Evaluator keeps W2 `partial` or `blocked`, records the exact future execution procedure and missing evidence, and stops the pipeline before W3.

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

- GitHub Pages hosts only the frontend. Approved Cloudflare Workers/Durable Objects signaling and Cloudflare Realtime TURN are separate.
- Never embed long-lived TURN secrets or fixed TURN accounts in JavaScript.
- TURN credential TTL is five minutes or less; invite TTL is five minutes; reconnect grace is 60 seconds; session maximum is 60 minutes.
- Do not return the provider's port-53 ICE URLs to browsers. Do not authorize Workers Paid or Realtime overage; stop credential issuance at 800 GB of account-period Realtime egress and fail closed if the free allowance or pricing changes.
- Keep `CF_TURN_KEY_ID` and `CF_TURN_API_TOKEN` only as encrypted Worker secrets owned by the user/operator; generate participant credentials server-side and revoke them on close, leave, expiry, or security shutdown.
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

- W2 closure: D019's mixed-iPhone pair or the D020-accepted iPhone 15 Pro Max Phone B proxy, with Settings build/Safari-mode inventory, approved secure origin, ROM load, post-load OpenAL context, non-silent energy delta, human-audible Phone A-host-to-Phone B-guest output, muted `playsinline` video, and host one-tap/fallback-tap count. D021 waives the swapped orientation for W2 only unless a device-specific issue appears; it does not waive secure-origin or Home Screen evidence. Report LAN HTTP and same-page harness results separately.
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
- Any signaling/TURN account or service provisioning, paid resource, domain, DNS, or secret operation, including the D013-D014 targets.
- Any schema/database/auth/security change beyond the approved contract.
- Any broad architecture rewrite, irreversible migration, or work outside the requested scope.
