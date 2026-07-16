# 2026-07-16 Metal Slug Review

## Objective

Add the existing `roms/mslug.zip` to the active game catalog and make it reliably playable through FBNeo on desktop and mobile. Prevent the previously reported corrupted-sprite path, and avoid duplicating the large ROM in browser-managed caches.

## Success Criteria

- Metal Slug uses the FBNeo core with the required Neo Geo parent BIOS and verified program, graphics, sound, and BIOS archive contents.
- Desktop Chromium and iPhone-sized mobile WebKit reach active 304x224 gameplay, advance frames, and accept 8-way movement plus A/B/C inputs.
- Captured gameplay shows coherent Metal Slug graphics without corrupted sprite tiles on both browser targets.
- The 13 MB game ZIP is fetched once on first play, saved only after gameplay starts, reused from IndexedDB, and excluded from the Service Worker runtime cache.
- Focused tests, full tests, typecheck, build/package checks, all-game browser smoke, independent evaluator review, Pages deployment, and live verification pass.
- If these gates cannot be met with a normal scoped implementation, remove this session's changes and generated residue and do not commit.

## Source Plan

| P# | Requirement | Implementation | Verification | Status |
| --- | --- | --- | --- | --- |
| P1 | Correct FBNeo ROM and sprite path | I1 catalog/core/parent manifest plus archive CRC guards | Catalog, root-ROM, Vite-path tests and runtime core assertions | done |
| P2 | Desktop/mobile playability | I2 Metal Slug runtime fixture with exact input/video checks | Chromium and iPhone-sized WebKit gameplay smoke | done |
| P3 | No corrupted sprites | I3 graphics-ROM CRC checks and captured-frame visual oracle | Archive extraction checks plus desktop/mobile screenshot review | done |
| P4 | Efficient large-ROM handling | I4 single app-owned IndexedDB cache; bypass Service Worker ROM caching | Unit tests and same-context browser reuse check | done |
| P5 | Release closure | I5 commit, push, Pages publish, live smoke, cleanup | GitHub workflow and live URL readback | pending |

## Work Ledger

| W# | Owner | Status | Scope | Completion Gate |
| --- | --- | --- | --- | --- |
| W1 | mslug_planner | done | Read-only implementation and verification plan | P1-P5 risks and gates delivered |
| W2 | mslug_rom_forensics | done | Read-only ROM/core/history forensics | Exact failure cause and ROM/BIOS compatibility evidence delivered |
| W3 | mslug_oss_cache | done | Read-only upstream FBNeo/EmulatorJS/cache research | Primary-source runtime and cache recommendations delivered |
| W4 | codex | in_progress | Tests, implementation, browser verification, integration | I1-I5 green without scope drift |
| W5 | mslug_evaluator | done | Independent contract/diff/runtime evidence review | GO; no unresolved Critical, High, Medium, or Low findings |

## Baseline and Red Test

- Baseline inventory: `npx vitest list` -> 107 node IDs.
- Baseline suite: `npm test` -> 20 files / 107 tests passed.
- Red focused tests: `npm test -- tests/catalog.test.ts tests/controllers.test.ts tests/root-roms.test.ts tests/vite-roms.test.ts tests/pwa-cache.test.ts` -> expected 8 failures across inactive catalog/parent routing and duplicate Service Worker ROM caching; 32 checks passed. The current archives already passed the new content CRC guards.

## Implementation Ledger

| I# | Source IDs | Owner | Status | Scope Boundaries | Verification |
| --- | --- | --- | --- | --- | --- |
| I1 | P1 | codex | done | Activate only Metal Slug; do not restore Strikers 1945 or replace the emulator architecture | Focused catalog/ROM/core tests passed |
| I2 | P2 | codex | done | Reuse the shared input router and existing three-button profile | Desktop/mobile 304x224 runtime and 0/8/1 input smoke passed |
| I3 | P3 | codex | done | Guard known-good ROM bytes and observe actual runtime output | C-ROM/BIOS CRC checks and Mission 1 screenshot evidence passed |
| I4 | P4 | codex | done | Keep the existing deferred IndexedDB cache; remove only duplicate Service Worker ROM caching | Cold 1 / warm 0 / CacheStorage 0 integration checks passed on both targets |
| I5 | P5 | codex | pending | Release only after evaluator GO | Pages workflow and live browser smoke |

## Audit Findings

| A# | Severity | Evidence | Impact | Resolution | Status |
| --- | --- | --- | --- | --- | --- |
| A1 | High | Historical pre-`41b1185` archive used MAME2003+ `201-c*.bin` names with FBNeo full-chip CRCs | Core accepted the names but interpreted incompatible graphics layout, producing corrupted sprites | Bind the current `.c1`-`.c4` archive only to FBNeo and reject `.bin` names/CRC drift | done |
| A2 | High | The active catalog omitted Metal Slug although the corrected ROM, parent BIOS, core, and game config remained tracked | Game was unavailable despite a viable corrected path | Restore only `mslug` to the catalog and ROM/parent manifests | done |
| A3 | Medium | Prior smoke stopped at 120 frames and could pass a visible but corrupted or transitional screen | False-positive playability/sprite claims | Require 600 frames, state-driven exit from HOW TO PLAY, actual P1 Mission 1 capture, visual richness, and cross-target histogram distance | done |
| A4 | Medium | Service Worker Cache Storage and app IndexedDB both persisted the same 13,165,412-byte ROM | Roughly 13 MB duplicate mobile storage and SW-version churn | Leave ROM requests to SHA-keyed IndexedDB; retain SW cache-first for emulator assets | done |
| A5 | Low | `mslug.jpg` is absent | Catalog uses the existing text thumbnail fallback | No gameplay change required; retain fallback | accepted |

