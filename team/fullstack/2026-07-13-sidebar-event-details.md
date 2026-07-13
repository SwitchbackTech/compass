# Sidebar event details refactor — decision log

**Date:** 2026-07-13 · **Role:** fullstack · **Branch:** `claude/sidebar-event-details-form-a3e018`

**Goal (founder):** No floating forms. Clicking an event shows its details in the
sidebar, so the user always knows where to look when editing event info.

## Current state (mapped)

Three floating form render paths exist today:

1. **Day view** — `FloatingEventForm` (store-driven: `draft.store` `isFormOpen` +
   `gridDraft`), positioned by `useEventForm` (floating-ui), mounted in
   `DayCalendarGrid`.
2. **Week view** — `GridDraft` renders `EventForm` inline in the grid, gated on
   **React-local** `isFormOpen` (`useDraftState`), positioned by
   `useDraftForm` → `useEventForm`.
3. **Someday** — `SomedayEventForm` in a `FloatingPortal` pinned next to the
   sidebar, gated on local `isSomedayFormOpen` (`useSidebarState`), rendered
   per-event by `SomedayEventContainer`.

Both views already mount `ResizableSidebarPanel` + `PlannerSidebar`.

## Decisions

- **D1 — Relocation, not save-path unification.** Week and Day have different
  save/recurrence-scope pipelines (Week: `useDraftConfirmation` with
  standalone-conversion + base-event rule lookup; Day: simpler
  `needsRecurrenceScope` in `FloatingEventForm`). Unifying those is
  packet-03-phase-3c's job. I move each view's existing wiring into a sidebar
  slot with behavior intact: Day gets `SidebarEventDetails` (store-driven,
  ex-`FloatingEventForm` logic), Week gets `WeekSidebarEventDetails`
  (`useDraftContext`-driven, ex-`GridDraft` form JSX).
- **D2 — Grid form-open state unifies on the draft store.** Week's local
  `isFormOpen` in `useDraftState` becomes a store read
  (`status.isFormOpen`), `setIsFormOpen` delegates to
  `draftActions.setFormOpen`. Single source of truth lets the shared
  `PlannerSidebar` decide when to swap its body for the details panel, in both
  views, without new context plumbing.
