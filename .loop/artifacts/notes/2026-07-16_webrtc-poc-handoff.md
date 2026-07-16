# Bubble Bobble WebRTC PoC Remote Handoff

## Checkout

The durable work is on `origin/2p-bubble`. The live GitHub Pages source remains `origin/main`; this handoff does not merge or push `main` and does not deploy Pages.

For a remote Mac without a local branch:

```bash
git fetch origin
git switch --track origin/2p-bubble
```

If `2p-bubble` already exists locally:

```bash
git switch 2p-bubble
git pull --ff-only
```

Then read, in order:

1. `AGENTS.md`
2. `.loop/01_spec.md`
3. `.loop/02_contract.md`
4. `.loop/03_plan.md`
5. `.loop/04_progress.md`
6. `.loop/05_decisions.md`
7. `.loop/06_log.md`
8. `docs/plans/2026-07-16_bubble-bobble-webrtc-streaming-poc.md`

## Exact Status

- Planning: `done`.
- Implementation entry/W0: `needs-clarification`.
- Source, dependency, service, DNS, secret, and paid-resource changes: none.
- W1-W12 implementation: not started.
- Cloudflare enrollment/provisioning: deferred because account information cannot be supplied during this remote session.
- The zero-cost preference is recorded, but signaling provider/domain and TURN implementation remain unapproved. Managed Cloudflare Realtime TURN must not be silently substituted for the requested coturn contract.
- QR dependency and exact two-iPhone/iOS/Safari assignments remain unapproved.

## Live 1P Preservation Evidence

Before the handoff push, `origin/main` and the successful Pages deployment both referenced `f6e15224fa8d3628637a07b24772e67f1281f52c`. The deploy workflow listens only to `main` pushes or manual dispatch.

This command passed against the public site:

```bash
GAME_RUNTIME_SMOKE_BASE_URL=https://taekimax.github.io/ponpoko/ \
GAME_RUNTIME_SMOKE_GAME=bublbobl \
npm run games:smoke
```

It verified Bubble Bobble ROM boot, rendered frames, and mapped 1P inputs in desktop Chromium and mobile WebKit. It does not prove actual iPhone 15 Pro/Home Screen behavior, Safari audio unlock, non-silent OpenAL capture, TURN, or soak stability.

The same handoff baseline also passed `npm run typecheck`, `npm test` (20 files / 113 tests), `npm run build`, local `GAME_RUNTIME_SMOKE_GAME=bublbobl npm run games:smoke`, and the full feature-flag-off `npm run browser:smoke` suite.

## Resume Gate

Obtain one explicit response covering all four remaining W0 items:

1. signaling provider and exact HTTPS/WSS domain;
2. coturn or explicitly approved managed-TURN provider, zero-cost/cost ceiling, and DNS/secret owner;
3. QR dependency approval or rejection; and
4. two actual iPhones with exact iOS versions and Safari-tab/Home-Screen role assignments.

Record those choices in `.loop/05_decisions.md`, have an Evaluator confirm W0, and only then start W1. Execute W1, then the bounded W2 harness. Do not start W3 or claim W2 `done` without actual-iPhone post-ROM OpenAL non-silent and audible guest evidence.

## Safety Locks

- Preserve EmulatorJS 4.2.3 and the feature-flag-off 1P path.
- Keep remote input fixed to player 1 with `(player,input)` state isolation.
- Keep Coin/Start host-only and zero before guest-ready/real-runtime binding.
- Keep 2P startup assist, autosave, and every lifecycle save call at zero.
- Do not report the PoC `done` without actual-iPhone direct/forced-TURN and soak evidence.