## Upstream Evidence

- [FBNeo Metal Slug ROM definition](https://github.com/finalburnneo/FBNeo/blob/4455fad7882771d3438e6016cc7870d7f2bbf0a6/src/burn/drv/neogeo/d_neogeo.cpp#L13175-L13201) matches the current program, graphics, sound, and sample ROM names/sizes/CRCs.
- [FBNeo Neo Geo BIOS definition](https://github.com/finalburnneo/FBNeo/blob/4455fad7882771d3438e6016cc7870d7f2bbf0a6/src/burn/drv/neogeo/d_neogeo.cpp#L1623-L1675) matches `sp-s3.sp1`, `sm1.sm1`, `sfix.sfix`, and the `000-lo.lo` zoom table.
- [MAME2003+ Metal Slug definition](https://github.com/libretro/mame2003-plus-libretro/blob/2cca4441706b952c2eaf8264713b53fd5452e0bd/src/drivers/neogeo.c#L4089-L4113) demonstrates why the older `.bin` layout and CRC expectations were incompatible with the current FBNeo set.
- [EmulatorJS parent options](https://github.com/EmulatorJS/EmulatorJS/blob/cf622ec831e1c68dbbbce9dc49923a82b4b0e2a6/data/loader.js#L151-L190) and [parent loading](https://github.com/EmulatorJS/EmulatorJS/blob/cf622ec831e1c68dbbbce9dc49923a82b4b0e2a6/data/src/emulator.js#L1097-L1103) support `gameParentUrl` with `dontExtractBIOS` before core start.
- [FBNeo Neo Geo inputs](https://github.com/libretro/FBNeo/blob/808243ba2a95061e6bd2a86829dc54b46dfded99/src/burn/drv/neogeo/d_neogeo.cpp#L24-L35) and [libretro default mapping](https://github.com/libretro/FBNeo/blob/808243ba2a95061e6bd2a86829dc54b46dfded99/src/burner/libretro/retro_input.cpp#L57-L76) establish A/B/C as RetroPad B/A/Y, EmulatorJS IDs `0/8/1`.

## Failure Groups

| F# | Reproducer | Resolution | Status |
| --- | --- | --- | --- |
| F1 | Historical MAME2003+ name/FBNeo CRC mismatch rendered broken sprites | Exact archive/core binding and extracted-content CRC guards | done |
| F2 | Service Worker test showed `/ponpoko/roms/` cache-first alongside IndexedDB | Removed only the ROM prefix and added SW bypass coverage | done |
| F3 | Initial runtime capture stopped on a coherent HOW TO PLAY screen | Require actual P1 Mission 1 scene and reject the tutorial layout | done |
| F4 | Fixed-delay WebKit tutorial transition was slower than Chromium | Poll bounded visual state, issue frame-length Coin/Start presses, then wait for a stable Mission 1 frame | done |

## Verification

| Gate | Result |
| --- | --- |
| Baseline inventory/suite | pass: 107 node IDs; 20 files / 107 tests |
| Red focused tests | expected fail: 8 failures exposed inactive catalog/parent and duplicate cache handling |
| Focused green | pass: 5 files / 40 tests |
| Final inventory/full suite | pass: 20 files / 111 tests; net delta `+4`. Five obsolete requirement IDs were replaced by nine final IDs; no test files were deleted |
| Typecheck/build/package | pass: typecheck, build, ROM prepare/copy/hash smoke, desktop layout smoke |
| Metal Slug desktop/mobile runtime | pass: Chromium and iPhone-sized WebKit, 304x224, 600+ frames, 8-way + A/B/C `0/8/1`, actual P1 Mission 1 |
| Catalog-wide browser regression | pass: final `npm run browser:smoke` covered all 8 games on desktop Chromium/mobile WebKit plus app/prep-failure flows |
| Screenshot/graphics review | pass: desktop 87 and mobile 83 quantized color bins; histogram distance 0.00391; coherent character/enemy/background sprites confirmed |
| Independent evaluator | GO: relevant 64/64, full 111/111, typecheck, dist/hash smoke, both Mission 1 captures, input and cache behavior independently rechecked |
| Pages/live/cleanup | pending |

## Deletion Impact Note

No tracked test, documentation, or configuration file deletion is planned. Generated build output, browser profiles, screenshots, and temporary logs created during this session will be removed after release or rollback.

## Progress Log

`CP0 | W1-W4 | delegated research owners + codex | in_progress | baseline green; ROM/BIOS hashes and historical FBNeo path located | establish red contract tests`

`CP1 | P1-P4 | codex | in_progress | focused contract suite failed in the expected 8 places; archive content guards already green | implement catalog, parent route, and cache ownership`

`CP2 | I1-I4 | codex | done | 111 tests, build/package, Metal Slug desktop/mobile Mission 1, inputs, visual signature, and cache reuse green | final catalog-wide rerun and evaluator`

`CP3 | I1-I4 | mslug_evaluator + codex | done | final catalog-wide browser smoke and independent review GO with no unresolved findings | release I5`

## Closure

Pending.
