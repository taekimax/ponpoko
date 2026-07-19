# 2026-07-16 Bubble Bobble WebRTC Streaming PoC Review

## Objective

Track the approved planning, implementation, verification, and physical-device closure for the Bubble Bobble (`bublbobl`) host-stream/guest-P2 WebRTC PoC. The authoritative product requirements are P1-P14 in `docs/plans/2026-07-16_bubble-bobble-webrtc-streaming-poc.md`; the execution contract is `.loop/02_contract.md`.

## Baseline

- W0-start checkout: `/Volumes/dev/ponpoko`, branch `2p-bubble`, commit `f6e1522`; the branch had no upstream before the authorized handoff.
- `2p-bubble`, `main`, and `origin/main` started at the same commit. The user later authorized only a docs-only push to `origin/2p-bubble`; `main`, Pages deployment, and eventual merge remain untouched.
- No tracked implementation changes existed at W0 start. The planning document was already untracked; `.loop/` and project `AGENTS.md` were created by the requested `loop-init` workflow.
- Existing runtime boundary uses player 0 and input-only active-state sets. No WebRTC session or QR dependency is present.
- Physical iPhone execution is unavailable during development. Desktop or synthetic evidence will not be reported as actual-iPhone or TURN proof.

## W0 Implementation Ledger

| I# | Source IDs | Owner | Status | Scope boundary | Verification |
| --- | --- | --- | --- | --- | --- |
| I0 | P1-P14 / W0 | Planner | `done` | Record D013-D017 and synchronize the authoritative W0 contract; no implementation code, dependency, DNS, secret, paid resource, or external-service mutation | Decision-source report, contract consistency, independent Evaluator PASS |
| I1 | P6, P10 / W1 | Generator | `done` | Player-aware native input contract and adapters only; local input fixed to P1; no network, dependency, or W2 source | Corrected P1/P2 scoped-release tests, required local checks, and independent re-evaluation PASS |
| I2 | P2, P4, P5 / W2 | Generator | `partial` | Local capture adapter plus D021's temporary LAN HTTP A-to-B harness and D023 interval-normalized silence correction; no dependency, external infrastructure, W3, or product route | D021/D022/D023 repairs pass final local/browser verification and independent ACCEPT. Physical initial A/V passed before D023, but D022 failed natural silence and D023 has no physical recheck. |

W2 was activated only after W1 independently closed. W3 and later implementation IDs remain inactive because W2 ended `partial`; they can be added only after the physical W2 gate changes W2 to `done`.

## W0 Approval Recommendation

| Approval item | Recommended default | Constraint / trade-off |
| --- | --- | --- |
| Signaling | Selected: Cloudflare Workers Free + room Durable Object at `ponpoko-2p.taekimax.workers.dev` | Contract target only; account/subdomain/deployment remain W4 gates. |
| TURN | Selected: Cloudflare Realtime TURN, 300-second credentials, USD 0 authorization, 800GB cutoff | Explicit managed replacement for coturn; no paid overage or shared public credentials. |
| TURN DNS | No custom TURN DNS | Use provider endpoints including TURNS 443; omit port 53 browser URLs. |
| DNS and secrets | User/operator owns the Cloudflare account and encrypted Worker secrets | Never put `CF_TURN_KEY_ID`, `CF_TURN_API_TOKEN`, or participant credentials in Git, Pages, chat, URLs, or logs. |
| QR generation | Selected: exact-pin `uqr@0.1.3` at W7 | MIT, ESM, built-in types, zero runtime dependencies; app-owned rendering and decode/camera coverage. |
| Devices | Selected: two iPhone 15 Pro, iOS 26.5.2 build 23F84/system Safari 26.5 | Phone A Home Screen host / Phone B Safari guest, then swap; physical readback and evidence remain pending. |
| Branch | Push only the W0 documents to `origin/2p-bubble` and set upstream | User-approved handoff action. Do not push/merge `main`, trigger Pages, or treat this as W0 implementation approval. |

## Open-Source and Official Evidence

