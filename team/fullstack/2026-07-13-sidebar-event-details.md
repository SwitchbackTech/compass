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

## Status log

- [x] Architecture mapped (Explore agent + direct reads)
- [ ] Implementation
- [ ] Dead code removal
- [ ] Tests updated, type-check green
- [ ] Preview verification (week + day + someday flows)
- [ ] /simplify, /ship
