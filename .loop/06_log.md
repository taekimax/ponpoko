# Operational Log

Append operational entries below. Use this heading format:

`## YYYY-MM-DD HH:mm | role | title`

## 2026-07-16 17:43 | planner | Loop workspace initialized

- Created the standard `.loop/` workspace.

## 2026-07-16 17:44 | planner | Authoritative documents reviewed

- Read project `AGENTS.md`, `.loop/00_request.md` through `.loop/06_log.md`, and all 608 lines of `docs/plans/2026-07-16_bubble-bobble-webrtc-streaming-poc.md`.
- Confirmed planning status `done` and implementation-entry status `needs-clarification`.
- Performed no implementation-code, dependency, infrastructure, DNS, secret, or external-service change.

## 2026-07-16 17:44 | planner | Live checkout discrepancy recorded

- `git branch --show-current` returned `2p-bubble`, not the request's stated `main...origin/main`.
- `git status --short --untracked-files=all` showed no tracked changes and only `.loop/`, project `AGENTS.md`, and the planning document as untracked scope.
- Did not switch branches or alter tracked files.

## 2026-07-16 17:44 | planner | P1-P14 and W0-W12 contract synchronized

- Updated only `.loop/00_request.md` through `.loop/06_log.md`.
- Added explicit P1-P14 requirement mapping and W0-W12 deliverable, dependency, evidence, and execution-order mapping.
- Fixed approval-before-code, strict W1 -> W2 -> W3 sequencing, and the actual-iPhone post-ROM OpenAL non-silent-audio Gate 1A before W3.
- Fixed input isolation, guest direction allowlist, host-only Coin/Start, epoch/sequence/lease, 2P startup/autosave suppression, lifecycle save-zero, checksum, service-worker, and feature-flag invariants.
- Fixed local verification commands, direct/forced-TURN trial counts, direct/relay 20-minute soaks, forced disconnect/reconnect checks, and the rule that missing actual-iPhone/TURN evidence cannot yield `done`.
- W0 remains `needs-clarification`; W1-W12 implementation remains `blocked` by the recorded gates.

## 2026-07-16 17:51 | planner | W2 development and physical closure separated

- Clarified that after W0 approval and W1 completion, the minimal W2 capture-spike harness/adapter and local automated checks may be implemented without immediate physical-device access.
- Preserved actual iPhone `ROM load -> OpenAL context -> non-silent energy -> audible guest output` as W2's first physical validation and mandatory closure gate.
- Prohibited synthetic/desktop substitution, architecture workarounds, W2 `done`, and W3 entry without that evidence.
- Required W2 to stop as `partial` or `blocked` with a reproducible future execution procedure when device execution remains unavailable.

## 2026-07-16 18:01 | planner | Evaluator A1-A4 contract findings closed

- A1: Removed W5/W9 auto-start ownership overlap. W5-W8 now keep the real Coin/Start runtime unbound, W5 integration is test-double-only, and W9 alone installs all guards before the first atomic real-runtime bind and readiness-gated start.
- A2: Reverified `2p-bubble` has no upstream and that `2p-bubble`, local `main`, and `origin/main` all equal `f6e15224fa8d3628637a07b24772e67f1281f52c`. Added explicit branch disposition as the fifth consolidated W0 approval and prohibited implicit branch operations.
- A3: Changed W12 full entry from W11 merely evaluated to W11 `done`; limited staging needed for W11 evidence remains separately logged W11 preparation and is not production release or W12 completion.
- A4: Required W2-W4 reports to record consulted sources/revisions, copied-code status, and license/attribution handling without granting dependency or copy approval.
- Changed only `.loop/00_request.md` through `.loop/06_log.md`; no implementation code, dependency, external infrastructure, or branch operation was performed.

## 2026-07-16 18:12 | evaluator | W0 contract re-evaluation closed

- Re-read the corrected loop contract and the required review artifact.
- Confirmed A1-A5 and the temporary A2-R/A5 review-artifact residuals are closed, with no remaining High, Medium, or Low contract finding.
- Confirmed the five-part approval request may proceed while W0 remains `needs-clarification` and code/branch entry remains prohibited.
- Doc consistency passed for P1-P14/W0-W12 inventory, package-script names, referenced paths, code fences, trailing whitespace, and `git diff --check`; no tracked diff exists.

## 2026-07-16 20:03 | planner | Remote handoff and live 1P preservation authorized

