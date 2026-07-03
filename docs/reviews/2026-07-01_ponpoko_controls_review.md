# Ponpoko Controls Implementation Review

## Inputs
- F1: Remove visible flicker when tapping the game screen controls.
- F2: Add Ponpoko up/down controls through vertical screen swipes.
- F3: Expose the local dev server through Tailscale for iPhone Safari testing.
- F4: Keep left/right movement active while the user continues holding the touch zone.
- F5: Explain that emulator startup continues automatically after ROM download.
- F6: Show detailed emulator boot progress so long startup does not look like a hang.
- F7: Keep boot elapsed/status updates alive even if frame reads are not ready during runtime connection.
- F8: Simplify the bottom control hint for iPhone UI density.
- F9: Warn before MAME/runtime startup that iPhone Safari may pause elapsed-time updates for 10-40 seconds while the main thread initializes WASM.
- F10: Give the boot overlay a real paint opportunity before calling EmulatorJS loader/core startup work.
- F11: Convert EmulatorJS reported failure or 120s no-frame boot timeout into the existing retryable error screen instead of leaving an indefinite boot overlay.
- F12: Avoid a second network ROM download by passing the warmed ROM to EmulatorJS as a `File` while preserving the original `ponpoko.zip` filename for MAME.
- F13: Warm up EmulatorJS loader, shell, MAME report, and decompressor assets in parallel with ROM download so small CDN latency happens before loader execution.
- F14: Bound each EmulatorJS warm-up request so a slow CDN/cache fill cannot block `loadEmulator()` indefinitely.
- F15: Stop preloading/consuming the large MAME core data asset before EmulatorJS startup after real iPhone Safari stayed stuck at `MAME 코어 초기화` / `게임 런타임 연결`.
- F16: Remove app-owned EmulatorJS asset warm-up from the actual game start path because startup correctness is higher priority than speed optimization.
- F17: Disable EmulatorJS IndexedDB ROM/core caches so iPhone Safari startup cannot hang on browser storage before `gameManager` is created.
- F18: Enable runtime controls from observed frame/start progress even if EmulatorJS `start` event is missed on iPhone Safari.
- F19: Serve EmulatorJS runtime, compression helpers, and MAME core data from the app's `/ponpoko/emulatorjs/` path so iPhone Safari does not depend on cross-origin CDN startup.
- F20: Keep EmulatorJS pre-start UI options close to the known working configuration while hiding emulator chrome only through DOM/CSS, because iPhone Safari stopped after the interface update that removed EmulatorJS controls.
- F21: Load Ponpoko from a Chrome-generated post-warning start state and force the legacy MAME core path so WebKit does not stay on the copyright warning frame.
- F22: Remove Ponpoko startup-assist directional input, make touch zones visually inert, and require active gameplay frames before clearing the boot overlay so real iPhone controls are not masked by directional startup automation or visible touch overlays.
- F23: Add an opt-in `?bootDebug=1` real-device diagnostic panel so iPhone Safari failures can be classified without remote Web Inspector.
- F24: Restore a non-movement Ponpoko startup fallback (`ok`, `coin`, `start`) so Safari can pass a copyright warning without reintroducing automatic left/right input. Superseded by F26 after screenshot evidence showed this did not clear the MAME canvas warning.
- F25: Keep touch controls working if iPhone Safari rejects `setPointerCapture()` during a transient touch state.
- F26: Clear the MAME copyright warning before enabling gameplay controls, then reload the Ponpoko start state so the one-time left/right acknowledgement does not leak into gameplay.
- F27: Expose runtime preparation status in `?bootDebug=1` so real iPhone Safari can show whether warning acknowledgement, state reload, and control enablement completed.
- F28: Real iPhone Safari reaches the Ponpoko game screen but the transparent proprietary stage overlay is not usable enough; redesign Ponpoko as a visible bottom three-zone controller.
- F29: Keep EmulatorJS as the emulator runtime and use the documented virtual gamepad input IDs/control mapping behavior instead of cloning or replacing the emulator.
- F30: Make the Ponpoko bottom controller use native touch events on iPhone Safari, with pointer events retained for mouse/desktop verification, so touch input does not depend on pointer capture.

## Reference Notes - EmulatorJS Controls
- Official EmulatorJS options document warns that undocumented internal APIs are not guaranteed stable; keep configuration on documented globals where practical.
- Official EmulatorJS control mapping documents `EJS_defaultControls` for keyboard/gamepad mappings.
- Official EmulatorJS virtual gamepad settings document maps directional controls through `[4, 5, 6, 7]` and buttons through `input_value`, matching Ponpoko's current `up/down/left/right` and jump IDs.
- Current implementation still uses EmulatorJS/MAME, not a new emulator. The app-owned controller remains a wrapper because the required Ponpoko UX is a bottom full-width three-zone touch surface rather than EmulatorJS' default overlay.

