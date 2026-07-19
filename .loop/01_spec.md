# Specification

## Objective

Build a Bubble Bobble-only WebRTC streaming PoC in which one iPhone host runs the existing EmulatorJS 4.2.3 game and one iPhone guest receives video/audio and sends only safe P2 input. Preserve all current 1P, save, service-worker, and catalog behavior behind a feature flag.

Planning status: `done`.

Implementation-entry status: W0 and W1 `done`; bounded local W2 implementation independently accepted and closed `partial`. Initial system-Safari diagnostics and a first-correction Phone A retry rendered black. The subsequent display-buffer bridge passed bounded same-page Safari compatibility runs on Phone A without fallback and on Phone B's practical iPhone 15 Pro Max/iOS 26.5.2 proxy after exactly one allowed fallback tap. D021's temporary same-Wi-Fi LAN HTTP Phone A host-to-Phone B proxy guest harness has now also been implemented, independently accepted, and physically exercised. Earlier cross-device runs delivered moving receiver video and initially audible game audio with zero permission prompts, one guest CTA, and one host fallback; their later quiet interval was inconclusive because the old build could not distinguish RTP, inbound energy, and receiver output. D022 kept strict initial acquisition and added those labels, but its fresh physical A-to-B run failed the intended natural-silence behavior: after moving video, audible guest audio, no prompt, and `ready=yes`, a quiet host waiting screen produced `수신 출력 무음` and `ready=no` on Phone B. D023 replaces the raw positive-energy test with W3C interval RMS `sqrt(ΔtotalAudioEnergy / ΔtotalSamplesDuration)`, prefers float receiver samples, and treats unsupported/reset statistics as unknown rather than output failure. Local verification and independent evaluation accepted D023, but no post-correction physical run exists. The user waived the swapped orientation for this W2 objective unless a device-specific issue appears. LAN HTTP supplies neither secure-context nor Home Screen evidence, so W2 remains `partial`, W3 remains blocked, and no later slice is active.

## User / Use Case

- Primary runtimes: iPhone 16 Pro Max and iPhone 15 Pro, system Safari and Home Screen installed web-app mode.
- Participants: exactly one host and one guest.
- Host: launches Bubble Bobble, opens a private room, shares QR/link/code, receives guest readiness, and alone generates the new-game Coin/Start sequence.
- Guest: opens the invitation, taps `참가하고 소리 켜기` once, receives the host's game media, and controls P2 left/right/fire/jump.
- Expected normal app UX: host one tap, or at most two taps if the WebKit OpenAL fallback is needed; guest one tap. OS camera/URL interactions are measured separately.
- Android is not part of the current requested implementation or acceptance matrix.

## Product Requirements and Traceability

W0 and W11 cover the full P1-P14 contract. The table lists the focused implementation owners in addition to those cross-cutting gates.

| ID | Specification | Focused work | Acceptance summary |
|---|---|---|---|
| P1 | Only the host runs the Bubble Bobble ROM and core. | W6 | Guest ROM/core/loader requests, ROM cache access, and `EJS_emulator` creation are all zero. |
| P2 | Normal app flow targets host one tap, permits one WebKit audio fallback tap, and requires exactly one guest CTA tap. | W2, W3, W6, W7, W12 | Host app taps are at most two, guest app tap is one, and no network/ICE setting is exposed. |
| P3 | QR, system share link, and 8-character code refer to the same one-time invitation. | W7 | All three paths work; invitation expires after five minutes and reuse is rejected. |
| P4 | Stream playback requires no camera or microphone permission. | W2, W6, W7 | Safari permission prompts are zero and audio unlock succeeds. |
| P5 | Guest receives 30 fps game video and game audio. | W2, W5, W6 | First-frame/audio watchdog and both 20-minute path measurements pass. |
| P6 | Remote controls are forced to P2 and allow only left, right, fire, and jump. | W1, W5, W6 | P1/P2 simultaneous-input and allowlist tests pass with zero wrong-player applications. |
| P7 | Startup assist is blocked before guest readiness; exactly one host-owned new 2P start occurs after all readiness conditions. | W3, W5, W9 | W5 owns only readiness/start-command behavior against a test double; W9 installs all guards, binds the real runtime once, and proves pre-bind/pre-ready Coin/Start calls are zero. |
| P8 | Direct failure falls back automatically to TURN without a user choice. | W3, W4, W5 | Forced `relay` integration passes and UI does not expose transport selection. |
| P9 | Short disconnects recover automatically; reload within 60 seconds needs no QR rescan. | W3, W4, W5, W8 | Fault/reload matrix meets the recovery criteria. |
| P10 | Missing input heartbeat releases all P2 input within two seconds. | W1, W3, W5, W8 | A 1.5-second lease and forced-disconnect tests yield zero stuck P2 inputs. |
| P11 | A 2P session neither reads nor writes the existing 1P autosave. | W9 | Lifecycle save calls are zero and the before/after 1P save checksum is identical. |
| P12 | Invitation, signaling, and TURN credentials are least-privilege, short-lived, and redacted. | W3, W4, W5, W7, W8 | Security contract, origin/rate/expiry checks, and log-redaction tests pass. |
| P13 | Connection, path, quality, and recovery are observable without personal data. | W10, W12 | Required summarized stats and a random diagnostic ID are recorded without sensitive payloads. |
| P14 | With the feature flag off, existing 1P, games, saves, and service-worker behavior remain unchanged. | W9, W12 | Both feature-flag-off smoke suites and checksum/service-worker checks pass. |

