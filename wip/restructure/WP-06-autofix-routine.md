# WP-06 — Error autofix as a governed Routine

**task_id:** WP-06
**status:** queued
**owner:** On-call / Implementer (docs + drills), human for enabling modes
**depends on:** WP-02 `done`, WP-03 `done`
**next owner after done:** WP-07 may overlap; do not add new Routines yet

## Why

Playbook: a Routine is a trigger + instructions + tools + output +
approval + retry. Compass already has this in
[`.github/workflows/error-autofix.yml`](../../.github/workflows/error-autofix.yml)
plus [`.github/prompts/error-autofix.md`](../../.github/prompts/error-autofix.md)
and [`.github/scripts/autofix-merge-guard.sh`](../../.github/scripts/autofix-merge-guard.sh).
It is the strongest production-ish agent loop in the repo — and it is
under-documented, not described as a Routine, and has no written recovery
drills.

Do not invent a second unattended workflow. Govern this one.

## Finish line

1. `docs/CI-CD/workflows.md` lists Error autofix and
   `error-autofix-postdeploy.yml` in the workflow table (they are missing
   today). Perf-budget may be mentioned in the same pass if you are
   already in the file; do not build new perf gates.
2. A Routine contract exists at
   `docs/CI-CD/error-autofix-routine.md` (or a section in workflows.md if
   shorter than one page). Required fields:

   ```text
   ROUTINE: error-autofix
   TRIGGER: issues opened by posthog[bot] | workflow_dispatch
   INPUT: GitHub issue + PostHog fingerprint
   SKILL/PROMPT: .github/prompts/error-autofix.md
   OUTPUT: issue comment and/or PR with Fixes #<n>
   IDEMPOTENCY: one PR per issue; preflight skips labeled/already-handled
   RETRY: dispatch a fresh run (do not “Re-run jobs” on a failed snapshot)
   APPROVAL: AUTOFIX_MODE=triage|pr|merge; automerge-candidate + merge-guard
   STOP: repo var ERROR_AUTOFIX_ENABLED
   HEARTBEAT: Discord via existing notify scripts on skip/fail/needs-human
   ```

3. Idempotency, duplicate-issue, staging-only, denied-path, and
   merge-guard-failure behaviors are written as **drills** with expected
   evidence (not necessarily executed in prod in this WP — provide a
   checklist an operator can run).
4. Recovery packet template is in that doc (task identity, last
   successful action, writes after that point, rollback, human decision).
5. Autofix prompt tells the agent to write a typed handoff/ledger row
   when it opens a PR (WP-02 schema). It already must not merge production.
6. Kill switch, mode, denied paths, max files/lines remain enforced in
   **shell**, not only in the prompt.

## Routine contract (fill any gaps in the live workflow, do not redesign)

| Guard | Current code | This WP |
| --- | --- | --- |
| Stop switch | `ERROR_AUTOFIX_ENABLED` | Document how to flip it and that evidence/PRs remain |
| Mode | `AUTOFIX_MODE` | Document triage/pr/merge blast radius |
| Idempotency | preflight + “one PR per issue” | Name the key (issue number + fingerprint) |
| Duplicate trigger | `concurrency.group: error-autofix` | Document that a second issue waits, not cancels |
| Staging-only | prompt forbids automerge | Restate in Routine doc; drill |
| Denied paths | merge-guard `DENIED_PATH_PATTERNS` | Doc points at the script as source of truth |
| Verifier | merge-guard is independent of the LLM | Call it the Verifier; LLM must not be last line |
| Human | production deploy never auto | Keep |

If you find a real hygiene bug (e.g. docs say X, script says Y), **fix
the docs to match the script** unless the script is clearly wrong — then
escalate; do not silently widen denied paths.

## Steps

1. Read `error-autofix.yml`, `error-autofix-postdeploy.yml`,
   `error-autofix.md`, `autofix-preflight.sh`, `autofix-merge-guard.sh`,
   `autofix-lib.sh`, `autofix-postdeploy-notify.sh`.
2. Write the Routine contract + drills + recovery packet.
3. Patch `docs/CI-CD/workflows.md` table.
4. Add a short “at PR open, write `.agents/handoffs/<issue>.md` and a
   ledger row” sentence to the prompt. If the autofix agent cannot write
   to the default branch, state that the handoff lives on the PR branch.
5. Add a drill checklist section the implementing session can mark
   “documented, not run” vs “run on staging.” Prefer documenting unless
   the operator (human) authorizes a live drill.
6. Do not enable `ERROR_AUTOFIX_ENABLED` or change `AUTOFIX_MODE`.

## Activation checklist (operator, after this WP)

- Run once manually via `workflow_dispatch` on a **safe** issue (or a
  fixture issue) with mode `triage`
- Confirm stop switch from repo variables UI
- Simulate (or table-top): empty PostHog MCP, duplicate issue, denied
  path PR, staging-only error
- Only then consider `pr` / `merge` mode changes (human approval)

## Acceptance tests

- **Normal:** a stranger can name trigger, output, stop switch, and
  verifier from the new doc without reading the workflow YAML.
- **Incomplete:** missing PostHog fingerprint → documented bucket
  “unknown / insufficient signal,” no PR.
- **Duplicate:** second open for same issue → no second PR (prompt +
  preflight).
- **Policy:** denied path → merge-guard downgrades `automerge-candidate`,
  adds `autofix:needs-human`.
- **Recovery:** packet template has last confirmed external state and
  forbids rerunning the entire workflow blindly.

## Evidence

```text
workflows.md table includes autofix: yes/no
routine doc path:
prompt handoff sentence: yes/no
drills: documented | run
modes unchanged (must be yes):
```

## Out of scope

- New Cursor Automations
- Auto-remediation of production
- Raising file/line limits
- CI flake-retry Routine (mention as future only)
- Changing Discord/PostHog secrets

## Closed-laptop test (optional, human)

If an operator runs dispatch and walks away, the result (comment, PR, or
needs-human) must still be visible from GitHub and Discord. Record that
run in `TRACKING.md` if it happens.

## Handoff

```yaml
task_id: WP-06
from:
to: Implementer
status:
artifact:
evidence:
assumptions:
open_risks:
next_deadline:
```

## Session prompt

```text
You are implementing WP-06 from wip/restructure/WP-06-autofix-routine.md.
Read README.md and TRACKING.md. WP-02 and WP-03 must be done. Mark WP-06
running.

Finish line: docs/CI-CD/workflows.md lists autofix; a Routine contract
document covers trigger, idempotency, retry, approval, stop, heartbeat,
drills, and recovery packet; the autofix prompt points at typed handoffs;
shell merge-guard remains the verifier. Do not enable the kill switch or
change AUTOFIX_MODE. Commit. Update TRACKING.md and Evidence.
```
