# Progress

## Current Status

`partial`

W0 and W1 passed independent evaluation and are `done`. W2 stays `partial`. D021's temporary same-Wi-Fi LAN HTTP A-to-B harness is implemented with Mac process-memory signaling, a sender-only Phone A host, a ROM/emulator-free receiver-only Phone B guest, non-trickle `iceServers: []`, observed-revision offer CAS with one bounded active-host retry, revision/lease/generation fencing, a five-second silent watchdog with one fallback, residual-answer recovery, structural guest pre-routing, and strict initial AV acquisition plus monotonic video/audio transport freshness. D022's fresh physical A-to-B run passed moving video, audible guest audio, no prompt, one guest CTA, one host fallback, and `ready=yes`, then falsely classified a quiet host waiting screen as `수신 출력 무음`. D023 now uses W3C interval-normalized inbound RMS, float receiver samples, a conservative byte fallback, and unknown/reset fail-open behavior only for the output-mismatch claim. Full local/browser verification and independent evaluation returned ACCEPT with no finding. D023 has not been physically rechecked. LAN HTTP still cannot prove secure-context/Home Screen behavior. W3 remains blocked; no dependency installation, external infrastructure, `main`, or Pages change is authorized.

## Live Repository State

- Verified: 2026-07-20 00:30 KST.
- Branch: `2p-bubble`, tracking `origin/2p-bubble` at `ece0feaedd04ebb11df95fc49aa0fba8e273a766` before the current W0/W1 worktree changes.
- Local `main` and `origin/main` remain at `f6e15224fa8d3628637a07b24772e67f1281f52c`.
- The current diff contains W0 documentation, closed W1 input work, bounded W2 capture adapter/query harness/tests/smoke evidence, D019/D020 physical diagnostics, and the display-buffer bridge and WebKit play-race corrections. No W3 or later-slice source exists.
- No commit, push, merge, rebase, Pages deployment, dependency installation, or external-service operation has occurred in this session.

## Work Ledger

| Work | Status | Evidence / blocker |
|---|---|---|
| W0 | `done` | D011 fixes the branch boundary; D013-D017 record the evaluated W0 targets; D019 supersedes only the device inventory for current support/physical work. |
| W1 | `done` | Corrected player-aware implementation and required checks pass. Independent re-evaluation confirmed scoped P2 release leaves an identical active P1 input untouched and returned PASS with no findings. |
| W2 | `partial` | D021's one-way LAN A-to-B harness passed cross-device initial A/V; D022 then failed natural-silence classification physically. D023's interval-normalized/float analysis correction passes full local verification and independent ACCEPT but has no physical recheck. Secure-context/Home Screen proof remains absent. |
| W3 | `blocked` | Must not start until W2 actual-iPhone Gate 1A passes. |
| W4 | `blocked` | Requires W3 plus approved signaling/TURN provider, domain, cost, DNS, and secret handling. |
| W5 | `blocked` | Requires W4. It may verify readiness/start-command behavior only with a test double; the real Coin/Start runtime must remain unbound. |
| W6 | `blocked` | Requires W5. |
| W7 | `blocked` | Requires W6 and approved QR dependency policy. |
| W8 | `blocked` | Requires W7. |
| W9 | `blocked` | Requires W8 and is the sole owner of guarded, first real-runtime Coin/Start binding. |
| W10 | `blocked` | Requires W9. |
| W11 | `blocked` | Requires W10, two actual iPhones, live direct/forced-TURN paths, and physical test evidence. |
| W12 | `blocked` | Full entry requires W11 status `done`, then deploy/rollback access. Limited evidence-only staging preparation remains W11 work. |

## Done

