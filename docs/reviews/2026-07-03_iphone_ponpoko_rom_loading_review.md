# iPhone Ponpoko ROM Loading Review

Date: 2026-07-03
Repo baseline: `origin/main` at `3332d292e678a79d2229aab3abdd57309c615bdf`

## Mission

Find the root cause for Ponpoko not completing load on iPhone, with the stated expectation that ROMs load from the repository `roms/` directory.

## Scope And Constraints

- Inspect committed `origin/main` behavior so unrelated local edits from another session do not affect the analysis.
- Do not modify runtime source during this review.
- Prioritize correctness of ROM path selection, GitHub Pages artifact contents, and iPhone/Safari runtime behavior.

## Success Criteria

- Identify the exact ROM URL/path the app requests for Ponpoko on GitHub Pages.
- Verify whether that requested path maps to files produced from `roms/` or `public/roms/`.
- Identify the first failing boundary that can leave iPhone loading incomplete.
- Record concrete evidence with file/line references or command output.

## Planned Verification

- `npm test`
- `npm run build`
- Static inspection of `origin/main` files with line references.
- Live Pages checks for expected ROM URLs.
- Targeted browser smoke check where feasible.

## Live Ledger

| Event | W# | owner | status | elapsed | delta_since_last | next_action |
| --- | --- | --- | --- | --- | --- | --- |
| PLAN | W1 | coordinator | in_progress | 0m | Review ROM path and Pages artifact boundary | Inspect config, catalog, ROM preparation, emulator loader |
| PLAN | W2 | coordinator | in_progress | 0m | Review iPhone/Safari loading completion boundary | Inspect startup/emulator error handling and smoke behavior |
| CHECK | W1 | coordinator | done | 8m | Found Pages serves `public/roms`, not root `roms`; `bublbobl1.zip` and `spangj.zip` are missing on Pages | Record A1 |
| CHECK | W2 | coordinator | done | 16m | Reproduced overlay stuck with `frame>1900`, `started=true`, `prep=failed`, `overlay=true` when Ponpoko prep cannot complete | Record A2 |

## Findings

### High A1: GitHub Pages does not load ROMs from the repository root `roms/` directory

- Evidence: `src/catalog.ts:24-27` sets the default web ROM base to `/ponpoko/roms/`.
- Evidence: `vite-roms.ts:5-7` only maps `/ponpoko/roms/` to `ARCADE_SAFARI_ROM_DIR` in Vite dev/preview middleware.
- Evidence: `.github/workflows/deploy.yml:27-34` now skips ROM validation and runs `vite build` without copying root `roms/` into `dist`.
- Evidence: Vite copied `public/roms` into `dist/roms`; `roms/bublbobl1.zip` and `roms/spangj.zip` are missing from `dist/roms`.
- Live evidence: `https://taekimax.github.io/ponpoko/roms/ponpoko.zip` has the same hash as `public/roms/ponpoko.zip`, not root `roms/ponpoko.zip`.
- Live evidence: `https://taekimax.github.io/ponpoko/roms/bublbobl1.zip` and `https://taekimax.github.io/ponpoko/roms/spangj.zip` return `404`.
- Impact: Pages is not using the intended root `roms/` source of truth. Ponpoko happens to have a same-named file in `public/roms`, but the app/catalog/deploy contract is inconsistent and two catalog ROMs are broken on Pages.
- Why: GitHub Pages serves the `dist` artifact. Vite includes `public/*` in `dist`, but it does not include the repository root `roms/` directory unless the build or deploy workflow copies it.
- Fix direction: make one source of truth. Either copy `roms/*.zip` into `dist/roms/` during build/deploy and verify those exact filenames, or move the intended files under `public/roms/` and remove the separate root-ROM middleware expectation.
- Owner/Handoff: none.
- Handoff Payload: none.

### High A2: Ponpoko can run behind a permanent boot overlay when runtime prep fails after frames start

