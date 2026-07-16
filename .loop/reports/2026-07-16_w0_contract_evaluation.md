# W0 Contract Evaluation

- Evaluated: 2026-07-16 17:57 KST
- Role: Evaluator
- Scope: `AGENTS.md`, the 608-line planning document, and `.loop/00_request.md` through `.loop/06_log.md`
- Evaluation status: `needs-clarification`
- Mutation boundary: documentation review only; no implementation code, dependency, test fixture, branch, external infrastructure, DNS, or secret change

## Findings

### Critical

No Critical finding. The approval-before-code gate currently prevents the planning defects below from reaching runtime code.

### High

#### [High] A1 W5 and W9 duplicate automatic-start ownership and leave the first real 2P integration before the save/start guards

- Evidence: `.loop/03_plan.md:41` assigns readiness and host-only automatic start to W5, while `.loop/03_plan.md:45` assigns startup/autosave suppression and starting a new game after readiness to W9. The completion table likewise permits W5 two-browser host integration at `.loop/02_contract.md:67`, but does not require pre-ready Coin/Start zero, lifecycle-save zero, or the 1P checksum until W9 at `.loop/02_contract.md:71`. Those conditions are mandatory invariants at `.loop/02_contract.md:107-114`, and the slice workflow says each earlier work item becomes `done` before advancing at `.loop/03_plan.md:69-75`.
- Impact: A Generator following the work rows literally can bind and execute the actual 2P host path during W5-W8 before `startStartupAssist()`/`startAutosave()` suppression and save guards exist. That can produce a pre-ready start, touch the existing 1P autosave, or create two owners for the same Coin/Start behavior.
- Why: The global invariant is correct, but it is not an executable entry/completion gate for the first slice that owns and exercises the 2P runtime path.
- Minimal recommended fix: Give one slice sole ownership. Recommended: keep W5-W8 runtime-unbound or test-double-bound for Coin/Start, describe W5 as the host-only readiness/start-command contract, and make W9 the atomic first binding to the real game runtime together with `twoPlayerSessionMode`, startup/autosave suppression, lifecycle-save guards, and the zero-call/checksum gates. Alternatively, move the minimum guards into W5 before any real 2P integration and leave W9 as exhaustive verification; do not implement automatic start twice.
- Owner/Handoff: Planner/root agent | `needs-handoff`
- Handoff Payload: `A1,planner/root,.loop/02_contract.md;.loop/03_plan.md;.loop/04_progress.md,remove duplicate ownership and close the pre-W9 safety gap,choose one runtime-binding owner and add an explicit no-real-2P-before-guards gate`

### Medium

#### [Medium] A2 The actual `2p-bubble` checkout has no upstream and is recorded but not included in the W0 decision gate

- Evidence: Live readback returned branch `2p-bubble`, HEAD `f6e15224fa8d3628637a07b24772e67f1281f52c`, and `fatal: no upstream configured for branch '2p-bubble'`. The request stated `main...origin/main`. The discrepancy is recorded in `.loop/00_request.md:62-67`, `.loop/03_plan.md:91`, and `.loop/04_progress.md:9-15`, but the next approval action at `.loop/03_plan.md:7-11` and pending decisions at `.loop/05_decisions.md:53-59` ask only the four infrastructure/dependency/device groups.
- Impact: After those four answers, W0 could be marked `done` and implementation could start on a branch the user did not identify, with no defined upstream or delivery destination.
- Why: Recording a checkout discrepancy is not the same as resolving which branch is authorized for implementation.
- Minimal recommended fix: Include one checkout confirmation in the same consolidated approval request: continue on local `2p-bubble`, or return to/update `main` by an explicitly approved non-destructive procedure. Record the answer before W0 becomes `done`; do not switch branches implicitly.
- Owner/Handoff: Root agent | `needs-handoff`
- Handoff Payload: `A2,root,user-approval-request;.loop/05_decisions.md,resolve requested versus actual checkout before code,ask branch disposition in the consolidated request and record it`

#### [Medium] A3 W12 has contradictory entry semantics after an incomplete W11

