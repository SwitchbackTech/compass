# Gap, operating model, and first workflow

Source: Grok Bot systems-engineering playbook (2026 working note) applied to
this Compass repo. This file is context for implementers. Execute WPs, do
not expand this document.

## Maturity

| Level | Playbook mode | Compass today |
| --- | --- | --- |
| 0 | Chat | Still the fallback when skills are skipped |
| 1 | Role | Implicit “the current session” |
| 2 | Skill | Nine `.agents/skills/*` SOPs; `/ship` is the strongest |
| 3 | Routine | Error autofix is a Routine without a written contract |
| 4 | Team | `/ship` and `/chaos` compose specialists by convention |
| 5 | Governed | Autofix merge-guard is the only independent mechanical verifier |

Target after this pack: **Level 5 on one workflow** (feature → evidenced
PR). Not a large team diagram.

## What already works

- Package map, recipes, feature-file-map, acceptance runbooks
- Focused test commands and `/verify-change`
- `/ship` delivery gates and a PR template that mirrors them
- Required CI: `lint`, `knip`, `type-check`, unit matrix, `e2e`
- Autofix: triage buckets, denied paths, deterministic
  [`.github/scripts/autofix-merge-guard.sh`](../../.github/scripts/autofix-merge-guard.sh)
- Cloud/bootstrap story in `AGENTS.md` and
  `.cursor/bootstrap-backend.sh`
- Approval instincts: no login without backend, no force-push, production
  never auto, chaos/QA do not enter credentials

## Gaps (invariants)

| Invariant | Today | Target |
| --- | --- | --- |
| `task_id` | Ad hoc issue/PR numbers | Issue or PR number on every handoff |
| `owner` | Implicit session | One named role |
| `status` | Narrative ship gates | `queued \| running \| waiting \| verifying \| done \| escalated` |
| `artifact` | Branch + PR | Branch, contract, PR URL, evidence pointers |
| `evidence` | PR template prose | Commands, logs, screenshots/video, verifier verdict |
| `next_deadline` | None | Check time on every `waiting` / retry |

Other gaps: `/handoff` writes to OS temp (15 lines); `bun run verify` can
pass while CI fails (`verify.ts` uses `HEAD` and `bunx tsc`, skips knip/e2e);
independent review is requested by `/ship` but no `/review` skill exists;
chaos is omitted from `AGENTS.md`; conventions (no barrels, RTL locators, no
web `--parallel`) are prose; `docs/CI-CD/workflows.md` omits autofix and
perf-budget.

## First workflow canvas

```text
NAME:     Feature to evidenced PR
SOURCE:   GitHub issue, user session, or in-progress branch
TRIGGER:  Human or Manager assigns the issue / starts the session
OWNER:    Tech Lead (Manager skill); specialists own artifacts
OUTPUT:   squash-ready PR + filled template + verifier verdict
PASS:     required CI would pass locally; template sections are
          executed evidence; independent review recorded; human
          pinged only for product / architecture / prod-deploy
APPROVAL: ask before squash-merge; human for production
TIMEOUT:  do not stay silent in running; escalate when retry budget
          (2 verifier retries) is exhausted
RETRY:    2 on retryable verifier failures; preserve prior artifact
```

Reject: “make agents better,” “reorganize all skills,” one-off strategy
docs with no finish state.

## Role cards

Create a specialist only when objective, tools, permissions, or evidence
method differ. Start with Manager + implementer + verifier. Add reviewer
and simplifier because `/ship` already requires them and they have distinct
evidence methods. Do not add more.

### Tech Lead (Manager)

- **Owns:** intake, contract freeze, routing, ledger, retry/escalate
- **Input:** task, priority, deadline, policy
- **Output:** ledger row + next-owner assignment + final PR summary
- **Pass:** one current owner; every `waiting` names a dependency and
  check time; completion points to evidence