- The user explicitly authorized a commit and push of the current W0 artifacts to `origin/2p-bubble` for continuation from a remote Mac.
- Kept `main` and the GitHub Pages deployment out of scope; `.github/workflows/deploy.yml` triggers only for `main` pushes or manual dispatch.
- Recorded that Cloudflare account enrollment/provisioning is deferred and no provider, DNS, secret, paid resource, or dependency is approved by this handoff.
- Ran `GAME_RUNTIME_SMOKE_BASE_URL=https://taekimax.github.io/ponpoko/ GAME_RUNTIME_SMOKE_GAME=bublbobl npm run games:smoke`; it passed against the live Pages site in desktop Chromium and mobile WebKit, covering ROM boot, frame rendering, and mapped 1P input.
- Local verification also passed: `npm run typecheck`; `npm test` with 20 files and 113 tests; `npm run build`; and `GAME_RUNTIME_SMOKE_GAME=bublbobl npm run games:smoke` on desktop Chromium and mobile WebKit.
- This automated result is not actual-iPhone 15 Pro/PWA, Safari audio, OpenAL non-silent-track, TURN, or soak evidence. W0 remains `needs-clarification` and W1-W12 remain gated.

## 2026-07-16 20:15 | evaluator | Docs-only handoff evaluation and full 1P regression closed

- Independent staged-diff review found no Critical, High, Medium, or Low findings and approved committing/pushing only to `origin/2p-bubble`.
- Confirmed 13 staged files are documentation/loop artifacts only, D011 excludes `main`/Pages/release work, D012 defers Cloudflare/provider/DNS/secret/cost choices, and W0 remains `needs-clarification`.
- `npm run browser:smoke` passed end-to-end: Ponpoko WebKit behavior, unfiltered catalog ROM boot/frame/input on desktop Chromium and mobile WebKit, and the Ponpoko preparation-failure overlay regression.
- Remaining operational closeout: commit, push, verify remote branch SHA, verify `origin/main` is unchanged, and rerun the public Bubble Bobble 1P smoke.

## 2026-07-18 12:41 | planner | W0 targets selected for independent evaluation

- Switched the clean clone to local `2p-bubble` tracking `origin/2p-bubble` at `ece0fea`; `main` and Pages were not changed.
- Re-read `AGENTS.md`, `.loop/01_spec.md` through `.loop/06_log.md`, the 608-line WebRTC plan, `.loop/00_request.md`, and the handoff/review artifacts before mutation.
- Recorded D013-D017: Cloudflare Workers Free plus SQLite Durable Objects at `ponpoko-2p.taekimax.workers.dev`; Cloudflare Realtime TURN with 300-second credentials, USD 0 authorization, 800 GB cutoff, and user-owned Worker secrets; exact-pinned `uqr@0.1.3`; and the two-iPhone 15 Pro/iOS 26.5.2 Safari/Home Screen matrix.
- Added `.loop/reports/2026-07-18_w0_decision_evaluation.md` with current primary-source evidence and explicit deferred provisioning/device boundaries.
- Performed no source-code, dependency, infrastructure, DNS, secret, paid-resource, `main`, or Pages change. W0 remains `in_progress` until independent evaluation; W1 remains blocked.

## 2026-07-18 12:50 | evaluator | W0 accepted for local implementation entry

- Independently read the full authoritative document set, D013-D017, the W0 decision report, and the current documentation diff.
- Returned PASS with no Critical, High, or Medium blocker: the current user instruction authorizes bounded target selection, while W2/W4/W7/W11 preserve physical, account, cost, dependency, and live-service gates.
- Confirmed `git diff --check` passes, `uqr` is not installed, no external operation occurred, and local/origin `main` remain at `f6e1522`.
- Corrected the three Low documentation-hygiene findings: removed Android from the plan matrix, relabeled the historical pending W0 record, and refreshed the live repository snapshot.
- Marked W0 and D017 `done`; activated W1 only. W2 remains blocked until W1 independently closes.

## 2026-07-18 13:12 | generator | W1 player-aware input ready for re-evaluation

- Added player identity to the native emulator input contract, keyed active state by `(player,input)`, kept all existing local input on player `0`, and forwarded player identity through EmulatorJS.
- Added player-scoped cleanup so P2 can be released without disturbing P1; lifecycle-wide cleanup still releases both players.
- The first independent review found the code correct and scoped but identified a missing active-P1/scoped-P2-release assertion. Corrected both the fake-contract and EmulatorJS tests so identical P1/P2 input remains independent while P2 cleanup runs.
- Verification passed: `npm run typecheck`; focused 4 files / 35 tests; full 20 files / 114 tests; `npm run build`; targeted Bubble Bobble desktop/mobile runtime smoke; and `git diff --check`.
- Added `.loop/reports/2026-07-18_w1_implementation.md`. W1 remains `in_progress` and W2 remains blocked until independent re-evaluation returns PASS.

## 2026-07-18 13:14 | evaluator | W1 accepted and W2 local entry opened

