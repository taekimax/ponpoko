# W2 Local Capture Spike Implementation

- Prepared: 2026-07-18 13:55 KST
- Role: Generator
- Evaluated: 2026-07-18 14:15 KST
- Status: W2 `partial`; bounded local implementation passed independent evaluation, while actual-iPhone Gate 1A and the required two-iPhone host/guest evidence are unavailable
- Evaluator result: PASS with no Critical, High, Medium, or Low code finding after the documented correction rounds
- Source requirements: P2, P4, and P5 within the bounded W2 development allowance
- Mutation boundary: app-owned capture adapter, Bubble-only query harness, same-page in-memory loopback, focused tests, and opt-in smoke only; no dependency, signaling service, TURN, QR, DataChannel, guest route, production `PeerSession`, infrastructure, `main`, or Pages change

## Implemented boundary

- `StreamCaptureAdapter` copies the runtime canvas to an app-owned, offscreen-but-renderable 512x448 staging canvas at 30 fps, preserves source aspect on black, and sets the video track `contentHint` to `motion`.
- The adapter reads only the actual post-ROM EmulatorJS OpenAL context and current source gain nodes through a narrow runtime-owned provider. It connects owned graph edges to an analyser and `MediaStreamDestination`, combines the resulting audio track with staging-canvas video, reports RMS/context/track state, resumes a freshly read runtime context, and transactionally cleans up only its own graph edges, tracks, animation frame, and canvas on both success and failed startup.
- `EmulatorJsNativeEmulator` keeps `window.EJS_emulator`, `Module.AL`, the runtime canvas, and OpenAL nodes private. It exposes a cached adapter only for loaded Bubble Bobble and stops it before runtime disposal.
- `?captureSpike=1` activates a Bubble-only debug harness. Query absence creates no panel, receiver AudioContext, capture adapter session, or peer connection.
- The harness attempts to resume its owned receiver AudioContext when `startGame()` prepares the spike, starts two `RTCPeerConnection`s with `iceServers: []`, exchanges SDP/ICE only in memory, sends only the capture media, renders received video as muted/autoplay/playsInline, plays received audio through the receiver context/analyser, and polls inbound frames/packets/energy. The ordinary menu path awaits autosave lookup before `startGame()`, so this report does not claim that Safari still associates the attempt with the initiating game-card tap.
- `방 열고 소리 켜기` is exposed only for missing or suspended audio, or after the full five-second silent-media watchdog, and can run once. It resumes the fresh runtime/receiver contexts and replaces the local loopback once; a silent result remains failed rather than ready.
- Negotiation, ICE handlers, track handlers, stats polling, and fallback restart use generation guards so teardown cannot install late timers or overwrite idle/new-loop state.
- Runtime/menu/error/non-BFCache page disposal stops the harness with the emulator. No camera or microphone API is used.

## Runtime diagnostic and correction

The first mobile WebKit loopback received live tracks but decoded zero video frames because the staging canvas used the HTML `hidden` attribute. The adapter now keeps the canvas connected and renderable at an offscreen position. The corrected desktop Chromium and mobile WebKit capture smoke passes. This is desktop/headless WebKit evidence, not an actual-iPhone result.