- Evidence: `.loop/02_contract.md:74` allows W12 after W11 is merely "evaluated", and `.loop/04_progress.md:33` repeats that wording. In contrast, `.loop/03_plan.md:69-75` requires the previous slice to be `done` and says a `partial` or `blocked` result terminates the effort. W11 itself requires all actual-device Go thresholds at `.loop/02_contract.md:73`.
- Impact: One reading permits Pages release work after missing/failed actual iPhone or TURN evidence, while another requires the pipeline to stop. This weakens the status contract and can make release scope depend on the reader.
- Why: "Evaluated" is not one of the allowed statuses and does not say whether `partial`/`blocked` permits W12.
- Minimal recommended fix: Change the full W12 entry gate to W11 `done`. If limited W12 preparation is intentionally needed to obtain W11 evidence, define that as a narrowly named pre-release/staging action with explicit `partial` status, not as W12 completion or production release.
- Owner/Handoff: Planner/root agent | `needs-handoff`
- Handoff Payload: `A3,planner/root,.loop/02_contract.md;.loop/04_progress.md,make W11 to W12 status transition deterministic,require W11 done or define a separately bounded staging exception`

### Low

#### [Low] A4 The requested open-source-reference discipline is present only in the source plan, not in a slice output or verification record

- Evidence: The planning document limits upstream use and requires license/attribution review before direct code transfer at `docs/plans/2026-07-16_bubble-bobble-webrtc-streaming-poc.md:201-209`, and lists EmulatorJS/coturn references at `docs/plans/2026-07-16_bubble-bobble-webrtc-streaming-poc.md:597-608`. The W0-W12 outputs in `.loop/03_plan.md:32-48` have no corresponding reference/attribution evidence item.
- Impact: A later implementation can satisfy tests while silently ignoring the user's request to use relevant open-source precedents, or can copy code without making the required license decision visible.
- Why: The contract objective incorporates the plan generally, but the slice reporting contract has no concrete evidence field for this instruction.
- Minimal recommended fix: Add a small read-only evidence note to the relevant W2-W4 slice reports naming the upstream design consulted and whether code was copied. If code is copied, record license and attribution handling before merge. This does not authorize a dependency or architecture change.
- Owner/Handoff: Planner/root agent | `needs-handoff`
- Handoff Payload: `A4,planner/root,.loop/03_plan.md;.loop/04_progress.md,make open-source reference use and attribution auditable,add a scoped reference evidence field to relevant slice reports`

## P1-P14 Traceability Audit

The specification, contract, and plan each contain every identifier P1-P14 and W0-W12. Requirement mappings below are taken from `.loop/03_plan.md:13-30` and agree with the focused ownership in `.loop/01_spec.md:20-57` and `.loop/02_contract.md:37-74`, subject to A1.

| Requirement | Planned coverage | Result |
|---|---|---|
| P1 | W0, W6, W11 | covered |
| P2 | W0, W2, W3, W6, W7, W11, W12 | covered |
| P3 | W0, W4, W7, W11 | covered |
| P4 | W0, W2, W6, W7, W11 | covered |
| P5 | W0, W2, W5, W6, W11 | covered |
| P6 | W0, W1, W5, W6, W11 | covered |
| P7 | W0, W3, W5, W9, W11 | covered; ownership conflict A1 |
| P8 | W0, W3, W4, W5, W11 | covered |
| P9 | W0, W3, W4, W5, W8, W11 | covered |
| P10 | W0, W1, W3, W5, W8, W11 | covered |
| P11 | W0, W9, W11 | covered; first-runtime gate conflict A1 |
| P12 | W0, W3, W4, W5, W7, W8, W11 | covered |
| P13 | W0, W10, W11, W12 | covered |
| P14 | W0, W9, W11, W12 | covered; first-runtime gate conflict A1 |

## W0-W12 Work Audit

Every work identifier is present in the specification (`.loop/01_spec.md:41-57`), contract (`.loop/02_contract.md:58-74`), plan (`.loop/03_plan.md:32-48`), and ledger (`.loop/04_progress.md:17-33`).

| Work | Current status | Contract review |
|---|---|---|
| W0 | `needs-clarification` | correct; approvals unresolved |
| W1 | `blocked` | correct; W0 must be `done` |
| W2 | `blocked` | correct now; after W0/W1, local harness is allowed but physical closure is not |
| W3 | `blocked` | correct; actual-iPhone Gate 1A is mandatory |
| W4 | `blocked` | correct; W3 and approved infrastructure required |
| W5 | `blocked` | present; correct A1 before execution |
| W6 | `blocked` | present |
| W7 | `blocked` | present; QR policy gate recorded |
| W8 | `blocked` | present |
| W9 | `blocked` | present; correct A1 before execution |
| W10 | `blocked` | present |
| W11 | `blocked` | correct; actual devices and live TURN required |
| W12 | `blocked` | present; entry wording conflict A3 |