## MVP Work Breakdown

| Work | Requirements | Deliverable |
|---|---|---|
| W0 | P1-P14 | Synchronized `.loop/` contract plus explicit approval decisions for signaling, TURN, costs/ownership, QR dependency, and the two-iPhone matrix; branch disposition is already recorded as a docs-only `origin/2p-bubble` handoff with `main` untouched. |
| W1 | P6, P10 | Player-aware emulator input contract with active state keyed by `(player, input)`. |
| W2 | P2, P4, P5 | Minimal capture-spike harness and EmulatorJS 4.2.3 `StreamCaptureAdapter`, including the one-time host audio fallback; actual-iPhone execution is required for closure. |
| W3 | P2, P7, P8, P9, P10, P12 | Typed protocol, direction allowlists, connection epoch, sequence filtering, and session reducer. |
| W4 | P3, P8, P9, P12 | Minimal Cloudflare Workers/Durable Objects signaling API and short-lived Cloudflare Realtime TURN credential integration. |
| W5 | P5, P6, P7, P8, P9, P10, P12 | Host `PeerSession`, media sender, P2 application, and readiness/start-command contract with the real Coin/Start runtime port unbound; integration uses a test double only. |
| W6 | P1, P2, P4, P5, P6 | ROM-free guest viewer and P2-only controls. |
| W7 | P2, P3, P4, P12 | QR/share/code invitation UX and one-time token exchange. |
| W8 | P9, P10, P12 | Heartbeat, neutral lease, epoch reset, ICE restart, and foreground recovery. |
| W9 | P7, P11, P14 | Single atomic real-runtime binding owner: set 2P mode before game start, install startup/autosave/lifecycle-save guards, then first bind and execute the idempotent Coin/Start sequence after readiness. |
| W10 | P13 | Redacted summarized WebRTC/game-session diagnostics. |
| W11 | P1-P14 | Actual-device direct/relay matrix, reconnect trials, and two 20-minute soaks with artifacts. |
| W12 | P2, P13, P14 | Feature-flagged Pages release, service-worker cache update, full regression checks, and rollback verification. |

## MVP Scope

- Bubble Bobble (`bublbobl`) only.
- One host and one guest, private one-time invitation, five-minute invite TTL, and one-hour maximum PoC session.
- Host-only ROM/core/runtime execution and 512x448 staging-canvas capture at 30 fps, initially around 1.5 Mbps.
- OpenAL game audio connected to a `MediaStreamDestination` and verified as non-silent on actual iPhone hardware.
- WebRTC video/audio plus reliable ordered `control` and unordered no-retransmit `input` DataChannels.
- QR, native share link, and 8-character manual code.
- Direct ICE path with automatic TURN/UDP, TURN/TCP, then TURNS 443/TCP fallback.
- P2 full-state heartbeat, 1.5-second lease, epoch and sequence filtering, reconnect grace, and foreground recovery.
- Feature-flagged diagnostics and release/rollback path.

## Out of Scope