## Verification

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm test -- tests/stream-capture.test.ts tests/stream-capture-spike.test.ts` | PASS: 2 files, 13 tests |
| Focused adapter/runtime/lifecycle set | PASS: 5 files, 38 tests |
| `npm test` | PASS: 22 files, 127 tests |
| `npm run build` | PASS |
| `npm run smoke` | PASS: build paths, ROM hashes, local EmulatorJS assets, and start states |
| `GAME_RUNTIME_SMOKE_GAME=bublbobl GAME_RUNTIME_SMOKE_CAPTURE=1 npm run games:smoke` | PASS: desktop Chromium and mobile WebKit fixed-size capture, live video/audio tracks, received loopback tracks, decoded video, muted inline preview, mapped input, and zero `getUserMedia` calls |
| `GAME_RUNTIME_SMOKE_GAME=bublbobl npm run games:smoke` | PASS on the final rebuilt source: desktop Chromium/mobile WebKit boot, mapped input, and query-off capture boundary |
| `npm run browser:smoke` | PASS earlier in the same W2 diff: query-off WebKit Ponpoko, unfiltered desktop/mobile catalog, and preparation-failure regression; the final cleanup-only corrections were followed by the targeted rebuilt query-off run above |
| `git diff --check` | PASS |

The automated capture smoke deliberately does not treat headless RMS, track presence, or packet counters as non-silent/audible iPhone proof. Its success condition verifies the local harness boundary only.

## Independent evaluation and corrections

- The first W2 evaluation withheld PASS for non-transactional adapter startup cleanup, teardown racing pending SDP/ICE, a roughly one-second silent fallback instead of the specified five-second watchdog, and over-strong initial-gesture wording.
- The correction added owned-resource rollback with failure injection, operation-generation checks before and after every async negotiation stage, stop-during-negotiation coverage, ten 500 ms watchdog polls excluding the immediate sample, and attempted-arm wording with the autosave-await caveat.
- Re-evaluation found two residual edges: destination audio tracks had to be registered before graph connection could throw, and a stale rejected stats poll had to be generation-guarded. Both received focused regressions.
- Final independent re-evaluation returned PASS with no Critical, High, Medium, or Low code finding and assigned W2 `partial`, not `done`.

## Open-source and source provenance

| Consulted source | Exact local/version evidence | Use | Copied code | License / attribution handling |
|---|---|---|---|---|
| EmulatorJS project, <https://github.com/EmulatorJS/EmulatorJS>, vendored `public/emulatorjs/emulator.min.js` and `loader.js` | Authoritative plan identifies EmulatorJS 4.2.3; local import commit `8a133230a03cec881f701af8e2c388719ef6f457`; `emulator.min.js` SHA-256 `6aec3fd7bb2721255801b0a6af02e47e78b05e28a1822b1f213aacbd348abaee`. The vendored files themselves say only `stable`, so no stronger upstream revision is claimed. | Consulted the existing `collectScreenRecordingMediaTracks` canvas/OpenAL concept and start-hook shape; implemented a separate app-owned adapter and did not call the private minified helper. | `no` | Existing GNU GPL v3 `public/emulatorjs/LICENSE` and `NOTICE.txt` remain unchanged and continue to cover the unmodified vendor assets. |
| TypeScript DOM library, TypeScript 5.9.3, <https://github.com/microsoft/TypeScript/tree/v5.9.3> | Installed `node_modules/typescript/lib/lib.dom.d.ts`; package version 5.9.3 | Confirmed the local `HTMLCanvasElement.captureStream(frameRequestRate?)` DOM typing used by the independent implementation. | `no` | No TypeScript source was copied; the existing development dependency and its license handling are unchanged. |

No external WebRTC sample or new dependency source was opened or copied during W2 implementation. The same-page peer exchange and Web Audio graph were independently written from the project contract and browser DOM APIs.

## Missing Gate 1A evidence

- No actual iPhone 15 Pro ran the post-ROM capture path.
- No Settings readback confirms iOS 26.5.2 build 23F84/system Safari 26.5 on either required phone.
- No human confirmed non-silent captured game audio or audible receiver output.
- No physical host one-tap/fallback-tap count or camera/microphone permission-prompt count was recorded.
- The same-page loopback cannot prove D016's Phone A host to Phone B guest path or the swapped orientation. Adding temporary signaling or reusable session code would violate the active W2 boundary.

## Reproducible future device procedure

1. Reverify both iPhone 15 Pro Settings version/build against D016 before testing. Do not infer compatibility from a different stable release.
2. Serve the current branch build from an approved secure origin without changing `main` or public Pages, then open `?captureSpike=1` on Phone A in the Home Screen app.
3. Start Bubble Bobble from the app. The harness attempts receiver-context resume during `startGame()`, but the ordinary menu path has already awaited autosave lookup, so record the actual context/tap result rather than assuming transient activation survived. Wait through the five-second watchdog for the W2 panel to show 512x448 at 30 fps, live capture/received video and audio tracks, decoded video, and changing audio energy.
4. If `방 열고 소리 켜기` appears, tap it once. Record whether the panel reaches ready, whether captured receiver audio is human-audible, the app/OS prompt count, and the total host tap count. Do not retry the fallback in the same run.
5. Repeat the same local compatibility run on Phone B in Safari, then swap Safari/Home Screen modes as D016 requires. These local runs are useful device evidence but still do not prove cross-device guest output.
6. W2 can become `done` only after a separately authorized contract-compatible mechanism proves Phone A host to Phone B guest audible output and the swapped orientation. Until then keep W2 `partial` and W3 blocked; do not add temporary signaling to manufacture closure.

## Evaluator determination

The bounded local W2 implementation is complete and useful, with query-off regressions preserved, and the independent Evaluator accepted the corrected code with no remaining finding. W2 is `partial` because the required physical/two-device closure evidence cannot be produced in the current remote environment and active slice boundary. W3 must not start.

## 2026-07-19 practical compatibility diagnostic and black-preview correction

This dated addendum supersedes the earlier report only for current device inventory, observed physical evidence, and the later local correction. The 2026-07-18 implementation/evaluation history above remains unchanged.

### Current device decision

- Phone A: iPhone 16 Pro Max, iOS 26.5.2, build unconfirmed.
- Phone B: iPhone 15 Pro, iOS 26.5.2, build unconfirmed.
- Both models are support targets under D019. The user allowed unconfirmed builds only for this bounded practical compatibility diagnostic. Formal Gate 1A still requires exact Settings inventory.

### Physical diagnostic result

The Mac and each phone were on the same Wi-Fi. The dirty `2p-bubble` Vite server was reached directly from system Safari at `http://192.168.219.51:5173/ponpoko/?captureSpike=1`; the query remained present and the `W2 capture spike` panel appeared on both phones. Tailscale, `*.ts.net`, Pages, and an external tunnel were not used. The Vite server was stopped after the run.

| Device | Observed evidence | Invalid or missing evidence |
|---|---|---|
| Phone A | Query and panel present; no error or permission prompt; capture/received `v=1/a=1`; capture/receiver contexts running; audible game sound. At T1: RMS `0.0000`, video frames `5431`, audio packets `11955`. At T2: RMS `0.0012`, video frames `6114`, audio packets `13240`. The fallback button was not pressed. | Received preview remained black despite rising counters and the then-current `ready=true`. No Home Screen, secure-origin, cross-device, or recording artifact. |
| Phone B | Query and panel present; no error or permission prompt; moving source game, `v=1/a=1`, both contexts running, and audible game sound. Initial `status=fallback`, `ready=false`, `fallback=available` changed without a fallback press to `ready=true`, `fallback=none` after game start. | Received preview remained black. No two-time numeric capture, Home Screen, secure-origin, cross-device, or recording artifact. |

Same-device game sound was audible on each phone, but the run did not isolate the emulator's original speaker path from the receiver graph, so human-audible receiver-only output is not proven. It is not Phone A-to-Phone B guest-audio evidence. The direct LAN origin is HTTP and not a secure context, so this run cannot establish HTTPS, PWA, or Home Screen behavior. The current harness creates sender and receiver peers in one page; it contains no guest route, signaling, TURN, or cross-device path. Therefore the result is a useful failed Safari compatibility observation, not Gate 1A evidence. Camera/microphone prompts were zero and the fallback was used zero times, but those fields cannot rescue the black-video failure or substitute for the missing formal run.

