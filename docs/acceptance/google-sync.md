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

Do not use this guide to validate:

- first-time Google sign-in from a logged-out state (see `docs/acceptance/auth.md`, Scenario 5)
- connecting Google during initial signup (see `docs/acceptance/auth.md`, Scenario 7)

## Setup

1. Start the app with `bun run dev:web`.
2. Start the backend — Google sync requires a live backend with Google credentials configured.
3. Ensure `compass.yaml` at the repo root has valid Google OAuth client credentials.
4. Use a Google account you control and can create test events in.
5. For revocation scenarios, you need access to the Google account's security settings at `myaccount.google.com/permissions`.

Helpful notes:

- There is no user-facing "Disconnect Google" button. Revocation only happens when the user removes access in Google's own account settings.
- All Google calendars sync by default. There is no UI to select which calendars to include or exclude.
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