- `done`: Standard `.loop/` workspace initialized.
- `done`: `AGENTS.md`, all `.loop/` files, and the 608-line planning document read by the Planner.
- `done`: P1-P14 and W0-W12 synchronized into spec, contract, and plan.
- `done`: Approval-before-code, strict W1 -> W2 -> W3 order, W2 actual-iPhone audio gate, safety invariants, verification commands, and honest completion status fixed in the contract.
- `done`: Clarified that unavailable development-stage device access does not prohibit minimal local W2 harness/adapter work after W0/W1, while physical evidence still gates W2 closure and W3 entry.
- `done`: Closed evaluator A1-A4 contract findings: W5/W9 runtime ownership, fifth branch approval, W11-`done` W12 gate, and W2-W4 OSS/license evidence.
- `done`: Evaluator final re-check found no residual W0 contract finding; doc consistency and tracked-diff checks passed.
- `done`: User authorized a docs-only `origin/2p-bubble` handoff while preserving `main` and the live Pages deployment.
- `done`: Pre-push live Pages Bubble Bobble 1P smoke passed on desktop Chromium and mobile WebKit with ROM boot, rendered frames, and mapped input.
- `done`: Full local feature-flag-off `npm run browser:smoke` passed, including Ponpoko WebKit, the unfiltered desktop/mobile game catalog, and the prep-failure regression.
- `done`: Independent handoff evaluation found no Critical, High, Medium, or Low findings and approved a docs-only `origin/2p-bubble` push.
- `done`: W1 player-aware input contract, explicit local P1 routing, player-scoped release, corrected simultaneous P1/P2 tests, required local checks, and independent PASS.
- `done`: Bounded W2 local adapter/query-loopback code, evaluator-requested rollback/race/watchdog corrections, required local checks, provenance, and final independent PASS. Slice status remains `partial` solely at the physical closure gate.
- `done`: Recorded D019's iPhone 16 Pro Max/iPhone 15 Pro support pair and diagnostic-only build-number exception without treating it as formal Settings inventory.
- `done`: Recorded the failed direct-LAN HTTP system-Safari compatibility result and corrected the local false-positive readiness path; independent re-evaluation accepted the correction with no finding.
- `done`: Recorded the failed post-first-correction Phone A retry, replaced direct WebGL readback copying with a display-buffer video bridge, added one-line stage diagnosis and OpenAL master-gain capture, passed final local checks, and closed independent code/test review with no finding.
- `done`: Recorded the positive post-bridge Phone A same-page result without promoting it to Gate 1A, and contained the W2 diagnostic panel inside the game stage after it blocked Coin on an opportunistic XS Max run. Independent evaluation accepted the layout fix with no finding.
- `done`: Corrected the WebKit bridge/preview `play()` race exposed by an opportunistic XS Max run, retained strict current-video/audio readiness, and recorded the later iPhone 15 Pro Max same-page success as D020's practical Phone B proxy without treating it as cross-device Gate 1A evidence.
- `done`: Corrected D021 replay/CAS/lease/generation/fallback defects, retained strict initial AV acquisition, added immediate track/AudioContext revocation, and then corrected D022's natural-game-silence false negative using RTP/energy/output classification. Independent review found and verified the interrupted-mismatch timer reset; final re-evaluation returned ACCEPT. The physical quiet interval is now recorded as inconclusive without promoting W2.
- `done`: Completed one fresh bounded D022 physical A-to-B run without recording or numeric transcription. Initial receiver video/audio/no-prompt/readiness passed, but the host waiting-screen quiet interval rendered `수신 출력 무음` and `ready=no`; no retry or later-slice work followed.
- `done`: Diagnosed the D022 false mismatch, implemented D023 interval-normalized inbound energy plus float/byte-aware receiver analysis, added tiny-energy/float/fallback/missing-reset regressions, passed the full local/browser matrix, and received independent ACCEPT with no Critical, High, Medium, or Low finding. Physical revalidation remains open.

## W0 Evaluation Result

- PASS: D013-D017 are sufficient bounded contract targets under the 2026-07-18 user instruction.
- No Critical, High, or Medium finding; documentation hygiene findings were corrected during closeout.
- Provisioning, enforceable zero-cost checks, dependency installation, physical inventory, and device evidence remain later slice gates.

## W1 Implementation Verification

- Player-aware active state is keyed by `(player,input)` throughout the native emulator contract and runtime adapters.
- Existing local keyboard, touch, and sustain paths explicitly remain player `0`.
- Fake-contract and EmulatorJS tests prove that releasing P2 while the same P1 input remains held does not emit a P1 release or clear P1 state.
- PASS: typecheck; 4 focused files / 35 tests; all 20 files / 114 tests; production build; targeted Bubble Bobble desktop/mobile runtime smoke; `git diff --check`.
- The first independent review found no implementation or scope defect, but withheld PASS for the active-P1/scoped-P2-release evidence gap. The corrected diff passed re-evaluation with no Critical, High, Medium, or Low finding.

## W1 Evaluation Result

- PASS: scoped P2 cleanup emits only P2 releases and preserves an identical active P1 input until explicit P1 release.
- No Critical, High, Medium, or Low finding remained after correction.
- The evaluator independently reran focused 4 files / 35 tests, full 20 files / 114 tests, typecheck, and `git diff --check`; the fresh generator report records the passing build and targeted Bubble Bobble desktop/mobile smoke.

