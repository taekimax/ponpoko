---
<!-- BEGIN MODEL LOOP POLICY -->
## Loop-Based Development

For non-trivial work in this repo, read `.loop/` before coding.

Start with:
- `.loop/01_spec.md`
- `.loop/02_contract.md`
- `.loop/03_plan.md`
- `.loop/04_progress.md`
- `.loop/05_decisions.md`
- `.loop/06_log.md`

Project files are authoritative. Chat context is not authoritative unless reflected in `.loop/`.

Roles:
- Planner: Codex subagent, xhigh thinking effort.
- Generator: medium thinking effort.
- Evaluator: Codex subagent, xhigh thinking effort.

For implementation work:
- follow `.loop/02_contract.md`
- search existing code before adding types, config values, schemas, API clients, or utilities
- keep changes scoped
- update `.loop/04_progress.md` and `.loop/06_log.md`
- do not self-grade final completion; evaluate against the contract

Human review is required before destructive file operations, dependency or framework changes, schema/database/auth/security changes, broad architecture rewrites, irreversible migrations, or changes outside the requested scope.
<!-- END MODEL LOOP POLICY -->
---