## Continuation Plan - 2026-07-01
- Mission: Make Ponpoko startup on real iPhone Safari over Tailscale continue into playable MAME instead of staying stuck at `MAME 코어 초기화` / `게임 런타임 연결`.
- Constraints: Keep existing dirty worktree changes, preserve `/ponpoko/`, keep the compact bottom control hint unchanged.
- Assumption: The original `MAME 코어 초기화`, `경과 8초` freeze was consistent with EmulatorJS/MAME WASM initialization blocking WebKit's main thread; later real-device results show the priority is correctness, so app-owned asset warm-up and IndexedDB cache dependencies must be removed before speed tuning.
- Non-goals: Do not replace EmulatorJS, change ROM files, or broaden controller layouts.

| P# | title | priority | scope_in | scope_out | acceptance_check | risk | owner_candidate | status | handoff | handoff_payload |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | iPhone Safari blocking warning | must-ship | MAME core and runtime boot copy plus visible pre-start overlay note | New emulator architecture | `npm test -- tests/boot-progress.test.ts` and `npm run browser:smoke` see the warning | Medium | Codex | done | P1->Codex | source_id=P1,target_owner=Codex,affected_files=src/boot-progress.ts src/main.ts tests/boot-progress.test.ts scripts/browser-smoke.mjs,reason=warn before Safari timer stall,required_action=implemented tested warning copy |
| P2 | Paint before blocking startup | must-ship | Wait for two animation frames and a short delay after rendering the game overlay before `loadEmulator()` | Artificial long loaders or core replacement | `npm run browser:smoke` reaches playable Ponpoko with overlay warning shown first | Medium | Codex | done | P2->Codex | source_id=P2,target_owner=Codex,affected_files=src/main.ts,reason=ensure overlay paints before WASM-heavy startup,required_action=added minimal paint wait before loader |

