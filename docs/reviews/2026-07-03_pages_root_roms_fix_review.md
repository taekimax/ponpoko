# 2026-07-03 GitHub Pages Root ROM Fix Review

## Mission

Implement `docs/handoffs/2026-07-03_github_pages_root_roms_fix_handoff.md`: GitHub Pages must serve catalog ROMs from repository-root `roms/`, with `dist/roms/<romFile>` byte-for-byte matching `roms/<romFile>`. Browser smoke must cover every catalog game and the Ponpoko prep-failure overlay regression.

## Constraints

- Do not revert unrelated local edits from other sessions.
- Do not make Pages depend on `public/roms/`, `/Volumes/dev/ponpoko/roms`, or external/Tailscale ROM URLs.
- Do not delete tests/docs/config to make checks pass.

## Implementation Ledger

| I# | source_ids | owner | status | changed_paths | verify_cmd | verify_result | handoff | handoff_payload |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| I1 | handoff-A1 | codex | in_progress | package.json scripts/copy-root-roms-to-dist.mjs scripts/catalog-roms.mjs tests/root-roms.test.ts | `npm test -- tests/root-roms.test.ts` | pending | none | none |
| I2 | handoff-A1 | codex | pending | scripts/smoke.mjs scripts/prepare-roms.mjs .github/workflows/deploy.yml | `npm run build && npm run smoke` | pending | none | none |
| I3 | handoff-A2 | codex | pending | src/main.ts src/runtime-prep.ts scripts/browser-smoke.mjs scripts/ponpoko-prep-failure-smoke.mjs tests/runtime-prep.test.ts | `npm test -- tests/runtime-prep.test.ts && npm run browser:smoke` | pending | none | none |
| I4 | handoff-closure | codex | pending | docs/reviews/2026-07-03_pages_root_roms_fix_review.md | final verification gates and Pages live hash checks | pending | none | none |

## Live Ledger

| checkpoint | W# | owner | status | elapsed | delta_since_last | next_action |
| --- | --- | --- | --- | --- | --- | --- |
| CP0 | W1 | codex | in_progress | 0m | Handoff read; local evidence confirms `dist/roms` currently mirrors `public/roms`, not root `roms` | Add RED tests |
| CP1 | W1 | codex | done | 18m | RED root ROM tests failed on missing manifest/copy script, public-ROM dist mismatch, workflow skip env; GREEN tests now pass | Run build/smoke |
| CP2 | W2 | codex | done | 24m | `npm run build` copies root ROMs to `dist/roms`; `npm run smoke` validates root/dist SHA-256 equality | Run browser smoke |
| CP3 | W3 | codex | done | 32m | `npm run browser:smoke` now runs Ponpoko, Bubble Bobble, Super Pang, and prep-failure overlay regression checks | Commit and publish |
| CP4 | W4 | codex | done | 58m | GitHub Pages run `28652413834` succeeded; live ROM URLs and live WebKit smoke checks passed | Telegram report |

## Verification Log

- RED `npm test -- tests/root-roms.test.ts`: failed as expected before implementation:
  missing `scripts/catalog-roms.mjs`, `dist/roms/ponpoko.zip` hash matched public not root, dist contained old public ROM set, and `package.json` build lacked `copy-root-roms-to-dist.mjs`.
- RED `npm test -- tests/runtime-prep.test.ts`: failed as expected before implementation because `src/runtime-prep.ts` did not exist.
- GREEN `npm test -- tests/root-roms.test.ts`: pass, 1 file / 3 tests.
- GREEN `npm test -- tests/runtime-prep.test.ts`: pass, 1 file / 2 tests.
- `npm test`: pass, 14 files / 50 tests.
- `npm run typecheck`: pass.
- `npm run build`: pass; copied root ROM hashes:
  - `ponpoko.zip`: `8d77d65d7b0a8594a185e4d2c28aec91cf0cb0ff47ef56108e85e4a52f90024f`
  - `bublbobl1.zip`: `ce4495598356f1832c76761f9163db6d8b709f0218e9d0869f1e09cca4032e5a`
  - `spangj.zip`: `53aed43f2426ee07fb83dd0bde53870812bdca150b617ab19bfecd6e0aefad0d`
- `npm run smoke`: pass; validates build paths, root/dist ROM hashes, local EmulatorJS assets, and start states.
- `npm run browser:smoke`: pass; includes Ponpoko strict smoke, Bubble Bobble/Super Pang runtime smoke, and Ponpoko prep-failure smoke.
- `npm run prepare:roms`: pass from `/Volumes/dev/arcade-safari/roms`.
- Direct local hash check confirms `roms/<romFile>` and `dist/roms/<romFile>` SHA-256 match for all three catalog games.
- Direct local dist listing confirms `dist/roms` contains only `bublbobl1.zip`, `ponpoko.zip`, and `spangj.zip`.
- GitHub Pages workflow run `28652413834`: success. Build ran `prepare:roms`, `npm test`, `npm run build`, and `npm run smoke`; deploy completed.
- Live Pages HTML references `/ponpoko/assets/index-xJVhxZGJ.js`.
- Live URL checks:
  - `https://taekimax.github.io/ponpoko/roms/ponpoko.zip`: HTTP 200, SHA-256 matches root `roms/ponpoko.zip` (`8d77d65d7b0a8594a185e4d2c28aec91cf0cb0ff47ef56108e85e4a52f90024f`).
  - `https://taekimax.github.io/ponpoko/roms/bublbobl1.zip`: HTTP 200, SHA-256 matches root `roms/bublbobl1.zip` (`ce4495598356f1832c76761f9163db6d8b709f0218e9d0869f1e09cca4032e5a`).
  - `https://taekimax.github.io/ponpoko/roms/spangj.zip`: HTTP 200, SHA-256 matches root `roms/spangj.zip` (`53aed43f2426ee07fb83dd0bde53870812bdca150b617ab19bfecd6e0aefad0d`).
- `BROWSER_SMOKE_BASE_URL=https://taekimax.github.io/ponpoko/ node scripts/browser-smoke.mjs`: pass.
- `GAME_RUNTIME_SMOKE_BASE_URL=https://taekimax.github.io/ponpoko/ node scripts/game-runtime-smoke.mjs`: pass.
- `PONPOKO_PREP_FAILURE_SMOKE_BASE_URL=https://taekimax.github.io/ponpoko/ node scripts/ponpoko-prep-failure-smoke.mjs`: pass.

## Deletion Impact Note

No test, doc, or config deletions planned.

## Closure Matrix

| CM# | scenario | criteria | outcome | action |
| --- | --- | --- | --- | --- |
| CM1 | all-green | final local gates pass and Pages live hashes match root ROMs | done | report |
| CM2 | env-blocked | GitHub Pages or Telegram tooling unavailable | pending | record exact blocker |
| CM3 | decision-blocked | source-of-truth decision unresolved | none | root `roms/` is explicit |
| CM4 | stuck-recycled | delegated worker stalls | none | no delegation |
| CM5 | no-findings | no actionable findings | declined | handoff contains A1-A2 |
| CM6 | partial-delivery | browser/live verification incomplete | physical iPhone manual play not performed; automated WebKit live smoke passed | report residual gap |
| CM7 | coverage-regressed | tests removed/renamed beyond threshold | no regression | added 2 test files / 5 tests; no deletions |
