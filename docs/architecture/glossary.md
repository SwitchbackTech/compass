# Glossary

Compass-specific terms used in the source code and docs.
Update this file when a new domain term becomes common, a term is being used
ambiguously, or a core relationship changes

## Events

**Event**:
A Compass calendar item represented by the shared event contract.

**Standalone Event**: A single event that is not part of a recurring series.

**All-Day Event**:
An event shown in the all-day row. Moves horizontally by day in the all-day row.
_Avoid_: day event

**Grid Event**: An timed event assigned to a concrete calendar slot in the grid. These are different from Someday events. Moves vertically by time slot and horizontally by day while it remains in the grid.

**Draft Event**: A pending event shape used while the user edits, drags,
resizes, or repositions before saving.

**Someday Event**: An unscheduled event stored in the sidebar instead of the
calendar grid. Someday events may be recurring or standalone. Can convert to either **Timed Event** or **All-Day Event**.
_Avoid_: Someday task

### Recurring Events

#### Recurring Event Types

**Recurring Event**: A a **Base Event**, an **Instance Event**, or the
  whole **Recurring Series**. Use the exact term before changing behavior.

**Base Event**: A recurring event that owns the series `RRULE` and is used to
generate instances.

**Instance Event**: One occurrence generated from a base event. Instances point
back to the base with `recurrence.eventId`.

#### Recurring Event Metadata

**Recurrence Scope**: The user's recurring edit choice: This Event, This and
Following Events, or All Events.

A **Recurring Series** has exactly one **Base Event** and zero or more
  **Instance Events**.
An **Instance Event** belongs to exactly one **Base Event** through
  `recurrence.eventId`.

## Tasks

**Task**:
A local task item tied to a specific date.

**Date key**:
The storage-level date association for tasks.

## Views

**Day View**:
The single-date calendar view. When routed without a date, it opens on today,
but it can represent any selected date.
_Avoid_: Today view, unless referring specifically to the current date

**Planner Sidebar**:
The calendar side panel that holds navigation, account context, and Someday
Events.
_Avoid_: Planning sidebar

## Hosting

**Compass Cloud**:
The managed Compass product at `compasscalendar.com`.

**Self-hosted Compass**:
An operator-run Compass install, usually the local Docker setup served at
`http://localhost:9080`.

## Accounts

- "Account" can mean a Compass user, a SuperTokens session, or a Google account. Use the exact term for the layer being discussed.

## Users

**Anonymous user**:
A user with no account session whose events and tasks stay in browser
IndexedDB.
_Avoid_: local user

**Authenticated user**:
A user with a Compass session managed through SuperTokens. Stores event data that the API manages (MongoDB).
_Avoid_: Google user

**Password-authenticated user**:
An authenticated user using email/password without necessarily having Google
Calendar connected.
_Avoid_: non-Google user

**Google-connected user**:
An authenticated user with usable Google credentials stored by the backend.
Can import from Google and mirror eligible Compass event changes to Google.

**Google authorization**:
The Google approval step that lets Compass sign a user in with Google or connect
Google Calendar to an active existing Compass session.
_Avoid_: Google login mode

**Google authorization intent**:
The user's Compass purpose for a Google authorization: Google sign-in/up or
Google Calendar connect/reconnect. Requires  an active **Authenticated user** session. If that session is missing or expired at callback time, Compass should recover through Google sign-in instead of calling the authenticated Google connect endpoint.
_Avoid_: auth mode

**Google revoked**:
The state where Google access is no longer usable and Google-origin data should
be pruned, ignored, or reconnected.
_Avoid_: logged out

## Sync

"Sync" can mean local IndexedDB persistence, backend event persistence, Googl import, Google incremental sync, or SSE refresh. Name the specific flow.e

### Google Sync

**Google Import**:
A Google Calendar import into Compass.

**Google Repair**:
A Google sync recovery path that refreshes or restarts Google data when metadata
says the existing sync needs repair.

**Google Watch repair**:
A repair path that recreates missing, expired, stale, or incomplete **Google
Watches** for a **Google-connected user**. Repair should happen only when watch
state is broken; regular health checks should not repeatedly call Google when
watches are already healthy. When sync tokens are usable, watch repair should
also catch up missed Google-side changes through incremental import; when sync
tokens are missing or invalid, fall back to full **Repair**.

**Primary Calendar**: The main Google Calendar Compass currently syncs. Compass
does not yet support choosing multiple Google calendars in the UI.

**Google Watch notifications**: A Google Calendar watch subscription used to notify Compass when Google-side calendar data changes. Use "channel" only for Google API fields such as `channelId`. These are eparate from browser API and **SSE** traffic; browser traffic can be local, but Google webhook posts need public HTTPS when continuous sync is expected.
_Avoid_: Sync Channel

**nextSyncToken**: Google's cursor for incremental calendar sync.