- EmulatorJS 4.3.0-pre upgrade or upstream netplay adoption as a runtime replacement.
- Guest-side ROM/core/loader/emulator execution, lockstep, rollback, or save transfer.
- More than two players, spectators, public rooms, accounts, chat, or voice.
- Android implementation or comparison testing for this request.
- Offline LAN discovery, Bluetooth/Nearby pairing, host migration, background continuous play, or production HA.
- Broad game abstraction, unrelated refactoring, speculative exception handling, or unapproved dependencies.
- External infrastructure, DNS, secrets, or paid-resource creation before explicit W0 approval.

## Key Flows

### Host

1. Tap `친구와 2인 플레이`; set `twoPlayerSessionMode` before `startGame()`.
2. Start a fresh Bubble Bobble runtime without startup assist or autosave, capture media, and create the approved private room.
3. If the post-ROM OpenAL context is not running or the captured audio is silent, expose `방 열고 소리 켜기` once.
4. Show QR/share/code while awaiting exactly one guest.
5. After runtime, media tracks, both DataChannels, and guest readiness are all true, the W9-owned guarded runtime binding runs one host-owned Coin/Start sequence.
6. On disconnect, neutralize P2 first, recover automatically within the bounded policy, and never save the 2P session.

### Guest

1. Open the invite fragment or enter the eight-character code; do not start networking or playback automatically.
2. On `참가하고 소리 켜기`, exchange the invite, resume the guest audio context, prepare muted inline video, and connect.
3. Load no ROM/core/loader/emulator resources.
4. Send only P2 full-state input, `ready`, `ping`, and `leave`.
5. On reload within 60 seconds, use only a `sessionStorage` reconnect token.

### Failure and Recovery

1. At 1.5 seconds without a valid input update, release all P2 inputs.
2. Keep transient disconnect UI quiet for 2.5 seconds, then pause and attempt one bounded recovery.
3. On failed direct recovery, refresh short-lived TURN credentials and recreate the peer connection once.
4. Stop automatic retry after roughly 10-15 seconds and offer one user action.

## Fixed Technical Notes

- Keep vendored EmulatorJS 4.2.3.
- `PlayerInputAdapter` owns player-aware press/release state; network payloads never choose a player.
- Host always applies remote input as `player=1`.
- Input payload carries protocol version, server-issued `connectionEpoch`, monotonically increasing sequence, and at most four allowed buttons.
- Host resets P2 neutral and the high-water mark when a newly authenticated epoch opens; stale or foreign epochs are rejected.
- W5 owns the `TwoPlayerSessionController` readiness/start-command contract but cannot bind or call the real Coin/Start runtime; W5 integration uses a test double only.
- W9 is the sole real-runtime binding owner. In one guarded initialization path it sets `twoPlayerSessionMode` before `startGame()`, installs startup-assist/autosave/lifecycle-save guards, and only then binds Coin/Start. Actual runtime calls before this point are forbidden.
- The host start command uses an idempotency key/acknowledgement and reconnect cannot re-run it.
- Cloudflare Workers/Durable Objects signaling and Cloudflare Realtime TURN live outside GitHub Pages. Pages remains frontend-only.
- Existing 1P save schema/key, service worker, ROM path, and non-Bubble-Bobble behavior are invariants.

## W2 Development and Physical-Evidence Boundary

- Physical-device execution was unavailable during the initial development stage. Later bounded LAN HTTP system-Safari diagnostics first produced black same-page received video; the display-buffer bridge subsequently passed Phone A and the D020-accepted iPhone 15 Pro Max proxy for Phone B. D021 then delivered moving cross-device video and initially audible guest audio. Its later quiet interval was inconclusive because the prior build could not distinguish normal game silence from RTP or receiver-output loss. A fresh D022 physical run exposed a false mismatch: a quiet host waiting screen became `수신 출력 무음` with `ready=no` on Phone B after initial normal acquisition. D023 is locally accepted but awaits physical revalidation, and no approved secure cross-device path exists.
- D021 implements a W2-only ephemeral LAN HTTP cross-device harness on one shared Wi-Fi: Mac process-memory signaling, a sender-only Phone A host, and a ROM/emulator-free receiver-only D020 Phone B proxy guest. It uses non-trickle local ICE with `iceServers: []`, structural guest pre-routing, process-lifetime nonreused revisions, observed-revision offer compare-and-set with one bounded active-host conflict retry, revision-conditional deletion, a two-second ready lease with 500 ms guest heartbeat/false revocation, strict initial AV acquisition plus independent monotonic two-second transport/content freshness, immediate AudioContext/track revocation, async generation fencing, a five-second silent-media watchdog with one fallback, and recovery from a residual answered generation.
- The D021 harness is not W3 signaling or a product guest route, and it may not use Tailscale, a tunnel, Pages, TURN, DNS, secrets, a dependency, or external infrastructure. LAN HTTP does not prove secure-context or Home Screen behavior, so even a positive run leaves W2 `partial` and W3 blocked until the remaining formal gate is separately resolved and evaluated.
- After W0 approval and W1 completion, implement the smallest reproducible capture-spike harness/adapter and local automated tests needed to run the planned iPhone spike later.
- The first physical validation target within W2 remains `ROM load -> actual OpenAL context -> non-silent track -> audible guest output`; desktop API existence, track count, synthetic audio, or mocked results do not close W2.
- If the harness/adapter is locally complete but the physical test cannot run or does not pass, assign W2 `partial` or `blocked`, document the exact result and next bounded execution, and stop before W3.
- Do not change media/session architecture merely to bypass the missing evidence.