- **D3 — PlannerSidebar gets an `eventDetails` slot.** When the store says a
  grid event form is open (and the draft isn't someday), the sidebar renders
  the slot instead of its normal body (month picker / calendar list / someday
  sections). Footer (account summary / actions) keeps its place.
- **D4 — Clicking an event with a collapsed sidebar still shows details.**
  `ResizableSidebarPanel isOpen` becomes `isSidebarOpen || isFormOpen` in both
  views. Transient — the user's persisted sidebar preference is untouched;
  closing the form collapses the sidebar again.
- **D5 — Someday form renders inline in the sidebar, not in the details slot.**
  Someday events already live in the sidebar; their form expands in place
  (same `SomedayEventContainer` wiring, minus `FloatingPortal` +
  positioning). Moving it into the shared slot would mean lifting a dozen
  per-event props/handlers up through context for no UX gain.
- **D6 — Escape replaces floating-ui dismiss.** The floating forms got
  Escape/outside-press close from `useDismiss`. The docked panel binds Escape
  explicitly (`useAppShortcut`) → same discard path. Outside-press close is
  intentionally dropped for the docked panel: grid mousedown handlers already
  discard an open form (`useGridEventMouseDown` checks `isEventFormOpen()`),
  so clicking the calendar still closes it; clicking around inside the sidebar
  should NOT nuke your edit.
- **D7 — Dead code to remove once green:** `FloatingEventForm`,
  `useEventForm`, `useDraftForm`, `FloatingFormContainer`, `formProps` from
  `DraftContext`/`GridDraft`/`SomedayEvent`, `Z_INDEX_FLOATING_FORM`,
  `getSidebarOpenWidth` form-pinning usage, and the floating-ui
  reference-attr plumbing (`DATA_FULL_WIDTH`/`DATA_OVERLAPPING`) if unused
  elsewhere.

## Risks / warts (named)

- `EventFormShell` is fixed `w-96`; in the sidebar it becomes `w-full` (the
  resizable sidebar width governs). Verify form controls tolerate narrow
  widths down to `SIDEBAR_MIN_WIDTH`.
- Week's grid-card "type to focus title input" (`titleInputRef`) crossed the
  grid→form boundary via ref; after relocation it needs a DOM-query hop or the
  autofocus-on-open covers it. Will verify in preview.
- e2e specs select the form via `getByRole("form")` — should survive, but
  flows that click "outside to close" may need updates.

## Verification findings (preview, 2026-07-13)

Three real bugs surfaced in the browser that unit tests missed, all fixed:

1. **Escape guard vs. permanently-mounted overlays.** The keyboard-shortcuts
   overlay is a `role="dialog"` that stays mounted while hidden
   (display:none in Day's tree, `aria-hidden` + laid-out in Week's), and the
   sidebar month picker is a permanently-visible react-datepicker
   `role="listbox"`. The naive "some floating layer is open → don't close on
   Escape" guard matched all of them, making Escape dead. Guard now requires
   visible + not aria-hidden + not inside the Planner month picker
   (`useEscapeToCloseForm.ts`). This is a named wart — role-scraping the DOM
   — kept because each nested layer owns its own Escape and there's no
   shared "topmost layer" registry to ask.
2. **Title input overflow at sidebar width.** `<input>`s have an intrinsic
   `size`-attribute width (~305px) that overflowed the ~253px form and made
   autofocus horizontally scroll the panel. Fixed with `w-full` on the
   EventForm title input (SomedayEventForm already had it).
3. (During dev only) real pointer clicks vs. synthetic: the Day/Week click →
   store pipeline works with real input; earlier "clicks do nothing" was a
   coordinate-space error in my own browser driving, not an app bug.

Verified end-to-end in Chrome preview: Day click→details in sidebar,
edit+save persists, Escape closes and restores sidebar body; Week
click→details, drag-create reveals details on release; someday form expands
inline in its sidebar section; collapsed sidebar transiently reveals for a
form and re-collapses on close (persisted pref untouched,
`compass.view.sidebar-open` stays false throughout).

## Status log

- [x] Architecture mapped (Explore agent + direct reads)
- [x] Implementation (commit `feat(web): dock event forms in the sidebar`)
- [x] Dead code removal (FloatingEventForm, useEventForm, useDraftForm,
      FloatingFormContainer, formProps plumbing, Z_INDEX_FLOATING_FORM,
      DATA_FULL_WIDTH/DATA_OVERLAPPING, getSidebarOpenWidth)
- [x] Tests updated (1315 pass), type-check green
- [x] Preview verification (week + day + someday flows)
- [x] e2e: smoke specs green; `move-event-reduced-days` needed a
      layout-settle wait (the sidebar now reveals/collapses around the form
      at reduced widths — intended behavior, test measured mid-transition);
      full-suite run kicked off before ship
- [x] /simplify (see `refactor(web): tidy sidebar form pass`)
- [x] PR #2092 opened; e2e workflow never fired on `pull_request` (missed
      webhook, confirmed by comparing against sibling PRs opened in the same
      window) — close/reopen was needed to force it
- [x] **Merged `main` mid-flight — `feat(events)!: remove someday events
      feature` (#2091) landed after I branched, deleting every someday-\*
      file this PR had touched (D5 is now moot).** Resolved by accepting
      main's deletions for all someday files plus the three floating-form
      files I'd already deleted myself (`useEventForm.ts`,
      `FloatingFormContainer.tsx`, `useDraftForm.ts` — modify/delete
      conflicts where main had touched them for its own cleanup but my
      deletion still wins). Manually reconciled the 4 true content
      conflicts (`PlannerSidebar.tsx`, `EventFormShell.tsx`, `WeekView.tsx`,
      `GridDraft.tsx`) to keep the Day/Week grid-event sidebar docking
      layered on top of main's simplified (someday-free) structure. Also had
      to drop `onConvert`/"convert to someday" from `EventForm` and
      `WeekSidebarEventDetails` — main removed that capability outright
      (`MoveToSidebarMenuButton`, `actions.convert`), so `viewEnd`/`viewStart`
      are no longer needed on the Week panel. Re-verified after merge:
      type-check clean, 1164/1164 web unit tests, 13/13 e2e (3 someday specs
      correctly gone), zero diff vs main in backend/core/scripts, and a
      fresh Chrome pass confirming Week click→sidebar→edit→save still works.
- [ ] Ship (push, watch CI, squash-merge)
