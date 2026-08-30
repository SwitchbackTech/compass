# WP-07 — Host Settings booking page

**task_id:** WP-07
**github:** [#2976](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2976)
**status:** queued
**owner:** Implementer (web)
**depends on:** WP-03
**next owner after done:** WP-09 (after WP-08)

## Why

The host has to enable booking, pick duration/calendars/hours, and copy
the public URL. Settings today is `"accounts" | "billing"` in
[`packages/web/src/settings/settings.store.ts`](../../packages/web/src/settings/settings.store.ts).

## Finish line

1. `SettingsPage` includes `"booking"`. A Settings nav item **Booking**
   opens it. Keyboard shortcut optional; do not steal existing
   accounts/billing shortcuts.
2. UI (semantic RTL queries, Tailwind semantic colors, no em-dashes):
   - Copyable link `https://<origin>/book/<slug>` once a slug exists.
   - Duration 15/30/45/60 (default 30).
   - Destination calendar: writable Google calendars only.
   - Blocking calendars: multi-select of availability-readable
     calendars; default all on the destination account.
   - Weekly hours editor in host timezone (timezone select; default
     from current calendar view timezone on first enable).
   - Min notice hours, max horizon days (cap 60).
   - Buffer toggle (off / 30 default when on).
   - Max bookings per day toggle (off / 4 default when on).
   - Guest can invite others toggle (default on).
   - Enable/disable control.
3. Not Google-connected: show a connect-Google prompt, no enable.
   Read-only billing: same write-gate pattern as other Settings writes.
4. Components in their own files. No new barrel files.
5. `bun test:web`, type-check, lint, knip green. `bun test:a11y` if
   Chromium is installed; otherwise note the skip like other WPs.

## Steps

1. Read existing Settings accounts/billing sections for layout and
   query patterns.
2. Admin API client against WP-03. MSW handler for `/api/booking/page`.
3. Tests: render Booking page, save duration, copy link name, Google
   disconnected prompt, cannot enable.
4. Do not add `/book/$username` in this WP (WP-08).
5. Run the finish-line checks.

## Acceptance tests

- **Normal:** user with Google can save 30-minute duration and see the
  copyable `/book/<slug>` link.
- **Incomplete input:** enable with no destination calendar blocked.
- **Tool failure:** PUT 403 shows an error, does not crash Settings.
- **Policy:** no raw colors like `bg-blue-300`; no em-dash in labels
  ("Guest can invite others", not an em-dash).

## Evidence

Fill when implementing.

## Out of scope

- Public guest page
- Slot preview against live Google (optional later)

## Risks

- Settings is a modal; keep booking controls accessible (labels,
  focus). `/a11y-audit` the diff if the page is interactive.

## Handoff

```yaml
task_id: WP-07
from:
to: Implementer (web)
status:
artifact:
evidence:
assumptions:
open_risks:
next_deadline:
```

## Session prompt

```text
You are implementing WP-07 from
wip/booking/WP-07-host-settings-ui.md in the Compass repo. Read
wip/booking/README.md, TRACKING.md, docs/features/booking.md first.
Mark WP-07 running, commit the ledger, implement only this WP.

Finish line: Settings Booking page with duration, calendars, weekly
hours, timezone, window, buffer, cap, guest-invite toggle, copyable
link, connect-Google prompt. bun test:web, type-check, lint, knip.
Fill Evidence, push, PR to main.
```