The old `ready` signal was a false positive: it required decoded frames and observed audio but did not inspect presented pixels, current motion, preview-time advancement, or live track state.

### First bounded correction (subsequently failed on Phone A)

- Prefer `window.EJS_emulator.canvas` as the capture source, with a validated nonzero DOM-canvas fallback.
- Keep the 512x448 staging canvas connected inside the viewport at one opaque CSS pixel rather than at `left:-10000px`.
- Use `captureStream(0)` and call `CanvasCaptureMediaStreamTrack.requestFrame()` after the initial draw and each scheduled 30 fps draw; fail and roll back explicitly if manual frame requests are unavailable.
- Record preview `play()` rejection, paused/ready state, dimensions, time advancement, nonblack pixels, pixel motion, black state, and live received-track counts.
- Require current nonblack content plus bounded-recent pixel motion and preview-time advancement before `ready`; clear it for black content, a static/frozen preview, or ended tracks.
- Strengthen browser smoke by screenshotting the received `<video>` at distinct times and requiring at least 2% visible pixels and 1% changed pixels. Track/frame counters alone no longer pass.

### Fresh verification

All commands ran with Node 25.8.1. Node 24 was not present in the active shell, so CI parity is not claimed.

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| Focused capture/emulator tests | PASS: 3 files, 39 tests |
| `npm test` | PASS: 22 files, 136 tests |
| `npm run build` | PASS |
| `npm run smoke` | PASS |
| `GAME_RUNTIME_SMOKE_GAME=bublbobl GAME_RUNTIME_SMOKE_CAPTURE=1 npm run games:smoke` | PASS on rebuilt desktop Chromium and mobile WebKit, including ready state plus received-preview nonblack/motion screenshots |
| `GAME_RUNTIME_SMOKE_GAME=bublbobl npm run games:smoke` | PASS on rebuilt query-off Bubble Bobble desktop/mobile paths |
| `npm run browser:smoke` | PASS on final source: query-off Ponpoko WebKit, unfiltered desktop/mobile game catalog, and preparation-failure regression |
| `node --check scripts/game-runtime-smoke.mjs` | PASS |
| `git diff --check` | PASS |

The first independent review of this addendum's code withheld acceptance because lifetime-latched video activity could keep `ready=true` after a freeze, black transition, frozen `currentTime`, or ended track. The correction added bounded recent-activity/time windows, current nonblack content, live track gates, and explicit regressions for each case. Independent re-evaluation returned ACCEPT with no Critical, High, Medium, or Low finding. At that evaluation time no post-correction iOS execution had occurred; the later Phone A result below disproved this first correction's video path.

### Additional source provenance

| Consulted source | Revision / access evidence | Use | Copied code | License / attribution handling |
|---|---|---|---|---|
| W3C Media Capture from DOM Elements, <https://www.w3.org/TR/mediacapture-fromelement/> | Living specification accessed 2026-07-19 | Confirmed canvas capture-frame and manual frame-request semantics. | `no` | Specification text/code was not copied. |
| WebKit Bug 240380, <https://bugs.webkit.org/show_bug.cgi?id=240380> | Bug 240380 accessed 2026-07-19 | Consulted historical WebKit evidence that an out-of-DOM canvas could fail display preparation/frame production. | `no` | No WebKit source or patch was copied. |
| WebKit Bug 181663, <https://bugs.webkit.org/show_bug.cgi?id=181663> | Bug 181663 accessed 2026-07-19 | Consulted historical iOS canvas-capture black-video behavior; not treated as proof of the current cause. | `no` | No WebKit source or patch was copied. |
| WebKit Bug 230613, <https://bugs.webkit.org/show_bug.cgi?id=230613> | Bug 230613 accessed 2026-07-19 | Consulted historical WebGL canvas-capture black/red output; not treated as proof of the current cause. | `no` | No WebKit source or patch was copied. |

No third-party code or new dependency was added. The sources informed a bounded app-owned correction only.

### Post-first-correction Phone A result

Phone A later opened the current dirty build directly in system Safari at `http://172.30.1.27:5173/ponpoko/?captureSpike=1`. The full query remained, the W2 panel appeared, the game and controls loaded, no permission/error popup appeared, and game sound was audible. The user reported that counters looked normal and increased; no numeric transcription was requested or retained.

The received W2 video remained black. The panel reported `status=failed`, `ready=false`, `fallback=none`, and `video visible=false changing=false black=true`. This proves the first correction improved truthfulness but did not repair physical iOS video. Phone B was not rerun, no recording or screenshot artifact was produced, and the development server was stopped. The result remains same-page LAN HTTP evidence and cannot close Gate 1A.

### Display-buffer bridge follow-up

The working hypothesis, supported by the local probe and current WebKit implementation structure, is that the visible EmulatorJS WebGL display buffer can be capturable while a later direct readback/copy of the source drawing buffer is black when `preserveDrawingBuffer=false`. This is an inference, not a claim that a specific WebKit bug is proven on iOS 26.5.2.

The bounded W2 path now is:

1. capture the EmulatorJS source canvas directly at 30 fps;
2. play that source stream in an in-viewport, muted, autoplay, inline bridge video;
3. draw the bridge video into an exact 512x448 opaque software-backed 2D staging canvas at 30 fps; and
4. capture the staging canvas at 30 fps for the existing same-page sender/receiver loopback.

