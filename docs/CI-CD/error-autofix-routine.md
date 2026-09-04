# Routine: error-autofix

Govern the existing Error autofix loop. Do not invent a second unattended
workflow. Kill switch and mode stay as repo variables — this document does
not flip them.

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
VERIFIER: .github/scripts/autofix-merge-guard.sh (not the LLM)
```

Sources of truth:

| Concern | File |
| --- | --- |
| Trigger, concurrency, kill switch, mode | `.github/workflows/error-autofix.yml` |
| Post-deploy Discord/GitHub follow-up | `.github/workflows/error-autofix-postdeploy.yml` |
| Agent instructions | `.github/prompts/error-autofix.md` |
| Preflight (cheap stop before the LLM) | `.github/scripts/autofix-preflight.sh` |
| Merge-guard Verifier (no-auto-merge paths, size) | `.github/scripts/autofix-merge-guard.sh` |
| Shared notify helpers | `.github/scripts/autofix-lib.sh` |

## Stop switch and mode

- `ERROR_AUTOFIX_ENABLED` must be the string `true` or the workflow does
  not run. Flip it in GitHub → Settings → Variables. Turning it off does
  not delete existing comments, PRs, or labels.
- `AUTOFIX_MODE`:
  - `triage` — comment only, no PR
  - `pr` — may open a PR; a human merges
  - `merge` — may open a PR and label `automerge-candidate`; merge-guard
    is the Verifier and may strip that label / add `autofix:needs-human`
- Sensitive paths (billing/Stripe, auth, `self-host/**`, `.github/**`,
  telemetry, config wiring) gate **merging**, not authoring. The agent may
  open a fix PR that touches them; it must self-label `autofix:needs-human`
  and never `automerge-candidate`, and the merge-guard enforces that
  independently. A diagnosed fix should arrive as a reviewable PR, not as a
  comment saying someone ought to write it.
- Production deploy is never automatic. Staging-only PostHog errors must
  never receive `automerge-candidate`.

## Idempotency

Key: **GitHub issue number** (plus the PostHog fingerprint in the issue
body for humans). Preflight skips if the issue already has the `autofix`
label. The prompt forbids a second PR that also says `Fixes #<n>`.
`concurrency.group: error-autofix` with `cancel-in-progress: false` means
a second issue **waits**, it does not cancel the first run.

## Retry

Do not use “Re-run jobs” on a failed Autofix run — that reuses the
workflow file snapshot from the failed attempt. Dispatch a **fresh** run
(`workflow_dispatch` with the issue number) after removing the `autofix`
label if preflight would skip it as already handled.

## Handoff

When the agent opens a PR, it writes `.agents/handoffs/<issue-number>.md`
(WP-02 schema) **on the PR branch**. Status lives on the GitHub issue. It
cannot write those files to `main` from the autofix job. `task_id` is the
issue number.

## Drills (documented, not run)

Operator checklist. Mark `documented` unless a human authorizes a live
staging drill.

| Drill | Expected evidence |
| --- | --- |
| Kill switch off | Workflow `if:` skips; no agent job |
| Missing PostHog fingerprint / MCP empty | Bucket **unknown / insufficient signal**; issue comment; `autofix:needs-human`; **no PR** |
| Duplicate open for the same issue | Preflight skip and/or prompt “one PR per issue”; **no second PR** |
| Second issue while a run is in flight | Queued behind `concurrency.group: error-autofix`; first run not cancelled |
| Staging-only error | No `automerge-candidate` |
| No-auto-merge-path diff | PR still exists; merge-guard downgrades `automerge-candidate`, adds `autofix:needs-human`, and it does not auto-merge. Authoritative list: `NO_AUTOMERGE_PATH_PATTERNS` in `.github/scripts/autofix-merge-guard.sh` (do not widen from this doc) |
| Merge-guard size fail | Same downgrade if files &gt; `MAX_FILES=8` or lines &gt; `MAX_LINES=250` in that script |
| `workflow_dispatch` triage on a safe issue | Comment only; mode unchanged |

## Recovery packet

Fill this when a run goes wrong. Do **not** blindly re-run the whole
workflow.

```text
task_id: <GitHub issue number>
last_successful_action: <preflight skip | comment | PR opened | merge-guard downgrade>
writes_after_that_point: <files, labels, comments, Discord>
external_state: <issue labels, open PRs with Fixes #<n>, Discord message>
rollback: <close stray PR, remove automerge-candidate, leave evidence>
human_decision: <re-dispatch | leave | revert>
```

## Activation (operator, after this WP)

1. Confirm `ERROR_AUTOFIX_ENABLED` and `AUTOFIX_MODE` in repo variables
   (do not change them in this WP).
2. Optional: `workflow_dispatch` on a **safe** issue with mode `triage`.
3. Table-top the drills above before considering `pr` / `merge`.
