# Google Calendar Sync

This runbook covers the Google Calendar sync UX in Compass.

## Scope

Use this guide to validate:

- connecting Google Calendar from a password session
- the initial import — progress indicator and completion
- real-time sync: event created in Google appears in Compass
- real-time sync: event created in Compass appears in Google
- Google Calendar status displaying as HEALTHY
- sync needing repair and user triggering repair
- Google access revoked — events removed and reconnect prompt shown
- re-connecting Google after revocation

Do not use this guide to validate:

- first-time Google sign-in from a logged-out state (see `docs/manual-testing/auth-testing.md`, Scenario 5)
- connecting Google during initial signup (see `docs/manual-testing/auth-testing.md`, Scenario 7)

## Setup

1. Start the app with `bun run dev:web`.
2. Start the backend — Google sync requires a live backend with Google credentials configured.
3. Ensure `packages/backend/.env.local` has valid Google OAuth client credentials.
4. Use a Google account you control and can create test events in.
5. For revocation scenarios, you need access to the Google account's security settings at `myaccount.google.com/permissions`.

Helpful notes:

- The Google connection status icon appears in the sidebar (and sometimes the header). Its color and tooltip reflect the current sync state.
- There is no user-facing "Disconnect Google" button. Revocation only happens when the user removes access in Google's own account settings.
- All Google calendars sync by default. There is no UI to select which calendars to include or exclude.
- The header spinner appears during import and repair. There is no granular progress bar.
- Toasts appear only on errors, not on successful sync operations.

---

## Scenario 1: Connect Google Calendar From A Password Session

### UX

A password-authenticated user can connect Google Calendar from inside the app using the command palette or the sidebar status control. Existing Compass data must remain intact after connecting.

### Steps

1. Sign up or log in with email/password. Do not connect Google.
2. Create at least one Compass event so there is pre-existing data.
3. Open the command palette (Cmd+K) and select Connect Google Calendar, or click the Google status icon in the sidebar.
4. Complete the Google OAuth popup with the intended Google account.
5. Return to Compass and observe the sidebar status icon.
6. Reload the page.

### Expected Results

- The OAuth popup opens and closes cleanly without redirecting away from the app shell.
- The sidebar status transitions away from NOT_CONNECTED into an importing state.
- Pre-existing Compass events remain visible on the calendar.
- The network flow uses `POST /api/auth/google/connect`, not the logged-out sign-in path.
- After reload, the Google connection state persists.

---

## Scenario 2: Initial Import — Progress And Completion

### UX

After connecting Google, Compass imports all events from the user's Google calendars. The user sees a spinning indicator in the header while the import runs. The app remains interactive during import.

### Steps

1. Connect Google Calendar (see Scenario 1), or start with an account that has `importGCal` flagged for restart.
2. Observe the header immediately after the OAuth popup closes.
3. Continue using the app normally while the import runs (navigate to different dates, create a Compass event).
4. Wait for the header spinner to disappear.
5. Check the calendar for newly imported Google events.

### Expected Results

- A spinner appears in the header with the tooltip "Syncing Google Calendar in the background."
- The app remains fully interactive during import (no blocking overlay).
- Google events gradually appear on the calendar as import progresses.
- When import completes, the spinner disappears.
- The sidebar status icon transitions to its post-import state (HEALTHY if all infrastructure is healthy).
- No success toast is shown — completion is indicated only by the spinner disappearing and events appearing.

---

## Scenario 3: Real-Time Sync — Event Created In Google Appears In Compass

### UX

After Google is connected and import is complete, creating an event in Google Calendar should appear in Compass within a few seconds without a page reload.

### Steps

1. Confirm Google Calendar is connected and the sidebar status is HEALTHY.
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

After a successful import with no sync infrastructure issues, the sidebar status icon shows a calm, connected state. Hovering over it confirms the connection is healthy.

### Steps

1. Connect Google and let the initial import complete.
2. Hover over the Google status icon in the sidebar.

### Expected Results

- The tooltip reads "Google Calendar connected."
- The icon is not spinning, warning-colored, or showing an error state.

---

## Scenario 6: Sync Needs Repair — User Triggers Repair

### UX

If the sync infrastructure degrades (for example, watch channels expire), the sidebar status icon moves to an ATTENTION or warning state. The user can trigger a repair from the sidebar, which re-imports recent events and refreshes the sync infrastructure.

### Steps

1. Simulate or wait for an ATTENTION state (this can be forced in a dev environment by expiring watch tokens, or observed in a long-running account).
2. Observe the sidebar status icon.
3. Hover over the icon to read the tooltip.
4. Click the icon or the "Repair" button in the dialog that appears.
5. Observe the header and sidebar during repair.
6. Wait for repair to complete.

### Expected Results

- The sidebar icon shows a warning state.
- The tooltip reads "Google Calendar needs repair. Click to repair." (or similar).
- Clicking opens a dialog: "Calendar sync needs repair" with a description and a Repair button.
- After clicking Repair, a spinner appears in the header with the tooltip "Repairing Google Calendar in the background."
- When repair completes, the spinner disappears and the sidebar status returns to HEALTHY.
- If repair fails, an error toast appears: "Google Calendar repair failed. Please try again."

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
- The sidebar status returns to NOT_CONNECTED.
- The command palette shows "Connect Google Calendar" again.

---

## Scenario 8: Re-Connecting Google After Revocation

### UX

After revocation, the user can reconnect Google using the same flow as the initial connection. A new import runs and Google events repopulate the calendar.

### Steps

1. Complete Scenario 7 so the connection is in the NOT_CONNECTED state.
2. Open the command palette and select Connect Google Calendar.
3. Complete the Google OAuth popup.
4. Wait for the import to complete.

### Expected Results

- The OAuth popup opens and closes without error.
- The import spinner appears in the header.
- Google events repopulate the calendar after import completes.
- The sidebar status returns to HEALTHY.
- Previously revoked-and-removed events reappear if they still exist in Google Calendar.

---

## Focused Regression Checks

If time is limited, run these checks before shipping Google sync changes:

1. Connecting Google from a password session uses `POST /api/auth/google/connect` and does not lose existing Compass data.
2. The header spinner appears during import and disappears when import completes.
3. The app remains interactive (no blocking overlay) during import.
4. An event created in Google Calendar appears in Compass within ~30 seconds without a page reload.
5. An event created in Compass appears in Google Calendar within ~30 seconds.
6. The sidebar status tooltip reads "Google Calendar connected." when healthy.
7. An ATTENTION state shows a repair dialog with a Repair button.
8. After repair completes, status returns to HEALTHY.
9. Revoking access in Google's settings removes all Google-origin events from Compass and shows the revocation toast.
10. Re-connecting after revocation triggers a fresh import and repopulates Google events.