The adapter owns and cleans up the source/staging tracks, bridge element, animation frame, and capture-only audio graph edges. OpenAL capture prefers `currentCtx.gain`, the stable master mix, and uses per-source gains only as a fallback. No existing speaker connection is disconnected and no feedback edge is introduced.

The panel now starts with one human-readable result: `영상 경로: 정상`, `원본 캡처 실패`, `512x448 복사 실패`, `캔버스 캡처/전송 실패`, or a bounded readback-unavailable label. Source, bridge, staging, and receiver samples are independent. Failed/tainted readback is not black, and a black direct source readback does not fail the run when bridge, staging, and receiver are visibly moving. Production `ready` still requires live tracks, decoded frames, current nonblack receiver pixels, recent receiver motion and time advancement, a running receiver AudioContext, and observed changing nonzero receiver audio activity.

Bridge-follow-up files are `src/stream-capture.ts`, `src/stream-capture-spike.ts`, `src/emulator.ts`, `scripts/game-runtime-smoke.mjs`, `tests/stream-capture.test.ts`, `tests/stream-capture-spike.test.ts`, and `tests/emulator.test.ts`, plus this report and the authoritative `.loop`/WebRTC-plan status records. Requirements remain P2, P4, and P5; no later work item is implemented.

### Bridge verification and evaluation

All commands ran with Node 25.8.1. Node 24 was not present, so CI parity is not claimed.

| Check | Result |
|---|---|
| Focused capture/emulator tests | PASS: 3 files, 51 tests |
| `npm test` | PASS: 22 files, 148 tests |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm run smoke` | PASS |
| `GAME_RUNTIME_SMOKE_GAME=bublbobl GAME_RUNTIME_SMOKE_CAPTURE=1 npm run games:smoke` | PASS: desktop Chromium and mobile WebKit both showed a visible/moving receiver pipeline; mobile WebKit reached real `ready=true` with receiver RMS. Desktop headless used a script-only sender-RMS plus inbound-packet exception and did not change app/physical readiness. |
| `GAME_RUNTIME_SMOKE_GAME=bublbobl npm run games:smoke` | PASS: query-off Bubble Bobble desktop/mobile |
| `npm run browser:smoke` | PASS: query-off Ponpoko WebKit, unfiltered desktop/mobile game catalog, and preparation-failure regression |
| `git diff --check` | PASS |

The first unprivileged capture-smoke attempt stopped before page execution because the sandbox denied the local preview bind with `listen EPERM`. The authorized local-port rerun passed and is the result above; the denied attempt is not media evidence.

Independent code evaluation and a separate test audit initially identified a Low diagnostic-branch test gap and a stale black latch when receiver readback changed to unavailable. Both were corrected. Final re-evaluation returned ACCEPT with no Critical, High, Medium, or Low finding. This acceptance covers the local bridge only; it is not a physical-iPhone or cross-device result.

### Bridge-specific source provenance

| Consulted source | Revision / access evidence | Use | Copied code | License / attribution handling |
|---|---|---|---|---|
| WebKit `CanvasCaptureMediaStreamTrack.cpp`, <https://github.com/WebKit/WebKit/blob/main/Source/WebCore/Modules/mediastream/CanvasCaptureMediaStreamTrack.cpp> | `main` source accessed 2026-07-19 | Confirmed current WebKit has a direct WebGL display-buffer capture path distinct from 2D canvas conversion. | `no` | No WebKit code or comments were copied. |
| WebKit Bug 207128, <https://bugs.webkit.org/show_bug.cgi?id=207128> | Bug 207128 accessed 2026-07-19 | Consulted an unresolved report of WebGL-canvas-to-2D `drawImage` producing black output; used only as hypothesis support. | `no` | No patch or code was copied. |
| WebKit Bug 170325, <https://bugs.webkit.org/show_bug.cgi?id=170325> | Bug 170325 accessed 2026-07-19 | Consulted historical WebGL canvas-capture behavior; not treated as proof of the current cause. | `no` | No patch or code was copied. |
| WebKit Bug 230624, <https://bugs.webkit.org/show_bug.cgi?id=230624> | Bug 230624 accessed 2026-07-19 | Consulted frame-timing/request behavior while evaluating the discarded manual-request path. | `no` | No patch or code was copied. |
| WebKit Safari 18 canvas notes, <https://webkit.org/blog/15865/webkit-features-in-safari-18-0/> | Article accessed 2026-07-19 | Confirmed `willReadFrequently` can select a software-backed 2D canvas for repeated readback. | `no` | No article text or code was copied. |

No third-party code, dependency, license obligation, or attribution file was added. These sources informed an app-owned bridge and diagnostics only.

### Remaining Gate 1A procedure, updated by D020

1. Treat the per-device same-page media-path compatibility question as complete. Do not repeat it on an exact iPhone 15 Pro or continue XS Max diagnostics merely to reproduce equivalent evidence.
2. D021 authorizes a temporary same-Wi-Fi LAN HTTP run with Mac memory-only signaling, Phone A host, and D020's accepted iPhone 15 Pro Max proxy guest. Tailscale, Pages, public tunnels, certificate profiles, TURN, DNS, secrets, dependencies, and firewall changes remain unauthorized.
3. Prove actual Phone A-to-Phone B guest video/audio. Do not swap roles for this W2 objective unless a device-specific issue appears; the user explicitly waived that repetition under D021.
4. Require distinct nonblack/moving samples, live tracks, advancing preview time, changing nonzero RMS, isolated tester-audible guest game sound, zero prompts, and no fallback retry. Prefer an artifact or one-line verdict over manual high-rate counter transcription.
5. Do not assume Home Screen coverage from Safari. The current manifest `start_url` is `/ponpoko/` and may drop the query; establish an approved origin/query-preserving method before that mode.
6. Do not claim secure-context or Home Screen Gate 1A from separate same-page runs or the D021 LAN HTTP path. D021 can answer only the practical one-way cross-device receiver question.
7. Keep W2 `partial` and W3 `blocked` after the D021 experiment. Any formal closure of the remaining secure-mode gap requires a later explicit decision and independent evaluation.

### D021 authorized LAN experiment boundary

- Approved work: a temporary W2-only same-Wi-Fi LAN HTTP Phone A-host-to-Phone B-proxy-guest harness with ephemeral Mac in-memory signaling.
- Not approved: Tailscale, a public tunnel, Pages, TURN, DNS, secrets, dependency installation, external infrastructure, W3 protocol/session work, or a reusable product guest route.
- Orientation: A-to-B only. The user waived W2 role swapping as non-material to this objective; revisit only if a later device-specific failure appears.
- Evidence meaning: a positive run may establish practical receiver-isolated cross-device video/audio over LAN HTTP. It cannot establish secure-context or Home Screen behavior, cannot change W2 from `partial`, and cannot unblock W3 by itself.
- Current state at this dated boundary record: authorization only. The later 2026-07-19 D021 implementation addendum below supersedes only the implementation state; no D021 physical result is claimed.
- W11 remains unchanged: D019's exact product pair and the full direct/TURN matrix still apply unless a later W11-specific decision changes them.

### Post-bridge Phone A and small-screen follow-up

Phone A, the D019 iPhone 16 Pro Max on iOS 26.5.2 with build unconfirmed, reopened the dirty build in system Safari at `http://172.30.1.27:5173/ponpoko/?captureSpike=1`. The query and W2 panel were present. The first panel line was `영상 경로: 정상`, and the user visually confirmed that the received W2 game image was visible and moving. Same-device game sound was audible, `방 열고 소리 켜기` was not pressed, `status=ready`, and no permission or error popup appeared. No numeric transcription or recording artifact was requested.

