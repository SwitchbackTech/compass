---
name: ship
description: Ship the current branch end-to-end - validate the change in a local Chrome preview, open a non-draft PR with a lower-case conventional-commit title, watch CI and push fixes for any failures, squash-merge once green, then watch the post-merge GitHub Actions on main (release tag, docker publish, staging deploy, health check). Use this whenever the user says "ship this", "ship it", "ship the branch", or asks to take the current work from local changes all the way to a merged, deployed PR instead of doing each step manually.
---

# Ship

A full pipeline from "this works on my machine" to "it's merged and main is
healthy." Each stage below gates the next one — do not skip ahead if a stage
is inconclusive. The point of this skill is to replace a string of manual
steps with one supervised run, not to rubber-stamp a merge.

## 0. Pre-flight

- Confirm the current branch is not `main`. If it is, stop and tell
  the user — there's nothing to ship from main itself.
- `git status` / `git diff` to see what's actually changed. If there are
  uncommitted changes, they need a commit before anything else (see step 2
  for message format).
- If the diff touches `packages/core`, remember per this repo's CLAUDE.md
  that core/schema changes usually need coverage across core, web, backend,
  and type-check — not just the package you were actively working in.

## 1. Validate locally in the user's real Chrome

This is the step that catches what type-checking and unit tests can't:
does the feature actually work when a user clicks through it? Use the
`claude-in-chrome` tools here, not the `preview_*` tools — `preview_*`
drives an isolated, headless browser instance the user never sees, while
`claude-in-chrome` connects to the user's actual installed Chrome (their
real profile, session, and rendering). The whole point of this step is
"does this look right in the browser I actually use," so it has to be the
real one.

1. `claude-in-chrome` doesn't manage dev servers, so start it yourself
   first. Check `.claude/launch.json` for the right command/port (web is
   `bun run dev:web` on port 9080 as of this writing — confirm rather than
   assume, since it can change). Run it with Bash `run_in_background`, then
   poll until it's actually serving before touching the browser.
2. Load the Chrome tools if they're deferred:
   `ToolSearch("select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__read_console_messages,mcp__claude-in-chrome__read_network_requests")`.
3. `tabs_context_mcp` (with `createIfEmpty: true`) then `tabs_create_mcp` to
   open a fresh tab for this session, `navigate` to the local dev server.
4. Before clicking anything, look at what the diff actually branches on —
   new conditionals, boundary values (empty/null/min/max), state
   transitions (loading→loaded, anon→authed, online→offline,
   draft→persisted), and for bug fixes, the exact repro scenario. That's
   your edge-case list, not generic boilerplate like "test on mobile"
   unless the diff actually touches responsive behavior.
5. Exercise the golden path for whatever the change touches, plus 2-4 edge
   cases from that list, using `computer` to click/type and `read_page` /
   `get_page_text` to confirm what rendered.
6. As you go, write down each step in reviewer-facing language: the URL or
   view you were on, what you clicked/typed, and what rendered or happened
   as a result. No internal function/variable/file names — describe it the
   way a user would see it. This log becomes the PR's Manual Testing Steps
   section in step 2, so capture it while it's fresh instead of
   reconstructing it from memory afterward.
7. Check `read_console_messages` and `read_network_requests` for errors the
   UI wouldn't otherwise surface.
8. If something's broken, fix it and re-check before moving on. Don't open
   a PR on unvalidated code — that just moves the discovery of the bug to
   CI or to review, which is slower for everyone.
9. Skip the browser walkthrough only if the change genuinely isn't
   observable in a browser (e.g., a backend-only script, a type-only
   change) — say so explicitly rather than silently skipping. In that
   case, still produce the equivalent record from step 6, but as CLI/API
   commands a reviewer can run themselves (e.g., a script invocation and
   its expected output) rather than clicks. Never skip the record itself.

## 2. Commit, push, and open the PR

