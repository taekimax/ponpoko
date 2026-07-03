# Native Emulator Runtime Decision

Last updated: 2026-07-03

## Decision

Build an app-owned `NativeEmulator` boundary first, then spike a single-threaded
MAME 2003-Plus/libretro WASM runtime for Ponpoko behind that boundary. Do not let
the app UI call EmulatorJS globals, RetroArch/libretro internals, MAME input
indexes, or runtime asset paths.

The recommended runtime path is a direct MAME 2003-Plus/libretro WASM adapter
with app-owned ROM loading, canvas attachment, audio unlock, input routing,
lifecycle state, cleanup, and diagnostics. The fallback is a minimal extraction
of the current local EmulatorJS runtime assets behind the same adapter, with all
visible/interactive wrapper chrome removed and treated as temporary until the
direct runtime proves stable on iPhone Safari.

This is intentionally not a desktop-first decision. The operating target is
iPhone Safari portrait.

## Goals And Non-Goals

Goals:

- Boot `ponpoko.zip`, `bublbobl1.zip`, and `spangj.zip` from same-origin private
  URLs under `/ponpoko/roms/`.
- Keep the app shell, loading states, error messages, canvas sizing, controls,
  and debug output owned by this app.
- Make keyboard and touch use one generic input layer before serious runtime
  debugging.
- Prove Ponpoko on real iPhone Safari before calling the runtime ready.

Non-goals:

- No public ROM downloading or ROM commits.
- No replacement runtime implementation before the connector and boot spike are
  planned.
- No dependency on hidden emulator menus, default virtual gamepads, or wrapper
  overlays.
- No multi-threaded/SAB runtime for the first iPhone Safari spike.

## Candidate Runtimes

| Candidate | Fit | Strengths | Risks | Decision |
| --- | --- | --- | --- | --- |
| Direct MAME 2003-Plus/libretro WASM | High | MAME 2003-Plus is performance-oriented for libretro platforms including mobile, supports arcade ZIP romsets, and matches the existing core family. | Requires an app-owned frontend/adapter or a thin RetroArch-compatible host; licensing is MAME non-commercial; exact ROM set compatibility must be verified. | Recommended first spike. |
| Minimal local EmulatorJS extraction | Medium | Assets already exist under `public/emulatorjs`; current bundle includes `mame2003_plus-legacy-wasm.data`; fastest way to confirm whether the local core/ROMs can boot. | Current wrapper has repeated ROM-loading and hidden overlay/control problems; minified GPLv3 wrapper globals are not a stable app contract. | Fallback only, behind `NativeEmulator`. |
| Upstream MAME Emscripten subtarget | Medium | Official MAME supports Emscripten builds and supports building a subset of source drivers, which could reduce browser payload. Upstream MAME licensing is clearer for public source distribution than old non-commercial MAME lineage. | Modern MAME can be heavier than MAME 2003-Plus and may require modern ROM sets, not the current 0.78-era ZIPs. Build maintenance is higher. | Fallback if MAME 2003-Plus licensing or runtime API blocks progress. |
| Emularity/JSMESS style loader | Medium-low | Proven browser MAME lineage used by archival sites; designed to embed emulators. | Older loader model, BrowserFS/loader complexity, not app-owned enough without major surgery, and default launch assumptions do not target iPhone portrait controls. | Research fallback, not MVP default. |
| FBNeo/libretro WASM | Low-medium | Often faster than full MAME for supported arcade boards. | ROM compatibility for these exact MAME ZIPs is not guaranteed; license/commercial-use constraints need review; may not support all three games as provided. | Defer unless MAME paths fail. |
| Nostalgist.js/other RetroArch browser wrappers | Low | Modern TypeScript-friendly wrapper, permissive wrapper license, convenient API. | Still wrapper-owned runtime behavior; arcade/MAME core availability and mobile touch behavior are uncertain; underlying cores keep their own licenses. | Useful reference only. |

## iPhone Safari Constraints

### WebAssembly Startup And Memory

Safari 15.2 expanded WebAssembly addressable memory to 4 GB and re-enabled Wasm
threading with the right isolation headers, but that does not mean a real iPhone
tab can safely allocate near that size. MDN documents that Wasm memory uses
64 KiB pages and can fail allocation when the user agent is out of memory.
Emscripten documents that heap growth can be costly because old heap contents
may need to be copied and JS typed array views replaced.

