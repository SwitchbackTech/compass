# Agent loop Routine

Autonomous manager loop that walks Compass GitHub issues across ordered
milestones from issue to PR to merge to staging smoke to the next issue.

This is a Routine, not a Skill. Milestone-specific agent prompts live
under `.github/prompts/<milestone-slug>.md`, falling back to
[`.github/prompts/agent-loop.md`](../../.github/prompts/agent-loop.md).
The launch/merge/smoke scripts live under `.github/scripts/agent-loop-*.sh`.

Alias notes: this Routine used to be named booking-loop. The
`booking-loop-*` labels, `booking-automerge`, and the pickup phrase
`booking-loop: pickup` remain valid for one release so open booking PRs
still merge.

```text
ROUTINE: agent-loop
PURPOSE: Walk milestone issues from GitHub to merged-on-staging
  without a human in the loop, except the one-time setup listed below.
OWNER: compass-maintainers
TRIGGER: workflow_dispatch | */15 cron | Release on main completed | pull_request labeled agent-automerge
INPUT: GitHub issue in the first AGENT_LOOP_MILESTONES entry that has an eligible WP
SKILL/PROMPT: .github/prompts/<milestone-slug>.md or .github/prompts/agent-loop.md
OUTPUT: draft PR marked ready after bun run verify, Fixes #<n>, labeled agent-automerge; GitHub auto-merges; next WP launched on merge; staging smoke after release
IDEMPOTENCY: up to AGENT_LOOP_CONCURRENCY in-flight agents with non-overlapping partitions; agent-loop-running; skip issues with an open Fixes PR
RETRY: HTTP 429 waits for credits and retries on the 15-minute watchdog; dispatch a
  fresh run for all other retryable investigation (do not "Re-run jobs" on a failed snapshot)
APPROVAL: agent-automerge + merge-guard (size, paths, main not red) + GitHub auto-merge on required checks
STOP: repo var AGENT_LOOP_ENABLED or BOOKING_LOOP_ENABLED (must be string "true"; default off)
HEARTBEAT: */15 cron watchdog when idle; Discord on merge-guard / smoke failure
VERIFIER: .github/scripts/agent-loop-merge-guard.sh (not the LLM)
STAGING: https://staging.compasscalendar.com (unauthenticated smoke only)
NEVER: enter credentials; merge PRs that touch .github/ or auth/billing paths
  unless a per-milestone allowlist re-allows that prefix
```

Sources of truth:

| Concern | File |
| --- | --- |
| Trigger, concurrency, kill switch, launch on merge | `.github/workflows/agent-loop.yml` |
| Agent instructions | `.github/prompts/agent-loop.md` |
| Pick next WP | `.github/scripts/agent-loop-next.sh` |
| Launch (Cursor API or pickup comment) | `.github/scripts/agent-loop-launch.sh` |
| Merge-guard Verifier (no-auto-merge paths, size) | `.github/scripts/agent-loop-merge-guard.sh` |
| Per-milestone path allowlists | `.github/agent-loop/allowlists/<milestone-slug>.txt` |
| Staging smoke | `.github/scripts/agent-loop-staging-smoke.sh` |
| Post-deploy (smoke + annotate) | `.github/scripts/agent-loop-postdeploy.sh` |
| Product spec | named by the issue `Spec:` link |
| Cursor Automation paste | this document (one-time setup) |

## Variables

| Variable | Kind | Meaning |
| --- | --- | --- |
| `AGENT_LOOP_ENABLED` | repo var | Kill switch. String `"true"` turns the workflow on. |
| `BOOKING_LOOP_ENABLED` | repo var | Alias notes: still accepted as the kill switch for one release. |
| `AGENT_LOOP_MILESTONES` | repo var | Ordered milestone titles, comma or newline separated. Higher entries drain first. Example: `Providers L: loop + CI acceleration,Booking v1.5`. Empty falls back to `Compass Booking v1`. |
| `AGENT_LOOP_CONCURRENCY` | repo var | Max in-flight WPs (default 3). The picker never launches two issues that share a partition label. |
| `AGENT_LOOP_GITHUB_TOKEN` | secret | PAT with `contents:write` + `pull_requests:write` so squash-merge triggers `release-on-main`. |
| `BOOKING_LOOP_GITHUB_TOKEN` | secret | Alias notes: still accepted if `AGENT_LOOP_GITHUB_TOKEN` is unset. |
| `CURSOR_API_KEY` | secret | Cloud Agents API. When set, launch never comments the pickup phrase. |

## One-time human setup

The loop stays off until these exist. After they exist, no further input is
required; the loop pulls its work from the issue queue.

1. Repo variable `AGENT_LOOP_ENABLED` = `true` (or keep
   `BOOKING_LOOP_ENABLED` = `true`).
2. Repo variable `AGENT_LOOP_MILESTONES` set to the ordered list of
   milestone titles to drain.
