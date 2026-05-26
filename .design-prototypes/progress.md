# Planner Sidebar Redesign — Progress

Raycast-style refinement of `PlannerSidebar`. Plan:
`~/.claude/plans/here-is-what-i-tingly-diffie.md`. Prototype:
`./sidebar-redesign.html`.

## Decisions locked with the user (before coding)

- **Sections stay always expanded** — count badge only, no collapse/chevron. Collapsing
  was rejected because the someday drag/drop engine requires events to stay mounted and
  measurable; a collapse would have to hide-not-unmount, adding state + risk for little gain.
- **Footer sync line reflects real `useConnectGoogle().state`**: "Synced with Google" + green
  dot (HEALTHY), "Syncing…" (IMPORTING/checking/repairing), "Reconnect needed"
  (RECONNECT_REQUIRED), "Repair needed" (ATTENTION), no second line when NOT_CONNECTED. The
  checking state also shows a tiny loading ring so the metadata lookup feels active.
- **No avatar** — the app has no user avatars.
- **No `↵` row hint** (was in the prototype). The row hover-right area is already taken by
  migrate-back/forward buttons; a hint would collide with a more useful affordance. Trade-off:
  migrate buttons kept, hint dropped.
- **Footer sync line is NOT `role="status"`** — the authoritative status indicator is
  `HeaderInfoIcon` in `#cal` (e2e: `sidebar-connection-status.spec.ts`). Footer line is plain
  text so it can't collide with that suite's `role="status"` label queries.

## UPDATE: account identity lives just above the footer (all account types)

Final placement (after several rounds of user feedback): the account identity — both the
**authenticated** email + sync line AND the **temporary-account** sign-up prompt — sits in a
single `shrink-0`, `border-t` band between the scroll region and `PlannerSidebarActions`, so it
stays pinned just above the footer regardless of someday-list length. No top slot, no
`placement` prop. The footer is actions-only (shortcuts left, command/update right, `h-12`).
Compact treatment (no avatar) unchanged.

(History: this moved top → split-by-type → finally settled on always-bottom per the user.)

## Files changed

Source:
- `PlannerAccountSummary/PlannerAccountSummary.tsx` — compact identity block (layout-neutral,
  `w-full`, no `flex-1`). Signed-in accounts read `useConnectGoogle().state`; render truncated email + a sync line
  ("Synced with Google" + green dot when HEALTHY, "Syncing..." while importing/checking/repairing,
  "Reconnect needed" for reconnect-required, "Repair needed" for attention, no line when
  NOT_CONNECTED). The checking state includes a tiny motion-reduced loading ring. Temp account
  keeps the "Temporary account · Sign up" CTA.
- `PlannerSidebar.tsx` — renders `<PlannerAccountSummary />` in the fixed bottom account band
  between the scroll region and `PlannerSidebarActions`.
- `PlannerSidebarActions/PlannerSidebarActions.tsx` — unchanged from original layout (actions
  only): shortcuts on the left, command palette + conditional update on the right, `h-12`.
- `SomedayEventSections/SomedaySectionHeader/SomedaySectionHeader.tsx` — NEW shared header
  (label `<h2>` + count badge pill shown when count > 0). The header keeps a fixed 18px minimum
  height so the badge appearing on first data load does not push the rows. Badge text includes a
  screen-reader-only "item/items" suffix.
- `SomedayWeekSection/SomedayWeekSection.tsx` and `SomedayMonthSection/SomedayMonthSection.tsx`
  — read the sidebar-local someday row counts and render via `SomedaySectionHeader`, so badges
  match optimistic add/drag/reorder state instead of lagging behind Redux.
- `SomedayEvents/SomedayEvent/styled.ts` — compact rows use a 30px border-box height, 2px
  vertical margins, and 3px/8px padding. The exported row footprint is 34px and is shared with
  the cold-start reserve hook.
- `SomedayEventsContainer/AddSomedayEvent.tsx` — dashed full-width button replaced with a
  minimal left-aligned "Add item" row; accessible labels are "Add item to week" / "Add item to month".

Tests:
- `PlannerAccountSummary.test.tsx` — added `useConnectGoogle` mock (mutable state); added
  sync-line + no-`role=status` + hidden-when-not-connected cases.
- `SomedayEventSections.test.tsx` — `useAppSelector` mock now returns `0` (count) instead of
  `true`.
- `PlannerSidebar.test.tsx` — keeps the `PlannerAccountSummary` mock + "Account summary"
  assertion (identity is rendered by `PlannerSidebar` in the bottom account band).
- `PlannerSidebarActions.test.tsx` — unchanged (no longer renders the identity).
- `SomedaySectionHeader.test.tsx` — covers the fixed header height with and without a count.
- `useSomedayColdStartReserve.test.tsx` — covers cached reserve height, first-row fade arming,
  empty-load disarming, one-read cache behavior, fade duration alignment, and re-persisting the
  stable count after add/remove changes.
- `SomedayEventsContainer.test.tsx` — covers the compact "Add item" buttons keeping their
  visible text in the accessible names.
- `SomedayEvent.test.tsx` — covers the exported 34px row footprint used by the reserve.

## Decisions / trade-offs made during implementation (beyond the plan)

- **Extracted a shared `SomedaySectionHeader` component** instead of inlining the badge in
  each section (the plan described inline markup). Avoids duplicating the header + badge in
  two places and keeps the badge styling in one spot.
- **Count badge is a subtle pill** (`bg-white/[0.07]` rounded-full, muted tabular-nums)
  rather than a bare span — matches the Raycast feel from the chosen prototype.