- **Never:** implement the change, invent completion, hide failure, dump
  specialist transcripts on the human
- **Escalate:** product ambiguity, blocked access, failed verification
  after retry budget, architecture/public-behavior/cost changes

### Implementer

- **Owns:** code + focused tests in the owning package(s)
- **Tools:** repo, focused `bun run test:<pkg>`, browser for UI work
- **Output:** branch commits + test evidence
- **Never:** merge, rewrite the verifier, skip evidence, force-push

### Contract owner

- **Owns:** `packages/core` schemas / shared contracts *before* parallel
  web/backend work
- **Output:** versioned contract artifact the other packages consume
- **Never:** UI or route implementation in the same turn as an unfrozen
  contract

### Verifier

- **Owns:** acceptance against the artifact; binary
  `PASS | RETRY | ESCALATE`
- **Input:** request + artifact + named tests — not the producer’s
  self-assessment
- **Output:** verdict + enumerated failures + evidence pointers
- **Never:** repair the artifact silently

### Reviewer

- **Owns:** read-only diff review against `AGENTS.md` and `.cursor/rules`
- **Output:** confirmed findings with severity, path/line, impact, evidence
- **Never:** edit production code in the same turn

### Simplifier

- **Owns:** behavior-preserving cleanup as a separate commit
- **Existing skill:** `/simplify`
- **Never:** change behavior or push/merge

### On-call

- **Owns:** PostHog autofix + `/google-sync-debug`
- **Never:** unbounded prod changes, denied-path edits, silencing telemetry

### Bootstrap

- **Owns:** lightest env that can finish the job
- **Existing skill:** `/local-dev-bootstrap`
- **Never:** invent or print secrets

## Deterministic routing

```text
if risk in {prod-deploy, secrets, oauth-grant, delete, access-grant}:
  return HUMAN
if missing compass.yaml and task needs backend/auth/sync:
  return BOOTSTRAP (or escalate)
if source is posthog[bot] issue:
  return ONCALL
if change is packages/core contracts:
  return CONTRACT then parallel IMPLEMENTER(web) / IMPLEMENTER(backend|sync)
if change is packages/web only:
  return IMPLEMENTER then VERIFIER
if change is packages/sync recurrence/provider:
  return IMPLEMENTER(sync) — do not put recurrence in backend
else:
  classify; if confidence < 0.85: return HUMAN
```

Concurrency budget: at most 3–4 specialists per task. Fan-out only after a
frozen contract. Fan-in through one verifier. Never two Bots with the same
open-ended objective.

## Evidence ladder (delivery loop)

| Level | Evidence | Use |
| --- | --- | --- |
| 0 | Agent says it is done | Never sufficient |
| 1 | Structured summary | Triage only |
| 2 | Commands + logs | Required for every WP and PR |
| 3 | Screenshot or diff | User-visible UI |
| 4 | Executed test or video | Behavior proof |
| 5 | Independent verifier PASS | Autonomy / merge gate |

## Architecture decision rule

Choose the smallest architecture that externalizes the real bottleneck:

- Execution problem → one Bot + Skill (WP-01 is this)
- Repeatability → version the Skill (WP-05)
- Continuity → Routine (WP-06, existing autofix)
- Durable expertise/permissions → specialist (WP-03)
- Routing → Manager (WP-03)
- Trust → verifier + approval (WP-03, WP-04)
- Parallel workers → only after inputs and convergence are stable (WP-08 gated)

## Metric definitions

Record on the delivery loop, not Bot count. Baseline three manual `/ship`
runs after WP-03 lands (table in `TRACKING.md`).

| Metric | Definition | Direction |
| --- | --- | --- |
| Completion | Verified PRs / started agent tasks | Up |
| Rework | Runs a human had to correct | Down |
| Interruptions | Human pings per completed PR | Down |
| Recovery | Minutes from failure to safe state | Down |
| Cost | Tool + model cost per verified result | Down |