- Re-read the corrected W1 diff, loop evidence, and focused safety tests; returned PASS with no Critical, High, Medium, or Low finding.
- Confirmed P1 and P2 can hold identical input, `releasePlayer(1)` emits only P2 releases, and P1 remains active until its explicit release.
- Independently reran focused 4 files / 35 tests, full 20 files / 114 tests, typecheck, and `git diff --check`; accepted the fresh generator-recorded production build and targeted Bubble Bobble desktop/mobile runtime smoke.
- Marked W1 `done` and activated only bounded local W2 capture harness/adapter work. Actual-iPhone OpenAL non-silent/audible evidence remains mandatory for W2 `done`; W3 remains blocked.

## 2026-07-18 13:55 | generator | W2 local capture spike ready for evaluation

- Added an app-owned 512x448/30fps staging-canvas/OpenAL capture adapter and a narrow Bubble-only EmulatorJS seam that keeps runtime internals out of UI code.
- Added a `?captureSpike=1` debug harness with same-page in-memory peers, no ICE servers, muted inline received video, receiver audio analyser/stats, one-shot `방 열고 소리 켜기`, serialized evidence, and owned cleanup. Query-off behavior creates none of these resources.
- The first mobile WebKit smoke received tracks but decoded no frames while the staging canvas was HTML-hidden. Kept it connected and renderable offscreen; the corrected desktop Chromium/mobile WebKit capture smoke passed with live video/audio capture and received tracks, decoded video, and zero camera/microphone calls.
- Verification passed: W2 focused 2 files / 9 tests; full 22 files / 123 tests; typecheck; build; static smoke; opt-in capture smoke; full query-off browser/catalog/prep-failure regression; and `git diff --check`.
- Added `.loop/reports/2026-07-18_w2_capture_spike.md` with exact provenance and future device procedure. W2 remains `in_progress` pending independent evaluation; actual-iPhone/two-device non-silent and audible evidence is absent, so W2 cannot be `done` and W3 remains blocked.

## 2026-07-18 14:15 | evaluator | W2 local implementation accepted as partial; pipeline stopped

- The initial independent review withheld PASS for failed-start resource rollback, stop-during-SDP/ICE races, a silent-audio fallback shorter than the specified five-second watchdog, and over-strong initiating-gesture wording. A second pass found destination-track rollback and stale rejected-stats cleanup edges.
- Corrected the adapter to register and transactionally stop owned destination/video tracks and disconnect only its graph edges on any startup failure. Added connection-stage failure injection.
- Allocated the loopback generation before the first await, guarded every negotiation/event/stats/fallback continuation, ignored stale rejected polls, and added stop-during-deferred-offer plus reject-after-stop tests.
- Made the silent-media fallback wait ten 500 ms interval polls after the immediate sample, retained decoded-video plus observed non-silent-audio readiness, and documented that the ordinary menu path's autosave await makes the initial receiver resume an attempt rather than confirmed Safari gesture association.
- Final verification passed: typecheck; W2 focused 2 files / 13 tests; adapter/runtime/lifecycle 5 files / 38 tests; full 22 files / 127 tests; production build; static smoke; final rebuilt capture-on Bubble smoke in desktop Chromium and mobile WebKit; final rebuilt targeted query-off Bubble smoke; the earlier full browser/catalog/prep-failure regression; and `git diff --check`.
- Final independent re-evaluation returned PASS with no Critical, High, Medium, or Low code finding. Assigned W2 `partial`, not `done`, because actual-iPhone Gate 1A, human-audible two-device output, prompt/tap counts, Settings inventory, and both D016 orientations remain unavailable. W3 stays `blocked`; no W3 source was started.

## 2026-07-19 15:30 | generator | Mixed-iPhone diagnostic exposed black-preview false positive and bounded correction