3. Either:
   - Secret `CURSOR_API_KEY` (Cursor Dashboard → Integrations → Cloud Agents
     API key), or
   - A Cursor Automation whose trigger is an issue comment matching
     `agent-loop: pickup` and whose prompt is
     [`.github/prompts/agent-loop.md`](../../.github/prompts/agent-loop.md).
     Alias notes: an Automation still listening for `booking-loop: pickup`
     needs its trigger updated.
4. A PAT with `contents:write` + `pull_requests:write` stored as
   `AGENT_LOOP_GITHUB_TOKEN`, or reuse `BOOKING_LOOP_GITHUB_TOKEN` /
   `AUTOFIX_GITHUB_TOKEN`. Required so squash-merge commits trigger
   `release-on-main` (the default `GITHUB_TOKEN` does not).
5. Labels `agent-automerge`, `agent-loop-running`,
   `agent-loop-waiting-for-credits`, `agent-loop-needs-human` on this
   repo (`gh label create` if missing). Alias notes: the `booking-*`
   labels stay as aliases for one release.

Do not flip `BOOKING_LOOP_ENABLED` or `AGENT_LOOP_ENABLED` from this
document. The workflow `if:` is the kill switch.

## Dual-launch rule

If `CURSOR_API_KEY` is present, launch **only** via
`POST https://api.cursor.com/v0/agents`. Do not also comment
`agent-loop: pickup`. If the key is absent, comment that exact phrase
for the Automation and do not call the API. API launch failure must not
fall back to the pickup comment (that would start a second agent when
both channels are configured).

## Loop

1. **Pick next WP** (`.github/scripts/agent-loop-next.sh`): walk
   `AGENT_LOOP_MILESTONES` in order. Skip `agent-loop-running` /
   `agent-loop-needs-human`, Approval boundary `human`, open `Depends on:`
   issues, and issues with an open PR with `Fixes #<n>`. Select up to
   `AGENT_LOOP_CONCURRENCY` (default 3) issues whose partition labels do
   not overlap. Partition labels are `sync-core`, `sync-microsoft`,
   `sync-apple`, `web`, `backend`, `core`, `scripts`, `e2e`, `docs`.
   `fresh_count` idles only when it reaches N. Labels older than 3 hours
   are treated as abandoned and cleared across every listed milestone.
2. **Launch** (`.github/scripts/agent-loop-launch.sh`): accepts one or
   more issue numbers. POST the Cloud
   Agents API when `CURSOR_API_KEY` is set; otherwise comment
   `agent-loop: pickup`. Never both. HTTP 429 records the provider's retry
   time, labels the issue `agent-loop-waiting-for-credits`, and exits
   successfully so the 15-minute watchdog can resume it. Other launch
   failures are `agent-loop-needs-human` stops. The prompt file is
   `.github/prompts/<milestone-slug>.md` when that file exists, else
   `.github/prompts/agent-loop.md`.
3. **Agent** follows that prompt: implement the WP, open a draft PR, run
   `bun run verify`, mark the PR ready, add label `agent-automerge` when
   the Approval boundary is `allow`, and stop. The agent does not merge
   and does not wait for CI.
4. **Merge guard** (`.github/scripts/agent-loop-merge-guard.sh`): when size
   is under the rails, no sensitive path is in the diff (unless a
   per-milestone allowlist re-allows that prefix), and the latest `main`
   Unit and E2E push runs are not red, enable GitHub auto-merge
   (`gh pr merge --auto`; the ruleset merge queue squash-merges and the
   repo deletes the branch). GitHub squash-merges when the required
   checks pass. Otherwise add `agent-loop-needs-human` and stop; a red
   `main` just waits for the scheduled sweep. The guard never holds a
   runner waiting on CI.
5. **Launch next** (`agent-loop.yml` `pull_request` `closed` + merged):
   smoke the staging that is live now, pick WPs to top the fleet up to N,
   launch them. `Fixes #<n>` closes the merged issue. A failing smoke
   stops launches.
6. **Release on main** deploys staging (code paths only; docs-only merges
   skip deploy). The 15-minute cron is the watchdog for docs-only WPs.
7. **Post-deploy** (`workflow_run`): smokes the new release, annotates
   the issue, and tops the fleet up to N; on failure it labels the issue
   `agent-loop-needs-human` and does not launch.

Concurrency is per job. `merge-guard` runs in `agent-merge-<pr>` with
`cancel-in-progress: true` (a newer push supersedes). `launch-next`,
`post-deploy`, and `kick` share `agent-loop` with
`cancel-in-progress: false`, so a second launch **waits** for the first.
Do not put those jobs back under one workflow-level group. The picker
fills up to `AGENT_LOOP_CONCURRENCY` (default 3) issues whose partition
labels do not overlap. Untested combinations cannot land: the Copilot PR
Review ruleset (8388539) requires a merge queue (`grouping_strategy:
ALLGREEN`, squash). Unit and E2E workflows listen for `merge_group` so
the queue can emit the required checks. If the queue rule cannot be
written, the equivalent is `strict_required_status_checks_policy: true`.

