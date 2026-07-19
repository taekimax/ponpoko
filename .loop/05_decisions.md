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

## Historical Pending W0 Decision Record (superseded by D013-D017)

- Historical status: `needs-clarification` on 2026-07-16.
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

## 2026-07-18 | D013 | Cloudflare signaling target

- Status: `done`
- Decision: Use a Cloudflare Workers Free service named `ponpoko-2p` with one SQLite-backed Durable Object per room and the WebSocket Hibernation API. The exact PoC origin is `https://ponpoko-2p.taekimax.workers.dev`; signaling uses `wss://ponpoko-2p.taekimax.workers.dev/v1/session`, and the HTTP contract remains under that origin. Allow only `https://taekimax.github.io` in production. This decision selects the contract target but does not provision a Cloudflare account, Worker, Durable Object, DNS record, or secret.
- Reason: It satisfies the small 1:1 room and WSS coordination contract on a zero-cost hobby-project path while keeping GitHub Pages frontend-only.
- Alternatives Considered: A paid VM; a custom-domain Worker; Render/Fly/Railway; signaling through GitHub Pages.
- Reversal Condition: If the `taekimax.workers.dev` account subdomain or `ponpoko-2p` Worker name cannot be controlled at W4, keep W4 blocked and obtain approval for one exact replacement endpoint before changing client configuration.

## 2026-07-18 | D014 | Cloudflare Realtime TURN, zero-cost ceiling, and ownership

- Status: `done`
- Decision: Cloudflare Realtime TURN explicitly replaces self-hosted coturn for this PoC. Use `stun:stun.cloudflare.com:3478`, `turn:turn.cloudflare.com:3478?transport=udp`, `turn:turn.cloudflare.com:3478?transport=tcp`, and `turns:turn.cloudflare.com:443?transport=tcp`; omit browser-blocked port 53 alternatives. The signaling service generates separate host/guest credentials with `ttl=300`, refreshes them only for an authenticated live session, and revokes them on room close, leave, or expiry. The cost ceiling is USD 0 per month: do not upgrade Workers or authorize paid overage, stop issuing new TURN credentials at 800 GB of account-period Realtime egress, and fail closed if the 1,000 GB free allowance or pricing changes. No custom TURN DNS is used. The user/operator owns the Cloudflare account and Worker secret bindings `CF_TURN_KEY_ID` and `CF_TURN_API_TOKEN`; raw values stay only in Cloudflare's encrypted secret store and never enter Git, Pages, chat, URLs, or logs.
- Reason: The managed service provides the required UDP, TCP, and TLS 443 paths, short-lived revocable credentials, and a current free allowance large enough for the bounded PoC without operating a public coturn host.
- Alternatives Considered: Self-hosted coturn on a paid VM; public/shared TURN; a metered paid ceiling; no relay path.
- Reversal Condition: If Cloudflare Realtime TURN cannot be enabled under the stated no-paid-use policy, W4 remains blocked until a separately approved provider, hard cost ceiling, DNS plan, and secret owner replace this decision.

## 2026-07-18 | D015 | Exact-pinned QR encoder dependency

- Status: `done`
- Decision: Approve exactly `uqr@0.1.3` as the sole new production dependency when W7 begins. Use only its encoder output and render the matrix in app-owned UI; do not add an in-app scanner. Commit the exact lockfile resolution, retain MIT license notice/attribution, and add decode plus iOS Camera smoke coverage before W7 can close.
- Reason: The repo has no QR capability. `uqr@0.1.3` is ESM, has built-in TypeScript declarations, has zero runtime dependencies, and is MIT-licensed; a project-owned QR encoder would add avoidable correctness and maintenance risk.
- Alternatives Considered: A dependency-free app-owned encoder; a larger QR package; camera/scanner packages.
- Reversal Condition: A supply-chain or decoding defect fails W7 review, or the package/license facts differ at install time; in either case stop before installation or remove the dependency through a separately reviewed W7 change.

## 2026-07-18 | D016 | Two-iPhone target matrix

- Status: `done`
- Decision: Fix the required physical matrix to two iPhone 15 Pro units on stable iOS 26.5.2 build 23F84, using the system Safari 26.5 release line and no beta OS. Phone A is the primary Home Screen-app host and Phone B the Safari-tab guest for W2 Gate 1A, five direct rooms, five forced-relay rooms, and both 20-minute soaks. Swap modes and roles for five more direct and five more forced-relay rooms. Split the 20 forced-disconnect releases, 10 reconnects, and 10 guest reload recoveries across both orientations. This W0 decision fixes the required matrix; it does not claim the phones are currently attached or that physical evidence exists. At physical execution, record each device's Settings version/build and stop if either differs until the matrix is re-approved.
- Reason: It keeps the requested iPhone 15 Pro Safari/Home Screen scope, covers both lifecycle orientations without Android, and preserves the required quantitative totals on one primary pair.
- Alternatives Considered: One phone plus simulator; mixed iPhone models; beta iOS; Android comparison; running the complete quantitative suite twice.
- Reversal Condition: Either physical iPhone is unavailable or reports a different OS/build, or Apple updates the stable release before testing; update the exact inventory/matrix before physical W2 execution and do not infer compatibility.
- Supersession: D019 replaces this device inventory for current support and future physical work. D016 remains the historical W0 decision that was independently evaluated.

