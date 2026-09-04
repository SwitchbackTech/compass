# Booking loop Routine

Autonomous manager loop that walks Compass Booking GitHub issues from
issue → PR → merge → staging smoke → next issue.

This is a Routine, not a Skill. The Skill
[`.agents/skills/booking-loop/SKILL.md`](../../.agents/skills/booking-loop/SKILL.md)
is the agent-facing prompt. The launch/merge/smoke scripts live under
`.github/scripts/booking-loop-*.sh`.

```text
ROUTINE: booking-loop
PURPOSE: Walk Compass Booking issues from GitHub to merged-on-staging
  without a human in the loop, except the one-time setup listed below.
OWNER: compass-maintainers
TRIGGER: workflow_dispatch | hourly cron | Release on main completed | pull_request labeled booking-automerge | booking-automerge PR merged
INPUT: GitHub issue in milestone Compass Booking v1
SKILL/PROMPT: .github/prompts/booking-loop.md
OUTPUT: ready PR with Fixes #<n> labeled booking-automerge; GitHub auto-merges; next WP launched on merge; staging smoke after release
IDEMPOTENCY: one in-flight agent; booking-loop-running; skip issues with an open Fixes PR
RETRY: HTTP 429 waits for credits and retries on the hourly watchdog; dispatch a
  fresh run for all other retryable investigation (do not “Re-run jobs” on a failed snapshot)
APPROVAL: booking-automerge + merge-guard (size, paths, main not red) + GitHub auto-merge on required checks
STOP: repo var BOOKING_LOOP_ENABLED (must be string "true"; default off)
HEARTBEAT: hourly cron watchdog when idle; Discord on merge-guard / smoke failure
VERIFIER: .github/scripts/booking-loop-merge-guard.sh (not the LLM)
STAGING: https://staging.compasscalendar.com (unauthenticated smoke only)
NEVER: enter credentials; merge PRs that touch .github/ or auth/billing paths
```

Sources of truth:

| Concern | File |
| --- | --- |
| Trigger, concurrency, kill switch, launch on merge | `.github/workflows/booking-loop.yml` |
| Agent instructions | `.github/prompts/booking-loop.md` |
| Pick next WP | `.github/scripts/booking-loop-next.sh` |
| Launch (Cursor API or pickup comment) | `.github/scripts/booking-loop-launch.sh` |
| Merge-guard Verifier (no-auto-merge paths, size) | `.github/scripts/booking-loop-merge-guard.sh` |
| Staging smoke | `.github/scripts/booking-loop-staging-smoke.sh` |
| Post-deploy (smoke + annotate) | `.github/scripts/booking-loop-postdeploy.sh` |
| Product spec | `docs/features/booking.md` |
| Cursor Automation paste | this document (one-time setup) |

## One-time human setup

The loop stays off until these exist. After they exist, no further input is
required; the loop pulls its work from the issue queue.

1. Repo variable `BOOKING_LOOP_ENABLED` = `true`.
2. Either:
   - Secret `CURSOR_API_KEY` (Cursor Dashboard → Integrations → Cloud Agents
     API key), or
   - A Cursor Automation whose trigger is an issue comment matching
     `booking-loop: pickup` and whose prompt is
     [`.github/prompts/booking-loop.md`](../../.github/prompts/booking-loop.md).
     In Cursor Dashboard → Automations: name `booking-loop`, trigger on a
     GitHub issue comment whose body contains exactly `booking-loop: pickup`,
     prompt that file, same Cloud Agent environment as manual runs. Skip this
     Automation when `CURSOR_API_KEY` is set (dual-launch rule).
3. A PAT with `contents:write` + `pull_requests:write` stored as
   `BOOKING_LOOP_GITHUB_TOKEN`, or reuse `AUTOFIX_GITHUB_TOKEN`. Required so
   squash-merge commits trigger `release-on-main` (the default
   `GITHUB_TOKEN` does not).
4. Labels `booking-automerge`, `booking-loop-running`,
   `booking-loop-waiting-for-credits`, `booking-loop-needs-human` on this repo (create with
   `gh label create` if missing).

