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
| I0 | P1-P14 / W0 | Planner | `needs-clarification` | Create project-local loop policy, planning/review/evaluator artifacts, and a docs-only remote handoff; no implementation code, dependency, DNS, secret, paid resource, or external-service mutation | P/W inventory, contract consistency, whitespace/fence checks, independent Evaluator report, live 1P smoke, consolidated user approval |

W1 and later implementation IDs are not activated until I0/W0 is `done`. After approval they will be added one at a time with one owner, exact allowed/forbidden paths, source P# mapping, and focused verification.

## W0 Approval Recommendation

| Approval item | Recommended default | Constraint / trade-off |
| --- | --- | --- |
| Signaling | Deferred; Cloudflare Workers Free plus SQLite Durable Object remains a zero-cost candidate | No account information or provisioning is required for this handoff. Exact provider/domain remains a W0 choice. |
| TURN | Deferred; no paid host is authorized | A self-hosted coturn VM needs a provider/domain/secret owner. Cloudflare Realtime TURN may fit a free PoC allowance but is managed TURN rather than coturn, so it requires explicit contract approval. Shared public credentials are not an acceptable completion path. |
| TURN DNS | Deferred with the provider choice | A self-hosted coturn path still needs a trusted public endpoint and explicit DNS ownership. Do not invent a bypass; leave W4 and forced-TURN evidence blocked. |
| DNS and secrets | User remains the sole owner | Keep the shared TURN secret only in a Cloudflare encrypted secret and root-readable coturn configuration. Never put account credentials or TURN shared secrets in Git, the client bundle, chat, invite URLs, or logs. Browser credentials have TTL at most five minutes. |
| QR generation | Exact-pin `uqr@0.1.3` as the only production dependency | MIT, ESM, built-in types, and zero runtime transitive dependencies. Render the encoded matrix in app-owned canvas; add decode/smoke coverage because the package is 0.x. |
| Devices | Two physical iPhone 15 Pro devices, using their actually installed stable iOS versions | Phone A host Home Screen app / Phone B guest Safari tab, then swap roles. Do not downgrade or install a beta solely for this PoC. Record the iOS setting value because Safari/WebKit is bundled with iOS. |
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

## Deletion Impact Note

No test, documentation, configuration, source, ROM, dependency, or generated artifact is deleted in W0. No rollback action is required beyond removing the newly created untracked W0 documents, which will not be done without explicit user direction.

## Current Closure

W0 remains `needs-clarification`. Branch handoff is resolved by D011, but no implementation slice is authorized until signaling/domain, TURN/cost/DNS-secret ownership, QR dependency, and the exact two-iPhone matrix are approved and recorded in `.loop/05_decisions.md`. Cloudflare provisioning and all secrets remain deferred.
