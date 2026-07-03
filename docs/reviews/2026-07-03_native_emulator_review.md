# Native Emulator Review

## Mission

Redesign work starts from branch `native-emulator` after preserving the prior wrapper state on `emulator-wrapper`.

Project development plan: `docs/native-emulator-development-plan.md`.

## Constraints

- Local ROM source is `/Volumes/dev/ponpoko/roms`.
- The web app must not fetch `file://` URLs; Safari loads ROMs through the app origin.
- Copyrighted ROMs are not downloaded by the agent. Existing local files or user-provided files are used.

## Success Criteria

- `P1`: The app catalog exposes only Ponpoko, Bubble Bobble, and Super Pang.
- `P2`: `/ponpoko/roms/<file>.zip` resolves to files from `/Volumes/dev/ponpoko/roms` during local dev/preview.
- `P3`: Existing tests, typecheck, and build remain green or blockers are recorded.

## Live Ledger

| ID | owner | status | scope | verify |
| --- | --- | --- | --- | --- |
| W1 | codex | done | catalog, scripts, docs, and ROM path wiring | `npm test`, `npm run typecheck`, `npm run build`, `npm run prepare:roms`, `npm run smoke`, `npm run browser:smoke`, `curl -sI http://localhost:5173/ponpoko/roms/ponpoko.zip` |
| W2 | codex | done | native runtime research decision and connector plan | `npm test`, `npm run typecheck` |
| W3 | codex | done | `NativeEmulator` contract, fake runtime, generic input router, keyboard/touch routing | `npm test`, `npm run typecheck` |
| W4 | codex | partial | Ponpoko boot spike start: current fallback runtime wrapped behind `NativeEmulator`; direct single-threaded MAME/libretro boot not complete | no runtime-complete claim; browser gates deferred |
| W4.1 | codex | done | Direct adapter entry and complete Ponpoko ZIP handoff | `npm test`, `npm run typecheck`, `npm run build`, `npm run smoke`, `npm run browser:smoke` |

## Implementation Ledger

| ID | source | status | changed_paths | verify_cmd | verify_result |
| --- | --- | --- | --- | --- | --- |
| I1 | P1,P2 | done | `src/catalog.ts`, `src/controllers.ts`, `src/main.ts`, `vite-roms.ts`, `vite.config.ts`, `scripts/prepare-roms.mjs`, `scripts/smoke.mjs`, `README.md`, `tests/catalog.test.ts`, `tests/controllers.test.ts`, `tests/emulator.test.ts`, `tests/vite-roms.test.ts` | `npm test tests/catalog.test.ts tests/vite-roms.test.ts tests/controllers.test.ts` | 3 files, 9 tests passed |
| I2 | P1 | done | `docs/native-emulator-runtime-decision.md` | `npm test`, `npm run typecheck` | 8 files, 28 tests passed; typecheck passed |
| I3 | P2 | done | `src/native-emulator.ts`, `tests/native-emulator.test.ts` | `npm test -- tests/native-emulator.test.ts tests/input-router.test.ts` | 2 files, 5 tests passed |
| I4 | P3 | done | `src/input.ts`, `src/main.ts`, `tests/input-router.test.ts` | `npm test`, `npm run typecheck` | 10 files, 33 tests passed; typecheck passed |
| I5 | P3,P6 | done | `scripts/browser-smoke.mjs` | `node --check scripts/browser-smoke.mjs` | script syntax check passed |
| I6 | P4 | partial | `src/emulator.ts`, `src/main.ts` | `npm test`, `npm run typecheck` | current EmulatorJS fallback is behind `NativeEmulator`; direct Ponpoko runtime boot remains not implemented |
| I7 | P4.1/W4.1 | done | `src/emulator.ts`, `src/main.ts`, `tests/native-emulator.test.ts` | `npm test -- tests/native-emulator.test.ts tests/rom-download.test.ts` | 2 files, 6 tests passed |
| I8 | P4.1/W4.1 | done | `src/rom-download.ts`, `src/main.ts`, `tests/rom-download.test.ts`, `scripts/browser-smoke.mjs` | `npm test`, `npm run browser:smoke` | 10 files, 35 tests passed; WebKit ROM fetch/input/menu checks passed |
| I9 | P4.1/W4.1 | done | `docs/reviews/2026-07-03_native_emulator_review.md` | doc consistency scan | recorded implementation notes, verification, and iPhone validation blocker |
| I12 | P4.3/P4.5/P4.7 follow-up | done | `src/emulator.ts`, `src/main.ts`, `src/styles.css`, `src/boot-progress.ts`, `tests/emulator.test.ts`, `tests/boot-progress.test.ts`, `scripts/browser-smoke.mjs`, `docs/reviews/2026-07-03_native_emulator_review.md` | `npm test`, `npm run typecheck`, `npm run build`, `npm run smoke`, `npm run browser:smoke`, installed Chrome layout check | 10 files, 37 tests passed; WebKit smoke passed; installed Chrome reports aspect-bound 430x334 stage |
| I16 | Pages remote ROM source | done | `.github/workflows/deploy.yml`, `README.md`, `src/catalog.ts`, `vite-roms.ts`, `scripts/prepare-roms.mjs`, `scripts/smoke.mjs`, `scripts/browser-smoke.mjs`, `tests/catalog.test.ts`, `tests/vite-roms.test.ts` | `npm test`, `npm run typecheck`, remote-ROM `npm run browser:smoke`, `gh variable list` | `ARCADE_SAFARI_ROM_BASE_URL` set to `https://jessie.adal-alhena.ts.net/ponpoko/roms/`; CORS headers verified for `https://taekimax.github.io` |

