# Compass Agent Operating System — work pack

Temporary project pack. Future sessions execute the work packages (WPs) in
order, then **delete this entire directory** from the repo when the last WP
is `done` and the delivery loop has five evidenced passes.

Do not re-litigate the playbook. Do not add extra Bots, skills, or
automations until the WP you are on names them. The unit of design is the
**feature → evidenced PR** workflow, not a roster.

## How to pick up

1. Read this file and [`TRACKING.md`](TRACKING.md). Do not start from chat
   memory.
2. Take the first WP whose status is `queued` and whose dependencies are
   `done`.
3. Set that row in `TRACKING.md` to `running`, with yourself as `owner`.
4. Open the WP file. The finish line, steps, acceptance tests, and a
   paste-ready session prompt are there.
5. Implement only that WP. Commit with a conventional message scoped to the
   change (`fix(scripts): …`, `docs(agents): …`, etc.).
6. Fill evidence on the WP and the tracking row. Set status to `verifying`,
   then `done` or `escalated`.
7. If you cannot finish, write a typed handoff (schema in WP-02; until WP-02
   lands, update `TRACKING.md` plus the WP's **Handoff** section) and stop.
   Do not silently mark `done`.

Read [`00-gap-and-model.md`](00-gap-and-model.md) once if you need the why.
Skip it if the WP is already unambiguous.

## Order

| WP | File | Depends on | Why this order |
| --- | --- | --- | --- |
| 01 | [WP-01-verify-ci-parity.md](WP-01-verify-ci-parity.md) | — | First worker: make the correct verify path the easy path |
| 02 | [WP-02-typed-handoff-ledger.md](WP-02-typed-handoff-ledger.md) | 01 optional, can overlap | State before scale: typed ownership and artifacts |
| 03 | [WP-03-split-ship-review-verifier.md](WP-03-split-ship-review-verifier.md) | 02 | Split the mega-skill only after handoffs exist |
| 04 | [WP-04-hard-constraints.md](WP-04-hard-constraints.md) | 01 | Convert recurring review comments into CI |
| 05 | [WP-05-skill-registry.md](WP-05-skill-registry.md) | 03 | Version skills after the role split |
| 06 | [WP-06-autofix-routine.md](WP-06-autofix-routine.md) | 02, 03 | Govern the existing Routine; do not invent a new one |
| 07 | [WP-07-agent-ready-intake.md](WP-07-agent-ready-intake.md) | 02 | Issues become the human inbox for the ledger |
| 08 | [WP-08-architecture-as-training.md](WP-08-architecture-as-training.md) | 01–05 | Gated. Run only if discovery is still the bottleneck |

WP-01 and WP-02 may run in parallel (different owners, non-overlapping
files). Everything else stays sequential unless `TRACKING.md` says otherwise.

## First-system finish line

Given a scoped GitHub issue or an in-progress branch, the delivery loop
produces one squash-ready PR whose template is filled from *executed*
evidence, required CI would pass locally, an independent verifier attached
logs/screenshots/commands, and a human is pinged only for
product/architecture/prod-deploy decisions.

## Service level objective

Treat the delivery loop as a small service:

- Acknowledge new agent work (issue assigned or session started) by writing a
  ledger row the same turn.
- Assign exactly one owner within that turn.
- Do not stay silent in `running` without a ledger update.
- Do not mark `done` without evidence another agent can replay.

Every in-flight task is progressing, waiting on a named dependency, ready
for verification, or escalated with a reason.

## Scale gate (the only one)

Do not add specialists, Routines, or concurrency until these hold on the
delivery loop:

- Completion (verified PRs / started agent tasks) is trending up
- Rework (human corrections per PR) is trending down
- Interruptions (human pings per completed PR) are trending down
- Recovery (CI/verifier fail → safe state) stays bounded
- Cost per verified PR is not climbing to buy the above

Change **one** of: frequency, scope, workers. Roll back if any guard metric
regresses.

## Deletion criteria

Delete `wip/restructure/` when **all** of the following are true:

1. WP-01 through WP-07 are `done` (WP-08 may stay `queued` forever if gated
   off — cancel it rather than leaving the pack around).
2. Five delivery-loop runs have produced evidenced PRs without the human
   routing every step (record them in `TRACKING.md`).
3. Durable replacements live in `.agents/`, `AGENTS.md`, CI, and issue/PR
   templates — nothing in this directory is still the source of truth.
4. A final commit removes the directory and mentions the replacement paths.

## Out of scope for the whole pack

- Personal ops (inbox/calendar briefing)
- Unattended production deploy
- Copying Grok Bot local bans (no comments, framework X, etc.)
- A custom multi-agent product inside Compass
- Adding Bots before one measured loop exists

## Capability budget (standing)

| Action | Default |
| --- | --- |
| Read, draft, tests, draft PRs, reversible record writes | Allow |
| Squash-merge, staging-impacting release investigation, new integrations | Ask |
| Production deploy, secret changes, OAuth grant, deletion, access grants | Human |

Approval packets must contain the decision, impact, evidence, alternatives,
and safest timeout — not “continue?”