- Cloudflare documents Durable Object Free limits and WebSocket hibernation: <https://developers.cloudflare.com/durable-objects/platform/pricing/> and <https://developers.cloudflare.com/durable-objects/best-practices/websockets/>.
- AWS documents the Lightsail bundles, Seoul availability, and transfer allowance: <https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html>, <https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-regions-and-availability-zones-in-amazon-lightsail.html>, and <https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-faq-data-transfer-allowance.html>.
- coturn documents `use-auth-secret`, time-limited REST credentials, TLS, and container networking: <https://github.com/coturn/coturn/blob/master/README.turnserver> and <https://github.com/coturn/coturn/blob/master/docker/coturn/README.md>.
- `uqr` documents its MIT TypeScript/ESM QR encoder: <https://github.com/unjs/uqr>.
- `n-at/playtime` is a close MIT host-only ROM, canvas/audio streaming, WebSocket signaling, QR, DataChannel-input, and coturn precedent: <https://github.com/n-at/playtime>. Its fixed-credential choices are not copied.
- EmulatorJS-Netplay is an Apache-2.0 signaling/netplay reference, not a server or runtime to deploy unchanged: <https://github.com/EmulatorJS/EmulatorJS-Netplay>.
- WebRTC's canvas capture and DataChannel samples are API-level references: <https://github.com/webrtc/samples/tree/gh-pages/src/content/capture/canvas-pc> and <https://github.com/webrtc/samples/tree/gh-pages/src/content/datachannel/basic>.

## Planned Slice Boundary

- W1: player-aware `(player,input)` state and independent P1/P2 press/release only.
- W2: after W0/W1, implement the smallest reproducible 4.2.3 capture-spike harness/adapter and local checks. Actual post-ROM iPhone OpenAL non-silent energy plus tester-audible guest output is still required to close W2.
- If the physical W2 execution is unavailable, stop with W2 `partial` or `blocked`, preserve exact future test steps, and do not enter W3.
- W3-W12 remain inactive until the preceding contract gates pass.

## Required Verification Gates

- Local: `npm run typecheck`, `npm test`, `npm run build`, and `GAME_RUNTIME_SMOKE_GAME=bublbobl npm run games:smoke`.
- Feature flag off: `npm run browser:smoke` and unfiltered `npm run games:smoke`.
- Physical: actual-iPhone W2 audio/video gate, direct 10 trials, forced TURN 10 trials, direct and relay 20-minute soaks, forced disconnect/reconnect and reload matrices.
- Safety: guest-ready pre-start calls zero; all 2P lifecycle save calls zero; P1 save checksum unchanged; remote player always 1; guest outbound allowlist, epoch, sequence high-water mark, and 1.5-second lease enforced.

## Progress

`CP0 | W0 | Planner | needs-clarification | .loop initialized and P1-P14/W0-W12 synchronized; no implementation/dependency/infra/branch mutation | await five-part consolidated approval`

`CP1 | W0 | Evaluator | done | A1-A5 corrected and re-evaluated; no residual contract finding | request five-part user approval; keep W0 needs-clarification`

`CP2 | W0 | Planner | partial | docs-only origin/2p-bubble handoff authorized; live Pages bublbobl 1P smoke passed; Cloudflare provisioning deferred | push handoff branch; await four remaining W0 approvals`

`CP4 | W0 | Handoff Evaluator | done | no Critical/High/Medium/Low findings; staged docs, live main/Pages, 1P evidence, and resume contract reviewed | commit, push, verify remote/main/live 1P`

`CP5 | W0 | Planner | in_progress | D013-D017 and current source evaluation recorded; no code/dependency/infra mutation | independent evaluation`

`CP6 | W0 | Evaluator | done | PASS; no Critical/High/Medium blocker; Low doc hygiene corrected | begin W1 only`

`CP7 | W1 | Generator | in_progress | player-aware contract/adapters and scoped P2 release tests pass all required local checks; first evaluator evidence gap corrected | independent W1 re-evaluation; keep W2 blocked`

`CP8 | W1 | Evaluator | done | PASS with no findings; scoped P2 release preserves identical active P1 input | begin bounded local W2 only; retain physical Gate 1A and W3 block`

`CP9 | W2 | Generator | in_progress | local adapter/query loopback passes 123 tests, build/static smoke, desktop/mobile capture smoke, and full query-off regression; physical evidence absent | independent evaluation; proposed partial; do not start W3`

`CP10 | W2 | Evaluator | partial | corrected adapter/query loopback passes 127 tests, rollback/race/watchdog regressions, rebuilt capture/query-off smokes, and final review with no finding; physical Gate 1A absent | stop; retain exact device procedure; keep W3 blocked`

`CP11 | W2 | Operator | partial | D022 physical A-to-B passed initial moving video/audible audio/no prompt/ready, then false-classified the quiet host waiting screen as receiver output silence | stop without retry; keep W3 blocked`

`CP12 | W2 | Generator/Evaluator | partial | D023 interval-normalized energy and float/byte-aware receiver analysis pass 208 tests, full local/browser smokes, and independent ACCEPT | publish handoff; next machine performs one physical D023 A-to-B recheck`

