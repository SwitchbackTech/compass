---
name: ship
version: 3
owner: compass-maintainers
last_verified: 2026-09-07
description: Take the current branch from working tree to a ready, labeled PR that GitHub merges. Use when the user says "ship" or a loop prompt reaches the PR step.
---

# Ship

Status lives on the GitHub issue (labels, open PR, closed state). Nothing in
the repo records it.

## Steps

1. **Preflight.** `git status`; work on a branch off `origin/main`, never on
   `main`; `gh auth status`; find any existing PR for the branch.
2. **Verify.** `bun run verify --strict`. Fix failures and rerun, at most two
   retries. `VERDICT: INCOMPLETE` means Chromium is missing: run
   `bunx playwright install chromium` and rerun. Never label a PR without
   `VERDICT: PASS` and never weaken a test, widen a timeout, or change test
   order to get there.
3. **Self-check.** Read the complete base-to-head diff as a stranger would:
   state, races, cleanup, keyboard and focus paths, accessibility, auth,
   data loss. If the diff added more than a screen of new abstraction, run
   the `simplify` skill. Confirmed problems become isolated fix commits, then
   rerun step 2.
4. **PR.** Open a **draft** PR against `main` using
   `.github/PULL_REQUEST_TEMPLATE.md`: `Fixes #N`, what changed and why, the
   pasted `VERDICT:` line and checks run. No unchecked manual-testing boxes.
   Mark it ready only after `VERDICT: PASS`; reviews run on ready PRs only,
   so a draft that never becomes ready is a stop, not a handoff.
5. **Label and stop.** Mark the PR ready and add `agent-automerge`. The merge guard enables GitHub
   auto-merge; GitHub squash-merges when required checks pass and the merge
   launches the next work package. Do not merge yourself, wait on CI,
   close/reopen the PR, push empty commits, or merge `main` in just to re-run
   CI (merge `main` only for a real conflict).

## Escalate

Comment on the issue with the decision needed, the recommended option, and
the cost of waiting, then label `agent-loop-needs-human`. Reasons: product
ambiguity, production deploy, secrets, OAuth grants, deletion, access grants,
verify still failing after two retries.

## Anti-patterns

See [`anti-patterns.md`](../anti-patterns.md).