- Reverified `2p-bubble` at `ece0fea` with its existing dirty W0/W1/W2 worktree. D019 records Phone A iPhone 16 Pro Max and Phone B iPhone 15 Pro, both iOS 26.5.2 with builds unconfirmed, as the current support pair; the build exception applies only to this practical diagnostic.
- On the same Wi-Fi, each phone opened the direct LAN HTTP system-Safari URL with `?captureSpike=1` preserved and the W2 panel present. No camera/microphone or error prompt appeared. Both showed live `v=1/a=1`, running contexts, rising media counters, and audible same-device game audio, but both received previews remained black.
- Phone A numeric samples changed from RMS/frames/packets `0.0000/5431/11955` to `0.0012/6114/13240`. Phone B initially showed fallback available, but the user did not press it; it disappeared and the old harness reported ready after game start. Fallback use was zero on both devices.
- Classified both old `ready=true` values as false positives. The runs were same-page, LAN HTTP, Safari-only, and non-cross-device; no Home Screen, secure-origin, role-swap, recording, or Gate 1A evidence was produced. The Vite server was stopped; Tailscale, Pages, tunnels, signaling, TURN, DNS, and secrets were untouched.
- Corrected only W2: prefer the runtime-owned canvas; keep staging at one renderable viewport pixel; submit each `captureStream(0)` frame explicitly; inspect preview play/presentation, nonblack pixels, time advancement, motion, and live tracks; and require screenshot-based nonblack/motion evidence in capture smoke.
- The first correction review found stale lifetime-latched readiness. Added bounded recent pixel/time activity, current nonblack/live-track gates, and regressions for static freeze, frozen `currentTime`, black-after-ready, ended track, and persistent black.
- Fresh Node 25.8.1 verification passed: typecheck; focused 3 files / 39 tests; full 22 files / 136 tests; production build; static smoke; rebuilt capture-on Bubble Bobble desktop Chromium/mobile WebKit smoke; rebuilt targeted query-off Bubble smoke; final full query-off browser/catalog/prep-failure smoke; script syntax; and `git diff --check`. Node 24 was unavailable, so CI parity is not claimed.
- Appended the physical evidence, source provenance, and future secure-device procedure to `.loop/reports/2026-07-18_w2_capture_spike.md`. No dependency, W3 code, commit, push, `main`, Pages, or external-service change occurred.

## 2026-07-19 15:31 | evaluator | Local black-preview correction accepted; physical gate unchanged

- The initial evaluation rejected the correction because a static, black, frozen-time, or ended video could retain `ready` after one earlier motion sample.
- Re-evaluation confirmed that current nonblack content, live audio/video tracks, bounded-recent pixel motion, and bounded-recent preview-time advancement now gate readiness and that each stale-video case has focused coverage.
- Independently passed focused 3 files / 39 tests, typecheck, and `git diff --check`; accepted the reported full 22 files / 136 tests, production build, and rebuilt desktop/mobile capture smoke as consistent supporting evidence.
- Returned ACCEPT with no Critical, High, Medium, or Low finding for the local correction only. No post-correction iOS compositor result exists; W2 remains `partial`, W3 remains `blocked`, and no later slice may start.

## 2026-07-19 18:06 | generator | Phone A disproved first correction; display-buffer bridge ready

- Phone A reopened the current direct-LAN HTTP system-Safari URL at `172.30.1.27` with `?captureSpike=1` preserved and the W2 panel present. The game and controls loaded, no permission/error popup appeared, game sound was audible, and media counters looked normal and increased.
- The received W2 video remained black. The corrected harness honestly reported `status=failed`, `ready=false`, `fallback=none`, and `video visible=false changing=false black=true`; no numeric transcription was required. Phone B was not rerun, no artifact was recorded, and the Vite server was stopped.
- Current WebKit source uses a display-buffer path for direct WebGL canvas capture while direct WebGL readback with `preserveDrawingBuffer=false` can be black. Replaced the failing source-to-2D copy with `source canvas captureStream(30) -> muted inline bridge video -> exact 512x448 opaque software-backed 2D staging -> captureStream(30)`. This is a bounded W2 same-page path, not signaling, TURN, guest routing, or W3.
- Added independent source/bridge/staging/receiver readback, a first-line Korean `영상 경로` diagnosis, black/static/unreadable separation, and strict current receiver visibility/motion/time/live-track readiness. A source readback may remain black while a moving bridge/staging/receiver is valid; black latches clear when readback becomes unavailable.
- Captured the stable OpenAL master gain before falling back to short-lived per-source gains. Existing audible output remains connected; the capture analyser/destination is a parallel owned edge and is removed on cleanup.
- Final Node 25.8.1 verification passed: focused 3 files / 51 tests; full 22 files / 148 tests; typecheck; production build; static smoke; opt-in desktop Chromium/mobile WebKit capture smoke; targeted query-off Bubble smoke; and full query-off browser/catalog/preparation-failure smoke. Mobile WebKit reached `ready=true` with receiver RMS and moving visible video. Node 24 remains unavailable, so CI parity is not claimed.
- The first sandboxed capture-smoke launch failed before page execution with `listen EPERM` on the local preview port. The authorized local-port rerun passed; this was recorded as an environment preparation failure, not a media result.
- No dependency, W3 code, commit, push, `main`, Pages, Tailscale route, tunnel, signaling, TURN, DNS, secret, certificate, firewall, or external-service change occurred.

## 2026-07-19 18:07 | evaluator | Display-buffer bridge accepted; physical gate unchanged

