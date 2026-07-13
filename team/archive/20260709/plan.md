# Plan — 2026-07-09

Five spec items, one PR each off `main`, shipped via the `ship` skill (auto-merge on green CI).
Ordering below is the intended ship order: cheap/mechanical first, the hard nudge item mid-day
with a fresh Opus/high context, forms last.

Answers locked at the morning gate:

- **Item 1:** Left-align everything (header, message, buttons); buttons ordered **Log out → Cancel**, left-aligned.
- **Item 2:** **Broad** copy rewrite across the full audited list — but errors stay *functional* (colloquial ≠ vague; keep the "what to do next").
- **Item 5:** **Shared form shell only** — extract the inner `<form>` wrapper; leave each form's floating/positioning wrapper as-is.

---

## Item 1 — fix(web): logout dialog + command-palette keycap

**Files:**

- `packages/web/src/components/OverlayPanel/OverlayPanel.tsx` — `OverlayPanelActions` currently `flex w-full justify-end`.
- `packages/web/src/components/LogoutConfirmation/LogoutConfirmationDialog.tsx` — button order.
- `packages/web/src/common/hooks/useLogoutCmdItems.ts` — `shortcut: "z"` (line 19).
- `packages/web/src/components/CommandPalette/CommandPalette.tsx` (renders `item.shortcut`).

**Approach:**

- The panel root is `flex flex-col items-center` (OverlayPanel.tsx:65). `items-center` is why the
  message + actions don't share the header's left edge. The panel is **shared** with the auth
  status loader (`variant="status"`, centered spinner) — so I will **not** flip `items-center`
  globally. Instead:
  - Give the `message` `<p>` `w-full` so its text aligns to the same left edge as the full-width title. (Title already has `w-full`.)
  - Change `OverlayPanelActions` from `justify-end` to `justify-start` **only for the modal use** — cleanest is to keep the panel's `items-center` but make title/message/actions all `w-full`, and left-justify the actions. Verify the status loader still looks right (it has no actions row, so unaffected).
  - Actually simplest & safest: switch panel root to `items-start` for `variant === "modal"` only (status keeps `items-center`). Then title/message/actions naturally left-align; add `w-full` where needed for the buttons row. I'll pick whichever reads cleaner once I see it in the preview; both are contained to the modal variant.
- Reorder buttons in `LogoutConfirmationDialog` to **Log out (primary) → Cancel**. No extra tests for ordering (per spec).
- Remove `shortcut: "z"` from the Log Out command item so no keycap renders (the palette already conditionally renders `item.shortcut`, so dropping the field is sufficient). Confirm no code still binds `z` to logout.

**Deliberately not doing:** no new tests solely for button order; not touching the status/loader variant's alignment.

**Manual test:** open logout dialog (via command palette / account menu) → header, message, buttons share left edge; order is Log out then Cancel; Esc + backdrop still dismiss; focus trap intact. Command palette → Log Out row shows **no** `Z` keycap.

---

## Item 2 — fix(web): more human copy (broad)

**Primary:** `packages/web/src/views/GoogleAuthCallback/GoogleAuthCallback.tsx:65`
`"Completing Google authorization..."` → `"Just finishing up …"`.

**Broad sweep (audited candidates, colloquial + still functional):**

- `auth/google/hooks/useConnectGoogle/useConnectGoogle.util.ts` — "Checking Google Calendar…", "Syncing Google Calendar…", "Syncing...", "Google Calendar needs a sync", "Google Calendar needs reconnecting".
- `components/PlannerSidebar/PlannerAccountSummary/PlannerAccountSummary.tsx:87` — "Syncing changes…".
- `auth/google/hooks/useConnectGoogle/useConnectGoogle.ts:78` — sync-failed toast.
- `auth/google/authorization/google-authorization.constants.ts:15,17` — OAuth failure / missing-permissions.
- `auth/google/util/google.auth.util.factory.ts:16,18` — local-sync failure / session-expiry-during-save.
- `components/LoginAbsoluteOverflowLoader/LoginAbsoluteOverflowLoader.tsx:52,57` — login loader messages.
- `common/utils/storage/db-errors.util.ts:61,69,77` — quota / version-mismatch / unexpected-close.
- `common/utils/app-init.util.ts:43` — offline-storage-unavailable.
- `components/AuthModal/hooks/useAuthFormHandlers.util.ts:9` — backend-unreachable.
- `auth/compass/user/hooks/useLoadProfile.ts` (`showSessionExpiredToast`) — session expired.
- `common/apis/util/api.util.ts:81` — "Login required, cuz security 😇" (already casual; keep or lightly tidy).
- Leave already-friendly ones (`uff-dah…`, "Check your email") as-is.

**Guardrails:** replace jargon (authorization, quota, backend, database version) with plain words,
keep the actionable instruction in every error. If a string is asserted in a test, update the test.