## Sensitive-path merge gate

The agent may *author* the code. The merge guard refuses to merge if the
PR touches:

- `.github/`: deploy, release, docs-sync, agent-loop, agent-review, and
  error-autofix workflows; the `agent-loop-*`, `autofix-*`, `deploy-*`, and
  `discord-*` scripts; `prompts/`, `agent-loop/` allowlists, and `docker/`.
  Test, e2e, and perf workflows, `detect-code-changes.sh`, issue and PR
  templates, dependabot, and stale config may auto-merge; `actionlint` and
  the loop script tests run in the `static` job.
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
`.github/scripts/agent-loop-merge-guard.sh` (do not widen from this doc).

Per-milestone allowlists under
`.github/agent-loop/allowlists/<milestone-slug>.txt` can re-allow a
refused prefix. The `providers-*` files re-allow
`packages/sync/src/providers/**` (including `__contract__`). Telemetry
and auth paths stay refused. Future milestones add a file, not a script
edit.

## Size limits

Merge-guard defaults:

- `MAX_FILES=60`
- `MAX_LINES=4000`

Override per run with env `AGENT_LOOP_MAX_FILES` and
`AGENT_LOOP_MAX_LINES`.

## Staging smoke

`GET https://staging.compasscalendar.com`, `/book/`, and
`/book/tylerdeane` must not return 5xx. 404 is success (page disabled or
not yet shipped). The smoke script never logs in.

Authenticated Settings is out of unattended smoke.
The `qa-test-staging` skill remains the signed-in sweep when a human is present
with a connected profile already signed in.

## Labels

| Label | Meaning |
| --- | --- |
| `agent-automerge` | Agent finished; merge-guard may squash-merge. |
| `agent-loop-running` | An agent is in flight for this issue. |
| `agent-loop-waiting-for-credits` | Cursor returned HTTP 429; retry only after the recorded time. |
| `agent-loop-needs-human` | Kill this issue's loop; do not pick it again. |

Alias notes: `booking-automerge`, `booking-loop-running`,
`booking-loop-waiting-for-credits`, and `booking-loop-needs-human`
still count for one release.

## Script tests (also run in the `static` CI job)

Picker and merge-guard shell tests run from `bun test:scripts` via
`packages/scripts/src/testing/agent-loop-next.test.ts`.

```bash
bash .github/scripts/agent-loop-next.test.sh
bash .github/scripts/agent-loop-merge-guard.test.sh
bash -n .github/scripts/agent-loop-*.sh
shellcheck .github/scripts/agent-loop-*.sh
```

`agent-loop-next.test.sh` drives `agent-loop-next.sh` through a `GH_STUB`
shim with canned `gh` JSON. It does not call the network.

## Drills (documented, not run)

Operator checklist. Mark `documented` unless a human authorizes a live
staging drill.

| Drill | Expected evidence |
| --- | --- |
| Kill switch off | Workflow `if:` skips; no agent job |
| Kill switch on, no eligible WP | `agent-loop-next.sh` `found=false`; no launch |
| Dual-launch | API key set → no `agent-loop: pickup` comment |
| Merge-guard sensitive path | PR exists; label stripped; `agent-loop-needs-human`; no merge |
| Merge-guard providers allowlist | Diff only `packages/sync/src/providers/**` prints `allowed by providers allowlist` and proceeds |
| Merge-guard size fail | Same downgrade if files > `MAX_FILES=60` or lines > `MAX_LINES=4000` |
| Staging 5xx | Smoke fails; next WP not launched |
| Credentials | Smoke and prompt never enter a password or complete OAuth |
| Second launch while in flight | Queued behind `concurrency.group: agent-loop`; first run not cancelled |
| Red main | Merge-guard prints "main is red" and does not enable auto-merge; scheduled sweep retries |

## Recovery packet

Fill this when a run goes wrong. Do **not** blindly re-run the whole
workflow.

```text
task_id: <GitHub issue number>
last_successful_action: <pick | launch | PR opened | merge-guard | smoke>
writes_after_that_point: <files, labels, comments>
external_state: <issue labels, open PRs with Fixes #<n>, Cursor agent URL>
rollback: <close stray PR, remove agent-automerge, leave evidence>
human_decision: <re-dispatch | leave | revert>
```

## Related

- Prompt: [`.github/prompts/agent-loop.md`](../../.github/prompts/agent-loop.md)
- Ship skill: [`.agents/skills/ship/SKILL.md`](../../.agents/skills/ship/SKILL.md)
- Providers spec: [`docs/features/calendar-providers.md`](../features/calendar-providers.md)
- Booking spec: [`docs/features/booking.md`](../features/booking.md)
- Staging QA: [`.agents/skills/qa-test-staging/SKILL.md`](../../.agents/skills/qa-test-staging/SKILL.md)
- Error-autofix (sibling Routine): [`error-autofix-routine.md`](./error-autofix-routine.md)
