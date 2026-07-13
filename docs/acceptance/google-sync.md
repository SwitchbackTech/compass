# Google Calendar Sync

This runbook covers the Google Calendar sync UX in Compass.

## Scope

Use this guide to validate:

- connecting Google Calendar from a password session
- the initial import — progress indicator and completion
- real-time sync: event created in Google appears in Compass
- real-time sync: event created in Compass appears in Google
- Google Calendar status displaying as HEALTHY
- sync needing attention and user triggering a sync
- Google access revoked — events removed and reconnect prompt shown
- re-connecting Google after revocation
- per-calendar visibility hide/show and its server-side read filtering
- Google-side calendar add/rename/recolor/hide/delete reconciling into Compass
- watch repair self-healing after an expired/deleted watch
- freeBusyReader calendars showing availability without event details
- revoked access pruning Google data while Compass-local data survives

Do not use this guide to validate:

- first-time Google sign-in from a logged-out state (see `docs/acceptance/auth.md`, Scenario 5)
- connecting Google during initial signup (see `docs/acceptance/auth.md`, Scenario 7)
- calendar-target selection and read-only event interaction (see `events.md`,
  "Calendar-Aware Events")

## Setup

1. Start the app with `bun run dev:web`.
2. Start the backend — Google sync requires a live backend with Google credentials configured.
3. Ensure `compass.yaml` at the repo root has valid Google OAuth client credentials.
4. Use a Google account you control and can create test events in.
5. For revocation scenarios, you need access to the Google account's security settings at `myaccount.google.com/permissions`.
6. Scenarios 9-13 are easiest with three calendars on the connected account:
   one you own (writable), one shared with you as a reader, and one shared
   with you as `freeBusyReader` ("See only free/busy"). Scenarios 10-12 need
   only the specific calendar role each one calls out.

Helpful notes:

- There is no user-facing "Disconnect Google" button. Revocation only happens when the user removes access in Google's own account settings.
- All eligible Google calendars import by default — there's no UI to opt a
  calendar out of import. The sidebar's "Calendars" list controls per-calendar
  *visibility* in Compass instead (Scenario 9); a hidden calendar keeps
  syncing in the background, it just stops showing events.
- The email shimmer animation appears during import and sync. There is no granular progress bar.
- Toasts appear only on errors, not on successful sync operations.

---

## Scenario 1: Connect Google Calendar From A Password Session

### UX

A password-authenticated user can connect Google Calendar from inside the app using the command palette or the sidebar account email. Existing Compass data must remain intact after connecting.

### Steps

1. Sign up or log in with email/password. Do not connect Google.
2. Create at least one Compass event so there is pre-existing data.
3. Open the command palette (Cmd+K) and select Connect Google Calendar (the sidebar email has no action while NOT_CONNECTED, so use the command palette here).
4. Complete the Google authorization redirect with the intended Google account.
5. Return to Compass and observe the sidebar account email.
6. Reload the page.

### Expected Results

- The Google authorization redirect returns to Compass through `/auth/google/callback`.
- The sidebar email transitions from plain text into the syncing shimmer (`c-sync-text-wave`).
- Pre-existing Compass events remain visible on the calendar.
- The network flow uses `POST /api/auth/google/connect`, not the logged-out sign-in path.
- After reload, the Google connection state persists.

---

## Scenario 2: Initial Import — Progress And Completion

### UX

After connecting Google, Compass imports all events from the user's Google calendars. The sidebar account email shows a wave shimmer while the import runs. The app remains interactive during import.

### Steps

1. Connect Google Calendar (see Scenario 1), or start with an account that has `importGCal` flagged for restart.
2. Observe the sidebar account email immediately after the Google authorization redirect returns.
3. Hover the email to read the tooltip.
4. Continue using the app normally while the import runs (navigate to different dates, create a Compass event).
5. Wait for the shimmer to stop.
6. Check the calendar for newly imported Google events.

### Expected Results

- The sidebar email shows the shimmer with tooltip "Syncing...".
- The app remains fully interactive during import (no blocking overlay).
- Google events gradually appear on the calendar as import progresses.
- When import completes, the shimmer stops and the email returns to normal color.
- The email's status transitions to its post-import state.
- No success toast is shown — completion is indicated only by the shimmer stopping and events appearing.