## Live Ledger
| Event | W# | owner | status | elapsed | delta_since_last | next_action |
| --- | --- | --- | --- | --- | --- | --- |
| REC1 | W1 | Codex | done | 0m | Reconciled dirty worktree and prior review doc; F9/F10 added from resumed objective. | Closed. |
| REC1 | W2 | Codex | done | 0m | Confirmed current `waitForGameContainer()` only waits one animation frame before `loadEmulator()`. | Closed. |
| CP1 | W1 | Codex | done | 8m | RED tests failed on missing Safari warning; implementation added immediate MAME/runtime warning and pre-start note; Vitest and WebKit passed. | Closed. |
| CP1 | W2 | Codex | done | 8m | Replaced one-frame wait with two animation frames plus 100ms before `loadEmulator()`; local and Tailscale WebKit reached active Ponpoko. | Closed. |
| CP2 | W3 | Codex | done | 14m | RED test failed because `shouldStopBoot` did not exist; implementation added reported-failure/120s no-frame stop logic and retryable error transition. | Closed. |
| CP3 | W4 | Codex | done | 24m | Resource timing showed duplicate Ponpoko ROM network requests; RED smoke failed on URL refetch; implementation passes a named `File` and Tailscale WebKit now shows one ROM request, `ponpoko.zip`, 288x224 video. | Closed. |
| CP4 | W5 | Codex | done | 34m | Resource timing showed EmulatorJS CDN/core assets started after ROM; RED tests required warm-up URLs and body reads; implementation warms and consumes assets before loader execution, with Tailscale WebKit still reaching active play. | Closed. |
| CP5 | W6 | Codex | done | 42m | RED test showed warm-up could wait forever on a hanging fetch; implementation added per-request AbortSignal timeout and WebKit success path still passes. | Closed. |
| CP6 | W7 | Codex | done | 51m | Real iPhone Safari over Tailscale still stopped around 8-9s at MAME/runtime while Mac Chrome reached gameplay under 5s; RED test proved warm-up consumed `mame2003_plus-legacy-wasm.data`; implementation removes that large core data asset from app-owned warm-up. | Physical iPhone retest. |
| CP7 | W8 | Codex | done | 64m | RED WebKit smoke proved app-owned CDN fetches still happened before loader startup; implementation removes `warmUpEmulatorAssets()` from `startGame()` and GREEN smoke confirms no pre-loader EmulatorJS CDN fetches. | Closed. |
| CP8 | W9 | Codex | done | 76m | `mame2003` core fallback was tested and reverted after local WebKit failed to create a canvas within 60s; RED test then added for disabling EmulatorJS IndexedDB caches, implementation sets `EJS_disableDatabases=true`, and WebKit/Tailscale smoke pass. | Physical iPhone retest. |
| CP9 | W10 | Codex | done | 84m | RED test added for enabling controls when frame progress exists without the `start` event; implementation added `shouldEnableRuntimeControls()` and calls `enableRuntimeControls()` from the boot monitor fallback path. | Physical iPhone retest. |
| CP10 | W11 | Codex | done | 96m | RED test required EmulatorJS loader/runtime/compression/report URLs under `/ponpoko/emulatorjs/`; assets were vendored locally with license/notice and app config now points `EJS_pathtodata` at the same-origin path. | Closed after local and Tailscale WebKit smoke reached active gameplay. |
| CP11 | W12 | Codex | done | 112m | Chrome/WebKit comparison showed Chrome first frame around 2.1s and WebKit around 7.1s on the same Tailscale URL; RED test then restored the known working EmulatorJS UI option shape and removed runtime `changeSettingOption()`/`toggleVirtualGamepad()` calls from chrome suppression. | Physical iPhone retest. |
| CP12 | W13 | Codex | done | 134m | WebKit showed an actual MAME copyright warning with `started=true`, `failed=false`, and `frame=4`; `simulateInput()` and core skip options did not advance it. A Chrome-generated legacy-core state now loads from `/ponpoko/states/ponpoko-start.state`, and local/Tailscale WebKit reach active gameplay. | Physical iPhone retest. |
| CP13 | W14 | Codex | done | 150m | Real iPhone reached gameplay but controls did not move Ponpoko and three translucent touch overlays were visible; Chrome sometimes auto-faced right. Startup assist now sends no Ponpoko input, touch-zone labels/default chrome are removed, state URL is cache-busted, and WebKit/Chrome diagnostics confirm active frames with no auto input. | Physical iPhone retest. |
| CP14 | W15 | Codex | done | 164m | Added opt-in `?bootDebug=1` diagnostics for real iPhone Safari: status, frame, started/paused/failed, core/video size, state URL, resource request counts, overlay/touch-zone visibility, recent touch events, and recent input calls. Normal URL remains unchanged. | Physical iPhone debug retest if needed. |
| CP15 | W16 | Codex | done | 186m | Diff comparison showed the copyright-warning regression came from removing the old `ok,left,right,ok,coin,start` startup assist. WebKit tests showed non-movement startup inputs are sufficient, so Ponpoko now uses only `ok,coin,start`; smoke rejects any automatic movement startup input. | Physical Safari retest. |
| CP16 | W17 | Codex | done | 198m | Added a WebKit smoke mode that forces `setPointerCapture()` to throw. It failed before the fix at the touch-input wait, then passed after pointer capture became best-effort and no longer blocks `input.press()`. | Physical iPhone retest. |
| CP17 | W18 | Codex | done | 214m | Screenshot evidence showed WebKit frames advanced while the MAME copyright warning still covered gameplay. Browser smoke now detects the warning box before manual input; runtime finalization sends one hidden left/right acknowledgement, reloads the start state, then enables controls. | Physical iPhone retest. |
| CP18 | W19 | Codex | done | 224m | Added `prep=` to boot debug output. Tailscale WebKit debug now shows `prep=controls-enabled` with `resources=rom:1 state:2 coreData:1` before manual input, so real iPhone failures can identify whether finalization stalled. | Physical iPhone retest. |
| CP19 | W20 | Codex | done | 0m | Real iPhone Safari now reaches gameplay but the controller does not move Ponpoko. RED tests added for `zonePlacement=bottom` and debug `surface=bottom`; implementation moved Ponpoko zones to a bottom dock and added touch-event-first handling. | Physical iPhone retest. |