## 2026-07-18 | D017 | W0 decision authority and implementation entry

- Status: `done`
- Decision: Treat the user's 2026-07-18 instruction to resolve and record the four remaining W0 decisions, then begin W1 followed by W2, as authorization to select the bounded contractual targets in D013-D016. It does not authorize provisioning, DNS or secret mutation, paid use, installing the W7 dependency early, a `main` change, a Pages deployment, or bypassing physical evidence. W0 becomes `done` only after an independent Evaluator accepts the synchronized contract diff.
- Reason: The current instruction is the required consolidated response and explicitly directs progression after W0 evaluation, while the selected targets create no external state during W1/W2.
- Alternatives Considered: Keep W0 open for a second approval response; provision services immediately; treat target choices as evidence that resources or phones already exist.
- Reversal Condition: The user corrects any selected target or a later operational gate disproves a prerequisite; stop the affected later slice without changing the already-verified local W1/W2 scope.

## 2026-07-18 | D018 | W2 local acceptance and physical-gate stop

- Status: `done`
- Decision: Accept the corrected bounded W2 capture adapter and query-gated same-page loopback as useful local implementation, and assign W2 `partial`. Do not enter W3 because no approved actual iPhone pair has proved post-ROM changing OpenAL energy, human-audible receiver output, zero permission prompts, allowed tap counts, Settings inventory, or both D016 device orientations.
- Reason: Independent final evaluation found no Critical, High, Medium, or Low code issue after transactional rollback, async-generation safety, five-second watchdog, and stale-stats corrections, but the contract explicitly rejects desktop/headless track presence as physical closure evidence.
- Alternatives Considered: Claim W2 `done` from automated loopback; label the useful local result `blocked`; add temporary signaling or W3 session code to manufacture cross-device proof; proceed to W3 while Gate 1A is missing.
- Reversal Condition: Run the report's reproducible procedure on the approved physical matrix through a separately authorized secure, contract-compatible cross-device path. A later independent evaluator may set W2 `done` and open W3 only if every Gate 1A field passes.

## 2026-07-19 | D019 | Mixed-iPhone support matrix and diagnostic exception

- Status: `done`
- Decision: Replace D016's future device inventory with Phone A iPhone 16 Pro Max and Phone B iPhone 15 Pro, both on iOS 26.5.2, and support both models. Their build numbers were unconfirmed and the user allowed that omission only for the 2026-07-19 bounded practical compatibility diagnostic. Formal W2 Gate 1A and W11 must record exact Settings build/Safari mode, use an approved secure origin, cover Safari/Home Screen and both host/guest role orientations, and prove actual cross-device video plus audible game audio. The direct-LAN HTTP same-page diagnostic cannot satisfy those fields.
- Reason: These are the actual available models and the user explicitly requested support for both while permitting a narrow build-readback exception to obtain immediate compatibility evidence. Keeping the exception diagnostic-only preserves honest closure criteria.
- Alternatives Considered: Retain the unavailable two-iPhone-15-Pro matrix; treat unknown builds as formal Gate 1A evidence; infer Home Screen or cross-device behavior from separate same-page Safari runs; exclude the iPhone 16 Pro Max.
- Reversal Condition: If either model, OS, or recorded build cannot run the corrected capture path on the approved secure origin, keep W2 `partial` and revise the exact supported matrix only through a new user decision and evaluator review.

## 2026-07-19 | D020 | iPhone 15 Pro Max accepted as W2 Phone B proxy

- Status: `done`
- Decision: Keep D019's product support target as Phone A iPhone 16 Pro Max and Phone B iPhone 15 Pro, but accept the tested iPhone 15 Pro Max/iOS 26.5.2 as Phone B's practical proxy for the W2 media-path compatibility objective and future cross-device Gate 1A execution. No exact iPhone 15 Pro repetition is required unless a device-specific failure relevant to capture, WebKit playback, or audio activation appears. The XS Max remains non-target evidence only. This proxy decision does not turn separate same-page runs into cross-device proof.
- Reason: The user clarified that there is no material iPhone 15 Pro versus 15 Pro Max difference for this test's objective and directed the work to prioritize decision-relevant evidence. Repeating the same media-path check on the exact chassis would add no useful information while the real blocker is cross-device playback and receiver-only audio.
- Alternatives Considered: Require the exact iPhone 15 Pro despite equivalent test objectives; broaden the support target to every Pro Max behavior; promote separate same-page runs to cross-device evidence.
- Reversal Condition: A device-specific difference relevant to this W2 media path appears, or the user changes the support/evidence matrix; otherwise the proxy remains accepted for this objective.

## 2026-07-19 | D021 | Temporary one-way W2 LAN cross-device harness