---

## Scenario 3: Real-Time Sync — Event Created In Google Appears In Compass

### UX

After Google is connected and import is complete, creating an event in Google Calendar should appear in Compass within a few seconds without a page reload.

### Steps

1. Confirm Google Calendar is connected and the sidebar email shows the HEALTHY (normal color, "Up-to-date" tooltip) state.
2. Open Google Calendar in another browser tab.
3. Create a new event in Google Calendar for today with a recognizable title (for example, "GCal Test Event").
4. Save the event in Google Calendar.
5. Switch back to Compass and wait up to 30 seconds without reloading.

### Expected Results

- The new event appears on the Compass calendar automatically, without a page reload.
- The event's title, time, and date match what was set in Google Calendar.
- The event is not duplicated.

---

## Scenario 4: Real-Time Sync — Event Created In Compass Appears In Google

### UX

Creating a new event in Compass pushes it to Google Calendar in the background. The user does not need to trigger this manually.

### Steps

1. Confirm Google Calendar is connected and HEALTHY.
2. Create a new event in Compass for today with a recognizable title (for example, "Compass Test Event").
3. Switch to Google Calendar in another browser tab and wait up to 30 seconds.

### Expected Results

- The new event appears in Google Calendar without any manual action.
- The event's title and time match what was set in Compass.
- The event is not duplicated in Google Calendar.

---

## Scenario 5: Google Calendar Status Displays As HEALTHY

### UX

After a successful import with no sync infrastructure issues, the sidebar account email renders in its normal color with no shimmer. Hovering over it confirms the connection is healthy.

### Steps

1. Connect Google and let the initial import complete.
2. Hover over the account email in the sidebar.

### Expected Results

- The tooltip reads "Up-to-date."
- The email is not shimmering, warning or error color.

---

## Scenario 6: Sync Needs Attention — User Triggers A Sync

### UX

If the sync infrastructure degrades (for example, watch channels expire), the sidebar account email turns to `text-status-warning`, the ATTENTION state). The user can trigger a sync directly from the sidebar — either by hovering the email and clicking "Sync now" in the tooltip, or by clicking/activating the email itself (it renders as a button when an action is available) — which re-imports recent events and refreshes the sync infrastructure.

### Steps

1. Simulate or wait for an ATTENTION state (this can be forced in a dev environment by expiring watch tokens, or observed in a long-running account).
2. Observe the sidebar account email.
3. Hover over the email to read the tooltip, or Tab to it to focus it.
4. Click "Sync now" in the tooltip, or press Enter/Space on the focused email.
5. Observe the email during the sync (it should switch to the shimmer treatment).
6. Wait for the sync to complete.

### Expected Results

- The sidebar email renders in `text-status-warning`.
- The tooltip explains a sync is needed, without using the word "repair", and includes a "Sync now" button.
- Clicking "Sync now" (or activating the email directly) triggers `onRepairGoogle`, which flips the state to the syncing shimmer treatment immediately.
- When the sync completes, the shimmer stops and the email returns to normal color (HEALTHY).
- If the sync fails, an error toast appears: "Google Calendar sync failed. Please try again."

---

## Scenario 7: Google Access Revoked — Events Removed And Reconnect Prompt Shown

### UX

If the user removes Compass's access in Google's account settings, the next time Compass tries to sync it detects the revocation. All Google-origin events are removed from the calendar and the connection status resets to NOT_CONNECTED with a prompt to reconnect.

### Steps

1. Connect Google Calendar and let import complete. Confirm several Google events are visible in Compass.
2. In a separate browser tab, go to `myaccount.google.com/permissions`.
3. Find Compass and remove its access.
4. Return to Compass and wait for the app to detect the revocation (may require triggering a sync action or waiting for the next background sync cycle).

### Expected Results

- A toast appears: "Google access revoked. Your Google data has been removed."
- All events that originated from Google (or were imported from Google) are removed from the Compass calendar.
- Compass-originated events that were pushed to Google remain visible in Compass.
- The sidebar email returns to plain text (NOT_CONNECTED — no tooltip).
- The command palette shows "Connect Google Calendar" again.