## W2-W4 Open-Source Provenance Evidence

- Each W2, W3, and W4 slice report lists every consulted open-source project, source file, document, or implementation example, with URL and exact commit/tag/version when available.
- Each report explicitly states whether any code was copied. If yes, it records the governing license, compatibility determination, required attribution, and where that attribution was applied.
- Consultation/reporting is not authorization to add a dependency or copy code. Existing W0/human-review approval requirements still apply before either action.

## W11 / W12 Release Boundary

- Full W12 entry requires W11 status `done`, not merely evaluated or partially evidenced.
- If actual-device W11 evidence requires a staging build or endpoint preparation, record it as a narrowly scoped W11 staging-preparation activity. It may not include W12 production completion, public release, final service-worker rollout, or a claim that W12 started.

## W0 Selection / Evaluation Gate

D013-D016 record the evaluated 2026-07-18 W0 selections for Cloudflare Workers Free signaling at `ponpoko-2p.taekimax.workers.dev`, Cloudflare Realtime TURN with a USD 0 authorization and user-owned Worker secrets, exact-pinned `uqr@0.1.3` for W7, and the original device matrix. D017 records the consolidated decision authority. D019 supersedes the product device inventory with iPhone 16 Pro Max plus iPhone 15 Pro on iOS 26.5.2; build numbers may remain unconfirmed only for the recorded practical diagnostic. D020 accepts iPhone 15 Pro Max as the practical Phone B proxy for the W2 media-path objective without broadening the product support target. D021 approves a temporary W2-only A-to-B LAN harness and waives only W2's swapped-orientation repetition; it does not change D019's W11 product pair or direct/TURN matrix. D022 records the natural-game-silence readiness correction without weakening initial audible acquisition or physical closure requirements.

The selected endpoint, provider, dependency, and current matrix are contract targets. They do not claim account provisioning, secret creation, dependency installation, secure-origin/Home Screen success, or cross-device evidence. W4, W7, W2 physical closure, and W11 retain their own operational entry gates. Branch disposition remains the docs-only `origin/2p-bubble` handoff; `main` and GitHub Pages require separate approval.

The independent Evaluator accepted the synchronized D013-D017 decision/contract diff and the corrected W1 player-aware input implementation with no Critical, High, Medium, or Low finding. W0 and W1 are `done`. Later independent evaluations accepted the false-ready correction, WebGL-display-buffer bridge, small-screen W2 panel containment, and WebKit media-element play-race correction with no remaining finding. D021's replay, false-ready, stale-async, silent-fallback, documentation, stale-offer CAS, delayed-poll timing, and diagnostic-honesty findings were repaired and independently accepted. D022's first independent review found that an interrupted receiver-output mismatch retained its old timer; the timer reset and direct regression were added, and re-review returned ACCEPT with no remaining finding. Final Node 25.8.1 verification passed 2 focused files / 51 tests, 24 files / 204 tests, typecheck, production build, static smoke, and desktop Chromium/mobile WebKit two-page LAN smoke; Node 24 remained unavailable. The physical A-to-B runs prove moving cross-device video and initial audible guest audio, but the later quiet interval is not classifiable from the then-visible diagnostics and does not close sustained-audio or secure-context/Home Screen evidence. W2 remains `partial`, and W3 stays blocked.