Org Project "Compass Booking" is optional. Milestone
[Compass Booking v1](https://github.com/KeepSoftwareSimple/compass-calendar/milestone/7)
is the queue.

Do not flip `BOOKING_LOOP_ENABLED` from this document. The workflow `if:`
is the kill switch.

## Dual-launch rule

If `CURSOR_API_KEY` is present, launch **only** via
`POST https://api.cursor.com/v0/agents`. Do not also comment
`booking-loop: pickup`. If the key is absent, comment that exact phrase
for the Automation and do not call the API. API launch failure must not
fall back to the pickup comment (that would start a second agent when
both channels are configured).

## Loop

1. **Pick next WP** (`.github/scripts/booking-loop-next.sh`): lowest open
   milestone issue that is not labeled `booking-loop-running` or
   `booking-loop-needs-human` and has no open PR with `Fixes #<n>`. If any
   issue has a fresh `booking-loop-running` label, idle. Labels older than
   3 hours are treated as abandoned and cleared.
2. **Launch** (`.github/scripts/booking-loop-launch.sh`): POST the Cloud
   Agents API when `CURSOR_API_KEY` is set; otherwise comment
   `booking-loop: pickup`. Never both. HTTP 429 records the provider's retry
   time, labels the issue `booking-loop-waiting-for-credits`, and exits
   successfully so the hourly watchdog can resume it. Other launch failures
   are `booking-loop-needs-human` stops.
3. **Agent** follows `.github/prompts/booking-loop.md`: implement the WP, run
   `bun run verify`, open a ready PR, add label `booking-automerge`, stop.
   The agent does not merge and does not wait for CI.
4. **Merge guard** (`.github/scripts/booking-loop-merge-guard.sh`): when size
   is under the booking limits, no sensitive path is in the diff, and the
   latest `main` Unit and E2E push runs are not red, enable GitHub auto-merge
   (`gh pr merge --auto --squash`). GitHub squash-merges when the required
   checks pass. Otherwise add `booking-loop-needs-human` and stop; a red
   `main` just waits for the hourly sweep. The guard never holds a runner
   waiting on CI.
5. **Launch next** (`booking-loop.yml` `pull_request` `closed` + merged):
   smoke the staging that is live now, pick the next WP, launch it.
   `Fixes #<n>` closes the merged issue. A failing smoke stops launches.
6. **Release on main** deploys staging (code paths only). **Post-deploy**
   (`workflow_run`) smokes the new release and annotates the issue; on
   failure it labels the issue `booking-loop-needs-human`.

Concurrency is per job. `merge-guard` runs in `booking-merge-<pr>` with
`cancel-in-progress: true` (a newer push supersedes). `launch-next`,
`post-deploy`, and `kick` share `booking-loop` with
`cancel-in-progress: false`, so a second launch **waits** for the first.
One group for everything made GitHub cancel queued launches whenever a
merge-guard was waiting on CI (56 cancellations on 2026-09-03).

## Sensitive-path merge gate

Same idea as error-autofix. The agent may *author* booking code. The merge
guard refuses to merge if the PR touches:

- `.github/`
- `self-host/`
- `packages/backend/src/auth/`
- `packages/web/src/auth/`
- `packages/web/src/supertokens.ts`
- `packages/core/src/logger/`
- `packages/backend/src/logging/`
- `packages/sync/src/telemetry/`
- `packages/core/src/config/`
- files matching `billing` or `stripe` in the path

Authoritative list: `NO_AUTOMERGE_PATH_PATTERNS` in
`.github/scripts/booking-loop-merge-guard.sh` (do not widen from this doc).

## Size limits

Booking WPs are larger than error-autofix. Merge-guard defaults:

- `MAX_FILES=60`
- `MAX_LINES=4000`

Override per run with env `BOOKING_LOOP_MAX_FILES` and
`BOOKING_LOOP_MAX_LINES`.

## Staging smoke

`GET https://staging.compasscalendar.com`, `/book/`, and
`/book/tylerdeane` must not return 5xx. 404 is success (page disabled or
not yet shipped). The smoke script never logs in.

Authenticated Settings (`/settings/booking`) is out of unattended smoke.
`/qa-test-staging` remains the signed-in sweep when a human is present with
`compasscaltest3@gmail.com` already signed in.

## Handoff and status

When the agent opens a PR, it writes `.agents/handoffs/<issue-number>.md`
(WP-02 schema) **on the PR branch**. `task_id` is the issue number.

Status lives on the GitHub issue, not in a repo file. There is no ledger
table: one row per WP in one file made every PR conflict with every other
merge, and each conflict cost a merge-from-main commit and a full CI round.

| Status | GitHub |
| --- | --- |
| queued | open, `agent-ready`, no running label |
| running | `booking-loop-running` |
| verifying | open PR with `Fixes #<n>` and `booking-automerge` |
| waiting | `booking-loop-waiting-for-credits` |
| escalated | `booking-loop-needs-human` |
| done | closed by the merged PR |

## Labels

| Label | Meaning |
| --- | --- |
| `booking-automerge` | Agent finished; merge-guard may squash-merge. |
| `booking-loop-running` | An agent is in flight for this issue. |
| `booking-loop-waiting-for-credits` | Cursor returned HTTP 429; retry only after the recorded time. |
| `booking-loop-needs-human` | Kill this issue's loop; do not pick it again. |

## Drills (documented, not run)

Operator checklist. Mark `documented` unless a human authorizes a live
staging drill.

| Drill | Expected evidence |
| --- | --- |
| Kill switch off | Workflow `if:` skips; no agent job |
| Kill switch on, no eligible WP | `booking-loop-next.sh` `found=false`; no launch |
| Dual-launch | API key set → no `booking-loop: pickup` comment |
| Merge-guard sensitive path | PR exists; label stripped; `booking-loop-needs-human`; no merge |
| Merge-guard size fail | Same downgrade if files > `MAX_FILES=60` or lines > `MAX_LINES=4000` |
| Staging 5xx | Smoke fails; next WP not launched |
| Credentials | Smoke and prompt never enter a password or complete Google OAuth |
| Second launch while in flight | Queued behind `concurrency.group: booking-loop`; first run not cancelled |
| Red main | Merge-guard prints "main is red" and does not enable auto-merge; hourly sweep retries |

## Recovery packet

Fill this when a run goes wrong. Do **not** blindly re-run the whole
workflow.

```text
task_id: <GitHub issue number>
last_successful_action: <pick | launch | PR opened | merge-guard | smoke>
writes_after_that_point: <files, labels, comments>
external_state: <issue labels, open PRs with Fixes #<n>, Cursor agent URL>
rollback: <close stray PR, remove booking-automerge, leave evidence>
human_decision: <re-dispatch | leave | revert>
```

## Related

- Skill: [`.agents/skills/booking-loop/SKILL.md`](../../.agents/skills/booking-loop/SKILL.md)
- Prompt: [`.github/prompts/booking-loop.md`](../../.github/prompts/booking-loop.md)
- Product spec: [`docs/features/booking.md`](../features/booking.md)
- Staging QA: [`.agents/skills/qa-test-staging/SKILL.md`](../../.agents/skills/qa-test-staging/SKILL.md)
- Error-autofix (sibling Routine): [`error-autofix-routine.md`](./error-autofix-routine.md)