## Implementation Ledger
| ID | Source | Scope | Verification |
| --- | --- | --- | --- |
| I1 | F1 | Keep touch zones visually transparent during active taps | `npm run browser:smoke` |
| I2 | F2 | Add Ponpoko vertical swipe mapping to up/down emulator inputs | `npm test`, `npm run browser:smoke` |
| I3 | F3 | Allow the Tailscale MagicDNS host and proxy `/ponpoko` through Tailscale Serve | `curl -I https://jessie.adal-alhena.ts.net/ponpoko/` |
| I4 | F4 | Re-send held left/right pressed state while the pointer remains down | `npm run browser:smoke` |
| I5 | F5 | Show an emulator startup overlay after download and remove it when gameplay starts | `npm run browser:smoke` |
| I6 | F6 | Add boot elapsed time, phase text, and stage checklist based on observed EmulatorJS runtime state | `npm run browser:smoke` |
| I7 | F7 | Move boot progress snapshot/copy logic into a safe tested module and catch frame-read failures | `npm test -- tests/boot-progress.test.ts` |
| I8 | F8 | Shorten controller hints and render the bottom hint as a compact chip | `npm run browser:smoke` |
| I9 | F9/P1 | Show iPhone Safari timer-stall warning immediately in MAME/runtime copy and pre-start note | `npm test -- tests/boot-progress.test.ts`, `npm run browser:smoke` |
| I10 | F10/P2 | Wait for overlay paint before invoking EmulatorJS loader/core startup | `npm run browser:smoke` |
| I11 | F11 | Stop indefinite boot wait on reported failure or 120s no-frame timeout and show retry/menu actions | `npm test -- tests/boot-progress.test.ts`, `npm run browser:smoke` |
| I12 | F12 | Pass the downloaded ROM Blob as a named `File` to EmulatorJS so MAME keeps `ponpoko.zip` identity without refetching the ROM URL | `npm run browser:smoke`, `BROWSER_SMOKE_BASE_URL=https://jessie.adal-alhena.ts.net/ponpoko/ npm run browser:smoke` |
| I13 | F13 | Fetch and consume small cacheable EmulatorJS assets before `loadEmulator()` while tolerating individual warm-up failures | `npm test -- tests/emulator.test.ts`, `BROWSER_SMOKE_BASE_URL=https://jessie.adal-alhena.ts.net/ponpoko/ npm run browser:smoke` |
| I14 | F14 | Abort each warm-up request after a bounded timeout so cache warm-up remains opportunistic | `npm test -- tests/emulator.test.ts`, `npm run browser:smoke` |
| I15 | F15 | Exclude `mame2003_plus-legacy-wasm.data` from warm-up so EmulatorJS alone owns MAME core data loading/initialization on iPhone Safari | `npm test -- tests/emulator.test.ts`, `npm run browser:smoke`, physical iPhone retest |
| I16 | F16 | Stop calling the warm-up utility from `startGame()` and verify app code does not fetch EmulatorJS CDN assets before loader startup | `npm run browser:smoke`, `BROWSER_SMOKE_BASE_URL=https://jessie.adal-alhena.ts.net/ponpoko/ npm run browser:smoke` |
| I17 | F17 | Set `EJS_disableDatabases=true` before loader execution so EmulatorJS uses in-memory dummy storage for ROM/core cache paths | `npm test -- tests/emulator.test.ts`, `npm run browser:smoke` |
| I18 | F18 | Treat observed frame/start progress as sufficient to clear boot overlay and enable touch controls | `npm test -- tests/boot-progress.test.ts`, `npm run browser:smoke` |
| I19 | F19 | Vendor EmulatorJS runtime, MAME core data, and decompressor files under `public/emulatorjs/` and load them from `/ponpoko/emulatorjs/` | `npm test -- tests/emulator.test.ts`, `npm run smoke`, `npm run browser:smoke`, `BROWSER_SMOKE_BASE_URL=https://jessie.adal-alhena.ts.net/ponpoko/ npm run browser:smoke` |
| I20 | F20 | Restore `EJS_VirtualGamepadSettings=[]` and previously working button option values; hide EmulatorJS chrome without calling runtime setting mutators during startup | `npm test -- tests/emulator.test.ts`, `npm run browser:smoke`, Chrome/WebKit timing comparison |
| I21 | F21 | Set `EJS_loadStateURL` for Ponpoko only, force legacy cores for save-state compatibility, and include `public/states/ponpoko-start.state` in smoke checks | `npm test -- tests/emulator.test.ts`, `npm run browser:smoke`, `BROWSER_SMOKE_BASE_URL=https://jessie.adal-alhena.ts.net/ponpoko/ npm run browser:smoke` |
| I22 | F22 | Remove Ponpoko directional startup assist, hide touch-zone text/default button chrome, cache-bust the start-state URL, and gate controls until frame 60 | `npm test`, `npm run browser:smoke`, `BROWSER_SMOKE_BASE_URL=https://jessie.adal-alhena.ts.net/ponpoko/ npm run browser:smoke`, WebKit/Chrome diagnostics |
| I23 | F23 | Render boot diagnostics only when `?bootDebug=1` is present and record recent input/resource/touch-zone/touch-event state | `npm test -- tests/boot-debug.test.ts`, `npm run browser:smoke`, Tailscale debug URL diagnostic |
| I24 | F24 | Use Ponpoko `ok,coin,start` startup assist as a copyright-warning fallback while forbidding automatic movement startup inputs; superseded by I26 | `npm test -- tests/startup-assist.test.ts tests/boot-debug.test.ts`, `npm run browser:smoke`, `BROWSER_SMOKE_BASE_URL=https://jessie.adal-alhena.ts.net/ponpoko/ npm run browser:smoke` |
| I25 | F25 | Treat pointer capture as best-effort so a capture exception cannot prevent touch logs or emulator inputs | `BROWSER_SMOKE_THROW_POINTER_CAPTURE=1 npm run browser:smoke`, `BROWSER_SMOKE_THROW_POINTER_CAPTURE=1 BROWSER_SMOKE_BASE_URL=https://jessie.adal-alhena.ts.net/ponpoko/ npm run browser:smoke` |
| I26 | F26 | Delay control enablement until Ponpoko runtime input is ready, acknowledge MAME copyright with one left/right pair, reload the start state, and assert no warning box remains in the screenshot before manual input | `npm test`, `npm run build`, `npm run browser:smoke`, `BROWSER_SMOKE_BASE_URL=https://jessie.adal-alhena.ts.net/ponpoko/ npm run browser:smoke`, `BROWSER_SMOKE_THROW_POINTER_CAPTURE=1 BROWSER_SMOKE_BASE_URL=https://jessie.adal-alhena.ts.net/ponpoko/ npm run browser:smoke` |
| I27 | F27 | Add `prep=` to boot diagnostics and assert the debug panel reaches `prep=controls-enabled` in WebKit smoke | `npm test -- tests/boot-debug.test.ts`, `npm run browser:smoke`, `BROWSER_SMOKE_BASE_URL=https://jessie.adal-alhena.ts.net/ponpoko/ npm run browser:smoke` |
| I28 | F28/F29/F30 | Move Ponpoko's three zones to a visible bottom dock, keep EmulatorJS as the runtime with documented input IDs, and make touch events the primary iPhone path while preserving pointer/mouse verification | `npm test`, `npm run build`, `npm run browser:smoke`, `BROWSER_SMOKE_BASE_URL=https://jessie.adal-alhena.ts.net/ponpoko/ npm run browser:smoke` |