## Gate and Safety Checklist

| Check | Evidence | Result |
|---|---|---|
| One consolidated approval before code/dependency/infra | `.loop/00_request.md:26-42`, `.loop/02_contract.md:7-18`, `.loop/03_plan.md:7-11` | pass; W0 remains `needs-clarification` |
| W1 then W2 local harness/adapter | `.loop/02_contract.md:63-64`, `.loop/03_plan.md:52-54` | pass |
| Actual iPhone Gate 1A before W3 | `.loop/02_contract.md:64-65,76-82,169-170`, `.loop/03_plan.md:54-56` | pass |
| No device proof means W2 `partial`/`blocked`, W3 not entered | `.loop/00_request.md:30-33`, `.loop/01_spec.md:118-124`, `.loop/02_contract.md:82` | pass |
| `(player,input)`, remote `player=1`, guest allowlist | `.loop/02_contract.md:84-94` | pass |
| Server epoch, sequence high-water mark, 1.5-second lease | `.loop/02_contract.md:95-104` | pass |
| Host-only Coin/Start, guest-ready zero, one idempotent start | `.loop/02_contract.md:93,105-111` | invariant passes; slice ownership A1 |
| No 2P startup assist/autosave and lifecycle saves zero | `.loop/02_contract.md:107-114` | invariant passes; first-runtime gating A1 |
| 1P checksum, service worker, feature-flag-off behavior | `.loop/01_spec.md:36-39,107-116`, `.loop/02_contract.md:53-56,143-152` | pass |
| Local typecheck/test/build/Bubble smoke | `.loop/02_contract.md:132-141` | pass |
| Flag-off browser and unfiltered games smoke | `.loop/02_contract.md:143-152` | pass |
| Direct 10, forced TURN 10, both 20-minute soaks | `.loop/02_contract.md:154-163`, `.loop/03_plan.md:64-65` | pass |
| Forced disconnect/reconnect/reload evidence | `.loop/02_contract.md:160`, `docs/plans/2026-07-16_bubble-bobble-webrtc-streaming-poc.md:448-455` | pass |
| Actual branch discrepancy | `.loop/00_request.md:62-67`, live Git readback | recorded but unresolved; A2 |

## Status and Consistency Audit

- All literal work/status values use the allowed enum: `in_progress`, `done`, `partial`, `blocked`, `declined`, `needs-clarification` (`.loop/02_contract.md:165-175`).
- Overall implementation-entry and W0 are consistently `needs-clarification`; downstream work is consistently `blocked` by explicit entry gates.
- Planning `done` and implementation-entry `needs-clarification` describe different states and are not a contradiction.
- W12's non-status term "evaluated" is the sole transition ambiguity found; see A3.

## Verification Performed

- Read `AGENTS.md`, all 608 lines of the planning document, and `.loop/00_request.md` through `.loop/06_log.md` with line numbers.
- Extracted and sorted identifiers from `.loop/01_spec.md`, `.loop/02_contract.md`, and `.loop/03_plan.md`; each produced P1-P14 and W0-W12 with no missing ID.
- Re-read live Git state: branch `2p-bubble`, HEAD `f6e15224fa8d3628637a07b24772e67f1281f52c`, no upstream, and no tracked modification. A concurrent untracked `docs/reviews/2026-07-16_bubble_bobble_webrtc_streaming_poc_review.md` appeared after the initial baseline; this Evaluator neither reviewed nor modified it.
- Did not run application tests/builds because this is a W0 document-contract evaluation and implementation code was intentionally untouched.

## Closure Scenarios

| Scenario | Evaluation |
|---|---|
| no-findings | not applicable; A1-A4 remain open |
| env-blocked | physical iPhone/TURN absence does not block the approval request, but it must block W2 closure/W3 entry and later W11 `done` |
| partial-delivery | if local W2 becomes complete while device execution remains unavailable, close W2 as `partial` or `blocked`, record the future procedure, and stop before W3 |

## Final Determination

- Approval request: **may proceed now**, because sending one consolidated non-mutating request does not violate the code gate. It must include the four W0 approval groups and the A2 branch disposition in the same response request.
- W0: **`needs-clarification`**, not `done`.
- Code-entry authorization: **not granted**. Record the user's decisions, correct A1 and A3 in the planner-owned loop documents, have the Evaluator re-check the resulting contract diff, and only then mark W0 `done` and begin W1.
- No actual-iPhone or TURN success is claimed.

