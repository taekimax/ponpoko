# Decisions

Append decision records below. Do not rewrite prior decisions unless correcting a factual error.

## Decision Record Template

- Date: TBD
- Decision: TBD
- Reason: TBD
- Alternatives Considered: TBD
- Reversal Condition: TBD

## 2026-07-16 | D001 | Host-stream / guest-input architecture

- Status: `done`
- Decision: Keep EmulatorJS 4.2.3. Only the host loads Bubble Bobble ROM/core/emulator; the guest receives WebRTC video/audio and sends P2 input via DataChannel.
- Reason: This is the approved PoC boundary and minimizes regression to existing ROM boot, input, save, and service-worker behavior.
- Alternatives Considered: EmulatorJS 4.3.0-pre full upgrade; guest ROM execution; lockstep/rollback.
- Reversal Condition: A new user-approved plan and contract after a separate architecture review.

## 2026-07-16 | D002 | Strict implementation sequence and W2 gate

- Status: `done`
- Decision: After W0 approval, execute W1, then W2. Do not start W3 or later slices until an actual iPhone proves post-ROM OpenAL non-silent capture and audible guest output, using at most one host fallback tap.
- Reason: Desktop API presence and track counts cannot prove iPhone WebKit audio capture, and the user explicitly fixed W1 -> W2 -> W3 order.
- Alternatives Considered: Parallel W1/W2; desktop-only spike; finishing PeerSession before device audio proof.
- Reversal Condition: None within this PoC; only a user-approved contract replacement.

## 2026-07-16 | D003 | Input and save safety are hard blockers

- Status: `done`
- Decision: Key input by `(player,input)`, force remote input to `player=1`, restrict guest outbound messages, enforce server epoch/sequence/1.5-second lease, keep Coin/Start host-only, suppress 2P startup assist/autosave, and require zero pre-ready start and zero lifecycle save calls.
- Reason: Stuck or cross-player input and 1P save corruption violate the core safety boundary.
- Alternatives Considered: Input-only keying, trusting network player, saving 2P state, reuse of existing startup/autosave lifecycle.
- Reversal Condition: None within this PoC.

## 2026-07-16 | D004 | Approval before implementation or provisioning

- Status: `needs-clarification`
- Decision: Make no implementation-code, dependency, signaling/TURN infrastructure, DNS, secret, paid-resource, or branch change until all five W0 approval groups, including `2p-bubble` disposition, are recorded.
- Reason: The user explicitly required one consolidated approval before code changes and cannot respond to new machine permission prompts while remote.
- Alternatives Considered: Implement W1 before approval; choose default cloud services; add a QR package speculatively.
- Reversal Condition: W0 becomes `done` after explicit user approval.

## 2026-07-16 | D005 | Target device scope and evidence status

- Status: `done`
- Decision: Target iPhone 15 Pro Safari and Home Screen installed web-app mode. Android comparison from the planning draft is excluded by the implementation request. Missing actual-iPhone or TURN evidence prevents a `done` result.
- Reason: The implementation request explicitly excludes Android and requires honest physical-device validation.
- Alternatives Considered: Retain Android comparison; infer mobile success from desktop WebKit/Chromium.
- Reversal Condition: User explicitly expands the target matrix.

## Pending W0 Decision Record

- Status: `needs-clarification`
- Signaling provider/domain: unresolved.
- coturn provider/cost ceiling/DNS-secret owner: unresolved.
- QR dependency policy: unresolved.
- Two-iPhone model and exact iOS/Safari mode matrix: unresolved.
- Branch disposition: resolved by D011 for docs-only handoff; eventual merge to live `main` is not authorized yet.

## 2026-07-16 | D006 | W2 local implementation versus physical closure

- Status: `done`
- Decision: Once W0 and W1 are `done`, the Generator may implement the minimal W2 capture-spike harness/adapter and local checks even though physical-device execution is unavailable during development. W2 remains `partial` or `blocked` until an actual iPhone proves post-ROM OpenAL non-silent energy and audible guest output; W3 cannot start before that proof.
- Reason: The user requested the maximum realistic implementation but explicitly prohibited forced workarounds and acknowledged that development-stage device testing is unavailable.
- Alternatives Considered: Block every W2 code change on device access; accept desktop or synthetic audio as closure evidence; redesign media capture to avoid the planned spike.
- Reversal Condition: Actual-iPhone Gate 1A passes, allowing W2 `done` and W3 entry.

