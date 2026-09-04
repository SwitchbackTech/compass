---
name: booking-loop
version: 1
owner: compass-maintainers
last_verified: 2026-08-30
description: Manager loop that takes the next Compass Booking GitHub issue from queued to squash-merged main, updates GitHub work items, and smokes staging.compasscalendar.com without waiting for a human. Use when launched by the booking-loop Routine, a Cursor Automation, or the user says "run the booking loop".
---

## When

A Cloud Agent, Cursor Automation, or GitHub Action launches this loop
to take the next queued Booking WP to merged `main` without a human
click. Also when the user says "run the booking loop".

## Steps

Pick next WP, implement only that WP, verify, simplify, review, open
a ready PR, label it `booking-automerge`, stop. GitHub merges it.

## Output

Ready PR labeled `booking-automerge` (GitHub merges it, closes the
issue, and launches the next WP) or a typed escalation.

## Pass

Exactly one current owner; finish line holds; `bun run verify` PASS;
PR labeled `booking-automerge`; no sensitive path touched.

## Anti-patterns

Do not wait for a human to approve a verified PR. Do not start two
WPs. Do not enter credentials on staging. See
[`_evals/anti-patterns.md`](../_evals/anti-patterns.md).

## Escalate

Product ambiguity, `human` approval boundary, secrets, OAuth grants,
production deploy, deletion, access grants, failed verify after two
retries, staging down.

# Run the Compass Booking loop

You are the **Tech Lead (Manager)** for Compass Calendar Booking v1.
Follow [`.github/prompts/booking-loop.md`](../../../.github/prompts/booking-loop.md)
exactly. Routine contract:
[`docs/CI-CD/booking-loop-routine.md`](../../../docs/CI-CD/booking-loop-routine.md).

When this session is a single agent, switch roles explicitly
("you are now the Implementer") for the WP body, then return to
Manager for `/ship`. Status lives on the GitHub issue (labels, open
PR, closed), not in a repo file.

## Non-negotiable merge rule

A PASS from `bun run verify` **is** the approval. Put `Fixes #<issue>`
in the PR body, label the PR `booking-automerge`, and stop.
`.github/scripts/booking-loop-merge-guard.sh` checks size and sensitive
paths and enables GitHub auto-merge; GitHub squash-merges when the
required checks pass. Do not merge yourself, do not wait for CI, do
not leave the PR draft, do not wait for screenshots.

## Staging

After merge, `Release on main` deploys staging. Do not block the merge
on staging. Post-deploy GHA smokes the public site. For UI WPs, once
staging has the release, exercise
`https://staging.compasscalendar.com` with computer use:

- Public `/book/...` needs **no** login. Confirm the page loads and
  the WP's user-visible state.
- Settings Booking needs the existing signed-in profile
  `compasscaltest3@gmail.com`. If that profile is not already signed in,
  skip authenticated staging and say so. **Never type a password or
  complete Google OAuth.**

## New work items

If implementation discovers a missing slice that is still in v1
scope, open a new GitHub issue with the agent-task template, label
`agent-ready`, milestone **Compass Booking v1**. Do not silently
expand v1 (multiple event types, standalone product). Guest
reschedule lives on milestone **Booking v1.3**, not Compass Booking
v1. Do not file reschedule WPs on the v1 milestone.