## Execution Log
| ID | Changed Paths | Verification Result | Status |
| --- | --- | --- | --- |
| I1 | `src/styles.css`, `scripts/browser-smoke.mjs` | Active touch background verified transparent in WebKit | done |
| I2 | `src/controllers.ts`, `src/main.ts`, `tests/controllers.test.ts`, `scripts/browser-smoke.mjs` | Swipe up/down verified as inputs 4/5 in WebKit | done |
| I3 | `vite.config.ts` | Tailscale HTTPS URL returned 200 and loaded Ponpoko in WebKit | done |
| I4 | `src/input.ts`, `scripts/browser-smoke.mjs` | Left hold produced repeated input 6 press events until release | done |
| I5 | `src/main.ts`, `src/styles.css`, `scripts/browser-smoke.mjs` | Startup overlay appeared before canvas startup and cleared after `EJS_onGameStart` | done |
| I6 | `src/main.ts`, `src/styles.css`, `scripts/browser-smoke.mjs` | Tailscale WebKit showed elapsed time, phase detail, five boot steps, then cleared after gameplay | done |
| I7 | `src/boot-progress.ts`, `src/main.ts`, `tests/boot-progress.test.ts` | Runtime connection state remains readable when `getFrameNum()` throws before first frame | done |
| I8 | `src/controllers.ts`, `src/main.ts`, `src/styles.css`, `tests/controllers.test.ts` | Tailscale WebKit showed one-line Ponpoko hint at 27.75px panel height | done |
| I9 | `src/boot-progress.ts`, `src/main.ts`, `tests/boot-progress.test.ts`, `scripts/browser-smoke.mjs` | MAME/runtime copy and pre-start boot note warn that iPhone Safari may pause elapsed updates for 10-40 seconds; RED/GREEN verified by boot-progress tests and WebKit smoke | done |
| I10 | `src/main.ts`, `scripts/browser-smoke.mjs` | Boot overlay is given two animation frames plus 100ms before EmulatorJS startup; local preview and Tailscale WebKit both reached active MAME gameplay | done |
| I11 | `src/boot-progress.ts`, `src/main.ts`, `tests/boot-progress.test.ts` | EmulatorJS reported failure or 120s without a started frame now exits the boot overlay into the existing retry/menu error screen | done |
| I12 | `src/main.ts`, `src/emulator.ts`, `scripts/browser-smoke.mjs` | Tailscale WebKit resource timing has a single `/roms/ponpoko.zip` network entry; EmulatorJS config keeps `ponpoko.zip`; Ponpoko video remains 288x224 | done |
| I13 | `src/emulator.ts`, `tests/emulator.test.ts` | Warm-up utility fetches small cacheable EmulatorJS assets, reads response bodies, and ignores individual failures; actual startup path no longer calls it after I16 | done |
| I14 | `src/emulator.ts`, `tests/emulator.test.ts` | Warm-up fetches include AbortSignal and timeout; hanging fetches are aborted and swallowed so startup can proceed | done |
| I15 | `src/emulator.ts`, `tests/emulator.test.ts`, `docs/reviews/2026-07-01_ponpoko_controls_review.md` | Warm-up list excludes the 5.1 MiB `mame2003_plus-legacy-wasm.data`; EmulatorJS now owns that asset fetch during startup instead of app code consuming it first | done |
| I16 | `src/main.ts`, `scripts/browser-smoke.mjs`, `docs/reviews/2026-07-01_ponpoko_controls_review.md` | Browser smoke first failed on five pre-loader EmulatorJS CDN fetches; after removing `warmUpEmulatorAssets()` from `startGame()`, local and Tailscale WebKit pass with no pre-loader CDN fetches | done |
| I17 | `src/emulator.ts`, `tests/emulator.test.ts`, `scripts/browser-smoke.mjs`, `docs/reviews/2026-07-01_ponpoko_controls_review.md` | `configureEmulator()` sets `EJS_disableDatabases=true`; browser smoke verifies the runtime global before active play | done |
| I18 | `src/boot-progress.ts`, `src/main.ts`, `tests/boot-progress.test.ts`, `docs/reviews/2026-07-01_ponpoko_controls_review.md` | Boot monitor now clears the overlay and enables controls when `frame > 0` or `started === true`, even if the EmulatorJS start callback was missed | done |
| I19 | `src/emulator.ts`, `tests/emulator.test.ts`, `scripts/smoke.mjs`, `scripts/browser-smoke.mjs`, `README.md`, `public/emulatorjs/`, `docs/reviews/2026-07-01_ponpoko_controls_review.md` | EmulatorJS runtime/core/compression/report files are served from `/ponpoko/emulatorjs/`; browser smoke verifies each expected same-origin resource and Tailscale smoke stays free of CDN runtime resources | done |
| I20 | `src/emulator.ts`, `tests/emulator.test.ts`, `src/boot-progress.ts`, `src/main.ts`, `scripts/browser-smoke.mjs`, `docs/reviews/2026-07-01_ponpoko_controls_review.md` | RED tests proved the control-removal path had changed EmulatorJS pre-start UI options and called runtime setting mutators; implementation restores the known working config shape and limits chrome removal to DOM/CSS hiding | done |
| I21 | `src/emulator.ts`, `tests/emulator.test.ts`, `scripts/smoke.mjs`, `scripts/browser-smoke.mjs`, `public/states/ponpoko-start.state`, `docs/reviews/2026-07-01_ponpoko_controls_review.md` | RED test failed without `EJS_loadStateURL`; implementation configures Ponpoko's state URL only for Ponpoko, forces legacy core loading, and browser smoke verifies state request plus active WebKit gameplay | done |
| I22 | `src/startup-assist.ts`, `src/main.ts`, `src/styles.css`, `src/boot-progress.ts`, `tests/startup-assist.test.ts`, `tests/boot-progress.test.ts`, `tests/emulator.test.ts`, `scripts/browser-smoke.mjs`, `docs/reviews/2026-07-01_ponpoko_controls_review.md` | RED startup-assist and boot-progress tests failed until Ponpoko stopped sending directional automatic controls and frame 4 no longer cleared the overlay; browser smoke verifies invisible touch zones and touchscreen tap inputs 6/0/7; diagnostics showed desktop WebKit active frames and no automatic movement input | done |
| I23 | `src/boot-debug.ts`, `src/input.ts`, `src/main.ts`, `src/styles.css`, `tests/boot-debug.test.ts`, `docs/reviews/2026-07-01_ponpoko_controls_review.md` | RED boot-debug test failed until the debug module existed, then failed again until resource/touch-zone/touch-event lines were added; Tailscale WebKit confirms `?bootDebug=1` shows active frame, state URL, `resources=rom:1 state:1 coreData:1`, `overlay=false`, `touchZones=3 enabled=true visible=false`, `touches=left:down left:up`, and input log ending in `6:1 6:0` after a left tap | done |
| I24 | `src/startup-assist.ts`, `tests/startup-assist.test.ts`, `scripts/browser-smoke.mjs`, `docs/reviews/2026-07-01_ponpoko_controls_review.md` | Ponpoko startup assist was temporarily changed to `ok,coin,start`; later screenshot evidence showed this did not clear the MAME canvas warning, so I26 removed the repeated assist | done |
| I25 | `src/main.ts`, `scripts/browser-smoke.mjs`, `docs/reviews/2026-07-01_ponpoko_controls_review.md` | `BROWSER_SMOKE_THROW_POINTER_CAPTURE=1 npm run browser:smoke` first failed with a timeout at the debug touch/input wait; after `trySetPointerCapture()`, local and Tailscale WebKit smoke pass even when pointer capture always throws | done |
| I26 | `src/main.ts`, `src/startup-assist.ts`, `tests/startup-assist.test.ts`, `scripts/browser-smoke.mjs`, `docs/reviews/2026-07-01_ponpoko_controls_review.md` | RED browser smoke failed with `MAME copyright warning is visible when gameplay controls first become active`; implementation waits for runtime input readiness, sends one left/right acknowledgement, reloads the start state, removes Ponpoko gameplay startup assist, and WebKit/Tailscale smoke pass | done |
| I27 | `src/boot-debug.ts`, `src/main.ts`, `tests/boot-debug.test.ts`, `scripts/browser-smoke.mjs`, `docs/reviews/2026-07-01_ponpoko_controls_review.md` | RED boot-debug test failed until `prep=` was formatted; runtime finalization now updates `pending/finalizing/input-ready/warning-ack/state-reloaded/controls-enabled/failed`, and Tailscale debug output shows `prep=controls-enabled` | done |
| I28 | `src/controllers.ts`, `src/main.ts`, `src/styles.css`, `src/boot-debug.ts`, `tests/controllers.test.ts`, `tests/boot-debug.test.ts`, `scripts/browser-smoke.mjs`, `docs/reviews/2026-07-01_ponpoko_controls_review.md` | RED tests failed on missing bottom placement/debug surface; implementation adds a visible bottom three-zone Ponpoko dock and uses native touch events for touch pointers. Local and Tailscale WebKit smoke pass, including forced pointer-capture failure mode. | done |

