# Arcade Safari Implementation Review

## Inputs
- Build a mobile-first Korean UI arcade web app for iPhone Safari.
- Target Ponpoko first, then expose a fixed 10-game ROM menu.
- Download ROMs only when the user starts a game.
- Support game-specific controller profiles.
- Publish to `https://taekimax.github.io/ponpoko/`.
- Notify through Hermes agent `ayukawa` if available.

## Implementation Ledger
| ID | Source | Scope | Verification |
| --- | --- | --- | --- |
| I1 | P1 | Vite TypeScript app, Korean menu, EmulatorJS shell | `npm run build` |
| I2 | P2 | Static 10-game catalog, fixed ROM paths | `npm test` |
| I3 | P3 | Controller profiles and touch input mapping | `npm test` |
| I4 | P4 | Runtime ROM download with loading state | `npm test`, `npm run smoke` |
| I5 | P5 | GitHub Pages workflow and ayukawa notification script | GitHub Actions run, `npm run notify:ayukawa` |

## Execution Log
- I1/I2/I3/I4: implemented in `src/` and `tests/`.
- I5: implemented with `.github/workflows/deploy.yml` and `scripts/notify-ayukawa.mjs`.

## Verification Notes
- `npm test`: 3 files, 8 tests passing.
- `npm run typecheck`: passing.
- `npm run build`: passing.
- `npm run smoke`: build paths, ROM ZIPs, and EmulatorJS CDN reachable.
- `npm run browser:smoke`: mobile menu, runtime ROM download, EmulatorJS mount, and canvas startup verified in a mobile Chrome viewport with iPhone Safari user agent.
- ROM ZIP files and downloaded thumbnails are excluded from git and prepared at build/deploy time.