- Independent code evaluation and a separate test audit accepted the bridge scope, cleanup, OpenAL graph ownership, desktop-only smoke exception, physical readiness contract, and W3 boundary.
- Corrected the audit's black-to-unreadable latch finding and the evaluator's Low diagnostic-branch coverage gap. Focused tests now directly cover source capture failure, staging copy failure, downstream capture failure, bridge/staging/receiver unreadable results, and source-black/display-bridge success.
- Final re-evaluation returned ACCEPT with no Critical, High, Medium, or Low finding. This is local W2 acceptance only: no post-bridge physical iPhone result or cross-device guest playback exists, so W2 remains `partial` and W3 remains `blocked`.

## 2026-07-19 18:32 | generator | Phone A bridge passed; small-screen W2 control obstruction corrected

- Phone A reopened `http://172.30.1.27:5173/ponpoko/?captureSpike=1` in system Safari. The new panel reported `영상 경로: 정상`; the user visually confirmed the received W2 game image was visible and moving, heard same-device game sound, did not press `방 열고 소리 켜기`, saw `status=ready`, and reported no permission/error popup. No numeric transcription or recording artifact was requested.
- This is a positive same-page physical bridge compatibility result for Phone A, not receiver-only audio proof: the run did not isolate the emulator speaker path from the receiver graph. It is LAN HTTP, not secure/Home Screen/cross-device, so it cannot close Gate 1A.
- Phone B could not proceed with the post-bridge run. The user then tried an opportunistic iPhone XS Max on iOS 17.4.1. It loaded Bubble Bobble but could not enter gameplay because the fixed W2 panel covered the mobile `동전` button on the smaller display. That run produced no media result and XS Max is not a D019 substitute.
- Moved the Bubble/query-only W2 panel inside `.game-stage` and changed it from viewport-fixed to stage-absolute, stage-bounded, internally scrollable layout. The diagnostic preview and one-shot fallback remain interactive while the panel cannot extend into the mobile control surface.
- Added capture-on browser assertions that the panel is a stage descendant, every panel edge stays inside the stage, and the center of every visible enabled mobile action—including Coin—is the actual hit target.
- Node 25.8.1 verification passed: typecheck; full 22 files / 148 tests; script syntax; production build; capture-on desktop Chromium/mobile WebKit smoke with visible/moving video and mobile `ready=true`; targeted query-off Bubble desktop/mobile smoke; and `git diff --check`. Node 24 remains unavailable, so CI parity is not claimed.
- Independent evaluation returned ACCEPT with no Critical, High, Medium, or Low finding for the small-screen correction. No dependency, W3 code, commit, push, `main`, Pages, Tailscale, tunnel, signaling, TURN, DNS, secret, certificate, firewall, or external-service change occurred.
- Next physical action is only to confirm on XS Max that Coin/game entry is no longer obstructed. Any later XS media observation remains extra compatibility information; D019 Phone B and secure cross-device evidence are still required. W2 remains `partial`, W3 `blocked`.

## 2026-07-19 19:58 | generator | WebKit play race corrected; supplemental iPhone 15 Pro Max bridge passed

- The XS Max follow-up confirmed that the stage-bounded W2 panel no longer blocked Coin or other mobile controls, but Bubble boot/start remained very slow and inconsistent. XS Max/iOS 17.4.1 is not a support target and produced no valid W2 media result.
- Corrected the WebKit media-element race exposed by `The operation was aborted`: preview attachment/play now happens only for the first video track, audio arrival cannot reset the preview source, bridge/preview play is single-flight, at most one current `AbortError` retry is allowed, and source/generation/token guards reject stale completions. Genuine `NotAllowedError` remains fatal unless current presentation independently proves success.
- Earlier same-session Node 25.8.1 verification passed typecheck; focused 2 files / 36 tests; full 22 files / 153 tests; production build; static smoke; capture-on desktop/mobile smoke; query-off desktop/mobile smoke; and `git diff --check`. An independent Evaluator returned ACCEPT with no Critical, High, Medium, or Low finding. Node 24 was unavailable, so CI parity is not claimed.
- A temporary iPhone 15 Pro Max/iOS 26.5.2 opened the dirty build from system Safari at `http://172.30.1.27:5173/ponpoko/?captureSpike=1`. Earlier attempts with the missing `?` were invalid; the valid run preserved the query and displayed the W2 panel.
- The user started screen recording. The valid debug-run tap ledger was Coin once, Play/Start once, OK zero, Fire zero, and `방 열고 소리 켜기` once. The panel initially showed `영상 경로: 확인 중` and `status=fallback`; after the single fallback tap, with no retry, receiver video and game sound started and the panel reached `영상 경로: 정상` and `status=ready`. A later observation confirmed sustained moving W2 video, sustained game sound, and no permission/error popup. These emulator/debug taps are not the future production host/guest CTA count.
- The user stopped recording and closed the Safari tab. The recording was not transferred into the repository, so no workspace artifact is claimed. No high-rate counter transcription, exact frame-rate sample, isolated receiver-only audio, secure-origin/Home Screen behavior, cross-device playback, or swapped orientation was collected.
- D020 keeps the temporary iPhone 15 Pro Max result supplemental; D019's iPhone 15 Pro Phone B remains untested. W2 stays `partial`, W3 stays `blocked`. The direct-LAN Vite server was stopped and port 5173 had no listener; no Tailscale route, Pages, tunnel, signaling, TURN, DNS, secret, certificate, firewall, dependency, commit, push, `main`, or external-service change occurred.

