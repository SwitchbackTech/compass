# Glossary

Compass-specific terms used in the source code and docs.

## Events

**Standalone Event**: A single event that is not part of a recurring series.

**Grid Event**: An event assigned to a concrete calendar slot in the day/week
grid. These are different from Someday events.

**Draft Event**: A pending event shape used while the user edits, drags, or
resizes before saving.

**Someday Event**: An unscheduled event stored in the sidebar instead of the
calendar grid. Someday events may be recurring or standalone.

**Base Event**: A recurring event that owns the series `RRULE` and is used to
generate instances.

**Instance Event**: One occurrence generated from a base event. Instances point
back to the base with `recurrence.eventId`.

**Update Scope**: The user's recurring edit choice: This Event, This and
Following Events, or All Events.

## Google Sync

**Primary Calendar**: The main Google Calendar Compass currently syncs. Compass
does not yet support choosing multiple Google calendars in the UI.

**Google Watch**: A Google Calendar watch subscription used to notify Compass
when Google-side calendar data changes. Use "channel" only for Google API
fields such as `channelId`.

**nextSyncToken**: Google's cursor for incremental calendar sync.

**Google Revoked**: Compass shorthand for the state where Google access is no
longer usable and Google-origin data should be pruned or reconnected.

## Runtime

**Server-Sent Events (SSE)**: The realtime connection Compass uses for
calendar refreshes, import status, metadata updates, and Google revocation.
Browsers connect with `GET /api/events/stream`.
