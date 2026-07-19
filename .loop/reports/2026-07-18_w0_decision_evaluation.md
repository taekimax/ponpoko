# W0 Decision Evaluation

- Evaluated: 2026-07-18 12:41 KST
- Role: Planner
- Scope: signaling endpoint, TURN provider/cost/DNS-secret ownership, QR dependency policy, and two-iPhone target matrix
- Mutation boundary: documentation only; no dependency installation, account enrollment, infrastructure, DNS, secret, paid-resource, `main`, or Pages change

## Proposed closure

| Item | Selected contract target | Deferred evidence or operation |
|---|---|---|
| Signaling | Cloudflare Workers Free, Worker `ponpoko-2p`, SQLite Durable Object per room, WebSocket Hibernation, `https://ponpoko-2p.taekimax.workers.dev` and `wss://ponpoko-2p.taekimax.workers.dev/v1/session` | Account/subdomain availability and actual deployment are W4 gates. |
| TURN | Cloudflare Realtime TURN, 300-second credentials, UDP/TCP/TLS 443, USD 0 monthly ceiling, 800 GB issuance cutoff | Account enablement, secret creation, live forced-relay proof, and current allowance recheck are W4/W11 gates. |
| Ownership | No custom TURN DNS; the user/operator owns the Cloudflare account and Worker secret bindings | No raw secret value is requested or stored during W0. |
| QR | Exact-pin `uqr@0.1.3` at W7, app-owned rendering, no scanner | Install, lockfile, attribution, decoding, and camera smoke wait for W7. |
| Devices | Two iPhone 15 Pro units, iOS 26.5.2 build 23F84/system Safari 26.5; Phone A Home Screen host and Phone B Safari guest, then swap | Physical availability, Settings readback, W2 audio evidence, W11 trials, and soaks remain unproved. |

## Current primary-source facts

- Cloudflare documents the `<worker>.<account-subdomain>.workers.dev` hostname format and positions `workers.dev` for personal/hobby projects: <https://developers.cloudflare.com/workers/configuration/routing/workers-dev/>.
- SQLite-backed Durable Objects are available on Workers Free, and WebSocket Hibernation avoids billing idle connected time: <https://developers.cloudflare.com/durable-objects/platform/pricing/> and <https://developers.cloudflare.com/durable-objects/best-practices/websockets/>.
- Cloudflare Realtime TURN returns UDP, TCP, and TURNS 443 URLs and supports server-generated expiring credentials and revocation: <https://developers.cloudflare.com/realtime/turn/generate-credentials/>.
- Cloudflare currently lists Realtime TURN at USD 0.05/GB after a shared 1,000 GB monthly free tier: <https://developers.cloudflare.com/realtime/sfu/pricing/>.
- Cloudflare budget alerts do not enforce a hard spend cap, so the contract adds a lower fail-closed issuance cutoff and authorizes no paid overage: <https://developers.cloudflare.com/billing/manage/budget-alerts/>.
- Apple identifies iOS 26.5.2 build 23F84 as the current stable release and Safari 26.5 as the corresponding stable Safari release line: <https://support.apple.com/127594> and <https://developer.apple.com/documentation/safari-release-notes/safari-26_5-release-notes>.
- npm reports `uqr@0.1.3` as MIT, ESM, built-in-types, and zero-dependency: <https://www.npmjs.com/package/uqr>.

## Boundary determination

- D013-D016 are target selections, not claims of deployment, account ownership verification, connected phones, or passing physical evidence.
- W1 changes only the local player-aware input boundary and does not consume signaling, TURN, QR, or device resources.
- W2 may implement the local capture harness only after W1 closes. Without the actual-iPhone OpenAL non-silent/audible result, W2 must end `partial` or `blocked` and W3 must not start.
- W4 remains independently gated on live provider/account/secret review. W7 remains independently gated on the approved dependency installation review. W11 remains gated on the exact physical inventory and complete device evidence.

## Planner determination

D013-D016 fully specify the four remaining W0 policy choices while preserving every later operational and evidence gate. W0 may move to `done` only if an independent Evaluator accepts the synchronized `.loop/` contract and the interpretation in D017.

## Independent evaluator result

- Evaluated: 2026-07-18 12:50 KST
- Result: `PASS`
- Findings: no Critical, High, or Medium blocker. Low documentation hygiene findings were corrected during closeout.
- Determination: the current user instruction supplies sufficient authority for D013-D016 as bounded contract targets; missing Cloudflare resources and physical phones remain W4/W2/W11 operational or evidence gates and do not block local W1.
- Safety qualification: the USD 0 TURN policy is target-only. W4 must prove endpoint control, current pricing, and a reliable account-period cutoff with safety margin or remain blocked.
