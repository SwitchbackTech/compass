---
name: booking-loop
version: 2
owner: compass-maintainers
last_verified: 2026-09-04
description: Manager loop that takes the next milestone GitHub issue from queued to squash-merged main, updates GitHub work items, and smokes staging.compasscalendar.com without waiting for a human. Use when launched by the agent-loop Routine, a Cursor Automation, or the user says "run the booking loop" or "run the agent loop".
---

## When

A Cloud Agent, Cursor Automation, or GitHub Action launches this loop
to take the next queued milestone WP to merged `main` without a human
click. Also when the user says "run the booking loop" or "run the
agent loop".

## Steps

Pick next WP, implement only that WP, verify, simplify, review, open
a ready PR, label it `agent-automerge`, stop. GitHub merges it.

## Output

Ready PR labeled `agent-automerge` (GitHub merges it, closes the
issue, and launches the next WP) or a typed escalation.

## Pass

Exactly one current owner; finish line holds; `bun run verify` PASS;
PR labeled `agent-automerge`; no sensitive path touched unless a
per-milestone allowlist re-allows it.

## Anti-patterns

Do not wait for a human to approve a verified PR. Do not start two
WPs. Do not enter credentials on staging. See
[`_evals/anti-patterns.md`](../_evals/anti-patterns.md).

## Escalate

Product ambiguity, `human` approval boundary, secrets, OAuth grants,
production deploy, deletion, access grants, failed verify after two
retries, staging down.

# Run the Compass agent loop

You are the **Tech Lead (Manager)** for the current
`AGENT_LOOP_MILESTONES` queue. Follow
[`.github/prompts/agent-loop.md`](../../../.github/prompts/agent-loop.md)
exactly. Routine contract:
[`docs/CI-CD/agent-loop-routine.md`](../../../docs/CI-CD/agent-loop-routine.md).

When this session is a single agent, switch roles explicitly
("you are now the Implementer") for the WP body, then return to
Manager for `/ship`. Status lives on the GitHub issue (labels, open
PR, closed), not in a repo file.

## Non-negotiable merge rule

A PASS from `bun run verify` **is** the approval. Put `Fixes #<issue>`
in the PR body, label the PR `agent-automerge`, and stop.
`.github/scripts/agent-loop-merge-guard.sh` checks size and sensitive
paths and enables GitHub auto-merge; GitHub squash-merges when the
required checks pass. Do not merge yourself, do not wait for CI, do
not leave the PR draft, do not wait for screenshots.

Alias notes: `booking-automerge` still arms the guard for one release.

## Staging

After merge, `Release on main` deploys staging. Do not block the merge
on staging. Post-deploy GHA smokes the public site. Never type a
password or complete OAuth.

## New work items

If implementation discovers a missing slice that is still in the
current milestone's scope, open a new GitHub issue with the agent-task
template, label `agent-ready`, and put it on that milestone. Do not
silently expand scope.
