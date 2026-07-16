# 2026-07-16 Mobile Input Scrub Review

## Objective

Keep every catalog game's mobile controls responsive after long holds, rapid repeated taps, and rub-style D-pad/action-button movement. Increase the physical separation between action buttons without breaking compact iPhone portrait layouts, desktop keyboard input, or simultaneous direction/action chords.

## Success Criteria

- A held D-pad pointer can move repeatedly through every sector and releases with no stuck emulator input or active-direction UI state.
- Action input follows the finger from one enabled action button to another, releasing the previous action before pressing the next.
- `pointerup`, `pointercancel`, `lostpointercapture`, capture failure, blur, visibility loss, and page hide all leave pointer state and `InputRouter` state clean.
- A reused pointer ID and a fresh pointer immediately work after each recovery path; rapid taps remain balanced.
- The minimum edge-to-edge gap between the six action buttons is at least 6 px at 375 x 667 while the controller remains entirely inside the viewport.
- Unit tests, typecheck, build, focused mobile WebKit stress smoke, full browser/runtime smoke, Pages deployment, live-site checks, and cleanup pass.

## Open-Source Evidence and Decision

- NippleJS binds move/end at document scope and routes events by identifier so a pointer leaving its original zone still terminates: <https://github.com/yoannmoinet/nipplejs/blob/ea425b3e81deaed14e384a2edcfbbd6a9a50f45b/packages/nipplejs/src/Factory.ts#L217-L259>.
- NippleJS reconciles fallback `TouchEvent.touches` with its identifier map and uses Pointer Events first with touch fallback: <https://github.com/yoannmoinet/nipplejs/blob/ea425b3e81deaed14e384a2edcfbbd6a9a50f45b/packages/nipplejs/src/Factory.ts#L167-L215>, <https://github.com/yoannmoinet/nipplejs/blob/ea425b3e81deaed14e384a2edcfbbd6a9a50f45b/packages/nipplejs/src/constants.ts#L13-L53>.
- Phaser combines target listeners with window-level end/cancel fallback and tracks moved touches by identifier and hit-test position: <https://github.com/phaserjs/phaser/blob/41be1e462bc600064e498cba370bfa8c5c055a22/src/input/touch/TouchManager.js#L231-L356>, <https://github.com/phaserjs/phaser/blob/41be1e462bc600064e498cba370bfa8c5c055a22/src/input/InputManager.js#L547-L715>.
- Angular Three Ecctrl routes `pointerup`, `pointercancel`, and `lostpointercapture` through the same reset path for both joysticks and momentary virtual buttons: <https://github.com/angular-threejs/angular-three/blob/057ab227829a272c76d138422f85ca9a4a57f944/libs/ecctrl/input/src/lib/joystick.ts#L84-L150>, <https://github.com/angular-threejs/angular-three/blob/057ab227829a272c76d138422f85ca9a4a57f944/libs/ecctrl/input/src/lib/virtual-button.ts#L57-L107>.

Decision: retain Ponpoko's pointer-ID map and input reference counts, but replace element-local move/end handling with one delegated broker. It will use document capture-phase move/up/cancel fallback, coordinate hit testing for action scrubbing, explicit lost-capture handling, and full-map cleanup for lifecycle loss. Existing `touch-action: none` remains. No arbitrary rate limit or third-party dependency is needed.

Rejected as out of scope: changing asynchronous OK/startup sequences. The reported failure is a missing pointer-terminal-event/state-ledger problem; sequence cancellation is a separate behavior change without evidence from this report.

## Plan and Implementation Ledger

| I# | Source | Owner | Status | Scope | Verification |
| --- | --- | --- | --- | --- | --- |
| I1 | P1 resilient pointer lifecycle | codex | done | Replace element-local pointer/touch listeners with delegated pointer-ID routing, document fallback, lost-capture handling, and stale-ID recovery | Focused mobile WebKit lifecycle stress passed |
| I2 | P2 natural scrub input | codex | done | Keep stick ownership while continuously updating its vector; allow action scrub only among gameplay-button peers | Four-way Bubble Bobble and vertical/eight-way S1945 stress passed |
| I3 | P3 action-button spacing | codex | done | Replace the overlapping diagonals with a 3 x 2 grid using 44 px minimum targets and measurable gaps | 375 x 667 geometry assertion passed with at least 6 px edge gap |
| I4 | P4 installed-client refresh | codex | done | Bump the service-worker cache generation | Production build passed with `2026-07-16-input-scrub-v1` |
| I5 | P5 regression and release closure | codex + evaluator | done | Full gates, evaluator GO, commit, push main, Pages/live verification, cleanup | Commit `f729681`; Pages run `29482659257`; live smokes and cleanup passed |