## 2026-07-16 | D007 | W5 command ownership and W9 real-runtime binding

- Status: `done`
- Decision: W5-W8 own only readiness/start-command semantics with the real Coin/Start port unbound; W5 integration uses a test double. W9 alone sets 2P mode before game start, installs startup/autosave/lifecycle-save guards, then atomically performs the first real-runtime bind and allows one readiness-gated start.
- Reason: Separating command protocol from runtime binding prevents an unsafe or duplicate start before save/startup guards exist.
- Alternatives Considered: Bind Coin/Start in W5; split guard setup and runtime binding across W5/W9; allow both slices to invoke the real runtime.
- Reversal Condition: None within this PoC without a new evaluator-approved contract.

## 2026-07-16 | D008 | Live branch disposition is a W0 approval

- Status: `needs-clarification`
- Decision: Add branch disposition to the same consolidated W0 approval. Current `2p-bubble` has no upstream and matches local `main` and `origin/main` at `f6e15224fa8d3628637a07b24772e67f1281f52c`; no branch switch or upstream choice is implicit.
- Reason: Commit equality removes content divergence but does not resolve branch ownership, publishing target, or user intent.
- Alternatives Considered: Silently switch to `main`; continue on `2p-bubble` and infer an upstream; ignore branch identity because commits match.
- Reversal Condition: User explicitly approves the branch disposition and W0 records it.

## 2026-07-16 | D009 | W12 full entry requires W11 done

- Status: `done`
- Decision: W12 full entry requires W11 status `done`. Any staging setup strictly needed to obtain W11 evidence remains a limited, separately logged W11 preparation activity and cannot include production completion or final public service-worker rollout.
- Reason: `evaluated`, `partial`, or incomplete W11 evidence cannot satisfy the release gate.
- Alternatives Considered: Start W12 after any W11 evaluation; treat staging preparation as partial W12; allow production release to gather W11 evidence.
- Reversal Condition: A user-approved release-contract change after evaluator review.

## 2026-07-16 | D010 | W2-W4 OSS provenance evidence

- Status: `done`
- Decision: Every W2-W4 slice report records consulted sources and revisions, copied-code `yes`/`no`, and license/attribution disposition. The evidence obligation does not authorize a dependency or copied code.
- Reason: The implementation plan relies on open-source examples, so provenance and licensing decisions must remain auditable without expanding scope.
- Alternatives Considered: Record only dependencies; report sources only when code is copied; infer license handling from repository history.
- Reversal Condition: None; evidence detail may be expanded by evaluator request.

## 2026-07-16 | D011 | Docs-only remote handoff branch publication

- Status: `done`
- Decision: Commit the W0 planning, loop, evaluator, and handoff documents on `2p-bubble`; push them to `origin/2p-bubble` and set that upstream. Do not push, merge, rebase, or open a release against `main`, and do not trigger a Pages deployment in this handoff.
- Reason: The user explicitly requested a durable remote-Mac handoff while requiring the currently served GitHub Pages 1P experience to remain intact.
- Alternatives Considered: Leave the work uncommitted on this Mac; push directly to `main`; deploy an incomplete feature.
- Reversal Condition: A later user-approved, fully verified merge/release decision after the required gates.

## 2026-07-16 | D012 | Free-hosting preference and Cloudflare provisioning deferral

- Status: `needs-clarification`
- Decision: Record a zero-cost PoC hosting preference, but do not request Cloudflare account information, create an account, provision services, store secrets, or select a paid provider during this remote handoff. Cloudflare Workers/Durable Objects remains a possible free signaling option. Cloudflare Realtime TURN is managed TURN rather than coturn, so adopting it requires an explicit contract decision; it is not approved implicitly.
- Reason: The user cannot provide Cloudflare enrollment information remotely and asked to continue without unsafe workarounds. W0 can remain durable without provisioning, while W4 and real forced-TURN evidence remain gated.
- Alternatives Considered: Paid coturn VM now; public shared TURN credentials; embedding long-lived secrets in the frontend; treating a managed TURN service as coturn without approval.
- Reversal Condition: The user later approves the exact signaling/TURN providers, domain, cost ceiling, and DNS/secret ownership.