## Closure Matrix
| CM# | scenario | criteria | outcome | action |
| --- | --- | --- | --- | --- |
| CM1 | all-green | F1-F27 implementation checks pass | done | Keep dev server running on `0.0.0.0:5173` for iPhone retest. |
| CM2 | env-blocked | Required local commands unavailable | partial | `pytest -q` has no Python tests and exits 5; repo JS gates passed. |
| CM3 | decision-blocked | Product/UX decision required | done | No unresolved decision. |
| CM4 | stuck-recycled | Worker stalled and recycled | done | No worker recycled. |
| CM5 | no-findings | Re-audit after verification finds no critical/high issue | done | No open critical/high issue in scoped files. |
| CM6 | partial-delivery | Deferred scope remains | done | Real physical iPhone hand test remains recommended, but WebKit Tailscale smoke passed. |
| CM7 | coverage-regressed | Test inventory dropped beyond threshold | done | Tests increased to 7 files / 25 tests; no deletions. |

## Closure
- `npm run typecheck`: passing.
- `npm test -- tests/emulator.test.ts`: passing, including Ponpoko-only versioned `EJS_loadStateURL`, legacy-core forcing, same-origin EmulatorJS assets, disabled IndexedDB caches, and no runtime setting mutators.
- `npm test`: 7 files, 25 tests passing.
- `npm run build`: passing.
- `npm run smoke`: passing.
- `npm run browser:smoke`: passing.
- `BROWSER_SMOKE_BASE_URL=https://jessie.adal-alhena.ts.net/ponpoko/ npm run browser:smoke`: passing.
- `npm run browser:smoke`: passing after same-origin EmulatorJS asset change; local preview only allows EmulatorJS' localhost-only `version.json` update check.
- `BROWSER_SMOKE_BASE_URL=https://jessie.adal-alhena.ts.net/ponpoko/ npm run browser:smoke`: passing after same-origin EmulatorJS asset change with no EmulatorJS CDN runtime resources allowed.
- Chrome/WebKit comparison on `https://jessie.adal-alhena.ts.net/ponpoko/`: Chrome desktop reached frame 121 in about 4.0s with the start state; WebKit desktop reached frame 1511 after the diagnostic wait; WebKit mobile-profile browser smoke passed on the same URL.
- Copyright warning diagnosis: WebKit showed the actual MAME copyright warning at `frame=4` with `started=true`, `paused=false`, `failed=false`; Chrome advanced into gameplay on the same ROM/core path.
- Tailscale WebKit state verification: `/ponpoko/states/ponpoko-start.state` is requested once, `window.EJS_loadStateURL` and EmulatorJS `config.loadState` match that path, and desktop/mobile WebKit advance beyond frame 1500 after load.
- Tailscale WebKit state verification after F22: `/ponpoko/states/ponpoko-start.state?v=20260701` is requested, desktop WebKit reaches `frame=1512`, and the boot overlay is removed only after active gameplay frames.
- Chrome/WebKit auto-input diagnostic after F26: the only automatic movement inputs before manual play are the hidden warning acknowledgement `6:1 6:0 7:1 7:0`; Ponpoko gameplay startup assist is now empty, so repeated `ok/coin/start` inputs no longer run after controls enable.
- Tailscale/local mobile WebKit smoke after F26: the screenshot-based warning detector fails on the pre-fix frame and passes after runtime finalization; touchscreen taps on left/jump/right still send inputs 6/0/7 press and release; `.touch-zone` text is empty, background is transparent, and border width is 0.
- Tailscale WebKit `?bootDebug=1` after F28: normal URL has no debug panel; debug URL shows `status=플레이 중`, active frame, `started=true paused=false failed=false`, `state=/ponpoko/states/ponpoko-start.state?v=20260701`, `resources=rom:1 state:2 coreData:1`, `prep=controls-enabled`, `overlay=false`, `touchZones=3 enabled=true visible=true surface=bottom`, `touches=left:down left:up`, and recent inputs ending in `6:1 6:0` after a left tap.
- Ponpoko bottom dock verification after F28: `npm run browser:smoke`, `BROWSER_SMOKE_THROW_POINTER_CAPTURE=1 npm run browser:smoke`, `BROWSER_SMOKE_BASE_URL=https://jessie.adal-alhena.ts.net/ponpoko/ npm run browser:smoke`, and `BROWSER_SMOKE_THROW_POINTER_CAPTURE=1 BROWSER_SMOKE_BASE_URL=https://jessie.adal-alhena.ts.net/ponpoko/ npm run browser:smoke` all pass with bottom controls below the game stage and manual left/jump/right inputs.
- Pointer-capture failure regression after F25: `BROWSER_SMOKE_THROW_POINTER_CAPTURE=1` fails on the pre-fix build and passes after `trySetPointerCapture()`, both locally and against `https://jessie.adal-alhena.ts.net/ponpoko/`.
- Tailscale WebKit resource timing: one `/roms/ponpoko.zip` network request; `window.EJS_gameUrl` is a `File` named `ponpoko.zip`; EmulatorJS config becomes `ponpoko.zip`; video dimensions are 288x224.
- Tailscale WebKit resource timing: app-owned startup no longer fetches EmulatorJS CDN assets before loader execution.
- Tailscale WebKit resource timing: `/ponpoko/emulatorjs/loader.js`, `emulator.min.js`, `emulator.min.css`, `cores/reports/mame2003_plus.json`, `cores/mame2003_plus-legacy-wasm.data`, and `compression/extract7z.js` are observed from same origin; `extractzip.js` is available locally but is not required for Ponpoko's arcade ROM startup path.
- Tailscale WebKit runtime config: `window.EJS_pathtodata === "/ponpoko/emulatorjs/"`, so loader, runtime, compression scripts, report, and MAME core data are same-origin.
- Tailscale WebKit runtime config: `window.EJS_disableDatabases === true`, so EmulatorJS ROM/core cache paths do not depend on IndexedDB.
- `python -m compileall -q src`: passing.
- `flake8 src tests`: passing.
- `pytest -q`: no Python tests collected, exits 5.
- `curl -I https://jessie.adal-alhena.ts.net/ponpoko/`: HTTP 200 after dev server restart.
- Dev server `http://192.168.0.7:5173/ponpoko/`: Ponpoko active, transparent tap state, up/down swipe inputs verified.
- Tailscale dev URL `https://jessie.adal-alhena.ts.net/ponpoko/`: Ponpoko active with ROM URL under the same HTTPS origin and sustained left hold verified.
- Tailscale dev URL `https://jessie.adal-alhena.ts.net/ponpoko/`: emulator startup overlay explains automatic startup, then clears after active gameplay begins.
- Tailscale dev URL `https://jessie.adal-alhena.ts.net/ponpoko/`: detailed boot overlay shows `ROM 다운로드 완료`, `EmulatorJS 로더 확인`, `MAME 코어 초기화`, `게임 런타임 연결`, `첫 프레임 확인`, plus elapsed seconds.
- Tailscale dev URL `https://jessie.adal-alhena.ts.net/ponpoko/`: boot overlay warns that iPhone Safari may pause elapsed updates for 10-40 seconds during MAME initialization and that startup continues automatically.
- Tailscale dev URL `https://jessie.adal-alhena.ts.net/ponpoko/`: bottom hint is `좌/우 홀드 · 가운데 점프 · 위/아래 스와이프`.