- Status: `done`
- Decision: Authorize a W2-only temporary same-Wi-Fi LAN HTTP host/guest harness with ephemeral Mac in-memory signaling. The physical direction is Phone A host to D020's iPhone 15 Pro Max Phone B proxy guest only. The user explicitly waived a swapped-orientation repeat for this W2 objective because the devices have no material difference relevant to the test; revisit the swap only if a later device-specific issue appears. This authorization excludes Tailscale, public tunnels, Pages, TURN, DNS, secrets, dependency installation, W3 protocol/product routing, and external infrastructure. LAN HTTP is not secure-context or Home Screen evidence, so implementation or a positive run cannot by itself move W2 beyond `partial` or unblock W3.
- Reason: The remaining practical question is whether the already-validated capture path can deliver receiver-isolated video and game audio from Phone A to Phone B. A bounded local signaling shim answers that question without prematurely implementing the product session stack, while preserving honest secure-mode gaps.
- Alternatives Considered: Repeat same-page tests; require a W2 role swap despite no decision-relevant device difference; use Tailscale, a public tunnel, Pages, TURN, or W3 signaling; treat LAN HTTP as formal secure/Home Screen closure.
- Reversal Condition: A device-specific host/guest failure appears, the LAN harness would require excluded infrastructure or product-session scope, or the user later changes the W2 evidence boundary. D019's exact W11 product pair and direct/TURN matrix remain unchanged.

## 2026-07-19 | D022 | Natural game silence is not post-acquisition path failure

- Status: `done`
- Decision: Keep W2 initial readiness strict: live video/audio tracks, running receiver AudioContext, moving visible video, growing inbound audio packets, and changing nonzero receiver RMS must be observed together before `ready=yes`. After that acquisition, do not revoke solely because Bubble Bobble is currently silent. Growing audio RTP packets with flat `totalAudioEnergy` and zero receiver RMS is classified `게임 무음(전송 정상)` and remains ready. Revoke at the existing two-second boundary if audio RTP stops, or if inbound `totalAudioEnergy` grows while receiver RMS remains absent for a fresh continuous two seconds. A no-packet/no-energy interval breaks that mismatch continuity. Non-running receiver AudioContext and ended tracks remain immediate failures. Keep one guest CTA and at most one host fallback; add no automatic recovery.
- Reason: The user clarified that waiting screens are normally silent and play can also contain quiet intervals. The final D021 build required continuous receiver RMS and therefore produced a false negative without exposing the packet/energy/output split. W3C WebRTC statistics distinguish RTP packet receipt from received-track audio energy, allowing the W2 panel to separate normal game silence, RTP stoppage, and receiver-output silence without asking the tester to transcribe counters.
- Alternatives Considered: Continue requiring nonzero RMS every two seconds; treat every quiet interval as receiver failure; keep readiness latched forever after initial audio; automatically recreate or resume receiver audio; modify EmulatorJS input or OpenAL behavior without evidence.
- Reversal Condition: Physical D022 evidence shows that Safari omits or misreports the required statistics, the compact classification disagrees with user-observed output, or a later contract requires a different bounded silence policy. Until then W2 remains `partial`, W3 remains blocked, and secure-origin/Home Screen proof remains separately required.

## 2026-07-20 | D023 | Normalize inbound energy and receiver RMS before declaring output failure

- Status: `done`
- Decision: Preserve D022's strict initial acquisition, RTP/video freshness, and immediate track/AudioContext failures. After acquisition, compute inbound interval RMS as `sqrt(ΔtotalAudioEnergy / ΔtotalSamplesDuration)` and declare material inbound energy only when that RMS exceeds the receiver measurement's reliable threshold. Prefer `getFloatTimeDomainData()` for receiver output RMS; fall back to byte samples with a conservative `1/128` resolution boundary. Missing, non-finite, zero-duration, or reset statistics are unknown and reset receiver-output-mismatch continuity rather than proving failure. Only continuous material interval energy with absent receiver RMS may still revoke after two seconds.
- Reason: The fresh D022 physical run passed strict initial A/V acquisition but reported `수신 출력 무음` on a genuinely quiet waiting screen. The implementation treated every positive cumulative-energy delta as audible content while measuring receiver output with 8-bit samples, so tiny codec/decoder energy or quantization could create a false mismatch. W3C defines interval audio level from energy and sample-duration deltas, which supplies the missing scale.
- Alternatives Considered: Add an arbitrary raw energy epsilon; drop receiver-output failure detection; treat any unknown statistic as source silence; use wall-clock duration; add automatic audio recovery; change OpenAL, input, session protocol, or infrastructure.
- Reversal Condition: A post-D023 physical run still misclassifies observed silence/output, Safari lacks usable interval statistics for this diagnostic, or a later physical result shows the conservative byte fallback hides a decision-relevant output failure. D023 has local and automated browser proof only; W2 remains `partial`, W3 remains `blocked`, and secure-origin/Home Screen proof remains separate.
