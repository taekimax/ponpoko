# Request

## Source of Truth

- User implementation request dated 2026-07-16.
- Planning document: `docs/plans/2026-07-16_bubble-bobble-webrtc-streaming-poc.md`.
- Repository policy: `AGENTS.md` and `.loop/01_spec.md` through `.loop/06_log.md`.
- This file records the request; `.loop/02_contract.md` is the implementation contract.

## Raw Request

Implement the Bubble Bobble (`bublbobl`) two-player WebRTC screen-streaming PoC described by the planning document. The host alone runs EmulatorJS 4.2.3 and the ROM, streams game video and audio over WebRTC, and applies guest input only as P2 through a DataChannel. The guest must remain a lightweight viewer/controller and must not load a ROM, core, loader, or emulator.

The implementation must be developed in small slices in strict order beginning with W1, W2, then W3. Before any implementation code changes, W0 must obtain one consolidated user approval covering external hosting, TURN cost/ownership, QR dependency policy, and the actual two-iPhone test matrix. The user later resolved branch disposition separately by explicitly authorizing a documentation-only commit and push to `origin/2p-bubble` for remote handoff, while keeping `main` and the live GitHub Pages deployment untouched.

The development session is remote. New interactive machine permission prompts cannot be answered, and physical-device execution is unavailable during development. Do not attempt forced workarounds or change the architecture merely to bypass unavailable real-device testing. After W0 approval and W1 completion, the minimal W2 capture-spike harness/adapter and its local automated checks may still be implemented. Actual iPhone execution remains the W2 closure gate; without it, stop at W2 with `partial` or `blocked` and do not enter W3. The practical target is iPhone 15 Pro, Safari, installed and run as a Home Screen web app. Android is out of scope for this request.

## User Intent

- Deliver the maximum realistic, locally verified implementation without overstating real-device or TURN evidence.
- Preserve the current EmulatorJS 4.2.3 runtime, existing 1P behavior, save checksum, service worker, and game catalog behavior.
- Keep the host as the only ROM/emulator owner; keep the guest ROM-free and limited to media reception plus P2 input.
- Prefer a small personal-project PoC over generalized abstractions or exhaustive exceptional-case handling.
- Stop at `partial`, `blocked`, or `needs-clarification` when real iPhone, TURN, external-service approval, or other required evidence is unavailable.

## Mandatory Start Sequence

1. Read `AGENTS.md`, all standard `.loop/` files, and the planning document in full.
2. Initialize and synchronize `.loop/` with P1-P14 and W0-W12.
3. Obtain one consolidated approval for the four still-open W0 items below before changing implementation code, dependencies, or external infrastructure. The already-authorized documentation-only `2p-bubble` handoff push is not implementation entry.
4. After approval, complete W1, then implement the minimal W2 spike harness/adapter and local verification needed for later physical execution.
5. Close W2 only after the real-iPhone OpenAL non-silent/audible gate passes. If that execution is unavailable, record W2 as `partial` or `blocked` and stop; do not start W3.
6. Only after W2 is `done`, execute W3 followed by W4-W12 as small verified feature slices.

## W0 Approval Questions

Current status: `needs-clarification`.

1. Signaling hosting provider and exact HTTPS/WSS domain.
2. coturn hosting provider, monthly or total PoC cost ceiling, and the owner for DNS and secrets.
3. Whether adding a QR-generation dependency is approved; if not, use only an already-present capability or a scoped dependency-free implementation after contract review.
4. The two physical iPhones available for testing and the exact iOS/Safari combinations, including which device runs Safari tab mode and which runs the Home Screen web app.
5. Resolved for this handoff: keep the work on `2p-bubble`, publish it as `origin/2p-bubble`, and do not merge or push to `main`. The live Pages source remains `main`; any later merge requires a separate verified release decision.

## Non-Negotiable Safety Conditions

- Isolate active input by `(player, input)` and force all remote input to `player=1`.
- Accept guest outbound messages only for P2 full-state input, `ready`, `ping`, and `leave`.
- W5-W8 may define and test the host readiness/start-command contract only with the real game-runtime Coin/Start port unbound or replaced by a test double.
- W9 is the single owner that sets `twoPlayerSessionMode` before `startGame()`, installs startup-assist/autosave/lifecycle-save guards, and only then atomically binds real game-runtime Coin/Start.
- Before that W9 bind, actual 2P runtime Coin/Start calls must be exactly zero; W5 integration tests may invoke only a test double.
- Enforce `connectionEpoch`, sequence high-water marks, and a 1.5-second remote-input lease.
- In 2P mode, do not start `startStartupAssist()` or `startAutosave()`.
- Before guest-ready, Coin/Start runtime calls must be exactly zero.
- Across `visibilitychange`, `pagehide`, `pageshow`, menu, back, and session end, 2P save calls must be exactly zero.
- Preserve the existing 1P save checksum, service worker behavior, and all existing game behavior when the feature flag is off.

## Completion Boundary

- Required local commands: `npm run typecheck`, `npm test`, `npm run build`, `GAME_RUNTIME_SMOKE_GAME=bublbobl npm run games:smoke`, feature-flag-off `npm run browser:smoke`, and feature-flag-off unfiltered `npm run games:smoke`.
- Required device evidence: direct connection 10 times, forced TURN 10 times, direct and relay 20-minute soaks, forced disconnect/reconnect testing, audible non-silent audio, and the planning document's acceptance metrics.
- Without actual iPhone and TURN evidence, final status must not be `done`.
- Local W2 harness/adapter work is valid evidence of implementation progress but is not a substitute for the actual-iPhone W2 closure evidence.
- W2-W4 slice reports must identify consulted open-source projects/sources, exact revision or version when available, whether code was copied, and license/attribution handling. This reporting requirement does not authorize a dependency or copied code.

## Live Repository Context

- Verified at 2026-07-16 18:01 KST.
- Actual branch: `2p-bubble`, not the request's stated `main...origin/main`.
- Current branch had no configured upstream before this handoff; the authorized push will set `origin/2p-bubble` as its upstream.
- `2p-bubble`, local `main`, and `origin/main` resolve to the same commit: `f6e15224fa8d3628637a07b24772e67f1281f52c`.
- No tracked-file changes were reported by `git status --short --untracked-files=all`.
- Untracked scope includes `.loop/`, project `AGENTS.md`, the planning document, and evaluator review artifacts under `.loop/reports/` and `docs/reviews/`.

## Date Created

2026-07-16
