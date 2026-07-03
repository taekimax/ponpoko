# Native Emulator Research Handoff

Last updated: 2026-07-03

## Copy/Paste Handoff Prompt

```text
You are taking over the `native-emulator` branch in `/Volumes/dev/arcade-safari`.

Context:
- Prior wrapper state was preserved on branch `emulator-wrapper` at commit `8a13323`.
- Active branch is `native-emulator`.
- Current app is Vite/TypeScript under `/ponpoko/`.
- Current catalog is only three ROMs from `/Volumes/dev/ponpoko/roms`: `ponpoko.zip`, `bublbobl1.zip`, `spangj.zip`.
- Local dev/preview serves `/ponpoko/roms/*.zip` from that directory via `ARCADE_SAFARI_ROM_DIR`.
- EmulatorJS wrapper assets still exist, but the current wrapper version still has repeated ROM-loading and control-overlay problems. Treat it as unreliable until researched.

Mission:
Do not start by coding a replacement runtime. First perform thorough research and produce a plan for a native emulator runtime plus app-owned connector that will run smoothly in iPhone Safari portrait. The operating target is iPhone Safari, not desktop Chrome. Pay special attention to Safari WebAssembly memory/startup behavior, audio unlock, worker/cross-origin limits, ROM ZIP loading/decompression/caching, touch event reliability, safe-area layout, and hidden overlays intercepting touches.

Research deliverable:
Create `docs/native-emulator-runtime-decision.md` with:
- Candidate runtime options: direct libretro/MAME WASM, minimal extraction from current local EmulatorJS assets, and any other credible browser arcade emulator path.
- iPhone Safari constraints with current sources/links.
- ROM loading strategy analysis: full ZIP fetch, Blob/File, ArrayBuffer, streaming, pre-extraction, HTTP range/chunking, service worker/cache. Explicitly answer whether slicing/chunking ROMs is useful or harmful for these arcade ZIPs.
- Licensing/attribution requirements for the selected runtime/core/assets.
- Recommendation: selected runtime path, fallback path, smallest Ponpoko boot spike, and blockers.

Connector plan:
Design an app-owned `NativeEmulator` boundary before replacing runtime code. UI must not depend on EmulatorJS globals, libretro internals, MAME input indexes, or runtime asset paths. The connector must cover load/attach/start/pause/reset/press/release/dispose/snapshot, lifecycle states, canvas sizing, audio unlock, errors, cleanup, and debug diagnostics.

Temporary keyboard input requirement:
Add keyboard test support before serious runtime debugging. Route keyboard and touch through the same app input layer.
- ArrowLeft: left
- ArrowRight: right
- ArrowUp: up
- ArrowDown: down
- Q: action1
- W: action2
- E: action3
- A: action4
- S: action5
- D: action6
- [: special1
- ]: special2
- \: special3

Game mapping:
- Ponpoko: left/right/up/down plus jump. Keep bottom touch profile as left, jump, right, with vertical swipes for up/down.
- Bubble Bobble: left/right/up/down plus jump and attack.
- Super Pang: left/right plus fire, and only add a second action if `spangj.zip` exposes one.

Suggested order:
1. Research and write `docs/native-emulator-runtime-decision.md`.
2. Add/revise `NativeEmulator` connector contract with a fake runtime test double.
3. Add generic input model and keyboard mapping tests.
4. Build smallest Ponpoko boot spike.
5. Verify Ponpoko with keyboard input before touch debugging.
6. Verify Ponpoko with bottom touch controls.
7. Add Bubble Bobble.
8. Add Super Pang after confirming `spangj.zip` is the intended game.
9. Redesign the portrait UI around the proven connector.
10. Expand browser smoke tests and record real iPhone Safari manual checks.

Verification expectations:
- For research/planning: `npm test` and `npm run typecheck`.
- Before any runtime-complete claim: `npm run build`, `npm run smoke`, and `npm run browser:smoke`.
- For iPhone readiness, record a real device checklist: first load, ROM load time/stalls, audio unlock, keyboard path, touch path, safe-area fit, no page scroll, no hidden overlay intercepts, menu disposal, and five-minute runtime stability.
```

## Message For Next Session

You are taking over the `native-emulator` branch of `/Volumes/dev/arcade-safari`. The previous wrapper state was preserved on `emulator-wrapper` at commit `8a13323`. The active branch already narrows the app to three local ROMs from `/Volumes/dev/ponpoko/roms`: `ponpoko.zip`, `bublbobl1.zip`, and `spangj.zip`.

Your mission is not to immediately code a new runtime. First, run thorough research and produce a concrete plan for a native emulator runtime and app connector that can run smoothly in iPhone Safari portrait. The current app still has repeated ROM-loading and control-overlay failures, even after wrapper fixes. Treat the current EmulatorJS-wrapper path as unreliable until proven otherwise.

## Operating Environment

- Primary target: iPhone Safari browser in portrait orientation.
- Development machine: Mac mini M4, 16 GB RAM.
- App stack: Vite, TypeScript, static SPA under `/ponpoko/`.
- Local ROM route: `/ponpoko/roms/<file>.zip`.
- Local ROM source: `/Volumes/dev/ponpoko/roms`, configurable with `ARCADE_SAFARI_ROM_DIR`.
- Current runtime: EmulatorJS/MAME wrapper assets are still present, but the product direction is app-owned native runtime integration.

Do not optimize for desktop first. Desktop/WebKit tests are useful, but the real success criterion is iPhone Safari behavior: memory, WebAssembly startup, audio unlock, touch input reliability, viewport stability, safe-area layout, and recovery from failed loads.

## Problem Statement

We are seeing repeated trouble in two areas:

1. ROM loading and runtime startup
   - ROM fetch/download may complete but runtime startup can still stall or fail.
   - Current boot progress work did not fully solve startup reliability.
   - Investigate whether loading size, ZIP handling, decompression, caching, WASM memory, core-data loading, or Safari-specific limits are the real bottleneck.
   - Consider whether ROM handling needs slicing, pre-extraction, range requests, worker-based decompression, asset preloading, smaller core builds, service-worker caching, or a different runtime model. Do not assume ROM slicing is valid for arcade ZIPs until researched and tested.

2. Control overlays and input
   - Emulator/default overlay controls have conflicted with the proprietary app UI.
   - App controls must be owned by our code, placed in the bottom area, and mapped into the emulator through a narrow connector.
   - The final UI cannot show emulator menus, default virtual gamepads, wrapper chrome, or hidden overlays that intercept touches.

## Required Research Outputs

Produce `docs/native-emulator-runtime-decision.md` with:

- Candidate runtimes:
  - Direct libretro/MAME WASM integration.
  - A minimal extraction of usable runtime pieces from current local EmulatorJS assets.
  - Any other credible open-source browser arcade emulator path for MAME-era arcade ROMs.
- iPhone Safari constraints:
  - WebAssembly memory behavior and practical limits.
  - Worker support and whether the runtime needs SharedArrayBuffer/cross-origin isolation.
  - AudioContext unlock requirements.
  - IndexedDB/cache behavior and whether it helps or hurts startup.
  - Touch/pointer event reliability and page-scroll suppression.
- ROM loading strategy:
  - Full ZIP fetch as Blob/File.
  - Streamed fetch plus ArrayBuffer.
  - Pre-extracted assets, if compatible with the selected runtime.
  - HTTP Range or chunking feasibility.
  - Service worker or Cache API feasibility.
  - Explicit conclusion on whether "slicing ROMs" is technically useful or harmful for these arcade ZIPs.
- Licensing:
  - Runtime license.
  - Core/data asset license.
  - Any attribution files required in `public/` or docs.
- Recommendation:
  - Selected runtime path.
  - Fallback path.
  - Smallest boot spike to prove the choice.
  - Risks that block implementation.

Use current official/browser/runtime docs where available. Do not rely only on memory for iPhone Safari capabilities.

## App Connector Requirements

Design an app-owned connector before replacing runtime code. The app should call a stable interface instead of emulator globals:

```ts
interface NativeEmulator {
  load(game: GameEntry, rom: Blob | ArrayBuffer): Promise<void>;
  attach(target: HTMLElement): void;
  start(): Promise<void>;
  pause(): void;
  reset(): void;
  press(input: EmulatorInput): void;
  release(input: EmulatorInput): void;
  dispose(): void;
  getSnapshot(): EmulatorSnapshot;
}
```

The exact TypeScript shape can change, but the boundary must cover:

- Runtime lifecycle: idle, loading ROM, loading runtime, running, paused, failed, disposed.
- Canvas ownership and resize behavior.
- Audio unlock on user gesture.
- Input press/release/tap mapping.
- Error reporting with user-visible app messages.
- Cleanup when returning to menu.
- Runtime diagnostics behind a query flag.

The UI must not know about libretro internals, EmulatorJS globals, MAME input indexes, or runtime asset paths.

## Temporary Keyboard Input Requirement

For testing, implement keyboard input support in addition to touch controls. This is required before serious runtime debugging because it separates emulator/input failures from touch-overlay failures.

Required keyboard map:

| physical key | app action |
| --- | --- |
| ArrowLeft | left |
| ArrowRight | right |
| ArrowUp | up |
| ArrowDown | down |
| Q | action1 |
| W | action2 |
| E | action3 |
| A | action4 |
| S | action5 |
| D | action6 |
| `[` | special1 |
| `]` | special2 |
| `\` | special3 |

Map those generic actions per game:

- Ponpoko: left/right/up/down plus jump. Keep bottom touch profile as left, jump, right, with vertical swipes for up/down.
- Bubble Bobble: left/right/up/down plus jump and attack.
- Super Pang: left/right plus fire, and any second action only if the selected ROM/runtime exposes it.

Do not hardcode keyboard events directly into UI components. Route keyboard and touch through the same app input layer, then into the emulator connector.

## Suggested Work Order

1. Research and write the runtime decision doc.
2. Add or revise the `NativeEmulator` connector contract with a fake runtime test double.
3. Add the generic input model and keyboard mapping tests.
4. Build the smallest boot spike for Ponpoko only.
5. Verify Ponpoko with keyboard input before debugging touch controls.
6. Verify Ponpoko with bottom touch controls.
7. Add Bubble Bobble.
8. Add Super Pang after confirming `spangj.zip` is the intended target.
9. Redesign the portrait UI around the proven runtime connector.
10. Expand browser smoke tests and add real iPhone Safari manual checks.

## Acceptance Criteria For The Research/Planning Session

- `docs/native-emulator-runtime-decision.md` exists and names one recommended runtime path.
- The decision doc includes iPhone Safari-specific evidence and links/sources.
- The decision doc explicitly answers whether ROM slicing/chunking is useful.
- The connector plan shows how app UI, ROM loading, runtime, and input communicate.
- Keyboard input support is planned with the QWE/ASD, arrow, and `[]\` mapping above.
- Next implementation tasks are split into small `P#` or `W#` slices with concrete verification.

## Verification Expectations

For research/planning only:

```bash
npm test
npm run typecheck
```

Before any runtime-complete claim:

```bash
npm run build
npm run smoke
npm run browser:smoke
```

For iPhone Safari readiness, do not rely on Playwright alone. Record a manual device checklist that includes:

- First load from private/local network URL.
- ROM load time and any stalls.
- Audio start after user gesture.
- Keyboard test path on desktop.
- Touch test path on iPhone.
- Bottom controls fit above safe area.
- No page scroll during gameplay.
- No hidden overlay intercepts controls.
- Returning to menu disposes the runtime.
- One game runs for five minutes without crashing or losing input.