## Evaluator Checkpoint

`CP1 | W0 | loop_evaluator | done | 6m | delta(A1-A4/traceability-and-gates-reviewed) | next_action=handoff-to-root-for-approval-request-and-document-corrections`

## Re-evaluation — 2026-07-16 18:07 KST

### Scope and live readback

- Re-read `.loop/00_request.md` through `.loop/06_log.md` in full after the Planner's A1-A4 corrections.
- Read `docs/reviews/2026-07-16_bubble_bobble_webrtc_streaming_poc_review.md` in full for cross-document consistency.
- Reverified live Git state without mutation: current branch `2p-bubble`; no upstream; `HEAD`, `2p-bubble`, local `main`, and `origin/main` all resolve to `f6e15224fa8d3628637a07b24772e67f1281f52c`; no tracked-file modification.
- Re-extracted identifiers from spec, contract, and plan. Each still contains P1-P14 and W0-W12 with no missing identifier.

### A1-A4 disposition

| Finding | State | Evidence and determination |
|---|---|---|
| A1 — W5/W9 automatic-start ownership and safety order | **closed** | W5-W8 are now explicitly real-runtime-unbound and W5 integration is Coin/Start-test-double-only (`.loop/00_request.md:49-51`, `.loop/01_spec.md:50,114-116`, `.loop/02_contract.md:68,108-117`, `.loop/03_plan.md:41,58`). W9 is the sole real-runtime binding owner and must set mode/install every guard before binding and one readiness-gated start (`.loop/01_spec.md:54,115-116`, `.loop/02_contract.md:72,110-117`, `.loop/03_plan.md:45,62`). Restart conditions explicitly reject either ordering violation at `.loop/02_contract.md:208-215`. No duplicate real-runtime owner remains. |
| A2 — unresolved `2p-bubble` branch disposition absent from W0 gate | **open, Medium residual documentation inconsistency** | The authoritative loop contract now correctly makes branch disposition the fifth consolidated approval and forbids implicit branch operations (`.loop/00_request.md:14,30,43`, `.loop/02_contract.md:11-19,63`, `.loop/03_plan.md:11,36,52,80`, `.loop/05_decisions.md:55-60,78-84`). Live commit/upstream claims are accurate. However, the operational review's approval table has no branch row (`docs/reviews/2026-07-16_bubble_bobble_webrtc_streaming_poc_review.md:23-32`), and its Current Closure authorizes progress after only the original four groups (`docs/reviews/2026-07-16_bubble_bobble_webrtc_streaming_poc_review.md:73-75`). A request copied from that artifact can still omit the fifth decision. |
| A3 — W12 entry after merely evaluated/incomplete W11 | **closed** | Contract, plan, ledger, and decisions now require W11 `done` for full W12 entry (`.loop/01_spec.md:134-137`, `.loop/02_contract.md:74-75,135-139,215`, `.loop/03_plan.md:47-48,64-65,83-84,95-99`, `.loop/04_progress.md:34-35`, `.loop/05_decisions.md:86-92`). Any evidence-enabling staging is narrowly owned/logged under W11 and excludes production release, final public service-worker rollout, W12 entry, or W12 success. |
| A4 — OSS precedent/license evidence not operationalized | **closed** | W2-W4 reports must record consulted URL/source and revision/version, copied-code `yes`/`no`, and license/attribution disposition (`.loop/00_request.md:64`, `.loop/01_spec.md:128-132`, `.loop/02_contract.md:184-186,193,223`, `.loop/03_plan.md:69-75`, `.loop/05_decisions.md:94-100`). The same clauses explicitly state that consultation/evidence does not authorize a dependency or copied code. |

### Remaining findings

#### [Medium] A2-R Review artifact omits the fifth W0 branch approval

- Evidence: `docs/reviews/2026-07-16_bubble_bobble_webrtc_streaming_poc_review.md:23-32,73-75` versus `.loop/00_request.md:35-43` and `.loop/02_contract.md:11-19`.
- Impact: The review artifact is the human-facing approval recommendation, so its four-item closure can produce an incomplete consolidated user answer even though `.loop/` is correct.
- Minimal fix: Add branch disposition/upstream target to the recommendation table and Current Closure. Preserve `needs-clarification` and the no-implicit-switch rule.
- Owner/Handoff: Planner/root agent | `needs-handoff`
- Handoff Payload: `A2-R,planner/root,docs/reviews/2026-07-16_bubble_bobble_webrtc_streaming_poc_review.md,synchronize the human-facing approval artifact with the five-item authoritative gate,add branch approval row and closure condition`

