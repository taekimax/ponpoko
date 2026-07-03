# Native Emulator Development Plan

Last updated: 2026-07-03

## Mission

Build a private-development iPhone Safari web app for three arcade games: Ponpoko, Bubble Bobble, and Super Pang. The app should keep a proprietary app-owned interface and touch-control system while replacing the current EmulatorJS wrapper path with a direct native emulator integration where the app owns boot, canvas, audio, input, loading, errors, and game-specific controls.

## Current State

- Branch `emulator-wrapper` preserves the previous wrapper implementation at commit `8a13323`.
- Branch `native-emulator` is the active breaking-change branch.
- The current app is a Vite/TypeScript single-page app mounted at `/ponpoko/`.
- The catalog is narrowed to three local ROM files: `ponpoko.zip`, `bublbobl1.zip`, and `spangj.zip`.
- Local dev/preview serves `/ponpoko/roms/*.zip` from `/Volumes/dev/ponpoko/roms`, configurable through `ARCADE_SAFARI_ROM_DIR`.
- EmulatorJS is still the runtime at this point; the next major work is replacing the runtime layer.
- Research handoff for the next session: `docs/native-emulator-research-handoff.md`.

## Product Goals

- Start each game from the app menu with minimal visible emulator boot friction.
- Run in iPhone Safari portrait as the primary target.
- Keep all visible UI proprietary: no emulator menus, skins, default virtual gamepad, or wrapper chrome.
- Provide per-game touch controls in the bottom area of the screen.
- Keep Ponpoko’s proprietary three-zone control: left, center jump, right, with vertical swipes for up/down.
- Support local/private ROM files without committing ROM ZIPs to git.
- Preserve deterministic tests and browser smoke checks for every critical startup/input path.

## Non-Goals

- Do not download copyrighted ROMs from public sites.
- Do not support a ten-game catalog during this phase.
- Do not build desktop-first layouts, multiplayer, cloud saves, online leaderboards, or public ROM distribution.
- Do not refactor unrelated app architecture unless it blocks the native emulator integration.
- Do not optimize for every MAME driver; support only the three selected ROMs.

## Open Decisions

| ID | decision | owner | status | notes |
| --- | --- | --- | --- | --- |
| D1 | Confirm `spangj.zip` is the intended Super Pang target | user | needs-clarification | The workspace ROM is `spangj.zip`; the user mentioned a possible Neo Geo version, which may be a mistaken memory. The plan proceeds with `spangj.zip` unless corrected. |
| D2 | Select direct emulator runtime strategy | codex | in_progress | Compare direct libretro/MAME WASM integration versus extracting only the usable runtime pieces from current local assets. |
| D3 | Decide private deployment ROM hosting | user/codex | pending | Local Vite middleware solves development. Static hosting needs a private `/ponpoko/roms/` source or a deployment-time private asset process. |

## Architecture Direction

The app should move to a small runtime boundary:

```text
UI/Menu
  -> GameCatalog
  -> RomProvider
  -> NativeEmulator
       -> RuntimeLoader
       -> Canvas/Audio
       -> InputAdapter
       -> SaveStateAdapter
  -> GameControllerProfile
```

`NativeEmulator` should be the only module that knows about the chosen WASM/libretro/MAME runtime. The rest of the app should talk through app-owned methods such as `load(game, rom)`, `start()`, `pause()`, `reset()`, `press(action)`, `release(action)`, and `dispose()`.

This keeps controller design, boot UI, error handling, and tests independent from the emulator implementation choice.

## MVP Cut

The MVP is complete when all three games boot on iPhone Safari portrait, use app-owned bottom controls, and pass automated desktop/WebKit checks plus one manual iPhone Safari checklist. Everything beyond that is deferred.

## Planning Slices

