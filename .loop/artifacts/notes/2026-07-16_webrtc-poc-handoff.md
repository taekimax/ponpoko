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

## 2026-07-18 Resume Update

- D013-D017 now select Cloudflare Workers Free/Durable Objects signaling at `ponpoko-2p.taekimax.workers.dev`, Cloudflare Realtime TURN under a USD 0/800GB fail-closed policy, exact-pinned `uqr@0.1.3` for W7, and the two-iPhone 15 Pro/iOS 26.5.2 Safari/Home Screen matrix.
- These are contract targets only. No account, Worker, TURN key, DNS, secret, dependency, or physical-device evidence has been created or claimed.
- W0 and W1 passed independent evaluation and are `done`. The corrected bounded local W2 implementation passed final independent evaluation with no finding and is `partial`; actual-iPhone/two-device non-silent and audible evidence is still required for W2 `done`, and W3 remains blocked.

## 2026-07-20 D023 Publish Update

- The current handoff contains the full bounded W0/W1/W2 work. D021's temporary same-Wi-Fi LAN HTTP Phone A-host-to-Phone B-guest path passed physical initial moving video, audible guest audio, zero permission prompts, one guest CTA, one host fallback, and `ready=yes`.
- The fresh D022 physical run then failed natural-silence classification: a quiet host waiting screen became `수신 출력 무음` with `ready=no`. D023 corrects the evidenced raw-energy/8-bit-analysis defect using interval-normalized inbound RMS, float receiver samples, a conservative byte fallback, and unknown/reset-stat handling.
- Node 25.8.1 checks pass: focused 2 files / 55 tests, full 24 files / 208 tests, typecheck, production build, static smoke, W2 two-page LAN desktop/mobile, query-off Bubble desktop/mobile, full feature-flag-off browser/catalog/preparation-failure smoke, and diff-check. Independent evaluation returned ACCEPT with no finding. Node 24 was unavailable.
- No post-D023 physical run exists because the user became unavailable. On the next machine, read `.loop/04_progress.md`, D023 in `.loop/05_decisions.md`, the final entries in `.loop/06_log.md`, and `.loop/reports/2026-07-18_w2_capture_spike.md`. Then run only one bounded A-to-B recheck when both phones are available: prove initial normal A/V, leave Phone A on the quiet waiting screen, and require Phone B `게임 무음(전송 정상)` with `ready=yes`.
- Keep W2 `partial` and W3 `blocked`. Do not treat LAN HTTP as secure-origin/Home Screen/Gate 1A closure, do not swap roles for this W2 objective unless device-specific evidence appears, and do not modify `main`, Pages, Tailscale, TURN, DNS, certificates, firewall, dependencies, or infrastructure without a new scoped decision.

## Historical Handoff Status

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

## Superseded Resume Gate

The following four items were open at the 2026-07-16 handoff and are superseded by D013-D017:

1. signaling provider and exact HTTPS/WSS domain;
2. coturn or explicitly approved managed-TURN provider, zero-cost/cost ceiling, and DNS/secret owner;
3. QR dependency approval or rejection; and
4. two actual iPhones with exact iOS versions and Safari-tab/Home-Screen role assignments.

The Evaluator accepted the corrected bounded W2 adapter/query-loopback diff and `.loop/reports/2026-07-18_w2_capture_spike.md`, then closed W2 as `partial` for unavailable actual-iPhone/two-device evidence. Resume only the report's physical procedure through a separately authorized secure, contract-compatible two-device path. Do not start W3 or claim W2 `done` without post-ROM OpenAL non-silent and audible cross-device guest evidence.

## Safety Locks

- Preserve EmulatorJS 4.2.3 and the feature-flag-off 1P path.
- Keep remote input fixed to player 1 with `(player,input)` state isolation.
- Keep Coin/Start host-only and zero before guest-ready/real-runtime binding.
- Keep 2P startup assist, autosave, and every lifecycle save call at zero.
- Do not report the PoC `done` without actual-iPhone direct/forced-TURN and soak evidence.
