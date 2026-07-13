---
name: qa-ux-sweep
description: Proactively explore the app's recently-changed surfaces like a first-time user, looking for usability, accessibility, and UX friction (confusing focus order, missing labels, awkward keyboard paths, unclear states) that automated tests wouldn't catch - then fix what's fixable and ship it through the normal PR flow, same ship autonomy as any role session. Use when the user says "/qa-ux-sweep", "find UX bugs", "check for a11y issues", "play with the app and find problems", or when invoked by a role session after a PR ships, or by cleanup (over the merge window).
---

# qa-ux-sweep

The proactive counterpart to `qa-a11y-audit` (which reviews a diff statically) and
`qa-test-staging` (which checks that staging didn't break). This skill actually
**drives** the recently-changed surfaces of the app like someone using it for
the first time, looking for friction a diff review or a breakage check would
miss: a focus ring that never appears, a control with no accessible name, a
drag interaction with no keyboard equivalent, an empty state that doesn't
explain what to do next.

**This skill is not diff review.** Don't read code and infer how it behaves —
open it in the browser and interact with it the way a real user would, the
same standard `ship` and `qa-test-staging` hold themselves to.

Findings get fixed autonomously, same posture as any autonomous role session:
no task chips, no waiting for a human to triage first. See
`team/operating-rules.md` → "I own follow-up decisions."

## 0. Determine scope

Figure out which surfaces actually need exploring — never wander the whole
app by default, that's expensive and unfocused. How you scope depends on how
this skill was invoked:

- **On-demand, no args**: diff the current branch/worktree against `main`
  (`git diff main...HEAD --stat`). If there's nothing local, fall back to the
  most recently merged PR (`gh pr list --state merged --base main --limit 1`).
- **Called from a role session** (after a task's PR ships): scope to that PR's
  diff alone — `gh pr diff <number> --name-only`.
- **Called from `/cleanup`**: scope to the whole review window,
  `START..END` from the cleanup marker (same range `cleanup` already
  established) — `git diff START..END --stat`.

Map the changed file paths under `packages/web/src` to the routes/flows they
affect — e.g. `WeekView/*` → open week view and exercise it; `Someday/*` →
open the someday list; a shared component (`Button`, `Tooltip`, a hook) →
check every surface that renders it, not just one. If a diff touches only
non-UI code (backend, core schema, scripts, tests), say so and skip the
browser walkthrough entirely — there's nothing to explore.

## 1. Start the dev server and open it in Chrome

Same convention as `ship` — use `claude-in-chrome`, not `preview_*`. This
skill needs the real console/network visibility other skills already rely on,
and reuses the same session state.

1. Check `.claude/launch.json` for the current web dev command/port (confirm
   rather than assume — it can change). Start it with Bash `run_in_background`
   if it isn't already running, and poll until it's actually serving.
2. Load the Chrome tools if deferred, one batched call:
   `ToolSearch("select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__read_console_messages,mcp__claude-in-chrome__read_network_requests,mcp__claude-in-chrome__find")`.
3. `tabs_context_mcp` (`createIfEmpty: true`), `tabs_create_mcp`, `navigate`
   to the local dev server, at the route for the surface in scope.

## 2. Explore like a first-time user

For each surface in scope, work through this checklist live — don't just
read the DOM, actually operate it with `computer` and confirm with
`read_page` (`filter: "interactive"`) plus screenshots:

- **Keyboard-only pass**: `Tab`/`Shift+Tab` through the surface. Is every
  interactive element reachable? Is the focus order sane (matches visual/DOM
  order)? Is there always a visible focus ring? Can every mouse-only action
  (drag to create/resize an event, drag-reorder a someday item) also be done
  from the keyboard, or does it have no equivalent at all?
- **Accessible names**: for icon-only buttons, custom controls, and anything
  that isn't a native `<label>`-connected input, check `read_page`'s
  accessible-name output. Borrow the exact checklist from `qa-a11y-audit`
  (semantics, labels, ARIA correctness, contrast) but apply it to what's
  actually rendered, not to a diff.
- **State coverage**: trigger the empty state (e.g. a day/week with nothing
  on it), a loading state if one is reachable, and an error state if you can
  induce one safely (e.g. a bad network condition isn't worth faking — skip
  states you can't reach without destructive action). Is each state
  understandable on its own, or does it look broken/blank?
- **First-run confusion check**: for anything new or changed, ask "would
  someone who's never seen this before know what to do?" — unlabeled icons,
  ambiguous empty states, and hover-only affordances (nothing tells a
  keyboard/touch user they exist) are the recurring failure modes here.
- Reference `e2e/utils/{event-test-utils,task-test-utils,test-constants}.ts`
  for this app's existing selector conventions so you're not fighting the
  test-id scheme while exploring.

Watch `read_console_messages` and `read_network_requests` throughout — a
silent thrown error or failed request during an interaction is a finding even
if the UI looked fine.

## 3. Triage findings

Sort what you found into:

- **Fixable now** — a missing `aria-label`, a focus ring suppressed by a
  stray `outline: none`, a `div` with a click handler that should be a
  `button`, a keyboard equivalent that's a small addition to existing drag
  logic, an empty state missing a one-line hint.
- **Needs a product/design call** — anything where the "right" fix isn't
  obvious from the code alone (a whole new interaction pattern, a copy
  rewrite that changes tone, a layout decision). Don't guess at these.

## 4. Fix autonomously, same posture as any role session

For each **fixable-now** finding:

1. Fix it directly. Keep the fix scoped to that one finding — don't bundle
   unrelated findings into one PR.
2. Run `bun run type-check` and the relevant test suite for what you touched.
3. Ship it through the **`ship` skill** — validates in Chrome, runs the
   correctness review, opens the PR (Manual Testing Steps included), watches
   CI, squash-merges once green. Don't reimplement any of that here.

For each **needs-a-decision** finding: don't force a fix. Follow the same
push-notify-vs-log rule as any role session
(`team/operating-rules.md` → "When to push-notify vs. log-and-continue") —
log it, don't spawn a task chip, don't idle waiting for an answer.

Never use `spawn_task` for anything found here — this skill inherits the
"I own follow-up decisions" rule from `team/operating-rules.md`, whoever
invoked it.

## 5. Report

- **Run inside a role session or `/cleanup`**: append what you found and fixed
  to the QA daily note, `team/qa/notes/<date>.md` — under Decisions for what
  shipped, under Founder follow-ups for anything needing a call.
- **Run on-demand**: print a short report grouped the same way `qa-test-staging`
  does — fixed (with PR links), needs-a-decision (flagged, not asserted as a
  bug), and clean (surfaces explored that had nothing wrong, so scope is
  visible, not just failures).