**Google Revoked**: Compass shorthand for the state where Google access is no
longer usable and Google-origin data should be pruned or reconnected.

## Runtime

**Server-Sent Events (SSE)**: The realtime broswser connection Compass uses for
calendar refreshes, import status, metadata updates, and Google revocation.
Browsers connect with `GET /api/events/stream`.

## Keyboard

**Shortcut**: A keyboard combination that triggers an app action, from the
low-level key-registration primitive (`useAppShortcut`, under
`packages/web/src/shortcuts`) through the user-facing catalog, overlay UI, and
per-view `use*Shortcuts` hooks. Use "shortcut" everywhere, including for the
key-binding primitive itself.
_Avoid_: hotkey — the term survives only inside the third-party
`@tanstack/react-hotkeys` package name and its own exports
(`HotkeysProvider`, `HotkeyManager`), which Compass code does not rename.

## Relationships

- An **Anonymous user** stores **Events** and **Tasks** in browser IndexedDB.
- An **Authenticated user** stores **Events** through the backend and configured
  MongoDB.
- A **Timed Event** appears in the **Timed Grid**.
- An **All-Day Event** appears in the all-day row.
- An active Week **Draft Event** can be repositioned before saving, whether it
  was created from a keyboard shortcut, created from the grid, or opened from an
  existing **Grid Event**.
- A **Timed Event** draft moves vertically by time slot and horizontally by day
  while it remains in the **Timed Grid**.
- Keyboard repositioning moves the whole **Draft Event** and preserves its
  duration.
- An **All-Day Event** draft moves horizontally by day in the all-day row.
- A shortcut-created **All-Day Event** draft starts as a one-day draft, not a
  full-week draft.
- Shortcut-created **Draft Events** start on today when today is inside the
  visible **Week View**; otherwise, they start on the visible week's anchor day.
- Keyboard repositioning keeps **Draft Events** inside the visible **Week View**
  bounds unless the interaction explicitly supports navigation.
- Keyboard repositioning keeps a **Timed Event** draft within one day and does
  not move it past midnight.
- Keyboard repositioning works while the **Draft Event** form is open unless
  the user is typing in an editable field.
- Keyboard repositioning preserves the user's current focus target unless the
  user explicitly commits title editing.
- Pressing Enter in a newly created **Draft Event** title field saves the final
  **Event** immediately.
- The **Draft Event** form remains non-modal while the draft block is used as
  the keyboard handle.
- Plain arrow-key repositioning applies to the active Week **Draft Event**. A
  saved **Event** that is not being edited as the active **Draft Event** does
  not move.
- The Week shortcuts overlay may summarize arrow-key movement as a single
  draft-movement shortcut instead of listing every arrow key separately.
- A **Timed Event** that is dragged outside the **Timed Grid** stays a
  **Timed Event** unless the interaction explicitly converts it to an
  **All-Day Event**.
- A dragged **Timed Event** stays within the visible bounds of the **Timed
  Grid** while it remains a **Timed Event**.
- A dragged **Timed Event** released outside the visible **Timed Grid** uses
  its visible bounded position as the saved time.
- A **Task** belongs to a **Date key** and stays local today, even when the user
  is authenticated.
- A **Someday Event** is an **Event**, not a **Task**.
- A **Someday Event** can move between **Planner Sidebar** sections without
  becoming a **Grid Event**.
- During **Planner Sidebar** sorting, sibling **Someday Events** make room for
  the dragged event's preview position before the drop commits.
- When a dragged **Someday Event** leaves the **Planner Sidebar** for a calendar
  surface, the sidebar stops previewing a sidebar sort.
- A full **Planner Sidebar** section is not a valid drop target for another
  **Someday Event**.
- A **Someday Event** is scheduled as a **Timed Event** or **All-Day Event**
  based on the calendar surface where it is dropped.
- A **Recurring Series** has exactly one **Base Event** and zero or more
  **Instance Events**.
- An **Instance Event** belongs to exactly one **Base Event** through
  `recurrence.eventId`.
- A **Base Event** owns the series recurrence rule.
- An **Update Scope** tells Compass whether a recurring change applies to one
  instance, this-and-following instances, or the whole series.
- A **Password-authenticated user** can create, edit, and delete Compass
  **Events** without becoming a **Google-connected user**.
- A **Google-connected user** can import from Google and mirror eligible Compass
  event changes to Google.
- A **Google authorization** must preserve its **Google authorization intent**
  instead of inferring the user's goal from the later session state.
- A Google Calendar connect/reconnect **Google authorization intent** requires
  an active **Authenticated user** session. If that session is missing or
  expired at callback time, Compass should recover through Google sign-in
  instead of calling the authenticated Google connect endpoint.
- **Public watch notifications** are separate from browser API and **SSE**
  traffic; browser traffic can be local, but Google webhook posts need public
  HTTPS when continuous sync is expected.