**Commit message and PR title are the same string**, lower-case
Conventional Commits, matching this repo's actual history (check `git log
--oneline -15` if unsure of the current pattern):

```
<type>(<scope>): <description>
```

- `type`: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `deps`
- `scope`: the package/area touched — `web`, `core`, `backend`, `scripts`,
  or omitted for repo-wide changes
- `description`: lower-case, imperative, no trailing period

Examples from this repo: `refactor(web): convert redux to zustand`,
`fix(web): all-day clicks`, `feat: migrate day-events read to tanstack
query`.

Steps:

1. `git add` the relevant files (never `-A`/`.` blindly — check what you're
   staging), commit with the message above.
2. Push the branch: `git push -u origin <branch>`.
3. Open a **non-draft** PR (just omit `--draft` — that's the default):
   `gh pr create --title "<same lower-case conventional string>" --body "..."`.
   Body must have three sections, in this order: `## Summary`,
   `## Manual Testing Steps`, `## Test plan`.
   - `## Summary` — what changed and why.
   - `## Manual Testing Steps` — unchecked boxes (`- [ ]`). These are steps
     a *human reviewer* still needs to perform themselves, which is why
     they're unchecked even though Claude just did them in step 1. Pull
     this straight from step 1's recorded log:
     - Golden path first, then the 2-4 diff-derived edge cases.
     - User-observable terms only: URLs, what to click/type, what should
       render or happen. No function/variable/file names — a reviewer
       with zero context on the code should be able to follow it without
       reading the diff.
     - If step 1 fell back to CLI/API steps (not browser-observable), use
       those instead — same principle, different medium. This section is
       never omitted, even for backend-only or type-only changes.
   - `## Test plan` — checked boxes (`- [x]`) for automation actually run:
     unit/e2e commands, pass/fail counts, flake reruns (see recent PRs via
     `gh pr view <n> --json body` for a concrete reference). This is the
     automated counterpart to Manual Testing Steps, not a restatement of
     it — don't blur the two together.

## 3. Watch CI, fix what breaks

This repo's PR checks are: `type-check` and a `unit` matrix
(core/web/backend/scripts) from the `Test` workflow, plus `e2e` (Playwright)
on `pull_request`. CodeQL analysis also runs as a check. Don't hardcode
these names as the only source of truth, though — always read the live
check list, since workflows can change.

1. `gh pr checks <pr-number> --watch` blocks until every check finishes.
2. If everything passes, move to step 4.
3. If something fails, pull the failure detail rather than guessing:
   `gh run view <run-id> --log-failed`. Reproduce locally with the matching
   focused command from this repo's defaults (`bun run test:web`,
   `bun run test:core`, `bun run test:backend`, `bun run test:scripts`,
   `bun run type-check`, or `bun run test:e2e`) so you're not iterating
   against CI's slower feedback loop.
4. Fix the root cause, not the symptom. Commit the fix with its own
   lower-case conventional message (it'll be squashed into the final PR
   commit, so it doesn't need to match the PR title) and push.
5. Go back to step 3.1 and watch again. Repeat until green.
6. If a failure isn't something you can fix confidently (flaky
   infrastructure, an ambiguous product decision, a failure outside the
   diff's blast radius), stop and surface it to the user instead of forcing
   a fix. Guessing at a fix for something you don't understand just trades
   one CI failure for a worse one later.

## 4. Merge

Only merge once CI is fully green and you're actually confident in the
change — "confident" means you understand every fix you made along the way,
not just that the checks happened to pass. This repo squash-merges PRs (its
history is one commit per PR, titled `type(scope): description (#NNNN)`),
so the default squash subject already matches what you need:

```
gh pr merge <pr-number> --squash --delete-branch
```

If you're not confident — the fix in step 3 felt like a guess, or CI is
green but something about the Chrome validation still nagged at you — say
so and let the user decide whether to merge. This gate is about your own
confidence in the change, not about whether a human has re-run the PR's
`## Manual Testing Steps` checkboxes — those are for reviewers to use after
merge review, not a pre-merge blocker for `ship` itself. A merge to `main`
in this repo immediately kicks off a real deploy pipeline (see step 5), so
this is not a reversible-for-free action.

## 5. Watch what happens after merge

Merging to `main` triggers `release-on-main.yml`: it tags a new patch
release, publishes Docker images, deploys to staging, then runs a staging
health check. Separately, the `Test` workflow's `push` trigger also runs
against `main`.

1. Give GitHub a few seconds to register the push, then find the run:
   `gh run list --branch main --limit 5`.
2. Watch the release workflow through to completion:
   `gh run watch <run-id>` (find the `Release on main` run id from the list
   above).
3. If `tag-release`, `publish-docker-images`, `deploy-staging`, or the
   health check fails, treat this as a deploy incident, not a normal CI
   failure — report it to the user immediately with the failing job and
   logs rather than attempting an autonomous fix. This is shared
   infrastructure (a broken staging deploy affects everyone), so a human
   should be in the loop on remediation.
4. If everything is green, report the release tag and confirm staging
   health passed — that's the actual signal the ship succeeded, not just
   "the merge button worked."