## 2026-07-19 20:08 | planner | iPhone 15 Pro Max accepted as practical W2 Phone B proxy

- The user clarified that iPhone 15 Pro and iPhone 15 Pro Max have no material difference for the objective of this W2 media-path test and directed the work to avoid exact-model bookkeeping that does not change the decision.
- Corrected D020 and the current spec/contract/plan/progress/report state: the successful iPhone 15 Pro Max run satisfies the practical Phone B per-device compatibility question, and no exact iPhone 15 Pro same-page repetition is required.
- The iPhone 15 Pro remains the product support target; the Pro Max proxy is accepted specifically for capture, WebKit playback, audio activation, and future cross-device Gate 1A execution. XS Max remains non-target.
- The meaningful remaining gate is cross-device video/audio with receiver-only audibility, secure-origin/Home Screen coverage, exact formal-run Settings inventory, and both role orientations. Same-page evidence still cannot close Gate 1A; W2 remains `partial` and W3 remains `blocked`.
- Documentation-only correction: no source code, test, dependency, server, network route, infrastructure, commit, push, `main`, or Pages change occurred.

## 2026-07-19 | planner | D021 one-way LAN W2 boundary authorized

- Recorded the user's authorization for a temporary W2-only same-Wi-Fi LAN HTTP harness with ephemeral Mac in-memory signaling, Phone A as host, and D020's iPhone 15 Pro Max Phone B proxy as guest.
- The user waived role swapping for this W2 objective because no material device difference is expected; revisit it only if device-specific evidence appears. This waiver does not change D019's exact W11 product pair or direct/TURN matrix.
- The approved boundary excludes Tailscale, public tunnels, Pages, TURN, DNS, secrets, dependencies, external infrastructure, W3 protocol work, and a product guest route.
- No harness implementation or cross-device result is claimed by this documentation entry. LAN HTTP cannot prove secure-context or Home Screen behavior; W2 remains `partial` and W3 remains `blocked`.

## 2026-07-19 21:34 | generator | D021 LAN harness corrected and ready for final re-evaluation

- Implemented the temporary W2-only same-Wi-Fi LAN HTTP harness with Mac process-memory signaling, a sender-only Phone A host, and a structurally pre-routed ROM/emulator-free receiver-only Phone B guest. The peer path uses non-trickle local ICE with `iceServers: []` and adds no dependency, Tailscale, tunnel, Pages, TURN, DNS, secret, external service, W3 protocol, or reusable product route.
- The initial independent evaluator rejected signaling revision replay, false ready retention, stale async generation writes, silent fallback behavior, and stale documentation. The corrected implementation uses process-lifetime nonreused revisions, revision-conditional deletion, a two-second ready lease with 500 ms guest heartbeat/false revocation, async generation fencing, a five-second silent watchdog with one fallback, and recovery from a residual answered generation; focused regressions cover the repaired cases.
- Verification on Node 25.8.1 passed: focused 2 files / 35 tests; full 24 files / 188 tests; typecheck; production build; static smoke; two-page LAN desktop Chromium and mobile WebKit including same-room sequential rerun; legacy same-page capture desktop/mobile; and query-off Bubble desktop/mobile. Node 24 was unavailable, so CI parity is not claimed.
- Final independent re-evaluation is pending. No physical D021 Phone A-to-Phone B run has occurred after this verified build. W2 remains `partial`, W3 remains blocked, LAN HTTP is not secure-context/Home Screen proof, the D021 role-swap waiver remains W2-only, and W11's exact D019 pair/orientations/direct+TURN matrix is unchanged.

## 2026-07-19 21:47 | generator | D021 stale-offer CAS correction