## Verification

- Planner inventory check: P1-P14 and W0-W12 are present in `.loop/01_spec.md`, `.loop/02_contract.md`, and `.loop/03_plan.md`.
- Planner formatting check: no trailing whitespace and no unbalanced Markdown code fence in the synchronized loop documents.
- Evaluator initial review found A1-A4; Planner closed the W5/W9 ownership gap, added branch disposition to W0, made W12 require W11 `done`, and added W2-W4 OSS provenance evidence.
- Evaluator re-evaluation: A1, A3, and A4 closed; A2 was closed in `.loop/`. The remaining A2-R and stale-result findings in this review document were corrected by adding the fifth branch approval and this result.
- Evaluator final addendum: A2-R and A5 closed; no residual High, Medium, or Low W0 contract finding.
- Doc consistency: passed for P1-P14/W0-W12 inventory, package-script names, referenced source/config paths, balanced code fences, trailing whitespace, and `git diff --check`.
- W0-start tracked diff: none. The later D011 handoff authorizes staging and publishing only these documentation artifacts on `origin/2p-bubble`.
- Implementation/build/runtime checks: not run at W0 because no implementation code changed and the approval gate remains open.
- Live Pages preservation check: `GAME_RUNTIME_SMOKE_BASE_URL=https://taekimax.github.io/ponpoko/ GAME_RUNTIME_SMOKE_GAME=bublbobl npm run games:smoke` passed before the branch push on desktop Chromium and mobile WebKit. This is not actual-iPhone/PWA or audio/TURN evidence.
- Docs-only handoff baseline: `npm run typecheck`, `npm test` (20 files / 113 tests), `npm run build`, and local `GAME_RUNTIME_SMOKE_GAME=bublbobl npm run games:smoke` all passed.
- Full feature-flag-off regression: `npm run browser:smoke` passed, including Ponpoko WebKit, unfiltered catalog desktop/mobile runtime smoke, and Ponpoko preparation-failure handling.
- Independent handoff evaluation: no Critical, High, Medium, or Low findings; recommendation `PASS` for `origin/2p-bubble` only.
- W1 generator verification: typecheck; focused 4 files / 35 tests; all 20 files / 114 tests; production build; targeted Bubble Bobble desktop/mobile runtime smoke; and `git diff --check` all pass.
- W1 final evaluation: PASS with no Critical, High, Medium, or Low finding after scoped P2 cleanup was tested while an identical P1 input remained active.
- W2 final verification: focused 2 files / 13 tests; adapter/runtime/lifecycle 5 files / 38 tests; all 22 files / 127 tests; typecheck; build; static smoke; final rebuilt opt-in desktop/mobile capture smoke; final rebuilt targeted query-off Bubble smoke; earlier full query-off browser/catalog/prep-failure regression; and `git diff --check` pass.
- W2 final evaluation: PASS with no Critical, High, Medium, or Low code finding after transactional rollback, async-generation safety, five-second watchdog, attempted-arm wording, destination-track ownership, and stale-stats corrections. Closure is `partial` because automated loopback is not actual-iPhone non-silent/audible or two-device proof.
- D023 final verification: focused W2 LAN/signaling 2 files / 55 tests; full 24 files / 208 tests; typecheck; production build; static smoke; two-page LAN desktop/mobile; query-off Bubble desktop/mobile; full flag-off browser/catalog/preparation-failure smoke; and `git diff --check` all pass on Node 25.8.1. Independent evaluation returned ACCEPT with no finding. No post-D023 physical proof exists.

## Deletion Impact Note

No test, documentation, configuration, source, ROM, dependency, or generated artifact is deleted in W0. No rollback action is required beyond removing the newly created untracked W0 documents, which will not be done without explicit user direction.

## Current Closure

W0 and W1 are `done`; W2 is `partial`; W3 is `blocked`. D021 passed cross-device initial A/V, D022 then failed physical natural-silence classification, and D023 locally corrected the raw-energy/receiver-resolution defect. Node 25.8.1 verification passes focused 2 files/55 tests, full 24 files/208 tests, typecheck, build, static smoke, W2 two-page LAN desktop/mobile, query-off Bubble desktop/mobile, full flag-off browser/catalog/preparation-failure smoke, and diff-check. Independent D023 evaluation returned ACCEPT with no finding. Node 24 was unavailable, and no post-D023 iPhone result exists, so CI parity and physical closure are not claimed. LAN HTTP is not secure-context/Home Screen evidence; D021's W2-only role-swap waiver does not change W11's exact pair, both orientations, or direct/TURN matrix.
