# Summary — 2026-07-09

## Executive summary

Built the autonomous daily-workflow infrastructure (the meta-goal of `workflow-planning.md`)
and then used today's `spec.md` as the first live dry-run of that workflow. All three spec
items shipped as separate PRs, CI-green and squash-merged to `main`:

- #1975 feat(day): default task list width to 600 — MERGED
- #1976 fix(day): migrate task when the reorder handle is focused — MERGED
- #1977 docs(web): document floating-ui positioning conventions — MERGED

Verified at the automated level (unit + type-check + lint + full CI incl. e2e). Live
browser QA was deferred to the staging-review stage — see Decisions.

## Before and after

| Area | Before | After |
|------|--------|-------|
| Permission surface | Only sprawling `.claude/settings.local.json` | Committed `.claude/settings.json`: daily-loop allow-list + destructive deny-list, `acceptEdits` default |
| Daily process | Stop-and-go, session-spawned, manual review | `WORKFLOW.md` rhythm: one morning question-gate, uninterrupted auto-merge window, push-notify blockers, evening simplify |
| Agent self-governance | Implicit | `workflow/agent-operating-rules.md`: model tiering, 2-attempt spike rule, resume protocol |
| Walk-away runs | Undefined | `tmux` + `caffeinate` launch recipe in `WORKFLOW.md` |
| Day task list default width | 360px | 600px (`TASK_LIST_DEFAULT_WIDTH`) |
| Migrate task via keyboard | Failed when reorder/thumb handle focused | Works from the reorder handle (focus-gate + handle `data-task-id`), covered by a new test |
| Floating/anchored UI guidance | Undocumented convention | `docs/frontend/ui-positioning.md` + docs index entry |

## Decisions