**Manual test:** trigger the Google auth redirect → spinner reads "Just finishing up …". Spot-check a couple of the reworded toasts (sync failure, session expiry) still make sense.

---

## Item 3 — fix(web): nudge lag + replay (the hard one; Opus/high)

**Root cause (confirmed by trace):** every keydown (incl. OS key-repeat) calls `mutate()`, which does
an instant optimistic cache write **plus** a network PUT. PUTs are serialized per-event by
`waitForPrecedingEventWrites` (`events/mutations/event.mutation.runtime.ts`) to avoid Mongo
write-conflict 500s, with **no coalescing** — so a burst enqueues N PUTs that drain one-at-a-time
after the user stops (the "replay"), and the queue can error under load.

**Files:**

- `packages/web/src/common/utils/event/event-nudge-shortcut.util.ts` (`nudgeEventFromKeyboard`).
- `packages/web/src/views/Week/hooks/shortcuts/useWeekShortcuts.ts` (`moveFocusedCalendarEvent`, Shift+Arrow bindings).
- `packages/web/src/views/Day/hooks/shortcuts/useDayEventNudgeShortcuts.ts`.
- `packages/web/src/components/PlannerSidebar/SomedayEventSections/SomedayEvents/SomedayEventContainer/SomedayEventContainer.tsx` (`scheduleEvent`, someday→grid).
- `packages/web/src/common/hooks/useUpdateEvent.ts` — already separates instant `draftActions.setEvent` from network `edit`; `saveImmediate=false` updates local state only.

**Approach (keep it simple):**

- Keep the visual **instant** on every keypress (optimistic/draft update — the mechanism already exists via `useUpdateEvent(payload, false)` / draft store).
- **Trailing-debounce the network write** (~250 ms after the last nudge) so a burst collapses to a
  single PUT of the final position. Add one tiny debounce helper (none exists in the repo) — a
  minimal `useDebouncedCallback`/timeout, not a library.
- Flush the pending write on blur / unmount / when a different event is nudged, so nothing is lost
  if the user navigates away quickly.
- Do **not** touch the `waitForPrecedingEventWrites` serialization machinery — the debounce removes
  the burst before it reaches that queue, which is the simplest fix and leaves the write-conflict
  protection intact.
- Scope: keyboard nudging (Shift+Arrow) + the someday→grid schedule path. Drag already routes
  through the draft layer and isn't part of the reported bug — leave it.

**Spike rule:** if the instant-visual-vs-debounced-write split gets ugly after ~2 attempts (e.g. the
optimistic layer fights the debounce), stop, checkpoint in summary, and reassess coalescing at the
queue instead.

**Manual test:** hold Shift+Right on a grid event → moves smoothly, network tab shows ~1 PUT after
release (not one per step), no errors. Someday→grid via Shift+Right then nudge around → preview
immediate, single settle, no trailing replay.

---

## Item 4 — style(week): now line only on the current day's column

**File:** `packages/web/src/common/calendar-grid/components/CalendarTimedGrid.tsx` (`CalendarNowLine`, lines 154–179; render gate at line 79).

**Approach:**

- Off-week guard already exists (`isTodayVisible ? <CalendarNowLine/> : null`, line 79) — no change there.
- Currently the line is `absolute h-px w-full` → spans all columns. Scope it to the current day's
  column: compute `todayIndex = visibleDates.findIndex(date isSame today)` and pass it (+ column
  count) to `CalendarNowLine`; position via `left: calc(index * 100% / count)` and
  `width: calc(100% / count)` (matches the `repeat(count, 1fr)` grid). Keep the blue gradient + minute tick.

**Manual test:** current week → now line appears only under today's column. Navigate to a non-current
week → no now line. Resize / different visible-day counts → line stays aligned to today's column.

---

## Item 5 — style(forms): shared form shell

**Files:**

- `packages/web/src/views/Forms/EventForm/EventForm.tsx` (grid `<form>`: `z-1 rounded-sm bg-(--event-form-bg) px-5 py-4.5 shadow-… transition-all duration-300`).
- `packages/web/src/views/Forms/SomedayEventForm/SomedayEventForm.tsx` (someday `<form>`: same + `text-xl`).
- New: `packages/web/src/views/Forms/EventFormShell.tsx` (or `components/`).

**Approach:**

- Extract the inner `<form>` wrapper into a content-agnostic `EventFormShell` that owns the shared
  container styling (padding, bg via `--event-form-bg`, shadow, rounding, transition) and takes
  `children`, `priority`, `onSubmit`, ref/props. Both forms render their existing sections inside it.
- Reconcile the one real drift (`text-xl` on someday, title sizing) — decide a single consistent
  scale or expose a minimal prop; keep both forms visually intentional.
- Leave floating wrappers (`FloatingEventForm`, `FloatingFormContainer`) untouched — they anchor to
  genuinely different things (grid event vs sidebar). Consolidating them was explicitly out of scope.

