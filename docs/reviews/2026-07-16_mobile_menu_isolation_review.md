# 2026-07-16 Mobile Menu Isolation Review

## Objective

Keep the in-game menu control away from the mobile gamepad so an active thumb cannot exit gameplay accidentally. Preserve the existing top safe-area menu and all non-navigation service controls.

## Success Criteria

- Exactly one in-game menu button exists and it is inside `.game-topbar`.
- `[data-touch-surface="virtual"]` contains no `[data-back]` menu button.
- The top menu remains visible, enabled, inside the viewport, and above gameplay in compact mobile portrait and landscape layouts.
- Existing desktop controls, game inputs, save/load controls, and menu navigation continue to work.
- Tests, typecheck, build, browser/runtime smoke, Pages deployment, and live-site verification pass.

## Plan and Implementation Ledger

| I# | Source | Owner | Status | Scope | Verification |
| --- | --- | --- | --- | --- | --- |
| I1 | P1 user menu-isolation request | codex | done | Remove the menu variant from `SPECIAL_CONTROLS` and the gamepad renderer; preserve the topbar exit handler | Focused unit test and DOM assertions passed |
| I2 | P2 compact mobile layout | codex | done | Change the gamepad service strip from six to five columns | Mobile portrait/landscape geometry smoke passed |
| I3 | P3 regression coverage | codex | done | Assert one topbar menu, zero gamepad menus, hit visibility, and unchanged navigation | Browser and all-game runtime smoke passed |
| I4 | P4 installed-client refresh | codex | done | Bump the service-worker cache version | Build artifact contains `2026-07-16-menu-isolation-v3` |
| I5 | P5 release closure | codex | done | Commit, push `main`, verify Pages and live behavior, then remove generated artifacts | Pages and live smoke passed; generated artifacts removed |

## Baseline and Red Test

- Baseline inventory: `npx vitest list` -> 107 node IDs.
- Baseline suite: `npm test` -> 20 files / 107 tests passed.
- Red focused test: `npm test -- tests/controllers.test.ts` -> 1 expected failure because `SPECIAL_CONTROLS` still contained the gamepad menu.
- Script syntax and diff check after the red test: passed.

## Verification

| Gate | Result |
| --- | --- |
| Focused green | `tests/controllers.test.ts`: 12/12 passed |
| Full suite | `npm test`: 20 files / 107 tests passed; inventory delta 0 |
| Type safety | `npm run typecheck`: passed |
| Build/package | `npm run prepare:roms`; `npm run build`; `npm run smoke`: passed; asset `index-ChTk_07c.js` |
| Browser integration | `npm run browser:smoke`: passed, including WebKit portrait/landscape menu geometry and menu navigation |
| Catalog runtime | All 7 games passed on desktop Chromium and mobile WebKit with one topbar menu and zero gamepad menus |
| Desktop layout | `npm run desktop:smoke`: passed; desktop topbar/menu and keyboard layout preserved |
| Diff integrity | `git diff --check`: passed |
| Pages release | Implementation commit `bce9af8`; workflow `29470954834`: build/deploy passed |
| Live site | `https://taekimax.github.io/ponpoko/`: asset `index-ChTk_07c.js`, cache `2026-07-16-menu-isolation-v3`, live WebKit menu smoke passed |
| Cleanup | Removed local `dist`, TypeScript/Vite caches, `.DS_Store`, and menu-test temporary files; no local server remains |

## Evaluator Review

Status: `done`; no Critical, High, Medium, or Low findings; release recommendation `GO`. The evaluator confirmed one preserved topbar menu, no gamepad `[data-back]`, five service controls, unchanged desktop rules, and portrait/landscape regression coverage. Residual risk is limited to physical-iPhone safe-area and touch validation.

## Deletion Impact Note

No tracked test, documentation, or configuration file will be deleted. The only behavior removal is the duplicate gamepad menu control required by P1; the existing topbar menu and its navigation handler remain. Generated build/cache artifacts may be removed after deployment and are reproducible from repository commands.

## Progress Log

`CP0 | W1-W5 | planner + codex | in_progress | <3m | current DOM, safe-area CSS, and 107-test baseline confirmed | establish red isolation test`

`CP1 | W1-W3 | codex | in_progress | <6m | red test fails on duplicate gamepad menu as expected | implement I1-I4`

`CP2 | W1-W4 | codex | done | <12m | 107 tests, build, WebKit portrait/landscape, catalog and desktop smoke green | evaluator review`

`CP3 | W1-W4 | evaluator | done | <15m | no findings; GO recommendation | release I5`

`CP4 | W5 | codex | done | <20m | commit bce9af8, Pages 29470954834, live WebKit and cleanup complete | close review`

## Closure

The mobile gamepad no longer contains a menu button. Exactly one menu remains in the safe-area-aware topbar, separate from gameplay controls in portrait and landscape. Local and live browser verification passed, Pages was deployed, and generated local artifacts were removed. Physical-iPhone validation remains external.