- **Floating-ui "refactor" is already done.** The codebase is fully on `@floating-ui/react`
  (tooltips, context menus, selects, floating forms, command palette). The spec's premise
  was outdated, so I did the valuable, non-redundant part — documented the convention and
  its exceptions (react-datepicker/react-select/react-toastify own their positioning;
  modals don't need it) — and deliberately did NOT add a speculative "shared middleware
  factory" abstraction.
- **Migration hotkey is `Shift+Arrow`, not `cmd+ctrl+arrow`.** The spec described the
  binding as cmd+ctrl+arrow, but Day-view migration is bound to `Shift+ArrowLeft/Right`
  (`useDayViewShortcuts`). Fixed for the real binding. Flag if a different binding was intended.
- **Default width 600 == current MAX.** Spec value equals `TASK_LIST_MAX_WIDTH`, so the
  list now opens at full width. Followed the spec as written.
- **Live browser QA deferred.** Local preview is blocked in secondary worktrees by a
  launch.json/compass.yaml port mismatch (see PO follow-ups). Given the changes are
  low-risk and well-covered by automated checks, I did not sink tokens into working around
  it; QA belongs in the staging-review stage.
- **Did not auto-commit/merge.** This is the inaugural run and it mixes workflow-infra with
  spec features on the `workflow-restructuring-proposal` branch; branch/PR strategy is a
  PO call before shipping (see PO follow-ups).

## PO follow-ups

1. **Confirm ship strategy for the spec work.** The three spec items should move to their
   own branch(es) off `main` (they're currently alongside the workflow-proposal changes).
   Recommend 3 small PRs (feat / fix / docs) or one grouped PR — your call.
2. **launch.json port-sync gap (real bug).** #1963 assigns per-worktree ports in
   `compass.yaml` (this worktree → web 9084) but does NOT sync `.claude/launch.json`
   (still 9080), so `preview_start` collides with the main checkout's server. This blocks
   smooth local browser QA in secondary worktrees — worth fixing to make the workflow's
   local-QA principle actually work in parallel worktrees. (Task chip spawned.)
3. **Interactive setup (plan Task 5):** confirm the `remote-control` subcommand, enable
   `/config` push notifications, verify `auto` permission-mode availability, and set the
   `/usage-credits` monthly cap. None of these can be done from a non-interactive session.
4. **Verify migration binding intent** — was cmd+ctrl+arrow expected instead of Shift+Arrow?

## Token spend

TODO: record `/usage` figure at end of session (not accessible from this non-interactive run).

---

# Afternoon run — spec items 1–5 (post-approval)

PO approved plan.md. Implementing 5 items, one PR each off `main`, shipping via `ship`.
Local browser QA unblocked by pointing `.claude/launch.json` Web port at this worktree's
real port (9085, from `dev:ports`) — kept LOCAL/uncommitted (the launch.json↔dev:ports
sync remains PO follow-up #2, its own task).

## Item 1 — fix(web): align logout dialog + drop stale keycap — PR #1981 (CI running)

- OverlayPanel gets opt-in `align` props (default center/end → every other consumer byte-identical).
  Logout dialog opts into left-align; buttons reordered Log out → Cancel; removed `shortcut:"z"`.
- Verified: 20 web tests pass, type-check pass, biome clean, local preview no console errors,
  palette items without a shortcut render no keycap (proves Log Out now does too).
- **Decision/flag:** DOM order == visual order means mount-focus now lands on "Log out" (was
  "Cancel"). Kept intentionally (a11y: don't desync SR order from visual). Flagged in PR for PO.
- Authed logout-dialog visual deferred to staging (anon/temp session doesn't expose Log Out).

## Item 1 — MERGED (#1981). Release pipeline green: staging deploy + health check passed

## Item 2 — fix(web): humanize user-facing copy — MERGED (#1982)

- Rewrote developer-jargon copy across loaders/toasts/errors (auth spinner → "Just finishing up …";
  de-jargoned quota/version/backend/session-expiry) while keeping every actionable instruction.
- 9 source + 6 test files (delegated the mechanical apply to a Sonnet subagent with an exact
  old→new mapping; reviewed the diff for voice). 44 web tests pass, type-check + biome clean.
- Live QA deferred to staging (strings live in OAuth-callback/failure/quota states; unit tests
  render + assert the exact text).

## Item 4 — style(week): now line only on current day's column — PR #1983 (CI running)

- CalendarNowLine positioned via left/width from today's column index + count; existing off-week
  guard kept (now `todayColumnIndex >= 0`). Day view unchanged (single column).
- Browser-verified on port 9085: Week current-week → line only under Thu (left 57.14%, width 14.28%);
  Day → full single column; next week → now-line element absent. type-check clean.

## Observation for item 3 (nudge)

- During QA, console shows pre-existing React warning "Encountered two children with the same key"
  firing on Shift+Arrow nudges → rapid nudges transiently duplicate an event `_id` in a keyed list.
  Strong lead for the item-3 lag/replay root cause; investigate there.

## Item 4 — MERGED (#1983). Release pipeline green (staging deploy + health check passed)

## Item 3 — fix(web): coalesce rapid event edits into a single write — MERGED (#1984)

- Root cause: each keystroke fired an optimistic write + a network PUT; PUTs serialize per-event
  (write-conflict avoidance) with no coalescing → burst drains one-at-a-time after the user stops
  (the lag + "replay").
- **Fix (deliberate deviation from the approved call-site-debounce plan → simpler queue-coalescing,
  the plan's named fallback):** when an edit reaches its turn and a newer edit for the same event
  is already queued, it skips its network write (the newer one persists the final state). Burst →
  1 request; per-keystroke optimistic visual untouched. ~15 lines in event.mutation.runtime.ts +
  useEventMutations.ts, no new util, no call-site changes; covers drags too.
- New unit test proves burst-of-3 → 1 write of final state, all 3 marked. 57 events tests pass
  (incl. existing serialization + undo/redo). type-check + biome clean.
- Network coalescing can't be observed in local/anon mode (IndexedDB, not network) — proven by unit
  test; optimistic visual preserved by construction.
- Spawned PO-follow-up chip (task_77953d99): pre-existing React duplicate-key warning during nudges
  (optimistic churn) — console-only, out of scope for this focused change.

## Item 5 — style(forms): extract a shared EventFormShell — PR #1985 (CI running)

- Both forms hand-rolled the same outer <form> styling; extracted to content-agnostic EventFormShell
  (packages/web/src/views/Forms/EventFormShell.tsx). Someday keeps its larger text via a text-xl
  className the shell merges → visually identical. Floating wrappers left per-form (out of scope).
- 48 Forms tests pass; type-check + biome clean; browser-verified the timed Event Form renders via
  the shell with exact expected classes, no console errors.
- Net reduction in duplication; removed 3 now-dead imports.

## Decisions (this run)

- Item 1: mount-focus now lands on "Log out" (DOM==visual order); kept for a11y (don't desync SR
  from visual). Flagged in PR for PO.
- Item 3: chose queue-coalescing over call-site debounce (simpler, PO's #1 priority). Documented.
- Item 5: preserved someday's text-xl rather than unifying font size (looked intentional). Flagged.
- Local QA: pointed .claude/launch.json Web port → 9085 (this worktree's dev:ports port) to unblock
  preview; LOCAL/uncommitted. The launch.json↔dev:ports sync is still the real fix (PO follow-up #2).

## PO follow-ups (this run)

1. Item 1: OK that logout dialog initial focus is "Log out" (vs "Cancel")? (a11y trade-off, flagged in PR)
2. Item 3: pre-existing duplicate-key React warning during nudges — chip spawned (task_77953d99).
3. Item 5: unify the two forms' text size, or keep someday larger? (kept larger)
4. Still open from earlier: launch.json↔dev:ports port sync (#1963 gap) blocks parallel-worktree local QA.

## Wind-down (all 5 items complete)

- ALL FIVE spec items shipped, CI-green, squash-merged to main, and deployed to staging:
  #1981 (logout dialog) · #1982 (copy) · #1983 (now line) · #1984 (nudge coalescing) · #1985 (form shell).
  Items 1–4 release pipelines confirmed green (staging deploy + health check). Item 5 release deploying.
- Evening simplify pass over the day's combined diff (git diff ed9011b29..HEAD): **nothing to change.**
  The five changes are in disjoint areas with no cross-cutting duplication; each was already simplified
  in its ship pipeline (item 5 was itself a de-duplication). Only near-candidate — a 1-line "find self by
  variables" shared by two mutation-runtime functions — deliberately left inline (extracting is net-neutral
  and couples two intentionally-different cache queries). No cleanup PR (an empty one would be noise).

## Next step (for tomorrow / if resumed)

- Nothing outstanding on today's spec — all 5 done. Confirm item-5's staging deploy went green (release
  run was mid-deploy at wind-down).
- Address the 4 PO follow-ups above (esp. #2 duplicate-key chip task_77953d99 and #4 launch.json↔dev:ports).

## Token spend

- TODO: record `/usage` figure (not accessible from this non-interactive session).

---

# Item 6 (new handoff) — feat: allow events to have empty title (#1871)

PO approved the plan (leave existing "untitled" events; empty = fully blank block, keep a11y label).

## What shipped

- **Root cause:** `gEventDefaults.summary = "untitled"` in `packages/core/src/mappers/map.event.ts`
  — Google omits `summary` for titleless events, so the default landed in `title`.
- **Change 1** `map.event.ts:169`: default `summary` `"untitled"` → `""`.
- **Change 2** `event_new.types.ts:49`: `title` `StringV4Schema` (nonempty, shared) → its own `z.string()`
  so the v4 schema / its Mongo validator won't reject `""` if that collection goes live.
- **Tests:** added two `toCompass > title` cases (absent summary → `""`; real summary preserved).
- **No frontend changes:** cards already render blank for empty titles ("Untitled event" is aria-label
  only — matches PO's choice); forms + web schemas already accept empty. Outbound is a PUT, so an
  omitted summary clears the title in Google (desired round-trip) — left as-is.

## Validation

- `bun run test:core` → **147 pass, 0 fail** (incl. new title cases).
- `bun run type-check` → **clean**.
- Backend/web jest could NOT run locally: pre-existing stale worktree
  `<mainRepo>/.worktrees/refactor-unify-floating-event-forms/` duplicates `packages/web/__mocks__/*`,
  crashing jest's haste-map (0 tests run, all suites). Unrelated to this change; CI runs clean.
  → Relying on CI for backend/web suites (the always-on gate).

## Decisions (this item)

- No inbound "untitled"/"(No title)" normalization (PO: leave existing events).
- Gave `title` its own `z.string()` rather than relaxing the shared `StringV4Schema` (keeps gEventId,
  rrule, etc. strict).

## Backlog rec (not a PO decision — FYI)

- Stale nested worktree `.worktrees/refactor-unify-floating-event-forms/` in the MAIN checkout blocks
  local backend/web jest (haste-map duplicate-mock collision). Either `git worktree remove` it once its
  branch is merged/abandoned, or add `.worktrees` to jest `modulePathIgnorePatterns`. Not touched here
  (removing another branch's worktree is destructive).

## Item 6 — SHIPPED (#1990, MERGED → v1.0.95)

- PR #1990 `feat(core): allow events to have empty title` squash-merged to main.
- CI fully green incl. `unit (backend)` + `unit (web)` (the suites that couldn't run locally due
  to the stale-worktree haste-map collision — confirmed clean on CI's fresh checkout).
- Release pipeline green: docker publish → staging deploy → health checks (staging-cloud +
  staging-selfhosted) all passed. Release tag **v1.0.95**.
- Correctness review (medium): no issues. Simplify: nothing to change (already minimal).

## Next step (for tomorrow / staging review)

- Today's spec (single item #1871) is COMPLETE. Nothing outstanding to implement.
- **Sequenced browser QA** (needs authed Google-synced account — not reproducible locally):
  create a titleless event → saves as a blank block, shows empty title on reopen, appears in
  Google as "(No title)", and stays blank after editing its time in Google. Run during the
  staging review or a `/qa-staging` sweep.

## PO follow-ups (this item)

- (FYI backlog, not a decision) Stale nested worktree `.worktrees/refactor-unify-floating-event-forms/`
  in the MAIN checkout breaks local backend/web jest (haste-map duplicate-mock). `git worktree remove`
  it once its branch is done, or add `.worktrees` to jest `modulePathIgnorePatterns`.