## W2 Local Implementation Verification

- Added an app-owned 512x448/30fps staging-canvas/OpenAL `StreamCaptureAdapter` behind a Bubble-only runtime seam.
- Added an opt-in `?captureSpike=1` same-page two-peer loopback with no ICE servers, muted inline preview, receiver audio analyser/stats, one-shot fallback, serialized debug state, and owned cleanup.
- The 2026-07-19 initial physical diagnostic produced decoded counters but black received video on both D019 phones; prior `ready` was therefore a false positive. A later Phone A retry of the first correction still produced black video, now honestly reported as `status=failed`, `ready=false`, `visible=false`, `changing=false`, `black=true`, with audible game sound, increasing counters, no prompt, and no reported error.
- The second correction uses the EmulatorJS WebGL canvas's direct `captureStream(30)` display path as the source of a muted inline bridge video, draws that video into an exact 512x448 opaque software-backed staging canvas at 30 fps, and captures the staging canvas at 30 fps. It prefers the stable OpenAL master gain over short-lived per-source gains.
- The panel begins with one Korean `영상 경로` diagnosis and independently classifies source, bridge, staging, and receiver readback as pending/ok/black/static/unreadable. A failed readback is never retained as black; direct source readback may be black with `preserveDrawingBuffer=false` while a moving bridge/staging/receiver remains valid.
- Browser smoke screenshots the received preview at distinct times and requires at least 2% visible pixels plus 1% changed pixels. Unit regressions cover initial/persistent black, black-after-ready, static/frozen/ended video, play rejection, all actionable pipeline diagnoses, source-black/display-bridge success, and black-to-unreadable transition.
- A subsequent WebKit correction attaches the preview stream only on the first video track, keeps bridge/preview `play()` single-flight, permits at most one current `AbortError` retry, guards stale generations/sources/tokens, and leaves genuine `NotAllowedError` fatal unless actual presentation proves recovery. Earlier same-session verification passed typecheck, focused 2 files / 36 tests, full 22 files / 153 tests, production build, static smoke, capture-on desktop/mobile smoke, query-off desktop/mobile smoke, and `git diff --check`; an independent Evaluator returned ACCEPT with no finding. Node 24 remained unavailable, so CI parity is not claimed.
- Corrected evaluator findings with transactional failed-start rollback, destination-track ownership before graph connection, generation guards across negotiation/events/stats/fallback restart, a five-second silent-media watchdog, and attempted-arm wording that records the menu autosave-await caveat.
- PASS on Node 25.8.1: focused 3 files / 51 tests; full 22 files / 148 tests; typecheck; production build; static smoke; rebuilt opt-in desktop/mobile capture smoke; rebuilt targeted query-off Bubble smoke; final full query-off browser/catalog/prep-failure regression; `git diff --check`. Mobile WebKit reached `ready=true` with receiver RMS and a visible/moving bridge pipeline; desktop headless required sender RMS plus inbound packets because its remote MediaStream analyser remained zero. This desktop-only smoke exception does not alter app or physical readiness. Node 24 was not available, so CI parity is not claimed.
- Final D022 verification on Node 25.8.1 passes: focused 2 files / 51 tests; full 24 files / 204 tests; typecheck; production build; static smoke; final two-page LAN desktop Chromium and mobile WebKit smoke; and `git diff --check`. Earlier corrected-build verification also passed same-room sequential reuse, legacy same-page capture desktop/mobile, and query-off Bubble desktop/mobile. Node 24 is unavailable, so CI parity is not claimed.
- Physical D022 result: the fresh run observed initial audible guest output and moving video, zero prompts, one guest CTA, one host fallback, and `ready=yes`. Before Phone A started active play, its quiet game waiting screen made Phone B report `수신 출력 무음` and `ready=no` after several seconds. This fails the intended healthy natural-silence classification; the run was stopped without retry. Approved secure origin, Home Screen behavior, and formal Settings evidence remain missing. D021 waives swapped playback for this W2 objective unless a device-specific issue appears; exact iPhone 15 Pro repetition is not missing evidence under D020.
- Final D023 verification on Node 25.8.1 passes: focused W2 LAN/signaling 2 files / 55 tests; full 24 files / 208 tests; typecheck; production build; static smoke; two-page LAN desktop Chromium/mobile WebKit; query-off Bubble desktop/mobile; full feature-flag-off browser, unfiltered catalog, and preparation-failure smoke; and `git diff --check`. The first W2 browser-smoke launch inside the sandbox failed before app assertions because port 4176 could not bind; the approved host-environment rerun passed. Node 24 remains unavailable, so CI parity is not claimed.
- Physical D021 evidence: Phone A host and Phone B proxy guest opened exact role URLs on `172.30.1.27`; host fallback was used exactly once and guest CTA exactly once. Phone B showed moving video, initially audible game audio, no permission prompt, and eventually `ready=yes`. During the final ten-second observation the audio became quiet and the old continuous-RMS gate changed to `ready=no` and `연결 중` while video remained visible. The user later clarified that this can be normal game behavior; packet/energy/output diagnostics were unavailable in that build, so the interval is inconclusive. Recording was started and stopped but no file was transferred into the workspace. Both tabs closed and port 5173 had no listener after server shutdown.
- Physical bridge evidence exists for Phone A and the D020-accepted iPhone 15 Pro Max Phone B proxy. Phone A showed moving receiver video, `영상 경로: 정상`, `ready=true`, same-device game sound, no fallback, and no permission/error popup. The proxy reached the same sustained visible/audible state after exactly one fallback tap and no retry. Neither run isolated receiver-only audio; both remain LAN HTTP same-page evidence.
- The XS Max follow-up confirmed the stage-bounded panel no longer prevented mobile-control access, but Bubble boot/start was very slow and inconsistent; XS Max is not a support target and produced no valid W2 media result.