Implications:

- Use a single runtime instance at a time.
- Prefer a single-threaded build for the first spike.
- Do not set huge `INITIAL_MEMORY` or `MAXIMUM_MEMORY` values just because Safari
  exposes a 4 GB address space.
- If using Emscripten memory growth, cap it conservatively and measure stalls.
  A fixed memory build may be smoother if the required size is known.
- Dispose runtime, canvas, audio nodes, workers, timers, and object URLs on menu
  return.
- Serve `.wasm` with `Content-Type: application/wasm` so
  `WebAssembly.instantiateStreaming()` can use the optimized path.

Sources:

- WebKit Safari 15.2 WebAssembly and COOP/COEP notes:
  https://webkit.org/blog/12140/new-webkit-features-in-safari-15-2/
- MDN `WebAssembly.Memory`:
  https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/Memory/Memory
- MDN `WebAssembly.instantiateStreaming()`:
  https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/instantiateStreaming_static
- Emscripten memory settings:
  https://emscripten.org/docs/tools_reference/settings_reference.html

### Workers, SharedArrayBuffer, And Cross-Origin Isolation

Dedicated workers are acceptable for helper work such as optional decompression or
diagnostics. Do not require SharedArrayBuffer or pthreads for the first runtime.
SharedArrayBuffer requires secure context plus cross-origin isolation. Emscripten
pthreads builds also require COOP/COEP headers, and Emscripten cannot produce one
binary that uses threads when available and transparently falls back when not.

Implications:

- First spike must be single-threaded and no-SAB.
- Keep all runtime, WASM, worker, ROM, and data assets same-origin.
- Avoid CDN runtime assets because COEP/CORP mismatches can break isolation.
- If a future threaded runtime is needed, add a separate threaded build and
  headers:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp` or `credentialless`
  - Verify `window.crossOriginIsolated === true` on iPhone Safari.

Sources:

- MDN `SharedArrayBuffer` security requirements:
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer
- MDN `crossOriginIsolated`:
  https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated
- Emscripten pthreads:
  https://emscripten.org/docs/porting/pthreads.html

### Audio Unlock

iPhone Safari must treat game audio as locked until an explicit user action. The
Start tap should call the runtime audio unlock path and `AudioContext.resume()`
before or during `start()`. Starting audio from page load is not reliable.

Implications:

- `NativeEmulator.start()` must be called from a user gesture.
- Add `unlockAudio(): Promise<void>` to the adapter even if the first runtime
  internally owns its AudioContext.
- Surface an `audioLocked` diagnostic if the context remains suspended after the
  Start tap.

Sources:

- Apple Safari Web Audio guide:
  https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/Using_HTML5_Audio_Video/PlayingandSynthesizingSounds/PlayingandSynthesizingSounds.html
- MDN autoplay guide:
  https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- MDN `AudioContext.resume()`:
  https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume

### Touch, Scroll Suppression, And Safe Area

iPhone portrait controls must not scroll the page, trigger pointer cancellation,
or lose releases. `touch-action: none` belongs on the game stage and bottom
controller surfaces. Touch-event fallbacks that call `preventDefault()` must use
non-passive listeners. The bottom controls must use safe-area padding so they are
not hidden under the Home indicator.

Implications:

- Use Pointer Events as the primary input path.
- Call `setPointerCapture()` for active touches when possible.
- Release all active inputs on `pointercancel`, `pointerup`, `lostpointercapture`,
  `blur`, `visibilitychange`, and runtime disposal.
- Use `touch-action: none`, `user-select: none`, and fixed-size control zones.
- Add `viewport-fit=cover` and use `env(safe-area-inset-bottom)` in the bottom
  controller panel.
- Smoke-test `document.elementsFromPoint()` over each control zone to catch
  hidden overlays intercepting touches.

Sources:

- WebKit iPhone safe-area guidance:
  https://webkit.org/blog/7929/designing-websites-for-iphone-x/
- MDN `env()` safe-area variables:
  https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env
- MDN `touch-action`:
  https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action
- MDN passive listeners:
  https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
- MDN `pointer-events`:
  https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/pointer-events

### Storage, Cache, And Safari Eviction

Cache API can help repeat loads, but it must not be required for first boot.
Browser storage is best-effort by default and Safari can proactively evict
script-written storage after periods without user interaction. The current
EmulatorJS path disables IndexedDB caches, which is a reasonable default until
the runtime is stable.

Implications:

- Use normal HTTP caching for static WASM/core assets first.
- Do not block startup on a service worker install or Cache API warm-up.
- If adding Cache API later, version the cache and treat cache misses as normal.
- Do not rely on IndexedDB for required ROM/runtime startup data.
- Measure first-load and second-load startup separately on iPhone Safari.

Sources:

- MDN Cache API:
  https://developer.mozilla.org/en-US/docs/Web/API/Cache
- MDN CacheStorage:
  https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage
- MDN storage quotas and eviction:
  https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- WebKit ITP script-writable storage cap:
  https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/

## ROM Loading Strategy

Current local ROM sizes:

| ROM | ZIP size | Uncompressed contents | Notes |
| --- | ---: | ---: | --- |
| `ponpoko.zip` | 20 KB | 41,760 bytes, 14 files | Very small, standard arcade ZIP shape. |
| `bublbobl1.zip` | 49 KB | 98,304 bytes, 2 files | Looks like a clone/split-style set; verify whether parent files are required by selected runtime. |
| `spangj.zip` | 440 KB | 688,256 bytes, 7 files | Still small enough for a single request. |

Recommended path:

1. `RomProvider` fetches `/ponpoko/roms/<rom>.zip` from the app origin.
2. Use `response.arrayBuffer()` for the direct native adapter. Use `Blob` only if
   the fallback runtime requires a `File`/`Blob` URL.
3. Verify `Content-Length`, status, and byte count in smoke tests.
4. Mount the ZIP as one file in the runtime filesystem and let MAME/libretro read
   the romset. Do not JS-decompress unless the chosen direct runtime explicitly
   requires extracted files.
5. Keep ROMs uncommitted and externally supplied by the user/private deployment.

### Explicit Answer: ROM Slicing Or Chunking

Do not slice or HTTP-chunk these arcade ZIPs for the MVP.

Slicing is harmful or at best useless here because:

- The ROM ZIPs are tiny compared with the core asset and WASM startup cost.
- MAME/libretro expects a complete arcade romset ZIP or the complete individual
  ROM files with correct filenames/checksums.
- ZIP readers commonly need the central directory, which is at the end of the ZIP
  file, before they can reliably locate entries.
- HTTP Range requests are useful for large random-access media/data. They add
  request and cache complexity here without reducing the bytes MAME ultimately
  needs.
- Partial ZIP loading would make clone/parent/BIOS failures harder to diagnose,
  especially for `bublbobl1.zip`.

Only reconsider Range/chunking for future large CHD/media assets or ROMs large
enough that full fetch measurably dominates startup on iPhone Safari.

Sources:

- PKWARE ZIP APPNOTE:
  https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
- MDN HTTP Range requests:
  https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Range_requests
- Libretro MAME 2003-Plus romset guidance:
  https://docs.libretro.com/library/mame2003_plus/

## Licensing And Attribution

This is not legal advice. Treat this as implementation gating input.

- ROM ZIPs: copyrighted game ROMs must be provided by the user/private owner and
  must not be committed, downloaded by the app, or publicly redistributed by this
  repo. MAME's own docs state that original ROM/media images must be provided by
  the user and are not included in the executable.
- Current local EmulatorJS assets: `public/emulatorjs/LICENSE` is GPLv3 and
  `public/emulatorjs/NOTICE.txt` attributes the stable runtime assets to
  EmulatorJS. If these assets remain distributed, keep those files and be ready
  to provide corresponding source for any modified GPL-covered assets.
- MAME 2003-Plus/libretro: libretro docs list the core license as MAME
  Non-Commercial. This is acceptable for a private development spike, but it is a
  blocker for any commercial/public distribution unless reviewed and approved.
- Upstream modern MAME: MAME docs say the project as a whole is GPL-2.0-or-later,
  with most code also under BSD-3-Clause. If non-commercial MAME 2003-Plus is a
  blocker, an upstream MAME Emscripten subtarget is the cleaner source-license
  fallback, but likely needs different ROM-set validation.
- Third-party wrapper libraries: a permissive wrapper license does not change the
  license of emulator cores, RetroArch, MAME, or ROM files.

Sources:

- MAME purpose, ROM, and license notes:
  https://docs.mamedev.org/whatis.html
- MAME license:
  https://docs.mamedev.org/license.html
- MAME Emscripten build docs:
  https://docs.mamedev.org/initialsetup/compilingmame.html#emscripten-javascript-and-html
- EmulatorJS project:
  https://github.com/EmulatorJS/EmulatorJS
- Libretro MAME 2003-Plus:
  https://docs.libretro.com/library/mame2003_plus/

## App-Owned Connector Plan

The connector is the stable boundary. Everything outside this boundary speaks in
app terms.

```ts
export type NativeEmulatorState =
  | "idle"
  | "loading-rom"
  | "loading-runtime"
  | "ready"
  | "running"
  | "paused"
  | "failed"
  | "disposed";