- The next independent review found that an already-dispatched stale host offer could still overwrite a newer same-room offer after local abort. Offer creation now compares the server's observed current revision, rejects conflicts without mutation, and permits only the still-current host one fenced re-read and retry; a stopped host cannot retry or update local state.
- Tightened signaling `Content-Type` parsing to exact `application/json` with optional parameters and added adversarial arrival-order, one-retry, second-conflict, and exact 500 ms watchdog/poll timing regressions. The two low documentation drifts were also corrected without changing W11.
- Node 25.8.1 verification passed: focused 2 files / 40 tests, full 24 files / 193 tests, typecheck, production build, static smoke, and two-page LAN desktop Chromium/mobile WebKit with sequential same-room reuse. The earlier legacy same-page and query-off desktop/mobile smokes remain passing and were unaffected by this role-gated CAS change. Node 24 remains unavailable, so CI parity is not claimed.
- Final independent re-evaluation and the post-build physical A-to-B run remain pending. W2 stays `partial`, W3 stays blocked, and no excluded infrastructure, dependency, deployment, commit, or push occurred.

## 2026-07-19 23:00 | evaluator | D021 CAS and monotonic readiness accepted

- Final independent re-evaluation accepted the observed-revision offer CAS, current-host single retry, revision fencing, exact JSON parsing, cleanup, and W2-only scope with no remaining Critical, High, Medium, or Low finding.
- The first physical A-to-B run then delivered continuous moving video and game audio without permission prompts, but its instantaneous guest readiness text oscillated while the media itself remained continuous. That run was retained as useful delivery evidence, not a final pass.
- A dedicated readiness review rejected poll-count timing because delayed polls could exceed the intended two-second bound and rejected latched `정상` wording that hid a current missing sample. Replaced it with strict simultaneous initial/reacquisition AV evidence, four independent monotonic transport/content timestamps with pre-refresh expiry at exactly two seconds, immediate track/AudioContext revocation, and truthful `최근 정상` grace wording. EmulatorJS P2/Coin/Start behavior was not changed.
- A fresh independent evaluator returned ACCEPT. Final Node 25.8.1 verification passed focused 2 files / 46 tests, full 24 files / 199 tests, typecheck, production build, static smoke, desktop Chromium/mobile WebKit two-page LAN smoke, and `git diff --check`. Node 24 was unavailable, so CI parity is not claimed.

## 2026-07-19 23:17 | generator | D021 physical video passed; sustained receiver audio failed

- Phone A iPhone 16 Pro Max host and D020's Phone B iPhone 15 Pro Max/iOS 26.5.2 proxy guest opened the exact LAN role URLs at `172.30.1.27`. The host used `방 열고 소리 켜기` exactly once after audible local game start; Phone B began screen recording and used `참가하고 소리 켜기` exactly once.
- Phone B showed moving received video, initially audible game audio, no camera/microphone permission popup, and eventually `ready=yes`. During the next ten seconds guest audio stopped and remained silent. The bounded readiness logic then changed to `ready=no` and final `연결 중` while video remained visible. The already-used fallback and CTA were not retried, so the run is a sustained receiver-audio failure and not Gate 1A pass.
- The user stopped recording and closed Phone B and Phone A tabs. No recording file was transferred into the workspace. The Vite server was terminated and port 5173 had no listener. Tailscale was not used or changed; no Pages, tunnel, TURN, DNS, secret, certificate, firewall, dependency, commit, push, `main`, or external-service action occurred.
- W2 remains `partial`, W3 remains `blocked`, secure-origin/Home Screen evidence remains absent, and W11's D019 exact-pair/orientation/direct+TURN matrix remains unchanged. The next bounded task is user-independent diagnosis of the persistent receiver-audio loss within W2.

## 2026-07-19 23:44 | generator | D021 audio result corrected; D022 natural-silence readiness implemented

- The user clarified that Bubble Bobble waiting screens are normally silent and that play can also contain quiet intervals. The final D021 ten-second quiet observation therefore cannot prove receiver-audio failure: the then-visible panel did not distinguish continued RTP packets, inbound `totalAudioEnergy`, and receiver analyser output. The earlier 23:17 failure label is retained as contemporaneous history but superseded for current interpretation. The run proves moving cross-device video, initial audible guest audio, zero permission prompts, one guest CTA, and one host fallback; its later silence is inconclusive.
- Kept strict simultaneous initial AV acquisition. After acquisition, packet-growing flat-energy silence now remains ready and renders `게임 무음(전송 정상)`. Audio RTP inactivity still revokes at the existing two-second freshness boundary. Growing inbound energy with absent receiver RMS starts a fresh mismatch timer and revokes only after a continuous two seconds. Non-running receiver AudioContext and ended tracks remain immediate. No automatic recovery, additional CTA/fallback, input/P2/Coin/Start, OpenAL graph, W3, dependency, or infrastructure change was added.
- The first independent review found that a no-packet/no-energy poll did not clear the receiver-output mismatch timer. That interruption now resets the timer, and a focused regression proves that later mismatch samples receive a fresh full two-second window.

## 2026-07-19 23:46 | evaluator | D022 natural-silence correction accepted