This is useful physical Safari evidence that the display-buffer bridge repaired the earlier Phone A black-video result. It does not prove receiver-only audio because the run did not isolate the emulator's original speaker path from the receiver graph. It is still LAN HTTP same-page loopback evidence with no Home Screen, guest route, signaling, TURN, cross-device playback, or swapped orientation. It cannot close Gate 1A.

Phone B could not proceed with the post-bridge test, so its result remains missing. The user temporarily used an iPhone XS Max on iOS 17.4.1. That phone loaded Bubble Bobble but the viewport-fixed W2 panel covered the mobile `동전` control on the smaller display, preventing gameplay entry. The run stopped before a valid media observation. The XS Max is not part of D019 and cannot substitute for Phone B.

The W2-only panel now lives inside `.game-stage`, is absolutely positioned and bounded by the stage's clipped box, and remains internally scrollable. It can still show the live receiver preview and interactive one-shot fallback but cannot extend into the lower mobile controls. Capture-on smoke verifies panel ancestry/edges and center-point hit targets for every visible enabled mobile action, including Coin.

| Small-screen follow-up check | Result |
|---|---|
| `npm run typecheck` | PASS on Node 25.8.1 |
| `npm test` | PASS: 22 files, 148 tests |
| `node --check scripts/game-runtime-smoke.mjs` | PASS |
| `npm run build` | PASS |
| capture-on targeted Bubble smoke | PASS: desktop Chromium and mobile WebKit; visible/moving video retained, mobile `ready=true`, active controls unobstructed |
| query-off targeted Bubble smoke | PASS: desktop Chromium and mobile WebKit |
| `git diff --check` | PASS |

Independent evaluation accepted the small-screen correction with no Critical, High, Medium, or Low finding. At that point the next bounded action was an XS Max control-access check; the later follow-up and D020 below supersede that action. XS evidence remains non-target, while receiver-only/cross-device audio, secure-origin/Home Screen coverage, and both orientations remain open. W2 stays `partial` and W3 stays `blocked`.

### Post-small-screen play-race correction and Phone B proxy result

The XS Max follow-up confirmed that Coin and the other mobile controls were reachable after the stage-bounded panel correction. Bubble Bobble boot and game entry on that iPhone XS Max/iOS 17.4.1 remained very slow and inconsistent, however, so no valid W2 media result was retained. The user explicitly stated that XS support is not a project goal.

The XS diagnostic also exposed `bridgeError`/`previewError` values reporting `The operation was aborted`. The bounded W2 correction now attaches and plays the received preview only on the first video track; later audio-track arrival does not reassign `srcObject` or restart preview playback. Bridge and preview play attempts are readiness-gated and single-flight, allow at most one current `AbortError` retry, and use source/generation/token guards so late rejections cannot overwrite a newer or stopped run. Genuine `NotAllowedError` remains fatal when current presentation has not independently succeeded.

The correction files are `src/stream-capture.ts`, `src/stream-capture-spike.ts`, `scripts/game-runtime-smoke.mjs`, `tests/stream-capture.test.ts`, and `tests/stream-capture-spike.test.ts`, plus the current `.loop` evidence sync. Requirements remain P2, P4, and P5; no W3 or later-slice responsibility was added.