## Runtime Decision Session

Planning inputs:

- Mission: research and plan a native emulator runtime plus app-owned connector before replacing runtime code.
- Primary target: iPhone Safari portrait, not desktop Chrome.
- Runtime direction: direct single-threaded MAME 2003-Plus/libretro WASM adapter behind `NativeEmulator`.
- Fallback: minimal current local EmulatorJS runtime extraction behind the same adapter only.
- ROM strategy: full same-origin ZIP fetch; no ROM slicing/chunking for current small arcade ZIPs.
- Connector requirement: UI must not depend on EmulatorJS globals, libretro internals, MAME input indexes, or runtime asset paths.
- Keyboard requirement: route arrows, `QWE`, `ASD`, and `[]\` through the same input layer as touch.

Planning slices:

| ID | title | priority | acceptance_check | owner_candidate | status | handoff |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | Runtime decision | must-ship | Decision doc exists with selected/fallback paths, Safari constraints, ROM loading answer, licensing, and boot spike | codex | done | P1->W1 |
| P2 | Connector contract | must-ship | Unit tests pass against fake runtime without EmulatorJS globals | codex | done | P2->W2 |
| P3 | Generic input layer | must-ship | Keyboard and touch tests hit the same generic input path | codex | done | P3->W3 |
| P4 | Ponpoko boot spike | must-ship | WebKit smoke plus real iPhone Safari note for Ponpoko | codex | partial | P4->W4 |
| P5 | Three-game runtime verification | must-ship | Browser smoke covers all three games | codex | blocked | P5->W5 |
| P6 | iPhone portrait hardening | must-ship | Real iPhone checklist recorded | codex/user | blocked | P6->W6 |

MVP cut line:

- Must-ship: P1-P6. These cover the decision, connector, input layer, Ponpoko boot, all-game runtime verification, and real iPhone portrait hardening.
- Deferred: save-state polish, deployment polish, and visual polish until boot/input is proven on real iPhone Safari.

## Connector Implementation Session

Success criteria:

- `NativeEmulator` exists as the app-owned runtime boundary with a fake runtime test double.
- Keyboard and touch control actions route through one generic `EmulatorInput` layer.
- Temporary keyboard mapping covers arrows, `Q/W/E`, `A/S/D`, and `[` / `]` / `\`.
- Active inputs release on blur, dispose, touch cancel, pointer cancel, visibility hide, and page hide.
- Focused unit tests prove the fake runtime receives generic input calls.
- No runtime-complete claim is made without `npm run build`, `npm run smoke`, `npm run browser:smoke`, and real iPhone Safari evidence.

Implementation plan:

| ID | source | owner | scope | verification | status |
| --- | --- | --- | --- | --- | --- |
| I3 | P2 | codex | Add `NativeEmulator`, snapshot types, fake runtime, and lifecycle/input tests | `npm test -- tests/native-emulator.test.ts tests/input-router.test.ts` | done |
| I4 | P3 | codex | Replace direct UI/runtime input with `InputRouter` and generic `EmulatorInput` calls | `npm test`, `npm run typecheck` | done |
| I5 | P3,P6 | codex | Add hidden overlay hit-test coverage to WebKit smoke script | `node --check scripts/browser-smoke.mjs` | done |
| I6 | P4 | codex | Begin Ponpoko boot spike by keeping current fallback runtime behind `NativeEmulator` | `npm test`, `npm run typecheck` | partial |

Execution notes:

| ID | changed_paths | result | status |
| --- | --- | --- | --- |
| I3 | `src/native-emulator.ts`, `tests/native-emulator.test.ts` | fake runtime records generic `press`/`release`, releases active inputs on `pause()`/`dispose()`, and exposes snapshots | done |
| I4 | `src/input.ts`, `src/main.ts`, `tests/input-router.test.ts` | keyboard and touch controls share `InputRouter`; temporary keyboard map emits generic inputs; blur/dispose releases active inputs | done |
| I5 | `scripts/browser-smoke.mjs` | smoke script now checks `document.elementsFromPoint()` over active controls for hidden/unrelated interceptors | done |
| I6 | `src/emulator.ts`, `src/main.ts` | current EmulatorJS fallback implements `NativeEmulator`; MAME input indexes and EmulatorJS globals are contained in the adapter | partial |

Test inventory:

- Baseline `npm test`: 8 files, 28 tests passed.
- `npm test -- --list`: unavailable in Vitest 4.1.9 (`Unknown option --list`).
- Final `npm test`: 10 files, 33 tests passed.
- Delta: +2 test files, +5 tests.

Runtime spike status:

- Started only at the boundary level: Ponpoko still boots through the current local EmulatorJS fallback, now behind `NativeEmulator`.
- Direct single-threaded MAME 2003-Plus/libretro WASM boot is not complete and is not claimed ready.
- Browser/runtime gates remain required before runtime-complete status: `npm run build`, `npm run smoke`, `npm run browser:smoke`, then real iPhone Safari checklist evidence.

## Ponpoko Direct Runtime Boot Spike Plan

Mission:

- Prove only Ponpoko through a direct single-threaded MAME 2003-Plus/libretro WASM adapter behind `NativeEmulator`.
- Keep `EmulatorJsNativeEmulator` available only as a fallback behind the same boundary.
- Do not start Bubble Bobble, Super Pang, threaded runtime, UI expansion, or polish in this spike.

Acceptance gates:

- Fetch the complete ZIP from `/ponpoko/roms/ponpoko.zip` on the same origin.
- Do not slice, chunk, unzip, or issue range requests for the ROM ZIP.
- Do not require `SharedArrayBuffer`, pthreads, COOP/COEP, or a threaded runtime.
- Attach runtime canvas only through `NativeEmulator.attach(target)`.
- Unlock audio from an explicit Start/user gesture through `unlockAudio()` before or during `start()`.
- Keep UI and `InputRouter` on generic `EmulatorInput`; libretro/MAME-specific input values belong only inside the adapter.
- Release every active input on pointer cancel, touch cancel, blur, visibility hide, dispose, and menu return.
- Ensure hidden runtime overlays/chrome are `hidden`, inert where supported, or `pointer-events: none`, and do not intercept touches.
- Do not claim runtime completion until fresh `npm run build`, `npm run smoke`, and `npm run browser:smoke` all pass.
- Do not claim iPhone readiness until real iPhone Safari evidence is recorded for first load, ROM load time, audio unlock, keyboard path, touch path, safe-area fit, no page scroll, no hidden overlay intercepts, menu disposal, and five-minute stability.

Planning rows:

| P# | title | priority | scope_in | scope_out | acceptance_check | risk | owner | status | P# -> W# handoff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P4.1 | Direct adapter entry and ROM handoff | must-ship | Add the direct adapter path behind `NativeEmulator`; pass one full `ArrayBuffer` fetched from `/ponpoko/roms/ponpoko.zip`; keep EmulatorJS only as fallback behind the same boundary | ROM slicing/chunking, range requests, public ROM download, other game ZIPs | Route/smoke evidence shows one full same-origin ZIP fetch and `NativeEmulator.load()` receives the complete Ponpoko ZIP; UI does not know runtime asset paths | high: direct runtime filesystem and boot API are still unknown | codex | done | P4.1->W4.1 |
| P4.2 | Single-threaded MAME 2003-Plus/libretro runtime | must-ship | Instantiate a no-SAB, no-pthreads MAME 2003-Plus/libretro WASM runtime; mount Ponpoko as a complete romset ZIP; expose lifecycle diagnostics through `getSnapshot()` | COOP/COEP headers, threaded builds, upstream modern MAME fallback, multi-game runtime validation | Browser smoke or debug diagnostics identify the direct runtime, require no `SharedArrayBuffer`, and reach `ready`, `running`, or a structured `failed` state with `lastError` | high: runtime API, memory limits, and romset compatibility may block boot | codex | blocked | P4.2->W4.2 |
| P4.3 | Canvas, audio, and disposal lifecycle | must-ship | Attach the runtime canvas through `NativeEmulator.attach()`; start/unlock audio from explicit Start/user gesture; dispose canvas, audio, timers, and object URLs on menu return | Autoplay audio, hidden wrapper start controls, CanvasHost redesign | Start path calls `unlockAudio()` before or during `start()`; menu return leaves no active inputs, no runtime-owned canvas in the mount, and no open app-owned audio context | high: iPhone Safari audio gesture behavior must be proven on device | codex | blocked | P4.3->W4.3 |
| P4.4 | Generic Ponpoko input mapping | must-ship | Map `left`, `right`, `up`, `down`, `action1`, `coin`, and `start` to libretro/MAME values only inside the direct adapter; keep keyboard and touch on `InputRouter` | UI imports of MAME indexes, direct `simulateInput` calls outside fallback adapter, final per-game remap UI | Unit or browser diagnostics show keyboard and touch produce generic input events and adapter-local runtime input events; active inputs are released on cancel, blur, dispose, and menu return | medium: exact libretro input IDs may require runtime probing | codex | blocked | P4.4->W4.4 |
| P4.5 | Hidden overlay and touch interception guard | must-ship | Hide or remove direct/fallback runtime chrome; make any hidden elements inert or non-interactive; keep bottom controls hittable | Visual polish, controller layout redesign, emulator wrapper UI | `npm run browser:smoke` hit-test coverage confirms `document.elementsFromPoint()` over active controls is not intercepted by hidden overlays | medium: runtime may inject unexpected DOM during boot | codex | blocked | P4.5->W4.5 |
| P4.6 | Automated Ponpoko boot gate | must-ship | Reach first changing frames through the direct adapter and prove `left`, `right`, and `action1` change input diagnostics | Runtime completion for all three games, iPhone readiness, save states | Fresh `npm run build`, `npm run smoke`, and `npm run browser:smoke` pass before any runtime-complete claim; smoke records changing frames and Ponpoko input diagnostics | high: desktop WebKit can pass while real iPhone still fails | codex | blocked | P4.6->W4.6 |
| P4.7 | Real iPhone Safari evidence gate | must-ship | Record device/iOS version, URL, first load, ROM load time, audio unlock, keyboard path, touch path, safe-area fit, no page scroll, no hidden overlay intercepts, menu disposal, and five-minute stability | Desktop-only readiness claims, Android certification, full three-game certification | This review doc contains a completed real iPhone Safari checklist with timings and notes before any iPhone-readiness claim | high: requires real iPhone Safari access and may expose device-only failures | codex/user | partial | P4.7->W4.7 |

Handoff payload:

| source_id | work_id | owner | affected_files | reason | required_action | status |
| --- | --- | --- | --- | --- | --- | --- |
| P4.1 | W4.1 | codex | `src/native-emulator.ts`, `src/emulator.ts`, `src/main.ts`, ROM fetch path tests/smoke as needed | Establish the direct adapter entry without leaking runtime details into UI | Implement adapter selection and full-ZIP ROM handoff while preserving EmulatorJS fallback boundary | done |
| P4.2 | W4.2 | codex | direct runtime adapter module and runtime asset wiring | Prove the selected no-SAB runtime can instantiate Ponpoko | Mount `ponpoko.zip`, start runtime, and surface structured diagnostics | blocked |
| P4.3 | W4.3 | codex | direct runtime adapter module, `src/main.ts` start/dispose paths if needed | Audio/canvas lifecycle must remain app-owned | Attach canvas through `NativeEmulator.attach()`, unlock audio from Start, and dispose cleanly | blocked |
| P4.4 | W4.4 | codex | direct runtime adapter module, `src/input.ts` tests only if generic contract gaps appear | Runtime-specific input mapping must not leak outside adapter | Map generic Ponpoko inputs internally and verify releases on cancellation paths | blocked |
| P4.5 | W4.5 | codex | direct/fallback runtime DOM suppression and browser smoke checks | Hidden runtime DOM must not steal touches | Enforce hidden/inert/non-interactive overlays and verify hit tests | blocked |
| P4.6 | W4.6 | codex | smoke/build scripts only as needed for direct runtime detection | Runtime-complete claims require automated evidence | Run and record `npm run build`, `npm run smoke`, and `npm run browser:smoke` after direct boot implementation | blocked |
| P4.7 | W4.7 | codex/user | this review doc | iPhone-readiness claims require device evidence | Record real iPhone Safari checklist results with timings and stability notes | partial |

## W4.1 Implementation Session

Mission:

- Add the smallest direct Ponpoko runtime adapter entry behind `NativeEmulator`.
- Keep `EmulatorJsNativeEmulator` behind the same boundary as fallback only.
- Fetch `/ponpoko/roms/ponpoko.zip` as one complete same-origin ZIP and pass its complete `ArrayBuffer` into `NativeEmulator.load()`.

Implementation plan:

| ID | source | owner | scope | verification | status |
| --- | --- | --- | --- | --- | --- |
| I7 | P4.1/W4.1 | codex | Runtime selection boundary with direct adapter entry and EmulatorJS fallback | `npm test -- tests/native-emulator.test.ts tests/rom-download.test.ts` | done |
| I8 | P4.1/W4.1 | codex | Complete ROM ZIP `ArrayBuffer` fetch and app handoff | `npm test`, `npm run browser:smoke` | done |
| I9 | P4.1/W4.1 | codex | Review doc implementation notes, verification, and blocked iPhone status | doc consistency scan | done |

Checkpoint ledger:

| checkpoint | W# | owner | status | elapsed | delta | next_action |
| --- | --- | --- | --- | --- | --- | --- |
| CP1 | W4.1 | codex | in_progress | 0m | scope and tests identified | write failing tests |
| CP2 | W4.1 | codex | in_progress | 18m | focused red tests added; selector and ROM downloader implemented | run full verification gates |
| CP3 | W4.1 | codex | done | 36m | full local verification passed | real iPhone validation remains blocked pending user test |

Execution notes:

| ID | changed_paths | result | status |
| --- | --- | --- | --- |
| I7 | `src/emulator.ts`, `src/main.ts`, `tests/native-emulator.test.ts` | `createNativeEmulator()` now owns runtime selection, tries `DirectPonpokoNativeEmulator` first with the same `ArrayBuffer`, and falls back to `EmulatorJsNativeEmulator` only after the direct entry reports `direct-runtime-unavailable`; `main.ts` no longer imports `EmulatorJsNativeEmulator` or `suppressEmulatorChrome` directly | done |
| I8 | `src/rom-download.ts`, `src/main.ts`, `tests/rom-download.test.ts`, `scripts/browser-smoke.mjs` | Ponpoko is fetched from `/ponpoko/roms/ponpoko.zip` with `response.arrayBuffer()` and passed to `NativeEmulator.load()` as a complete ZIP `ArrayBuffer`; fallback-only `File` conversion remains inside `EmulatorJsNativeEmulator` | done |
| I9 | `docs/reviews/2026-07-03_native_emulator_review.md` | Review doc records local verification and keeps real iPhone validation blocked pending user-observed evidence | done |

W4.1 verification:

| command/check | result |
| --- | --- |
| `npm test -- tests/native-emulator.test.ts tests/rom-download.test.ts` before implementation | expected red: missing direct runtime selector and complete `ArrayBuffer` downloader |
| `npm test -- tests/native-emulator.test.ts tests/rom-download.test.ts` after implementation | 2 files, 6 tests passed |
| `npm test` | 10 files, 35 tests passed |
| `npx vitest list --json` | final inventory: 10 files, 35 test cases; prior documented baseline: 10 files, 33 test cases; delta: +2 tests, 0 files removed or renamed |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `npm run smoke` | passed |
| `node --check scripts/browser-smoke.mjs` | passed |
| `npm run browser:smoke` | passed: WebKit Ponpoko ROM fetch, active gameplay, keyboard/touch input, overlay hit tests, no scroll, and menu disposal verified |
| UI boundary scan | `src/main.ts` and `src/input.ts` contain no direct `EmulatorJsNativeEmulator`, `suppressEmulatorChrome`, `EJS_`, `simulateInput(`, `mame2003_plus-legacy-wasm.data`, or `/ponpoko/emulatorjs/` references |
| ROM handoff scan | `src/main.ts` calls `downloadRomArrayBuffer()` and passes `rom.arrayBuffer` to `NativeEmulator.load()`; `File` conversion is adapter-local in `src/emulator.ts` fallback |
| Real iPhone Safari validation | partial user-reported evidence exists; full readiness remains blocked pending retest/checklist completion |

Remaining blocked items:

| ID | status | blocker | owner | next_action |
| --- | --- | --- | --- | --- |
| P4.2/W4.2 | blocked | Direct single-threaded MAME 2003-Plus/libretro runtime assets and boot API are not wired | codex | implement runtime instantiation in the next slice |
| P4.7/W4.7 | partial | User reported Ponpoko gameplay works as intended on real iPhone Safari, with remaining no-sound and resume-popup issues plus earlier overlay-line reports | user/codex | user retests after local fixes; agent records only user-reported results |

## Real iPhone Safari User Report

Source: user-reported, not agent-observed.

| date | device/browser | result | status | follow_up |
| --- | --- | --- | --- | --- |
| 2026-07-03 | real iPhone Safari, exact model/iOS not yet recorded | Ponpoko works overall through the Tailscale dev URL | partial | continue collecting full checklist details before any iPhone-readiness claim |
| 2026-07-03 | real iPhone Safari, exact model/iOS not yet recorded | Three thick semi-transparent horizontal overlay lines are visible on the upper half of the browser screen | partial | locally fixed canvas aspect containment and added WebKit canvas ratio smoke check; needs real iPhone retest |
| 2026-07-03 | real iPhone Safari, exact model/iOS not yet recorded | Swipe up/down on the jump button did not control vertical movement; swiping up at jump sent jump instead | partial | locally fixed jump-zone swipe to defer jump press and added WebKit smoke assertions that vertical swipe sends `up`/`down` without pressing `jump`; needs real iPhone retest |
| 2026-07-03 | real iPhone Safari, exact model/iOS not yet recorded | Game works as intended, but audio is silent on iPhone while sound works on Mac Chrome | partial | locally added fallback runtime `Module.AL` audio-context resume from Start/control user gestures; needs real iPhone audio retest |
| 2026-07-03 | real iPhone Safari, exact model/iOS not yet recorded | `"undefined"` / `"Click to resume Emulator"` appears before the game; tapping it starts the game | partial | locally suppresses EmulatorJS popup containers and retries runtime audio unlock through app-owned controls; needs real iPhone retest |
| 2026-07-03 | real iPhone Safari, exact model/iOS not yet recorded | Sound plays well; prior no-sound report was likely iPhone silent mode | done | record as user-reported evidence only |
| 2026-07-03 | local source inspection | Remaining `"undefined"` / `"Click to resume Emulator"` popup comes from EmulatorJS Safari/mobile `checkStarted()` calling `createPopup("", {})` while its WebAudio context is suspended | partial | documented as non-blocking fallback-runtime chrome leakage; do not block publish |
| 2026-07-03 | Mac Chrome, agent-observed local check after user report | Game stage is aspect-bound at 430x334 instead of expanding the game into the upper half of the viewport | done | installed Chrome layout check passed against `http://127.0.0.1:5173/ponpoko/` |
| 2026-07-03 | local browser UI check | Jump control now shows `▲`, `점프`, and `▼`; game screen and controls are top-aligned for more vertical swipe room | done | WebKit smoke and installed Chrome layout check passed |
| 2026-07-03 | local browser UI check | Loading caution copy is concise and uses two bullets | done | installed Chrome check verified both loading bullets with a delayed ROM fetch |

Real iPhone validation status:

| item | status | evidence |
| --- | --- | --- |
| Ponpoko boot/play path | partial | user reported it works overall |
| Horizontal overlay lines | partial | user reported issue; local WebKit canvas stretch reproduced and fixed, but real iPhone confirmation is pending |
| Jump-zone swipe up/down | partial | user reported issue; local WebKit smoke now covers no jump press during vertical swipe, but real iPhone confirmation is pending |
| Audio on iPhone | partial | user reported no sound; local adapter test confirms EmulatorJS runtime audio contexts are resumed by `unlockAudio()`, but real iPhone confirmation is pending |
| Audio on iPhone follow-up | done | user reported sound plays well and earlier issue was likely silent mode |
| Resume popup | partial | user reported `"undefined"` / `"Click to resume Emulator"` popup; local WebKit smoke now fails on that text or visible `.ejs_popup_container`, but real iPhone confirmation is pending |
| Pages ROM source | done | GitHub repository variable `ARCADE_SAFARI_ROM_BASE_URL` is set to the authorized Tailscale Serve URL `https://jessie.adal-alhena.ts.net/ponpoko/roms/`; ROM responses return `Access-Control-Allow-Origin: *` |
| Full iPhone readiness | blocked | exact device/iOS, timings, audio, safe-area, no-scroll, overlay, menu-disposal, and five-minute stability checklist are not complete |

Follow-up fix notes:

| ID | changed_paths | result | status |
| --- | --- | --- | --- |
| I10 | `src/styles.css`, `scripts/browser-smoke.mjs` | Canvas is aspect-contained at the native 288x224 ratio instead of stretched to the full stage height; browser smoke fails if the canvas ratio drifts or fills the stage height | done |
| I11 | `src/main.ts`, `scripts/browser-smoke.mjs` | Jump-zone vertical swipe defers the jump press until release; if movement crosses the vertical threshold, only `up` or `down` is sent for that gesture | done |
| I12 | `src/emulator.ts`, `src/main.ts`, `tests/emulator.test.ts`, `scripts/browser-smoke.mjs` | Fallback adapter resumes EmulatorJS `Module.AL` runtime audio contexts on `unlockAudio()`; Start/control gestures retry audio unlock without failing game startup; EmulatorJS popup containers are suppressed and browser smoke rejects the resume-popup text | done |
| I13 | `src/styles.css`, `scripts/browser-smoke.mjs` | `.game-stage` is now aspect-bound and top-aligned at a max 430px width; bottom controls move up to leave vertical swipe room; browser smoke checks stage/canvas ratio and control bottom position | done |
| I14 | `src/main.ts`, `src/styles.css`, `scripts/browser-smoke.mjs` | Bottom jump control renders `▲`, `점프`, and `▼` in one stable glyph stack | done |
| I15 | `src/main.ts`, `src/boot-progress.ts`, `src/styles.css`, `tests/boot-progress.test.ts`, `scripts/browser-smoke.mjs` | Loading and boot cautions are shortened; loading view uses two bullets and boot-progress warning copy is concise | done |
| I16 | `src/catalog.ts`, `.github/workflows/deploy.yml`, `README.md`, `tests/catalog.test.ts` | Built app can fetch ROMs from `VITE_ROM_BASE_URL`; Pages workflow requires `ARCADE_SAFARI_ROM_BASE_URL` and injects it into the build | done |
| I17 | `vite-roms.ts`, `tests/vite-roms.test.ts` | External ROM middleware adds CORS headers so GitHub Pages can fetch the Tailscale Serve ROM URL | done |
| I18 | `src/styles.css`, `scripts/desktop-layout-smoke.mjs`, `package.json` | Desktop Chrome uses a pointer/hover media query to expand the stage while mobile WebKit keeps the compact top-aligned layout | done |

Follow-up verification:

| command/check | result |
| --- | --- |
| `npm run browser:smoke` before canvas fix | expected red: canvas was stretched to `360x592`, ratio `0.61`, instead of native `288:224` |
| `npm run browser:smoke` after canvas fix and before swipe fix | expected red: jump-zone swipe up pressed input `0` before input `4` |
| `npm test -- tests/emulator.test.ts tests/boot-progress.test.ts` before latest audio/popup/copy fix | expected red: popup selector lacked `.ejs_popup_container`, runtime audio context was not resumed, and boot warning copy was still duplicated/long |
| `npm test -- tests/emulator.test.ts tests/boot-progress.test.ts` after latest fix | 2 files, 14 tests passed |
| `npm test` | 10 files, 37 tests passed |
| `npm run typecheck` | passed |
| `node --check scripts/browser-smoke.mjs` | passed |
| `npm run build` | passed |
| `npm run smoke` | passed |
| `npm run browser:smoke` | passed: WebKit Ponpoko ROM fetch, active gameplay, keyboard/touch input, hidden popup/chrome suppression, stage/control layout, no scroll, and menu disposal verified |
| installed Chrome layout check | passed: stage `430x334`, canvas `428x333`, ratio `1.286`, jump control bottom `564` in an `800px` viewport; loading bullets verified with delayed ROM fetch |
| `curl -I --max-time 5 http://127.0.0.1:5173/ponpoko/` | `200 OK` from local Vite server |
| `curl -I --max-time 5 http://100.65.82.82:5173/ponpoko/` | `200 OK` through Tailscale address |
| `gh variable list --repo taekimax/ponpoko` | `ARCADE_SAFARI_ROM_BASE_URL` set to `https://jessie.adal-alhena.ts.net/ponpoko/roms/` |
| `curl -I -H 'Origin: https://taekimax.github.io' https://jessie.adal-alhena.ts.net/ponpoko/roms/ponpoko.zip` | `200 OK`, `Content-Type: application/zip`, `Access-Control-Allow-Origin: *` |
| `VITE_ROM_BASE_URL='https://jessie.adal-alhena.ts.net/ponpoko/roms/' npm run browser:smoke` | passed: WebKit Ponpoko fetches the remote ROM URL and reaches active gameplay |
| `npm run desktop:smoke` | passed: desktop Chrome media query matched; stage expanded to about `658x512` at `1280x800` |
| Real iPhone Safari retest | blocked pending user confirmation of audio, resume-popup, overlay-line, and layout fixes |

## Verification

| command | result |
| --- | --- |
| `npm test` | final follow-up state: 10 files, 37 tests passed |
| `npm run typecheck` | passed |
| `npm run prepare:roms` | validated `ponpoko.zip`, `bublbobl1.zip`, `spangj.zip` in `/Volumes/dev/ponpoko/roms` |
| `npm run build` | passed |
| `npm run smoke` | passed against external ROM files and built assets |
| `npm run browser:smoke` | final follow-up state: passed WebKit Ponpoko ROM fetch, active gameplay, keyboard/touch input, hidden popup/chrome suppression, stage/control layout, no scroll, and menu disposal |
| installed Chrome layout check | passed against `http://127.0.0.1:5173/ponpoko/`; stage `430x334`, canvas `428x333`, jump control bottom `564` in `800px` viewport |
| `curl -I --max-time 5 http://100.65.82.82:5173/ponpoko/` | `200 OK`; Tailscale URL remains reachable |
| `curl -sI http://localhost:5173/ponpoko/roms/ponpoko.zip` | `200 OK`, `Content-Type: application/zip` |
| `curl -s http://localhost:5173/ponpoko/roms/spangj.zip \| wc -c` | `450684`, matching `/Volumes/dev/ponpoko/roms/spangj.zip` |
| `curl -s http://localhost:5173/ponpoko/roms/bublbobl1.zip \| wc -c` | `50182`, matching `/Volumes/dev/ponpoko/roms/bublbobl1.zip` |
| Plan-only doc consistency scan | Ponpoko path, no-SAB/no-pthreads gate, `NativeEmulator.attach()`, `unlockAudio()`, runtime command gates, hidden-overlay gate, and real iPhone checklist gates are present |
| Planning status enum scan | no disallowed waiting status remains in this review doc; planning rows use the allowed status enum |
| W4.1 doc consistency scan | W4.1 command/path references, `/ponpoko/roms/ponpoko.zip`, `downloadRomArrayBuffer()`, verification rows, and partial user-reported iPhone status are present |
| W4.1 UI boundary scan | `src/main.ts` and `src/input.ts` have no direct fallback helper, EmulatorJS global, runtime input index, or runtime asset path references |
| W4.1 ROM handoff scan | `src/main.ts` passes `rom.arrayBuffer` into `NativeEmulator.load()`; fallback `File` conversion remains inside `src/emulator.ts` |
| Trailing whitespace scan | no trailing whitespace found in this review doc |

## Closure Matrix

| ID | scenario | criteria | outcome | action |
| --- | --- | --- | --- | --- |
| CM1 | all-green | tests, typecheck, build, ROM route check pass | done | continue to native emulator design |
| CM2 | decision-blocked | native engine choice not yet approved | needs-clarification | choose engine approach before replacing EmulatorJS |
| CM3 | partial-delivery | this slice only wires local ROMs and catalog | done | UI/native engine redesign remains next |
| CM4 | plan-only handoff | Ponpoko direct-runtime boot spike has deterministic P4.1-P4.7 rows and W4.1-W4.7 handoffs | done | P4.1 implemented; continue with P4.2 before UI or other games |
| CM5 | W4.1 local-best-effort | direct adapter entry, full ZIP handoff, tests, build, smoke, WebKit checks, and installed Chrome layout check pass | done | real iPhone retest remains blocked pending user confirmation of audio, popup, overlay-line, and layout fixes |