#### [Low] A5 Review artifact still says the Evaluator result is pending

- Evidence: The initial independent report exists in this file, but `docs/reviews/2026-07-16_bubble_bobble_webrtc_streaming_poc_review.md:62-67` still says `Evaluator result: pending`.
- Impact: W0 status remains correctly `needs-clarification`, but audit progress is stale and can obscure which findings were evaluated.
- Minimal fix: Record this re-evaluation outcome and link/path in the review artifact; do not mark W0 `done`.
- Owner/Handoff: Planner/root agent | `needs-handoff`
- Handoff Payload: `A5,planner/root,docs/reviews/2026-07-16_bubble_bobble_webrtc_streaming_poc_review.md,remove stale evaluator-pending progress,record re-evaluation while retaining W0 needs-clarification`

### Consistency and verification result

- No remaining High finding was found.
- P1-P14 and W0-W12 traceability remains complete.
- The authoritative `.loop/` documents are internally consistent on approval-before-code, W1 -> W2 local harness -> actual-iPhone Gate 1A -> W3, W2 `partial`/`blocked` stop behavior, player/input ownership, guest allowlist, epoch/sequence/lease, W9 guarded real binding, lifecycle-save zero, 1P checksum/service-worker/flag-off regression, local commands, and direct/TURN/soak criteria.
- All work/status literals remain within `in_progress`, `done`, `partial`, `blocked`, `declined`, and `needs-clarification`.
- Command/path/version references are consistent across the loop and review artifact. Markdown fence counts are balanced and no trailing whitespace was found in the reviewed documents.
- No application build or test was run because this re-evaluation is documentation-only and no implementation code changed.

### Re-evaluation determination

- Approval request: **may proceed**, but it must use the authoritative five-item gate and include explicit disposition/eventual upstream or merge target for no-upstream `2p-bubble`. Correcting A2-R first is recommended so the human-facing recommendation cannot drop that item.
- W0: remains **`needs-clarification`** until the user answers all five approval groups and they are recorded in `.loop/05_decisions.md`.
- Code entry: **not yet authorized**. It begins only after all five user approvals are recorded, the branch instruction is followed without an implicit operation, the contract diff is rechecked, and W0 is assigned `done`. W1 is the first implementation slice.
- Actual-device/TURN status: no success claimed; the W2 and W11 physical gates remain pending.

`CP2 | W0 | loop_evaluator | partial | 12m | delta(A1-closed,A2-open-medium,A3-closed,A4-closed,A5-low) | next_action=synchronize-review-artifact-then-send-five-item-approval-request`

### Final addendum — 2026-07-16 18:10 KST

- A2-R: **closed**. The review artifact now records that `2p-bubble` has no upstream, adds Branch as the fifth approval row with eventual upstream/merge-target confirmation, and includes that decision in Current Closure (`docs/reviews/2026-07-16_bubble_bobble_webrtc_streaming_poc_review.md:9-10,23-33,75-77`).
- A5: **closed**. The Verification section now records the initial findings, Planner corrections, and Evaluator re-evaluation instead of `pending` (`docs/reviews/2026-07-16_bubble_bobble_webrtc_streaming_poc_review.md:63-69`).
- Remaining findings: **none** at High, Medium, or Low for the W0 document set reviewed.
- Final status: the five-part consolidated approval request may proceed. W0 remains `needs-clarification`, and code/branch entry remains unauthorized until all five user decisions are recorded, the contract diff is confirmed, and W0 is assigned `done`.

`CP3 | W0 | loop_evaluator | done | 15m | delta(A2-R-closed,A5-closed,no-remaining-findings) | next_action=send-five-part-consolidated-approval-request`

## Post-Evaluation Branch Addendum

After this evaluation closed, the user explicitly authorized a documentation-only handoff commit and push to `origin/2p-bubble` while keeping `main` and GitHub Pages untouched. D011 supersedes this report's branch-only prohibition; it does not change the evaluator findings, make W0 `done`, or authorize implementation, dependency, infrastructure, DNS, secret, paid-resource, merge, or deployment work. The four non-branch W0 approvals remain open.