## W2 Evaluation Result

- PASS: the original W2 final independent re-evaluation found no Critical, High, Medium, or Low code finding.
- The first reviews withheld PASS for startup rollback, negotiation teardown races, the short silent-media watchdog, over-strong gesture wording, destination-track rollback, and a stale rejected stats-poll write. Each correction has a focused regression.
- The 2026-07-19 evaluator first rejected the black-preview correction because lifetime-latched readiness could survive static/black/ended video. After recent motion/time and live-track gates plus four focused regressions were added, re-evaluation returned ACCEPT with no Critical, High, Medium, or Low finding.
- The bridge follow-up's independent code evaluation and separate test audit both returned ACCEPT. A Low diagnostic-branch coverage gap and a black-to-unreadable latch defect were corrected; final re-evaluation found no Critical, High, Medium, or Low finding.
- The small-screen panel relocation passed independent evaluation with no Critical, High, Medium, or Low finding; it remains Bubble/query-only, keeps preview/fallback interactive, and cannot extend beyond the clipped game stage into mobile controls.
- The WebKit media-element play-race correction passed independent evaluation with no Critical, High, Medium, or Low finding; its later iPhone 15 Pro Max Phone B proxy run reached a sustained `ready` state after the single allowed fallback tap.
- D021's CAS correction passed independent re-evaluation. A later readiness review rejected poll-count timing and latched diagnostic wording; monotonic pre-refresh expiry, truthful `최근 정상`, and immediate AudioContext revocation were added, after which a fresh independent evaluator returned ACCEPT. No input, P2, Coin, or Start behavior changed.
- D022's natural-silence review found that a no-growth poll did not break the continuous receiver-output mismatch timer. The timer now resets on that interruption, a direct regression proves that only a fresh continuous two seconds revokes, and independent re-review returned ACCEPT with no remaining finding. No automatic recovery, extra CTA/fallback, input, P2, Coin, Start, W3, dependency, or infrastructure change was added.
- D023's independent evaluator accepted interval energy normalization, float receiver sampling, conservative byte fallback, unsupported/reset-stat handling, preserved strict acquisition/freshness/immediate failure gates, and focused coverage. It independently reran 2 files / 55 tests plus `git diff --check` and returned ACCEPT with no Critical, High, Medium, or Low finding.
- Evaluator-assigned closure remains W2 `partial`; W3 `blocked`. Automated desktop/headless bridge evidence is not post-bridge physical iOS or cross-device Gate 1A proof.

## Next Step

On a machine with the two phones available, run one bounded post-D023 A-to-B recheck: initial moving video/audible guest audio/no prompt/one CTA/at most one fallback, then observe the quiet waiting screen for `게임 무음(전송 정상)` with `ready=yes`. Do not swap roles, enter W3, or add product routing/infrastructure. Secure-context/Home Screen evidence remains separately open, W2 stays `partial`, and W3 stays blocked.

## Last Updated

2026-07-20 00:30 KST
