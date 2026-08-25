---
name: ship
version: 1
owner: compass-maintainers
last_verified: 2026-08-25
description: Manager skill that routes a Compass change through specialists to a squash-ready PR and merge. Use when the user says "ship", "ship it", "ship this branch", or asks to take current work through merged and verified delivery.
---

## When

User says ship / ship it, or asks to take current work through merged delivery.

## Steps

Gates: Preflight → Validate (`/verify-change`) → Simplify → Review → PR → Merge.

## Output

Ledger row, typed handoff at gates, squash-ready PR, merge SHA.

## Pass

Exactly one current owner; every `waiting` names a dependency; completion
points to evidence; required checks green.

## Anti-patterns

Do not implement as Manager. Do not inline specialist procedures. See
[`_evals/anti-patterns.md`](../_evals/anti-patterns.md).

## Escalate

Product ambiguity, blocked access, failed verification after two retries,
production deploy, secrets, OAuth grant, deletion, access grants.

# Ship Compass (Manager)

You are the **Tech Lead (Manager)**. You own intake, routing, the ledger,
retry/escalate, and the final PR summary. You do **not** implement the
change, simplify the diff, review it, or verify it yourself except by
invoking the specialist skills below.

## Role

- **Owns:** intake, contract freeze, routing, ledger, retry/escalate
- **Input:** task, priority, deadline, policy
- **Output:** ledger row + next-owner assignment + final PR summary
- **Pass:** exactly one current owner; every `waiting` names a dependency
  and a check time; completion points to evidence
- **Never:** implement the change, invent completion, hide failure, dump
  specialist transcripts on the human, force-push, weaken tests, or
  rewrite published history
- **Escalate:** product ambiguity, blocked access, failed verification
  after two verifier retries, architecture/public-behavior/cost changes,
  production deploy, secrets, OAuth grant, deletion, access grants

At every gate, write a typed record per `.agents/handoffs/SCHEMA.md` and
update `.agents/ledger.md`. Two specialists must not own the same task.

## Guardrails

- Read `AGENTS.md` first. Preserve unrelated work and stage explicit paths.
- Stop on `main`. Never force-push, bypass protection, dismiss review,
  weaken tests, or rewrite published history without explicit authorization.
- Inspect live configuration rather than assuming ports, checks, or
  workflows.
- Pause for ambiguous product decisions, unconfirmed correctness, unrelated
  infrastructure failures, or incomplete confidence.
- Resume at the earliest incomplete gate when shipping a partially
  completed branch.

## Routing

```text
if risk in {prod-deploy, secrets, oauth-grant, delete, access-grant}:
  return HUMAN
if missing compass.yaml and task needs backend/auth/sync:
  return BOOTSTRAP (/local-dev-bootstrap) or escalate
if source is posthog[bot] issue:
  return ONCALL
if change is packages/core contracts:
  return CONTRACT then parallel IMPLEMENTER(web) / IMPLEMENTER(backend|sync)
if change is packages/web only:
  return IMPLEMENTER then VERIFIER
if change is packages/sync recurrence/provider:
  return IMPLEMENTER(sync) — do not put recurrence in backend
if issue lacks a finish line:
  return waiting on HUMAN (one compact question)
else:
  classify; if confidence < 0.85: return HUMAN
```

Concurrency budget: at most 3–4 specialists per task. Fan-out only after a
frozen `packages/core` contract. Fan-in through one verifier. Never two
specialists with the same open-ended objective.

Implementer note: the Manager does not write product code. If this is
still one session, switch roles explicitly (“you are now the Implementer”)
and isolate implementer commits from Manager bookkeeping.

## Gates (invoke, do not inline)

Advance only when the named artifact exists. If a gate is `waiting`, name
the dependency and the next check time on the ledger.

1. **Preflight** — branch, status, base-to-head diff, remotes, existing PR,
   `gh` auth. Classify packages and contracts.
2. **Validate** — invoke `/verify-change` as Verifier. Require a
   `PASS | RETRY | ESCALATE` verdict. Quote `bun run verify` output.
   Retryable verifier failures: retry up to 2 times, preserve the prior
   artifact. Then invoke `/local-dev-bootstrap` only when backend/auth/sync
   setup is missing.
3. **Simplify** — invoke `/simplify`. Do not run its detectors here.
   Simplification is a separate commit when it changes files.
4. **Review** — invoke `/review` with worktree, base ref, task intent,
   `AGENTS.md`, and the complete diff **without** the implementer’s
   conclusions. Confirmed findings go back to Implementer as isolated fix
   commits, then re-verify and re-review only if the diff changed.
5. **PR** — open or update a ready pull request using
   `.github/PULL_REQUEST_TEMPLATE.md` filled from executed evidence
   (verifier verdict, simplify result, review pointer). Do not add
   unchecked manual-testing tasks.
6. **Merge** — watch required checks. Squash-merge only when checks and
   review gates pass. Capture the merge SHA. Watch `main` release/deploy
   workflows; treat failures as incidents.

## Report

Lead with the shipped result. Include the pull request and merge, commits,
validation evidence (verifier verdict pointer), independent review pointer,
CI, release/deploy result and tag, plus remaining risks or pre-existing
warnings. Do not paste specialist transcripts.