- Independent re-review returned ACCEPT with no remaining finding. Final Node 25.8.1 verification passed focused 2 files / 51 tests, full 24 files / 204 tests, typecheck, production build, static smoke, desktop Chromium/mobile WebKit two-page LAN smoke, and `git diff --check`. The first browser-smoke attempt was blocked before app startup by sandbox `listen EPERM` on `127.0.0.1:4176`; the approved out-of-sandbox rerun passed, terminated its preview server, and left no listener on ports 4176 or 5173.
- Node 24 remains unavailable, so CI parity is not claimed. No Tailscale route was used or changed, and no Pages, tunnel, TURN, DNS, secret, certificate, firewall, dependency, commit, push, `main`, or external-service action occurred. W2 remains `partial`, W3 remains `blocked`, and the next physical action is one fresh bounded D022 A-to-B run when the devices are available.

## 2026-07-20 00:04 | operator | D022 physical natural-silence check failed

- Reconfirmed the dirty `2p-bubble` checkout at `ece0feaedd04ebb11df95fc49aa0fba8e273a766`, started the Vite server only after device availability, and used direct same-Wi-Fi LAN HTTP at `172.30.1.27:5173`. Both exact role queries and `W2 LAN capture · Phone A` / `Phone B` panels were visible; no Tailscale path was used.
- Phone A initially remained white after Bubble Bobble selection, but the user used the practical game controls and reached the running game. No extra boot-sequence test was performed. The host fallback and guest CTA were each pressed exactly once.
- Phone B then showed moving received video, audible game audio, no permission popup, and `ready=yes`. While Phone A remained on the quiet game waiting screen before active play, Phone B became inaudible after several seconds and changed to `소리=수신 출력 무음` with `ready=no` instead of the intended healthy `게임 무음(전송 정상)` classification.
- The user did not start another round or retry either one-shot action. The run is a physical D022 natural-silence failure, not Gate 1A closure. The user was instructed to close both Safari tabs; the Vite server was terminated and port 5173 had no listener.
- No recording or numeric counter transcription was requested. No code, dependency, Tailscale route, Pages, tunnel, TURN, DNS, secret, certificate, firewall, commit, push, `main`, W3, or external-service change occurred. W2 remains `partial`, W3 remains `blocked`; next work is bounded diagnosis under separately confirmed scope.

## 2026-07-20 00:29 | generator | D023 interval-normalized natural-silence correction verified

- An independent Planner traced the physical `수신 출력 무음` false mismatch to treating every positive cumulative `totalAudioEnergy` delta as material while receiver RMS used 8-bit samples. The exact physical contribution of decoder noise, quantization, and poll-window timing is not known because no numeric counters were requested.
- Added inbound `totalSamplesDuration` and the W3C interval RMS calculation `sqrt(Δenergy / Δduration)`. Receiver RMS now prefers float time-domain samples and uses a conservative byte-resolution fallback. Only material normalized energy can start the two-second output-mismatch timer; tiny energy is source silence, while missing/non-finite/zero-duration/reset statistics interrupt mismatch continuity as unknown.
- Preserved strict initial A/V acquisition, video and RTP two-second freshness, immediate track/AudioContext failures, one CTA, one fallback, revision/generation fencing, and cleanup. No automatic recovery, input/P2/Coin/Start, OpenAL graph, W3, dependency, signaling/TURN/DNS/secret, Pages, `main`, or infrastructure change was made.
- Added regressions for tiny decoder energy, float sub-byte output, conservative byte fallback, missing/reset statistics, material-energy output mismatch, interrupted mismatch, RTP stop, context stop, and ended tracks.
- Node 25.8.1 verification passed focused 2 files / 55 tests, full 24 files / 208 tests, typecheck, production build, static smoke, W2 two-page LAN desktop Chromium/mobile WebKit, query-off Bubble desktop/mobile, full feature-flag-off browser/unfiltered catalog/preparation-failure smoke, and `git diff --check`. The initial sandboxed W2 smoke failed before assertions on local-port binding; its approved host-environment rerun passed. Node 24 remains unavailable, so CI parity is not claimed.

## 2026-07-20 00:30 | evaluator | D023 accepted; physical gate unchanged

- Independent evaluation returned ACCEPT with no Critical, High, Medium, or Low finding for interval energy normalization, float/byte receiver sampling, invalid/reset-stat handling, preserved hard/freshness gates, lifecycle resets, and focused coverage.
- The evaluator independently reran the focused W2 LAN/signaling pair: 2 files / 55 tests passed; `git diff --check` passed.
- This is local and automated-browser acceptance only. No post-D023 iPhone result exists; W2 remains `partial`, W3 remains `blocked`, and the next bounded physical action is one A-to-B recheck of initial normal acquisition followed by the quiet waiting-screen classification.