---

## Scenario 8: Re-Connecting Google After Revocation

### UX

After revocation, the user can reconnect Google using the same flow as the initial connection. A new import runs and Google events repopulate the calendar.

### Steps

1. Complete Scenario 7 so the connection is in the NOT_CONNECTED state.
2. Open the command palette and select Connect Google Calendar.
3. Complete the Google authorization redirect.
4. Wait for the import to complete.

### Expected Results

- The Google authorization redirect returns to Compass without error.
- The sidebar email shows the syncing shimmer during import.
- Google events repopulate the calendar after import completes.
- The sidebar email returns to normal color (HEALTHY).
- Previously revoked-and-removed events reappear if they still exist in Google Calendar.

---

## Scenario 9: Per-Calendar Visibility Persists Across Reload

### UX

The sidebar lists every active calendar under "Calendars" with a visibility
switch per calendar. Turning a calendar off hides its events from the grid
without unsubscribing sync; the choice is a Compass preference that survives
reloads and other sessions, and the server filters what it sends based on it.

### Steps

1. Confirm Google Calendar is connected and import is complete, with at
   least two calendars visible in the sidebar "Calendars" list.
2. Note an event on the grid from a secondary (non-primary) calendar.
3. In the sidebar, toggle that calendar's visibility switch off.
4. Reload the page.
5. Toggle it back on.
6. Sign in with the same account from a second session (a private/incognito
   window works).

### Expected Results

- Turning a calendar off immediately removes its events from the grid, no
  page reload needed.
- After reloading, the calendar still shows off and its events stay hidden —
  the preference is stored server-side (`isVisible`), not just client state.
- The second session shows the same visibility state.
- The event read request (`GET /api/event`) omits events on the hidden
  calendar entirely rather than returning and filtering them client-side —
  confirm via the browser's network inspector.
- Toggling the calendar back on restores its events.

---

## Scenario 10: Google-Side Calendar Changes Reconcile Without A Reset

### UX

Adding, renaming, recoloring, hiding, or deleting a calendar in Google
Calendar reconciles into the Compass sidebar automatically. None of these
require a reconnect or a full reimport of the account.

### Steps

1. Confirm Google Calendar is connected and the sidebar "Calendars" list
   matches Google's current calendar set.
2. In Google Calendar's settings, create a new secondary calendar.
3. Wait up to 30 seconds (or trigger a sync — see Scenario 6) and check the
   Compass sidebar.
4. Rename the new calendar in Google Calendar, and change its color.
5. Check Compass again.
6. Hide the calendar in Google Calendar (uncheck it in "My calendars"
   without deleting it), then check Compass.
7. Unhide it in Google Calendar, then check Compass.
8. Delete the calendar entirely in Google Calendar.

### Expected Results

- The new calendar appears in the Compass sidebar without a reconnect or
  full reimport; any of its existing events import normally.
- The rename and recolor both reconcile into the sidebar's name and color
  marker.
- Hiding it in Google removes it from the Compass sidebar and stops syncing
  its events, without touching any other calendar's events or visibility.
- Unhiding it restores it under the same Compass identity — the same
  visibility preference as before, not reset to a default.
- Deleting it in Google removes it, and only its own events, from Compass.
- Throughout, every other calendar's events, visibility, and sync state stay
  undisturbed.

---

## Scenario 11: Watch Repair Self-Heals After An Expired Or Deleted Watch

### UX

Compass keeps a live Google notification subscription ("watch") per
syncable calendar. If a watch expires or is deleted outside Compass,
reopening the app repairs it automatically — no manual "Sync now" click
required (compare Scenario 6, which covers the manual trigger).

### Steps

1. Confirm Google Calendar is connected and HEALTHY.
2. In a dev environment, expire or delete a watch record (for example, by
   forcing a short `google.channelExpirationMin` and waiting, or by directly
   invalidating the stored watch).
3. Without clicking anything in Compass, close and reopen the tab (or
   reload) to reconnect.