| Play-race source | Revision / access evidence | Use | Copied code | License / attribution handling |
|---|---|---|---|---|
| WHATWG HTML media-element `srcObject` processing, <https://html.spec.whatwg.org/multipage/media.html#dom-media-srcobject> | Living Standard accessed 2026-07-19 | Confirmed that assigning a media source invokes media loading, supporting the duplicate-source-reset diagnosis. | `no` | No specification text or code was copied. |
| WHATWG HTML pending play promises, <https://html.spec.whatwg.org/multipage/media.html#notify-about-playing> | Living Standard accessed 2026-07-19 | Distinguished multiple pending `play()` calls from source-reset cancellation and informed single-flight handling. | `no` | No specification text or code was copied. |
| WebRTC 1.0 remote-track processing, <https://w3c.github.io/webrtc-pc/#process-remote-tracks> | Editor's Draft accessed 2026-07-19 | Confirmed same-stream track delivery behavior and supported attaching the preview on the first video track only. | `no` | No specification text or code was copied. |
| WebKit changeset r271531, <https://trac.webkit.org/changeset/271531/webkit> | Revision 271531 accessed 2026-07-19 | Consulted WebKit's distinction between autoplay-policy `NotAllowedError` and cancellation-style `AbortError`. | `no` | No WebKit code or comments were copied. |
| WebKit Bug 243519, <https://bugs.webkit.org/show_bug.cgi?id=243519> | Bug 243519 accessed 2026-07-19 | Consulted a related Safari MediaStream abort report as supporting evidence only; it was not treated as proof of the device-specific cause. | `no` | No patch or code was copied. |

No third-party code, dependency, license obligation, or attribution file was added for this correction.

All verification below used Node 25.8.1. Node 24 was not available, so CI parity is not claimed.

| Play-race correction check | Result |
|---|---|
| `npm run typecheck` | PASS |
| Focused capture tests | PASS: 2 files, 36 tests |
| `npm test` | PASS: 22 files, 153 tests |
| `npm run build` | PASS |
| `npm run smoke` | PASS |
| capture-on targeted Bubble smoke | PASS: desktop Chromium and mobile WebKit; visible/moving video retained and mobile reached `ready=true` with receiver RMS |
| query-off targeted Bubble smoke | PASS: desktop Chromium and mobile WebKit |
| `git diff --check` | PASS |

Independent evaluation returned ACCEPT with no Critical, High, Medium, or Low finding. The correction remains within the same-page W2 harness; it adds no guest route, signaling, TURN, W3 protocol, dependency, or external service.

A later practical run used an iPhone 15 Pro Max on iOS 26.5.2 as Phone B because the iPhone 15 Pro was unavailable. D020 accepts this device as the practical proxy for the W2 media-path objective. The valid system-Safari URL was `http://172.30.1.27:5173/ponpoko/?captureSpike=1`; attempts that placed `captureSpike=1` in the path without `?` were invalid and are not evidence. In the valid run the query remained, the W2 panel appeared, and the user began screen recording. The debug-run tap ledger was Coin once, Play/Start once, OK zero, Fire zero, and `방 열고 소리 켜기` once; those emulator/debug controls are not the future production host/guest CTA count. The panel initially showed `영상 경로: 확인 중` and `status=fallback`. After the single allowed fallback tap, without retry, W2 receiver video and game sound began, the panel changed to `영상 경로: 정상` and `status=ready`, and a later observation confirmed sustained moving video, sustained game sound, and no permission/error popup. The user then stopped recording and closed the tab.

The user confirmed starting and stopping screen recording, but no recording file was transferred into the repository, so no workspace artifact is claimed. No exact high-rate counter transcription, isolated receiver-only audio, secure origin, Home Screen mode, cross-device guest playback, or swapped orientation was obtained. The run completes the practical Phone B per-device Safari compatibility question under D020; repeating it on an exact iPhone 15 Pro would add no material evidence for this objective. It remains same-page evidence only, so W2 remains `partial`, W3 remains `blocked`, and the next meaningful work is a separately authorized secure cross-device path using Phone A and Phone B or this accepted proxy.
## 2026-07-19 D021 implementation addendum

This addendum supersedes earlier current-state statements only where they said the authorized D021 harness was unimplemented or lacked a guest route/signaling path. It does not rewrite the earlier same-page physical observations or claim a post-build two-device result.

The implemented harness is deliberately temporary and W2-only:

- Mac HTTP process-memory signaling with process-lifetime nonreused revisions, observed-revision offer compare-and-set with one bounded active-host conflict retry, and revision-conditional delete;
- sender-only Phone A host and structurally pre-routed, ROM/emulator-free receiver-only Phone B guest;
- non-trickle local ICE with `iceServers: []` and no TURN;
- two-second ready lease, 500 ms guest heartbeat, and false-ready revocation;
- async generation fencing, five-second silent-media watchdog with one fallback, and guest recovery from a residual answered generation.

It adds no dependency, Tailscale, tunnel, Pages, TURN, DNS, secret, external infrastructure, W3 protocol/session work, or reusable product guest route.

The initial independent evaluator rejected the first implementation for replayable/reused revisions, false-ready retention, stale async writes, silent fallback behavior, and stale documentation. A follow-up review then rejected an already-dispatched stale offer's ability to overwrite a newer room. Those findings were repaired with observed-revision offer CAS, one bounded current-host retry, strict JSON media-type parsing, and adversarial regressions. Final independent re-evaluation accepted the CAS-corrected implementation. After the first physical run exposed an oscillating instantaneous `ready` display despite continuous media, a separate review rejected poll-count timing and lifetime-latched diagnostic wording. The final correction requires strict simultaneous initial AV acquisition, then maintains four independent transport/content timestamps for less than two monotonic seconds, revokes immediately on ended tracks or non-running receiver AudioContext, and labels grace samples `최근 정상`. A fresh independent evaluator returned ACCEPT.

All verification used Node 25.8.1:

| Check | Result |
|---|---|
| Focused tests | PASS: 2 files / 46 tests |
| Full tests | PASS: 24 files / 199 tests |
| Typecheck | PASS |
| Production build | PASS |
| Static smoke | PASS |
| Two-page LAN smoke | PASS: final desktop Chromium and mobile WebKit run; earlier corrected-build run also passed same-room sequential reuse |
| Legacy same-page capture smoke | PASS: desktop Chromium and mobile WebKit |
| Query-off Bubble smoke | PASS: desktop Chromium and mobile WebKit |

`git diff --check` also passed. Node 24 was unavailable, so CI parity is not claimed. W2 remains `partial`, W3 remains blocked, and LAN HTTP cannot prove secure-context or Home Screen behavior. D021 waives only the bounded W2 role swap; W11 still requires D019's exact product pair, both orientations, and the full direct plus forced-TURN matrix.

## 2026-07-19 D021 physical A-to-B result

Two bounded physical runs used Phone A iPhone 16 Pro Max as sender-only host and D020's Phone B iPhone 15 Pro Max/iOS 26.5.2 proxy as receiver-only guest on the same Wi-Fi through `http://172.30.1.27:5173/ponpoko/`. Both exact role URLs retained `?captureSpike=1`; Phone A displayed `W2 LAN capture · Phone A`, and Phone B displayed the ROM/emulator-free `W2 LAN capture · Phone B` page and its single CTA. The user used the host fallback exactly once and the guest CTA exactly once. No camera/microphone permission popup appeared.

The first run delivered continuously moving guest video and user-observed game audio while the instantaneous readiness text oscillated. That run motivated the bounded monotonic readiness correction and is not the final pass result. In the final corrected run, Phone B again showed moving video, initially audible game audio, no permission popup, and eventually `ready=yes`. During the following ten-second observation, guest audio stopped and remained silent. The two-second freshness gate then changed readiness to `no` and the final status to `연결 중` while the video remained visible. This is a sustained receiver-audio failure. It must not be recorded as Gate 1A pass, and the already-used fallback/CTA were not retried.

The user started and stopped Phone B screen recording in both runs, but no recording file was transferred into the repository, so no workspace artifact is claimed. Phone B and Phone A tabs were closed, the Vite process was terminated immediately afterward, and port 5173 had no listener. No Tailscale route was used or changed. No Pages, tunnel, TURN, DNS, secret, certificate, firewall, dependency, commit, push, `main`, or external-service action occurred.

The official EmulatorJS documentation was consulted only to bound the input interpretation. Its control mapping defines the first key as player identity (`0` for Player 1 and `1` for Player 2) and defines generic Select/Start inputs, but does not specify a Bubble Bobble Coin/Start/Fire sequence. Its netplay options and setup guide describe a separate server plus ICE configuration that D021 does not use. No game-start sequence, upstream netplay feature, dependency, or source code was adopted:

| Reference | Use | Copied code |
|---|---|---|
| EmulatorJS Control Mapping, <https://emulatorjs.org/docs4devs/control-mapping/> | Confirmed player-indexed control mapping and generic input IDs; did not infer a Bubble Bobble startup sequence. | `no` |
| EmulatorJS Options, <https://emulatorjs.org/docs/options/> | Confirmed `EJS_startOnLoaded` interaction caveat and that official netplay requires separate configuration. | `no` |
| EmulatorJS Netplay Server Setup Guide, <https://emulatorjs.org/docs4devs/netplay/> | Confirmed official netplay requires a separate server/ICE surface and is outside D021. | `no` |

The next bounded W2 task is to diagnose the persistent receiver-audio loss without entering W3 or adding infrastructure. W2 remains `partial`, W3 remains `blocked`, secure-origin/Home Screen proof remains absent, and the W11 matrix is unchanged.

## 2026-07-19 D022 natural-silence correction

This section supersedes the preceding current interpretation that the final ten-second quiet interval proved a sustained receiver-audio failure. It does not alter the observed sequence: Phone B first showed moving video and audible game audio, reached `ready=yes`, later became quiet, and the former continuous-RMS gate returned to `ready=no`. The user subsequently clarified that Bubble Bobble is normally silent on waiting screens and may also contain quiet play intervals. Because that build did not expose whether audio RTP packets and inbound audio energy continued during the quiet interval, the observation is inconclusive rather than a proved capture, RTP, or receiver-output failure. It also remains insufficient to close Gate 1A.

D022 keeps the initial acquisition gate strict: live A/V tracks, a running receiver AudioContext, visible moving video, growing audio packets, and changing nonzero receiver RMS must be observed together. Once that real path has been acquired:

- growing audio packets with flat inbound `totalAudioEnergy` and zero receiver RMS is treated as legitimate game/source silence, remains ready, and renders `게임 무음(전송 정상)`;
- audio RTP inactivity still revokes at the existing two-second freshness boundary and renders `RTP 중단`;
- growing inbound `totalAudioEnergy` with absent receiver RMS starts a fresh mismatch timer, revokes only after a continuous two seconds, and renders `수신 출력 무음`;
- a no-packet/no-energy interval breaks mismatch continuity and gives any later mismatch a new full window;
- non-running receiver AudioContext and ended tracks remain immediate failures.

The host retains its initial-audio acquisition latch because current host RMS silence can also be normal game behavior. No automatic audio recovery, extra CTA/fallback, EmulatorJS input/P2/Coin/Start change, OpenAL graph rewrite, W3 code, dependency, signaling/TURN/DNS/secret work, or deployment was added.

The independent evaluator's first pass found the interrupted-mismatch timer defect described above. After the reset and direct regression were added, re-review returned ACCEPT with no remaining finding. All final checks used Node 25.8.1:

| D022 check | Result |
|---|---|
| Focused W2 LAN/signaling tests | PASS: 2 files / 51 tests |
| Full test suite | PASS: 24 files / 204 tests |
| Typecheck | PASS |
| Production build | PASS |
| Static smoke | PASS |
| Two-page LAN smoke | PASS: desktop Chromium and mobile WebKit |
| `git diff --check` | PASS |

The initial browser-smoke attempt could not bind `127.0.0.1:4176` inside the sandbox (`EPERM`) and did not reach app assertions. The approved out-of-sandbox rerun passed and terminated its preview server. Ports 4176 and 5173 had no listener afterward. Node 24 was unavailable, so CI parity is not claimed.

The statistics interpretation follows the W3C WebRTC Statistics specification: `packetsReceived` is a cumulative RTP-receipt counter, while `totalAudioEnergy` accumulates the energy of received audio samples and may remain flat for digital silence. No specification text or code was copied.

| Reference | Use | Copied code |
|---|---|---|
| W3C WebRTC Statistics, <https://www.w3.org/TR/webrtc-stats/> | Distinguished continued RTP transport from non-silent received-track energy for D022 diagnostics. | `no` |

## 2026-07-20 D022 physical A-to-B result

The fresh bounded run used the current dirty `2p-bubble` build at `ece0feaedd04ebb11df95fc49aa0fba8e273a766` through direct same-Wi-Fi LAN HTTP at `172.30.1.27:5173`. Both exact role URLs retained their queries and displayed `W2 LAN capture · Phone A` and `W2 LAN capture · Phone B`. Phone A's Bubble Bobble boot showed a persistent white screen until the user used the practical game controls; once the game had started, no further boot-sequence testing was performed.

The host fallback and guest CTA were each used exactly once. Phone B then showed moving received video, audible game audio, no permission popup, and `ready=yes`, satisfying strict initial acquisition. Before Phone A began active play, the game was left on its quiet waiting screen. After several seconds of inaudible output, Phone B changed to `소리=수신 출력 무음` and `ready=no` instead of `게임 무음(전송 정상)` with retained readiness. The user did not start another round, retry either one-shot button, or perform another orientation. This is a physical failure of D022's intended natural-silence classification, not Gate 1A closure.

No screen recording or numeric counter transcription was requested. The user was instructed to close both Safari tabs. The Vite server was terminated immediately and port 5173 had no listener at 00:04 KST. No Tailscale route was used or changed, and no Pages, tunnel, TURN, DNS, secret, certificate, firewall, dependency, commit, push, `main`, W3, or external-service action occurred.

## 2026-07-20 D023 interval-normalized silence correction

The physical failure matched one exact code path: any positive `totalAudioEnergy` delta was considered meaningful inbound sound while receiver output RMS was sampled with 8-bit time-domain data. A tiny codec/decoder energy increase or byte quantization could therefore start the two-second `수신 출력 무음` timer even when the game was practically silent. The physical run did not record numeric counters, so the relative contribution of decoder noise, quantization, and poll-window timing is not known; the unscaled decision defect is confirmed independently of that distinction.

D023 keeps strict initial acquisition and all existing video/RTP/track/AudioContext gates, but changes the post-acquisition mismatch evidence:

- collect inbound `totalSamplesDuration` with `totalAudioEnergy` and compute interval RMS as `sqrt(Δenergy / Δduration)`;
- use `getFloatTimeDomainData()` for receiver RMS when available, with byte samples and a conservative `1/128` reliability boundary as fallback;
- treat only interval RMS above that receiver measurement boundary as material inbound energy;
- treat tiny normalized energy as healthy source silence when packets continue;
- treat missing, non-finite, zero-duration, or reset counters as unknown, reset mismatch continuity, and retain only `최근 정상` while the separate transport/content windows remain fresh;
- retain the continuous two-second failure for material inbound energy with absent receiver RMS.

The implementation changes only `src/w2-lan-capture.ts` and its focused W2 LAN tests. It adds no automatic recovery, CTA/fallback retry, input/P2/Coin/Start change, OpenAL rewrite, W3 code, dependency, signaling/TURN/DNS/secret work, or deployment.

All generator verification used Node 25.8.1:

| D023 check | Result |
|---|---|
| Focused W2 LAN/signaling tests | PASS: 2 files / 55 tests |
| Full test suite | PASS: 24 files / 208 tests |
| Typecheck | PASS |
| Production build | PASS |
| Static smoke | PASS |
| Two-page W2 LAN smoke | PASS: desktop Chromium and mobile WebKit |
| Query-off Bubble smoke | PASS: desktop Chromium and mobile WebKit |
| Full flag-off browser/catalog/preparation-failure smoke | PASS |
| `git diff --check` | PASS |

The first sandboxed W2 browser-smoke launch could not bind the local preview port and did not reach app assertions. Its approved host-environment rerun passed and all later browser smokes terminated their servers. Ports 4176 and 5173 had no listener afterward. Node 24 was unavailable, so CI parity is not claimed.

An independent evaluator reviewed the normalized-energy formula, float/byte sampling, invalid/reset statistics, generation/reset lifecycle, strict acquisition, real material-energy mismatch, RTP/video freshness, and immediate context/track failures. It independently reran the focused 2 files / 55 tests and `git diff --check`, then returned ACCEPT with no Critical, High, Medium, or Low finding.

The W3C WebRTC Statistics reference already listed above defines average interval audio level from the differences in `totalAudioEnergy` and `totalSamplesDuration`; no specification text or code was copied. No post-D023 physical run exists because the user became unavailable. The next bounded W2 task is one equivalent A-to-B recheck focused on initial normal acquisition and the quiet waiting-screen label. W2 remains `partial`, W3 remains `blocked`, LAN HTTP still cannot prove secure-context or Home Screen behavior, and W11's matrix is unchanged.