- Evidence: `src/main.ts:736-739` calls `requestRuntimeControls()` and returns as soon as `shouldEnableRuntimeControls(snapshot)` is true.
- Evidence: `src/boot-progress.ts:93-99` never stops boot on timeout once `shouldEnableRuntimeControls(snapshot)` is true.
- Evidence: `src/main.ts:617-624` sets `runtimePrepStatus = "failed"` when `prepareRuntimeControls()` returns false, but it does not render an error, clear the overlay, or allow the boot timeout path to handle the failure.
- Evidence: `src/main.ts:629-645` makes Ponpoko controls depend on `isInputReady(120)`, warning acknowledgement, and start-state reload.
- Repro evidence: in a WebKit iPhone context, with `gameManager.simulateInput` removed after runtime creation, the runtime reached `frame=1983`, `started=true`, `failed=false`, but stayed at `prep=failed`, `overlay=true`, controls disabled, and status `다운로드 완료. 에뮬레이터를 시작합니다.`
- Impact: On a real iPhone, if `simulateInput` is unavailable/delayed or Ponpoko-specific prep fails, the user sees loading never complete even though ROM fetch and emulator frames may already be running.
- Why: active frame progress is treated as enough to enter finalization, but finalization failure is only recorded in debug state. The UI state machine has no terminal failure or fallback path for post-frame prep failure.
- Fix direction: add a terminal outcome for prep failure. Minimal choices: render a user-facing error after prep failure, enable controls when frames are active even if post-warning automation fails, or make `shouldStopBoot` aware of finalization failure/elapsed time.
- Owner/Handoff: none.
- Handoff Payload: none.

## Verification Log

- Created an `origin/main` snapshot at `/tmp/ponpoko-origin-main.hQ3QUA` to avoid unrelated local edits.
- `npm ci`: passed in the snapshot.
- `npm test`: passed, 10 files / 39 tests.
- `npm run build`: passed; generated `dist/assets/index--PDTqsBS.js` and `dist/assets/index-Bhz9ZQPh.css`.
- `ARCADE_SAFARI_SKIP_ROMS=1 npm run smoke`: passed, but it skipped external ROM checks and did not validate catalog ROM presence in `dist/roms`.
- `BROWSER_SMOKE_BASE_URL=https://taekimax.github.io/ponpoko/ npm run browser:smoke`: passed in Playwright WebKit against live Pages.
- ROM artifact check:
  - `roms/ponpoko.zip`: size `20577`, SHA-256 `8d77d65d7b0a8594a185e4d2c28aec91cf0cb0ff47ef56108e85e4a52f90024f`
  - `public/roms/ponpoko.zip`: size `21072`, SHA-256 `6ddf63d0244ebc2d87fb174d240b8c8af97cffc8572b77d017304a84968ed370`
  - live Pages `roms/ponpoko.zip`: SHA-256 `6ddf63d0244ebc2d87fb174d240b8c8af97cffc8572b77d017304a84968ed370`
  - internal Ponpoko ROM member hashes are identical between root and public ZIPs, so the ZIP difference is metadata/compression, not ROM contents.
- Live Pages catalog ROM URL check:
  - `ponpoko.zip`: `200`
  - `bublbobl1.zip`: `404`
  - `spangj.zip`: `404`
- Failure reproduction:
  - Playwright WebKit iPhone context with `gameManager.simulateInput` removed after runtime creation.
  - Observed `frame=1983`, `started=true`, `failed=false`, `prep=failed`, `overlay=true`, controls disabled.

## Closure Matrix

| CM# | scenario | criteria | outcome | action |
| --- | --- | --- | --- | --- |
| CM1 | all-green | Planned review items terminal and checks captured | done | Report findings A1-A2 |
| CM2 | env-blocked | Need physical iPhone to prove exact device-side trigger | partial | Use `?bootDebug=1` on iPhone to distinguish `prep=failed`, `frame=0`, or network failure |
| CM3 | decision-blocked | Need source-of-truth decision for ROM directory | partial | Choose root `roms/` copied to `dist`, or `public/roms` as canonical |
| CM4 | stuck-recycled | No delegated worker recycle used | done | Not applicable |
| CM5 | no-findings | No actionable findings | declined | Findings A1-A2 recorded |
| CM6 | partial-delivery | Review only, no runtime fix requested | done | Provide recommended fixes |
| CM7 | coverage-regressed | Tests removed/renamed | done | No tests changed |