export type EmulatorInput =
  | "left"
  | "right"
  | "up"
  | "down"
  | "action1"
  | "action2"
  | "action3"
  | "action4"
  | "action5"
  | "action6"
  | "special1"
  | "special2"
  | "special3"
  | "coin"
  | "start";

export interface NativeEmulatorSnapshot {
  state: NativeEmulatorState;
  gameId?: string;
  runtimeName?: string;
  frameCount?: number;
  fps?: number;
  canvasSize?: { width: number; height: number };
  audioState?: "locked" | "suspended" | "running" | "unknown";
  activeInputs: EmulatorInput[];
  timings: Partial<Record<"romFetchMs" | "runtimeLoadMs" | "firstFrameMs", number>>;
  lastError?: { code: string; message: string; cause?: unknown };
}

export interface NativeEmulator {
  attach(target: HTMLElement): void;
  load(game: GameEntry, rom: Blob | ArrayBuffer): Promise<void>;
  unlockAudio(): Promise<void>;
  start(): Promise<void>;
  pause(): void;
  reset(): void;
  press(input: EmulatorInput): void;
  release(input: EmulatorInput): void;
  dispose(): void;
  getSnapshot(): NativeEmulatorSnapshot;
}
```

Owned modules:

- `RomProvider`: maps `GameEntry` to same-origin URL, fetches ZIP, validates
  status/size/type, and returns `ArrayBuffer` plus timings.
- `NativeEmulator`: lifecycle and runtime adapter boundary.
- `InputRouter`: receives keyboard, pointer, touch, visibility, and blur events;
  emits generic `EmulatorInput` press/release/tap events.
- `GameInputProfile`: maps generic app inputs to game meanings, then the runtime
  adapter maps those to libretro/MAME-specific values internally.
- `CanvasHost`: owns target element, resize observer, device pixel ratio policy,
  portrait fit, and safe-area layout constraints.
- `Diagnostics`: behind query flag only; records ROM fetch, runtime load, first
  frame, audio state, frame count, active inputs, and hit-test overlay checks.

Rules:

- UI never imports runtime asset paths.
- UI never reads or writes `window.EJS_*`.
- UI never calls `simulateInput(player, index, pressed)`.
- Runtime adapter must release all active inputs on `pause()`, `dispose()`, page
  hide, failed load, and menu return.
- The runtime mount should contain only the canvas/audio/runtime-owned elements.
  Any hidden wrapper DOM must be `hidden`, `inert` where supported, and
  `pointer-events: none`.

## Temporary Keyboard Input Plan

Keyboard and touch must route through `InputRouter`, not directly into UI
components or runtime globals.

Use `KeyboardEvent.code` for physical layout stability, with `key` fallback for
older behavior:

| Physical key | Generic app input |
| --- | --- |
| `ArrowLeft` | `left` |
| `ArrowRight` | `right` |
| `ArrowUp` | `up` |
| `ArrowDown` | `down` |
| `KeyQ` / `Q` | `action1` |
| `KeyW` / `W` | `action2` |
| `KeyE` / `E` | `action3` |
| `KeyA` / `A` | `action4` |
| `KeyS` / `S` | `action5` |
| `KeyD` / `D` | `action6` |
| `BracketLeft` / `[` | `special1` |
| `BracketRight` / `]` | `special2` |
| `Backslash` / `\` | `special3` |

Game profiles:

- Ponpoko: `left`, `right`, `up`, `down`, `action1` as jump. Bottom touch zones
  stay `left`, jump, `right`; vertical swipes emit `up`/`down`.
- Bubble Bobble: `left`, `right`, `up`, `down`, `action1` as jump, `action2` as
  attack.
- Super Pang: `left`, `right`, `action1` as fire. Add `action2` only after the
  selected `spangj.zip` runtime input map proves a second action exists.

Unit checks:

- Keydown emits one press, repeat keydown is ignored while active.
- Keyup releases the same generic input.
- Blur/visibility/dispose releases every active input.
- Touch and keyboard both call the same `InputRouter.press/release` path.
- Runtime tests use a fake `NativeEmulator` and assert generic input calls, not
  MAME indexes.

## Smallest Ponpoko Boot Spike

`W1` should prove only Ponpoko before touching full UI or additional games.

1. Add the `NativeEmulator` contract and fake runtime.
   - Verify: unit tests cover lifecycle, attach, load, start, press/release,
     release-all, and dispose against the fake runtime.
2. Add generic input model and temporary keyboard map.
   - Verify: tests cover arrows, `QWE`, `ASD`, and `[]\` mapping through the
     fake runtime.
3. Implement `RomProvider` for full ZIP fetch as `ArrayBuffer`.
   - Verify: smoke route checks confirm `ponpoko.zip` byte count from
     `/ponpoko/roms/ponpoko.zip`.
4. Spike direct single-threaded MAME 2003-Plus/libretro adapter for Ponpoko.
   - Verify: local WebKit smoke reaches first changing frames and keyboard
     `left/right/action1` changes the input diagnostics.
5. Run the same Ponpoko boot on real iPhone Safari.
   - Verify: record URL, iPhone/iOS version, first load time, first frame time,
     audio unlock result, input result, page-scroll result, overlay hit-test
     result, menu disposal result, and stability notes.

The boot spike should not claim runtime completion. Runtime completion requires
all three requested commands plus real iPhone Safari checks:

```bash
npm run build
npm run smoke
npm run browser:smoke
```

## MVP Slices

| ID | title | priority | scope_in | scope_out | acceptance_check | risk | owner_candidate | status | handoff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | Runtime decision | must-ship | Candidate comparison, Safari constraints, ROM strategy, license notes, recommendation | Runtime code | This document exists and names selected/fallback paths | high | codex | done | P1->W1 |
| P2 | Connector contract | must-ship | `NativeEmulator`, snapshot, fake runtime, lifecycle tests | Real emulator integration | Unit tests pass without EmulatorJS globals | medium | codex | pending | P2->W2 |
| P3 | Generic input layer | must-ship | Keyboard/touch route to generic `EmulatorInput`; QWE/ASD/arrow/special mapping | Final per-game art/control polish | Unit tests prove keyboard and touch hit same fake runtime path | medium | codex | pending | P3->W3 |
| P4 | Ponpoko boot spike | must-ship | Full ZIP fetch, direct/fallback runtime adapter, first frames, keyboard input | Bubble Bobble and Super Pang | WebKit smoke plus real iPhone Safari note for Ponpoko | high | codex | pending | P4->W4 |
| P5 | Three-game runtime verification | must-ship | Bubble Bobble and Super Pang boot/input validation | Save-state polish | Browser smoke covers all three games | high | codex | pending | P5->W5 |
| P6 | iPhone portrait hardening | must-ship | Safe-area controls, no scroll, no overlays, audio unlock, menu disposal | Desktop-first redesign | Real iPhone checklist recorded | high | codex/user | pending | P6->W6 |

## Blockers And Risks

- `bublbobl1.zip` may be an incomplete clone/split romset. The boot spike must
  verify whether the selected runtime needs a parent ROM ZIP. Do not add parent
  ROM files without explicit user-provided assets.
- MAME 2003-Plus licensing is non-commercial. This is fine for a private spike
  but blocks any public/commercial distribution decision.
- Real iPhone Safari may fail where desktop WebKit passes due memory pressure,
  audio gesture behavior, or touch cancellation. Manual device evidence is
  required before readiness claims.
- Any fallback that uses EmulatorJS must remain behind `NativeEmulator`; wrapper
  globals must not leak back into UI or tests.

## Final Recommendation

Proceed with `NativeEmulator` plus fake runtime tests, then build the smallest
Ponpoko boot spike against direct single-threaded MAME 2003-Plus/libretro WASM.
Keep current local EmulatorJS assets only as a fallback adapter behind the same
boundary. Do not slice ROMs. Fetch the complete ZIP, mount it as a complete
romset, unlock audio from the Start gesture, and verify on real iPhone Safari
before expanding beyond Ponpoko.
