# GitHub Pages Root ROM Loading Fix Handoff

Date: 2026-07-03
Primary review: `docs/reviews/2026-07-03_iphone_ponpoko_rom_loading_review.md`
Repo context: `taekimax/ponpoko`, GitHub Pages URL `https://taekimax.github.io/ponpoko/`

## Objective

Fix GitHub Pages so the app serves and runs the ROM ZIP files from the repository root `roms/` directory, not `public/roms/` and not an external ROM host. Use the Ponpoko loading issue as the concrete regression, then verify the same Pages path works for every game in the current catalog.

## Current Failure

The app requests ROMs from `/ponpoko/roms/<romFile>`, but production Pages only serves files that Vite puts in `dist`. Vite copies `public/*` into `dist`; it does not copy repository-root `roms/*` unless the build or deploy process explicitly does so.

Observed on 2026-07-03:

- `src/catalog.ts` expects same-origin ROM paths under `/ponpoko/roms/`.
- `vite-roms.ts` maps `/ponpoko/roms/` to a local/external ROM directory only in Vite dev/preview middleware.
- `.github/workflows/deploy.yml` runs `vite build` but does not copy root `roms/` into `dist/roms/`.
- Live Pages `https://taekimax.github.io/ponpoko/roms/ponpoko.zip` matches `public/roms/ponpoko.zip`, not `roms/ponpoko.zip`.
- Live Pages returns `404` for catalog files `bublbobl1.zip` and `spangj.zip`.

There is also a separate user-visible Ponpoko boot issue: if Ponpoko-specific runtime prep fails after frames have started, the boot overlay can stay visible forever. The review reproduced `frame=1983`, `started=true`, `failed=false`, `prep=failed`, `overlay=true`, controls disabled.

## Non-Negotiable Direction

- The root `roms/` directory is the ROM source of truth.
- GitHub Pages must serve the root `roms/` files at `/ponpoko/roms/<romFile>`.
- Do not fix this by depending on `public/roms/`.
- Do not reintroduce the old external/Tailscale ROM base URL path for Pages.
- Do not revert unrelated local edits from other sessions.

## Acceptance Criteria

1. `npm run build` produces `dist/roms/<romFile>` for every `romFile` in the current catalog.
2. Each `dist/roms/<romFile>` byte-for-byte matches the corresponding `roms/<romFile>`.
3. GitHub Pages deploy uses those `dist/roms/*` files, so live URLs under `https://taekimax.github.io/ponpoko/roms/` return `200` for every catalog game.
4. The live `ponpoko.zip`, `bublbobl1.zip`, and `spangj.zip` hashes match the root `roms/` files after deploy.
5. Browser smoke coverage proves every catalog game can be launched through the production Pages path, not just Ponpoko.
6. Ponpoko no longer leaves users stuck behind the boot overlay when runtime prep fails after frames start. It must either enable playable controls when safe or move to a clear retry/error state.
7. CI/Pages workflow fails before deploy if any catalog ROM is missing from root `roms/`, missing from `dist/roms`, or mismatched by hash.

## Suggested Implementation Plan

### Step 1: Make build copy root ROMs into `dist/roms`

Add a small Node script, for example `scripts/copy-root-roms-to-dist.mjs`, that runs after `vite build`.

Required behavior:

- Read the expected ROM filenames from the catalog or from a single shared manifest that is tested against the catalog.
- Validate each `roms/<romFile>` exists, is non-empty, and starts with ZIP magic bytes.
- Remove or overwrite `dist/roms` so stale `public/roms` files cannot mask missing root ROMs.
- Copy each expected root ROM into `dist/roms/<romFile>`.
- Compare SHA-256 of source and destination and fail if any mismatch.

Update `package.json` so `npm run build` performs:

```bash
tsc -b && vite build && node scripts/copy-root-roms-to-dist.mjs
```

Equivalent structure is fine if the checks are deterministic and run in CI.

### Step 2: Tighten smoke checks

Update `scripts/smoke.mjs` or add a focused verification script so Pages artifacts are validated even when external ROM checks are skipped.

Required checks:

- For every catalog `romFile`, assert `roms/<romFile>` exists.
- For every catalog `romFile`, assert `dist/roms/<romFile>` exists.
- Assert source and dist SHA-256 match.
- Fail if `dist/roms` contains only the old `public/roms` set while catalog root ROMs are missing.

The current `ARCADE_SAFARI_SKIP_ROMS=1 npm run smoke` path is insufficient because it skips the checks that would have caught this Pages regression.

### Step 3: Update GitHub Pages workflow

Update `.github/workflows/deploy.yml` so the deploy job cannot publish without verified root ROMs.

Expected direction:

- Do not set `VITE_ROM_BASE_URL` for Pages.
- Do not skip root ROM verification in the deploy path.
- Run `npm test`, `npm run build`, and `npm run smoke` with the new dist-ROM checks.
- Keep the artifact path as `dist`.

### Step 4: Verify all catalog games in a browser

The current `scripts/browser-smoke.mjs` is Ponpoko-heavy. Extend it or add a second smoke script that launches every catalog game from a production build or live Pages URL.

Minimum per-game browser assertions:

- Click the game card.
- Observe ROM download progress and transition to the emulator stage.
- Confirm the requested ROM URL is `/ponpoko/roms/<romFile>` for that game.
- Confirm canvas appears and frame count advances.
- Confirm the boot overlay does not remain forever.
- Return to menu before launching the next game.

Ponpoko can keep its stricter assertions. Other games should at least prove the same-origin ROM download, EmulatorJS startup, and frame advancement.

### Step 5: Fix Ponpoko permanent overlay failure

Use the reviewed failure path in `src/main.ts` and `src/boot-progress.ts`.

Relevant code:

- `src/main.ts`: `finalizeRuntimeControls`, `prepareRuntimeControls`, `enableRuntimeControls`, `renderBootFailure`
- `src/boot-progress.ts`: `shouldEnableRuntimeControls`, `shouldStopBoot`

Required outcome:

- If frames are advancing but Ponpoko prep fails, do not leave `prep=failed` with `overlay=true` indefinitely.
- Either enable controls if gameplay is already active enough, or render a clear error/retry state.
- Add a regression test or browser smoke injection that simulates post-frame prep failure and verifies the overlay does not stay stuck.

## Recommended Verification Commands

Run these locally before pushing:

```bash
npm test
npm run build
npm run smoke
npm run browser:smoke
```

After GitHub Pages deploy completes, verify live URLs:

```bash
for rom in ponpoko.zip bublbobl1.zip spangj.zip; do
  curl -fsSI "https://taekimax.github.io/ponpoko/roms/$rom"
done
```

Also compare live hashes against root `roms/`:

```bash
for rom in ponpoko.zip bublbobl1.zip spangj.zip; do
  curl -fsSL "https://taekimax.github.io/ponpoko/roms/$rom" -o "/tmp/$rom"
  shasum -a 256 "roms/$rom" "/tmp/$rom"
done
```

If catalog games change, derive this list from the catalog instead of hardcoding only these three.

## Files Likely To Touch

- `.github/workflows/deploy.yml`
- `package.json`
- `scripts/smoke.mjs`
- `scripts/browser-smoke.mjs` or a new browser smoke script
- A new build helper script under `scripts/`
- `src/main.ts`
- `src/boot-progress.ts` if boot state needs a cleaner terminal condition
- Tests under `tests/`
- `README.md` if build/deploy instructions still mention the old behavior

## Do Not Do

- Do not leave `public/roms` as the effective Pages source of truth.
- Do not make Pages depend on `/Volumes/dev/ponpoko/roms`; that is local-only.
- Do not rely on `ARCADE_SAFARI_SKIP_ROMS=1` to pass deploy checks.
- Do not only fix Ponpoko. All catalog games must run through GitHub Pages.
- Do not remove tests/docs/config just to make checks pass.

## Suggested Final Report Shape

When done, report:

- What changed.
- Exact ROM source-of-truth behavior after build.
- Exact verification commands and outcomes.
- Live GitHub Pages URL/hash checks after deploy.
- Any remaining physical iPhone verification gaps.
