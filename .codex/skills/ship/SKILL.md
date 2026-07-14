---
name: ship
description: "Ship the current Compass branch end-to-end: validate locally in Chrome when user-visible, review and simplify the diff, commit and open a ready PR, monitor and fix CI, squash-merge when safe, then monitor the main-branch release, staging deploy, and health check. Use when the user says ‘ship’, ‘ship it’, ‘ship this branch’, or asks to take current Compass work through merged and verified delivery."
---

# Ship Compass

Take the current Compass change from working tree to a healthy merged and deployed result. Treat each stage as a gate; pushed or CI-passed is not shipped when merge or release work remains.

## Guardrails

- Read applicable `AGENTS.md` instructions first. Keep unrelated changes untouched; stage explicit paths only.
- Use the current feature branch. Stop on `main`; never force-push, bypass protection, dismiss review, or weaken tests.
- Use repository commands from `AGENTS.md`. Do not assume ports, check names, or workflow names without inspecting the live configuration.
- Stop before merge for an ambiguous product decision, unconfirmed correctness, unrelated CI/infrastructure failure, or incomplete confidence.

## 1. Preflight and scope

1. Inspect branch, status, complete diff against the base, recent commits, remotes, and any existing PR. Fetch the base; rebase only if safe and needed.
2. Confirm every changed file is in scope. Identify affected web, core, backend, scripts, contracts, auth, persistence, accessibility, responsive behavior, and release surfaces.
3. Treat a `packages/core` or shared-schema change as cross-package: cover affected core, web, backend, and type checking.
4. Confirm `gh` is available and authenticated before depending on it.

Resume at the earliest incomplete gate for a partially shipped branch.

## 2. Validate observable behavior

For browser-observable changes, read and use the available Chrome-control skill. Prefer the user's real Chrome profile/session. Read `.claude/launch.json` to choose the development command and confirm the served URL from its output (web currently uses `bun run dev:web` on port 9080, but verify it).

1. Open a fresh local tab and exercise the golden path.
2. Derive 2–4 edge cases from the diff: boundaries, new conditionals, state transitions, and the exact bug reproduction. Avoid generic cases unrelated to the change.
3. Check browser console and network failures when exposed.
4. Record reviewer-facing steps while testing: URL/view, user action, and observable result. Use these unchanged as unchecked PR manual-test steps.

For changes not observable in the browser, run and record an equivalent CLI or API scenario. Never silently skip this validation record. Re-run the affected scenario after a user-visible fix.

## 3. Review correctness

Review the full branch diff, not only unstaged files. Look for state/race/cleanup errors, boundaries, keyboard/pointer/scroll/focus regressions, accessibility, security/privacy/auth/data-loss risks, and missing regression coverage.

Use the repository’s diagnosis or review skill when applicable. Fix confirmed defects; surface plausible but uncertain findings instead of guessing. State plainly when no correctness issues are found.

## 4. Commit implementation

Run relevant focused checks. Commit in-scope implementation before simplification with a lower-case conventional message:

```
<type>(<scope>): <imperative description>
```

Use scopes such as `web`, `core`, `backend`, or `scripts` where helpful. Check recent history when unsure. Do not rewrite published history without explicit authorization.

## 5. Simplify separately

Use `codex-simplify-code` on the diff from the base branch. Reduce duplication, nesting, speculative abstractions, and unnecessary React effects, refs, or state without altering behavior. Keep one-off logic inline when extraction obscures it.

- Make a separate lower-case conventional commit only if simplification changes files.
- Revalidate user-visible behavior after behavior-adjacent cleanup.
- For React changes, run `react-doctor`; for UI changes, use `codex-a11y-audit` when warranted.
- Capture what changed, or that no simplification opportunity existed, and justify any retained or new `useEffect`, `useRef`, or `useState` for the PR.

## 6. Final local gate

Run checks chosen from the actual diff and repository guidance. At minimum run focused regression tests, affected type checking, and lint; run broader package tests for shared contracts. Use `bun run verify` only after inspecting its selected checks. Confirm the diff and worktree are clean except for intentional, committed work; distinguish new failures from existing warnings.

## 7. Push and open a ready PR

Rebase only when necessary and safe, then repeat impacted checks. Push with upstream tracking. Reuse an existing PR or create a non-draft PR titled with the implementation’s lower-case conventional message.

Use these sections in order:

```markdown
## Summary

## Simplicity

## Manual Testing Steps
- [ ] Reviewer-visible golden-path and diff-derived edge-case steps

## Test plan
- [x] Commands actually run
```

Write manual steps in user-observable language—never function, variable, or file names. Close the originating issue only when unambiguous.

## 8. Monitor CI and feedback

Read the live PR checks; this repository commonly runs type checking, package unit tests, E2E, and CodeQL, but workflow names may change. Watch to completion. For failures, inspect logs first, reproduce with the nearest focused local command, fix the root cause in a separate commit, push, and watch again.

Inspect unresolved review threads or requested changes. Address actionable feedback only. Pause for flaky infrastructure, out-of-scope failures, or uncertain fixes.

## 9. Squash merge

Merge only when required checks and reviews are satisfied, the PR targets the expected base, and local validation supports confidence. Compass normally squash-merges; use the repository’s observed strategy and delete the remote branch only when normal. Never merge on a guess.

## 10. Monitor main release

After merge, capture the merge SHA and watch workflows triggered by that SHA on `main`. `release-on-main.yml` currently tags a patch release, publishes Docker images, deploys staging, and performs a health check; the test workflow also runs on `main`. Verify the release tag and staging health.

Treat tag, publication, deployment, migration, or health-check failures as incidents. Report the failing job and logs; do not make autonomous production or infrastructure changes.

## Report

Lead with the shipped result. Include the PR and merge result, implementation and simplification commits, local/manual validation, PR CI, post-merge release/deployment result and tag, plus pre-existing warnings or follow-up risks. Emit git directives only for actions that actually succeeded.