| ID | title | priority | scope_in | scope_out | acceptance_check | risk | owner_candidate | status | handoff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | Runtime decision spike | must-ship | Evaluate direct runtime options, license constraints, Safari WASM/audio limits, and ROM compatibility for the three files | Full production integration | Written decision record with selected runtime, fallback, license notes, and boot feasibility | high | codex | in_progress | P1->W1 |
| P2 | Emulator interface boundary | must-ship | Define `NativeEmulator` contract, lifecycle states, input API, error model, and test doubles | Game-specific UI redesign | Unit tests cover state transitions and action mapping through the interface | medium | codex | pending | P2->W2 |
| P3 | Local ROM provider | must-ship | Keep external ROM directory support, validate three ZIPs, provide same-origin app URLs, report loading errors | Public ROM download automation | `npm run prepare:roms`, `npm run smoke`, and route byte-count checks pass | medium | codex | done | P3->W3 |
| P4 | Ponpoko native boot | must-ship | Boot `ponpoko.zip` through direct runtime, attach canvas/audio, map coin/start/left/right/up/down/jump | Perfect startup-state skipping | Browser smoke confirms active frames and controllable gameplay | high | codex | pending | P4->W4 |
| P5 | Bubble Bobble native boot | must-ship | Boot `bublbobl1.zip`, map left/right/up/down/jump/attack, validate visible gameplay | Advanced two-player controls | Browser smoke confirms active frames and action input events | high | codex | pending | P5->W5 |
| P6 | Super Pang native boot | must-ship | Boot `spangj.zip`, map left/right/fire, confirm correct title/gameplay | Alternate Pang clones unless D1 changes | Browser smoke confirms active frames and fire input events | high | codex | pending | P6->W6 |
| P7 | Proprietary portrait shell | must-ship | Redesign menu, game stage, boot/errors, safe-area layout, and bottom controller placement for iPhone portrait | Marketing landing page | Playwright screenshot checks show no overlapping controls at iPhone viewport sizes | medium | codex | pending | P7->W7 |
| P8 | Game-specific touch controllers | must-ship | Ponpoko three-zone bottom control, Bubble Bobble movement/action control, Super Pang movement/fire control | External gamepad configuration UI | Unit and browser tests verify press/release/swipe action mapping per game | medium | codex | pending | P8->W8 |
| P9 | Runtime diagnostics | must-ship | Minimal debug overlay behind query flag, startup timing, ROM/runtime error messages | Public telemetry | Browser tests cover clear user-facing failure states | medium | codex | pending | P9->W9 |
| P10 | iPhone Safari verification | must-ship | Manual checklist for load, audio unlock, touch latency, orientation, wake behavior, and memory stability | Android/desktop certification | Manual iPhone checklist recorded in review doc | high | user/codex | pending | P10->W10 |
| P11 | Private deployment path | must-ship | Define how private deployment serves app assets and ROM files under `/ponpoko/roms/` | Public GitHub Pages ROM publication | Deployment checklist proves app can fetch all three ROMs from private origin | high | user/codex | pending | P11->W11 |
| P12 | Save/load polish | defer | App-owned save-state slots if runtime supports it cleanly | Cloud sync | Deferred until stable boot/input exists | medium | codex | pending | none |
| P13 | Visual asset polish | defer | Higher-quality thumbnails, loading art, controller icons | Brand system expansion | Deferred; does not block native runtime MVP | low | codex | pending | none |

## Phase Plan

### Phase 0: Baseline and ROM Wiring

Status: done.

- Preserve wrapper state on `emulator-wrapper`.
- Create `native-emulator` branch.
- Narrow catalog to three ROMs.
- Serve local ROM files from `/Volumes/dev/ponpoko/roms`.
- Validate current wrapper path still boots Ponpoko before runtime replacement.

Verification:

- `npm test`
- `npm run typecheck`
- `npm run prepare:roms`
- `npm run build`
- `npm run smoke`
- `npm run browser:smoke`

### Phase 1: Runtime Decision Spike

Goal: choose the direct emulation strategy before large edits.

Tasks:

- Audit current EmulatorJS assets to identify what is wrapper chrome versus reusable runtime code.
- Evaluate direct MAME/libretro WASM integration for the three ROM sets.
- Check license obligations for any bundled runtime assets.
- Confirm iPhone Safari constraints: memory, WebAssembly startup, audio unlock, and touch event reliability.
- Produce `docs/native-emulator-runtime-decision.md`.

Exit criteria:

- One selected runtime path.
- One explicit fallback path.
- No unresolved license blocker for private development.
- A small boot spike proves at least Ponpoko can instantiate the runtime.

### Phase 2: Runtime Boundary and Adapter

Goal: isolate emulator-specific code.

Tasks:

- Add a `NativeEmulator` interface and fake implementation for tests.
- Move ROM loading behind a `RomProvider`.
- Move input mapping behind an `InputAdapter`.
- Add lifecycle states: `idle`, `loadingRom`, `loadingRuntime`, `running`, `paused`, `failed`, `disposed`.
- Keep app rendering independent from runtime internals.

Exit criteria:

- Unit tests cover lifecycle transitions, disposal, and input calls.
- Existing UI can run against a fake emulator without EmulatorJS globals.

### Phase 3: Three-Game Native Boot

Goal: each ROM boots and accepts app-owned input.

Tasks:

- Integrate Ponpoko first because its control model is the primary product requirement.
- Add Bubble Bobble after the runtime contract is stable.
- Add Super Pang after D1 confirms `spangj.zip` is the target.
- Record per-game runtime quirks in the catalog, not scattered through UI code.