## Baseline

- Branch/worktree: `codex/mobile-input-scrub` at `6e1a4b51ac5768dbe662304a84604c013e434095` in `/Volumes/dev/ponpoko-worktrees/input-scrub`.
- `.loop/` is absent; this review is the durable task contract for the scoped change.
- `npx vitest list` -> 113 node IDs.
- `npm test` -> 20 files / 113 tests passed.
- `npm run typecheck` -> passed.
- Current action-button geometry overlaps adjacent buttons; current input listeners have no document/window terminal fallback or `lostpointercapture` handler.

## Verification

- `npx vitest list` -> 113 node IDs; no test inventory delta.
- `npm test` -> 20 files / 113 tests passed.
- `npm run typecheck`, `npm run build`, `npm run smoke`, `npm run desktop:smoke`, and `git diff --check` -> passed.
- `GAME_RUNTIME_SMOKE_GAME=bublbobl GAME_RUNTIME_SMOKE_TARGET=mobile npm run games:smoke` -> passed with long four-way D-pad scrub, gameplay-button scrub, same-action two-pointer ownership, load/visibility cleanup, stale/fresh pointer recovery, and 30 rapid taps.
- `GAME_RUNTIME_SMOKE_GAME=s1945 GAME_RUNTIME_SMOKE_TARGET=mobile npm run games:smoke` -> passed with the same stress matrix in a vertical/eight-way game, including IndexedDB ROM-cache reuse. One isolated post-stress menu-navigation timeout was followed by a clean rerun; the final full suite also passed.
- `BROWSER_SMOKE_THROW_POINTER_CAPTURE=1 node scripts/browser-smoke.mjs` -> passed, proving the document fallback works when `setPointerCapture()` throws. An initial unrelated startup-ack timing miss passed on immediate rerun.
- `npm run browser:smoke` -> passed: Ponpoko WebKit flow, all catalog games on desktop Chromium and mobile WebKit, mapped inputs, runtime frames, ROM cache reuse, and preparation-failure recovery.
- 375 x 667 screenshot inspection -> D-pad and 3 x 2 action cluster remain inside the viewport; targets are separated and the menu stays outside the controller area.
- GitHub Pages run [29482659257](https://github.com/taekimax/ponpoko/actions/runs/29482659257) -> build and deploy jobs passed for implementation commit `f729681048e4138f34df875173bc7e332a870d7a`.
- Live readback at <https://taekimax.github.io/ponpoko/> -> service worker `2026-07-16-input-scrub-v1`, JavaScript `index-Brv9DG5-.js`, and CSS `index-Eo5gkbmo.css` served.
- Live `browser-smoke.mjs` and focused Bubble Bobble mobile runtime stress -> passed against GitHub Pages.

## Evaluator Review

GO. The evaluator found no Critical, High, or Medium release blocker after two requested corrections: manual-load now clears both the pointer ledger/UI and `InputRouter`, and gameplay-button scrub can no longer cross into coin/start/OK or topbar actions. Remaining non-blocking risks are real-iPhone verification and automated coverage of browsers without Pointer Events; current iPhone Safari supports the tested Pointer Events path and a touch fallback remains in code.

## Deletion Impact Note

No tracked tests, documentation, configuration, ROM, or source files will be deleted. Release cleanup is limited to reproducible generated artifacts, dependency/build caches, temporary screenshots/logs, the temporary OSS research checkout, and the dedicated worktree after successful deployment.

## Progress Log

`CP0 | W1-W5 | planner + codex | done | baseline clean; 113 tests and typecheck green; OSS and current-code findings recorded | add red stress and spacing checks`

`CP1 | I1-I4 | codex | done | delegated broker, lifecycle cleanup, bounded gameplay scrub, 44 px 3 x 2 controls, cache generation update | local and focused browser gates green`

`CP2 | I5 | evaluator + codex | done | evaluator GO; full browser/runtime suite green; commit f729681 pushed; Pages and live smokes green; dedicated worktree/temp artifacts removed | closed`

## Closure

Implementation commit `f729681048e4138f34df875173bc7e332a870d7a` was fast-forwarded to `main` and pushed. Pages deployment and public-site mobile input verification passed. The local preview server, generated `dist`/dependency/cache files, temporary OSS checkout, screenshots, live-readback files, dedicated `/Volumes/dev/ponpoko-worktrees/input-scrub` worktree, and local feature branch were removed. The pre-existing untracked `/Volumes/dev/ponpoko/docs/plans/` directory was preserved untouched.