4. Wait a few seconds, then create an event directly in Google Calendar.
5. Switch back to Compass and wait up to 30 seconds.

### Expected Results

- Reopening/reloading the app alone triggers a defensive repair check on
  reconnect — you don't need to notice an ATTENTION state or click "Sync
  now" for the watch to be repaired.
- The sidebar email converges to HEALTHY (normal color, "Up-to-date"
  tooltip) on its own.
- The event created directly in Google Calendar appears in Compass without
  a page reload, proving the repaired watch (or the incremental catch-up
  sync behind it) is live again.
- No duplicate events appear as a result of the repair.

---

## Scenario 12: freeBusyReader Calendars Show Availability Without Event Details

### UX

A calendar where your Google access is "See only free/busy" never produces
Compass event records. Compass shows its busy time ranges as inert striped
blocks on the grid, with no event content and no way to interact with them.

### Steps

1. Confirm a `freeBusyReader` calendar is connected and visible in the
   Compass sidebar (see Setup).
2. Create a titled event on that calendar directly in Google Calendar,
   during a time range visible in Compass.
3. Wait up to 30 seconds and check Compass.
4. Try to click, right-click, hover, and drag the striped block that
   appears.

### Expected Results

- Compass shows a diagonally-striped block for the busy period, matching
  the event's time range, with no title or other details shown.
- Left-click does nothing — no form opens.
- Right-click does nothing — no context menu opens.
- The block cannot be dragged, resized, or deleted; no cursor affordance
  suggests it can be.
- The calendar's sidebar visibility toggle still works, hiding/showing its
  busy blocks the same way it hides/shows real events on other calendars.

---

## Scenario 13: Revoked Access Prunes Google Data While Compass-Local Data Survives

### UX

Revoking Compass's Google access removes every Google-sourced calendar and
its events — not just the primary one — while the Compass-local calendar
and anything created without Google (password-only events)
is never touched.

### Steps

1. Before connecting Google (or on a separate password-only account),
   create at least one scheduled event on your
   Compass-local calendar.
2. Connect Google Calendar (see Scenario 1) with multiple calendars
   available — at least one writable calendar and, if possible, a reader or
   `freeBusyReader` calendar too. Let import complete.
3. Confirm events/availability from every Google calendar are visible,
   alongside your original Compass-local events.
4. Revoke Compass's access at `myaccount.google.com/permissions` (see
   Scenario 7).
5. Return to Compass and wait for the revocation to be detected.

### Expected Results

- Every Google-sourced calendar disappears from the sidebar, not just the
  primary one.
- All events and availability blocks from every Google calendar are
  removed.
- The Compass-local calendar, and the scheduled events you
  created on it before ever connecting Google, remain exactly as they
  were — nothing about the account, priorities, or local data is deleted.
- The toast and reconnect-prompt behavior matches Scenario 7.

---

## Focused Regression Checks

If time is limited, run these checks before shipping Google sync changes:

1. Connecting Google from a password session uses `POST /api/auth/google/connect` and does not lose existing Compass data.
2. The sidebar email shimmers during import and stops when import completes.
3. The app remains interactive (no blocking overlay) during import.
4. An event created in Google Calendar appears in Compass within ~30 seconds without a page reload.
5. An event created in Compass appears in Google Calendar within ~30 seconds.
6. The sidebar email tooltip reads "Up-to-date" when healthy.
7. An ATTENTION state turns the email warning color with a tooltip offering "Sync now".
8. After the sync completes, status returns to HEALTHY.
9. Revoking access in Google's settings removes all Google-origin events from Compass and shows the revocation toast.
10. Re-connecting after revocation triggers a fresh import and repopulates Google events.
11. Hiding/showing a calendar in the sidebar persists across reload, and the server excludes hidden-calendar events from event reads.
12. A Google-side calendar add/rename/recolor/hide/delete reconciles into the sidebar without a full reset.
13. Reopening the app after a watch expires or is deleted repairs it automatically, with no manual action.
14. A freeBusyReader calendar's busy blocks show no title, details, or event actions.
15. Revoking access prunes only Google-sourced calendars/events; the Compass-local calendar and its events survive.