- **Tightened the header bottom margin** `mb-3` → `mb-2` to suit the more compact rows.
- `SOMEDAY_DROP_ZONE_ROW_SLOT_HEIGHT` (36, in `SomedayEventsContainer.tsx`) was left unchanged —
  no visible drop-zone gap warranted touching the drag math. Revisit only if visual QA shows a gap.
- Temp-account row no longer has its own `border-b` (the footer's `border-t` is the divider now).

## Cold-start layout shift (someday list)

To stop the someday sections from jumping as rows pop in on first load, added a
**min-height reserve + one-time fade**, scoped to **cold start only** (week/month navigation
is left as an instant swap), per the user's choice.

- `SomedayEventsContainer/somedayCountCache.ts` — NEW. Persists the last-known row count per
  column in `localStorage` (`compass.someday.count.<col>`), best-effort.
- `SomedayEventsContainer/useSomedayColdStartReserve.ts` — NEW hook. While the first fetch is
  in flight and the column is empty, reserves `lastCount × 34px` (shared row footprint). Cold
  start ends when the fetch settles or data arrives (with a 2s safety timeout); then it
  persists the fresh count, and also re-persists later stable count changes so add/remove before
  a reload does not leave a stale reserve.
- `SomedayEventsContainer.tsx` — wraps the event rows in a div that carries the reserved
  `min-height` and passes a first-row fade flag to rows on the render where they first
  appear during cold start (plays once; navigation never re-triggers it).
- `index.css` — added the `--animate-someday-cold-fade-in` token (600ms opacity-only fade
  with a softer easing curve) and its keyframes; also set to `none` under
  `prefers-reduced-motion`.

Decisions/trade-offs:
- Reserve wraps only the rows (not the "Add item" row), so "Add item" sits at its final
  position from the start and rows fill the reserved space above it — no Add-item jump.
- The rows wrapper is `flex flex-col` so the rows' vertical margins do NOT collapse; this makes
  the rendered height exactly `count × 34px`, matching the reserve so releasing it is a no-op.
  (Browser trace confirmed: 2 rows = 68px reserve = 68px actual, nothing below moves.)
- Residual row shift is still possible on a true first-ever load with no cached count, but the
  cache self-corrects after normal add/remove.

### Fade rework (the reserve was right but the fade "popped")

Measured the cold start with Playwright (`getAnimations()` / computed opacity). Two bugs:
1. **Wrong layer + too fast.** The fade lived on the persistent wrapper and was short, so it
   played during the load-jank window and finished before the eye landed → looked like a pop.
2. **StrictMode + wrong gate.** The render-phase ref latch was consumed by StrictMode's double
   render, and `isColdStart` ends on the fetch-`isProcessing` flag which flips to idle *before*
   the events propagate into the sidebar store — so by the time rows mounted the gate was off.

Fix:
- Fade moved to each **row's** mount (`SomedayEventItem`'s outer div), so the browser plays a
  real mount animation (compositor-driven opacity) that can't be outrun by main-thread jank.
  The row captures the flag at mount via a ref, so it plays exactly once and never replays on
  re-render/reorder.
- `useSomedayColdStartReserve.ts` owns both reserve and row-enter lifecycle. It lazily reads the
  cached count once per mount, keeps a short grace period for success/entity updates that land in
  separate renders, arms the row fade only for the first cold-start row render, and disarms on a
  settled empty load so later user-created rows do not play the cold-start fade.
- `--animate-someday-cold-fade-in` is now **600ms, opacity-only** (no transform, so it can't
  conflict with the row FLIP reorder transition); `none` under reduced motion.
- Plays on **every fresh mount / page refresh** (each refresh re-mounts → hook re-arms), per the
  user's request — not just the very first cold start.
- Browser trace confirmed: row mounts at `opacity:0`, `somedayColdFadeIn` runs `state:running`
  for the full 600ms, opacity ramps 0→1 smoothly on a warm refresh under StrictMode.

## Verification

- Unit tests (each file run in its own process, matching the project runner): all pass —
  PlannerAccountSummary (9), PlannerSidebarActions (2), SomedayEventSections (2),
  PlannerSidebar (2), SomedayEvent (2), SomedaySectionHeader (2),
  SomedayEventsContainer (2), useSomedayColdStartReserve (5),
  SomedayInteractionAdapter (8, drag/drop unaffected by the flex wrapper).
- Browser check on `localhost:9080`: hard refresh `/week` shows the month rows fading in with
  the 600ms opacity-only animation; the row wrapper reserves 136px for 4 rows and releases it
  without moving the rows. `/day` shows no someday sections, and both `/week` and `/day` keep
  the temporary-account summary pinned above the footer actions.
- Browser style check: `animate-someday-cold-fade-in` is 600ms opacity-only, `none` under
  reduced motion. Playwright `getAnimations()` trace confirms it runs (opacity 0→1) on a warm
  refresh under StrictMode.
- Targeted e2e: `bun run test:e2e e2e/someday/create-someday-event-mouse.spec.ts e2e/oauth/sidebar-connection-status.spec.ts --project=chromium-desktop`
  — 9 passed. The first run caught the stale e2e helper expecting "Add to week"; it now matches
  the redesigned accessible names ("Add item to week/month").
- `bun run type-check` — clean.
- `bun lint` — clean.
- `bunx biome check packages/web/src/components/PlannerSidebar packages/web/src/ducks/events/selectors/someday.selectors.ts packages/web/src/index.css .design-prototypes/progress.md .design-prototypes/sidebar-redesign.html`
  — clean.
- `bunx react-doctor@latest . --verbose --diff` — score 100/100, no issues found.