Exit criteria:

- Each game reaches active frames through automated browser checks.
- Each game responds to mapped touch controls.
- Failures show app-owned error messages, not runtime internals.

### Phase 4: Proprietary iPhone Portrait UI

Goal: replace wrapper-era screens with a purpose-built arcade app shell.

Tasks:

- Build a compact three-game menu.
- Keep game canvas centered and stable above the controller zone.
- Place controllers in the bottom safe-area-aware panel.
- Use icon-first controls where appropriate.
- Keep labels short enough for Korean and English names.
- Add game-specific boot copy and error states.

Exit criteria:

- Playwright iPhone-size screenshots show no overlap at 390x844 and smaller portrait sizes.
- Controls do not resize or shift during active play.
- No visible EmulatorJS or third-party UI remains.

### Phase 5: Verification and Hardening

Goal: make regressions obvious.

Tasks:

- Update browser smoke tests for all three games.
- Add route checks for external ROM byte counts.
- Add a manual iPhone Safari checklist.
- Measure startup time and memory symptoms on the Mac mini dev server plus real iPhone Safari.
- Keep `browser:smoke` as the pre-completion gate.

Exit criteria:

- `npm test`, `npm run typecheck`, `npm run build`, `npm run smoke`, and `npm run browser:smoke` pass.
- Manual iPhone checklist is recorded.
- Known residual risks are documented before any merge or PR.

### Phase 6: Private Deployment

Goal: make the private app usable outside the local dev server.

Tasks:

- Choose private ROM hosting that serves the same `/ponpoko/roms/<file>` paths.
- Ensure app assets and ROM assets share a compatible origin/CORS setup.
- Document deployment steps and rollback.
- Keep ROM files out of git unless the user explicitly changes that requirement.

Exit criteria:

- A deployed private URL loads all three ROMs.
- No public workflow downloads or publishes copyrighted ROMs.

## Verification Gates

Run these after each implementation slice that touches code:

```bash
npm test
npm run typecheck
npm run build
npm run smoke
```

Run this before claiming emulator/runtime completion:

```bash
npm run browser:smoke
```

Run manual iPhone Safari verification before calling the MVP complete:

```text
1. Open the private app URL in iPhone Safari portrait.
2. Start Ponpoko, Bubble Bobble, and Super Pang one by one.
3. Confirm audio starts after the first user gesture.
4. Confirm touch controls do not scroll the page or lose stuck inputs.
5. Confirm the bottom controller fits above the safe area.
6. Confirm returning to menu disposes the previous game.
7. Let one game run for at least five minutes without memory failure.
```

## Risk Register

| ID | risk | impact | mitigation |
| --- | --- | --- | --- |
| R1 | Direct runtime does not support one of the three ROM sets on iPhone Safari | high | Spike runtime before UI rewrite; keep fallback runtime path until all games boot. |
| R2 | iPhone Safari WebAssembly memory limits cause startup or runtime failures | high | Test on real device early; keep assets minimal; avoid loading multiple runtimes at once. |
| R3 | Audio requires user gesture or fails after navigation | medium | Tie runtime start/audio unlock to explicit Start tap; test menu-return and restart flows. |
| R4 | Touch inputs stick or conflict with Safari gestures | high | Keep `touch-action: none` on control surfaces; test pointer/touch fallback paths. |
| R5 | `spangj.zip` is not the desired game/version | medium | Resolve D1 before final controller tuning and copy. |
| R6 | License obligations for bundled emulator code are unclear | high | Record runtime license decision before committing new third-party runtime assets. |
| R7 | Static deployment cannot serve private ROMs at expected paths | high | Decide deployment topology before removing local-only middleware assumptions. |

## Handoff Table

| plan_id | work_id | owner | verification |
| --- | --- | --- | --- |
| P1 | W1 | codex | Runtime decision doc and Ponpoko boot spike |
| P2 | W2 | codex | Unit tests for `NativeEmulator` contract |
| P3 | W3 | codex | `npm run prepare:roms`, route byte-count checks |
| P4 | W4 | codex | Ponpoko browser smoke active frames and controls |
| P5 | W5 | codex | Bubble Bobble browser smoke active frames and controls |
| P6 | W6 | codex | Super Pang browser smoke active frames and controls |
| P7 | W7 | codex | iPhone viewport screenshot checks |
| P8 | W8 | codex | Per-game input unit and browser tests |
| P9 | W9 | codex | Failure-state browser tests |
| P10 | W10 | user/codex | Recorded manual iPhone Safari checklist |
| P11 | W11 | user/codex | Private deployment fetch test |
