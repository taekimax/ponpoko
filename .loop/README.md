# Loop Workspace

## Purpose

`.loop/` is the project-local source of truth for Codex work. Chat history is not authoritative unless reflected in `.loop/`.

## Roles

- Planner: Codex subagent using xhigh thinking effort. Writes or updates spec, contract, and plan.
- Generator: medium thinking effort. Implements the plan but does not self-grade final completion.
- Evaluator: Codex subagent using xhigh thinking effort. Reviews against the contract and writes reports.

## Operating Rule

If chat context conflicts with `.loop/`, `.loop/` wins.