**Manual test:** open a grid event form and a someday event form → identical padding/margins/shadow/
radius; fields and save/cancel behave as before; no visual regression in either.

---

## Cross-cutting

- One branch + PR per item, off `main`; `ship` skill validates → reviews → opens PR → watches CI →
  squash-merges on green. Merge gated on `gh pr checks` exit + `mergeStateStatus == CLEAN`.
- Respect `.claude/settings.json` deny-list; any denied need → push-notify, not a workaround.
- Live browser QA (`preview_*`) while screen is unlocked; otherwise CI is the gate and QA is
  sequenced for staging review.
- Evening: run `simplify` over the day's diffs, land cleanup as its own PR(s).
- Keep `summary.md` append-only through the day.

---

# Item 6 (new handoff) — feat: allow events to have empty title (#1871)

PO answers locked at the gate:
- **Existing "untitled" events:** *leave them, fix going forward.* No inbound string-matching of
  "untitled"/"(No title)". Just stop creating the default; existing ones clear when edited.
- **Empty display:** *fully blank block.* Keep the visible card textless; keep the "Untitled event"
  string only in the screen-reader aria-label (accessibility).

## Root cause (verified in code)

`packages/core/src/mappers/map.event.ts:168-169` — `gEventDefaults.summary = "untitled"`. The
gcal→compass mapper does `mergeWith({}, gEventDefaults, gEvent)` then `title = event.summary!`.
lodash merge skips only `undefined` sources, so when Google **omits** `summary` (which is what the
API does for untitled events — "(No title)" is display-only, never sent), the `"untitled"` default
lands in `title`. That single default is the bug.

## Scope — two one-line source changes, no frontend changes

1. **`packages/core/src/mappers/map.event.ts:169`** — `summary: "untitled"` → `summary: ""`.
   Absent Google summary now maps to `""`. Empty/real summaries already pass through unchanged.

2. **`packages/core/src/types/event_new.types.ts:49`** — `title: StringV4Schema` → `title: z.string()`.
   `StringV4Schema` is `z.string().nonempty()` and is **shared** (gEventId, rrule, etc.), so give
   `title` its own `z.string()` rather than relaxing the shared symbol. This v4 `EventSchema` is dead
   at runtime today — it only feeds a Mongo `$jsonSchema` validator via a migration
   (`packages/scripts/src/migrations/…new-events-collection.ts`) — but relaxing it now prevents a
   latent DB-level rejection of `""` if/when that collection goes live. Keeps intent consistent.

## Deliberately NOT changing (verified already correct)

- **Outbound compass→gcal** (`map.event.ts:105`, `if (event.title) gcalEvent.summary = …`): omitting
  `summary` is correct. `updateEvent` uses `gcal.events.update` (PUT / full-resource replace,
  `gcal.service.ts:218`), so an omitted summary **clears** the title in Google — the desired
  round-trip. No change.
- **Frontend**: display already renders raw `event.title` (blank when empty); the "Untitled event"
  fallback is aria-label-only (`CalendarTimedEventCard.tsx:167`, `CalendarAllDayEventCard.tsx:87`) —
  matches PO's "fully blank block, keep a11y". Forms already accept empty titles; web schemas extend
  `CompassCoreEventSchema` (`title: z.string().optional()`) with no override. No web changes.
- **Log-only fallbacks** (`gcal.event.parser.ts:121` `?? "unknown"`, `compass.event.parser.ts:545`)
  — not persisted, don't affect titles. Leave.
- No inbound "untitled"/"(No title)" normalization (PO chose leave-existing).

## Tests

- Add cases to `packages/core/src/mappers/map.event.to-compass.test.ts` (or the to-compass test):
  gcal event with **absent** summary → compass `title === ""`; gcal event with real summary → unchanged.
- Sweep google-to-compass propagation test utils/fixtures for reliance on the `"untitled"` default
  (`google-to-compass.event-propagation.test.util.ts`, upsert tests) and the driver default
  `event.driver.ts:64` (`|| "No Title"`); update only what the new behavior actually breaks.
- Run `bun run type-check` (v4 schema edit) + web/core/backend unit suites.

## Ship

One PR off `main` via the `ship` skill (branch e.g. `feat/empty-event-title`), title
`feat(core): allow events to have empty title`. Auto-merge on green CI. Manual Testing Steps in the
PR: create an event with no title → saves + displays as a blank block; (staging, authed) it syncs to
Google as "(No title)" and syncing back keeps it blank.

## Manual test (local + staging)

- Local preview: create/save an event leaving the title empty → no error, card renders blank, reopens
  with an empty title field (placeholder "Title" shows).
- Staging (authed, sequenced): empty-title event → appears in Google Calendar as "(No title)"; edit
  its time in Google → title stays blank in Compass on next sync.
