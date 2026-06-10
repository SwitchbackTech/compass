# Compass Context

Compass is a calendar and task app with local-first anonymous use,
account-backed event storage, and optional Google Calendar integration. This
file gives agents and contributors the shared domain language to use in issues,
plans, diagnoses, and architecture notes.

Detailed source docs:

- `docs/README.md` - docs index
- `docs/architecture/glossary.md` - short canonical glossary
- `docs/architecture/event-and-task-domain-model.md` - event and task shape
- `docs/features/recurring-events-handling.md` - recurrence behavior
- `docs/features/google-sync-and-sse-flow.md` - Google sync and realtime flow
- `docs/development/hosting-modes.md` - account, hosting, and storage modes
- `docs/self-hosting/README.md` - self-hosting story

## Language

### Users And Hosting

**Compass Cloud**:
The managed Compass product at `compasscalendar.com`.

**Self-hosted Compass**:
An operator-run Compass install, usually the local Docker setup served at
`http://localhost:9080`.

**Anonymous user**:
A user with no account session whose events and tasks stay in browser
IndexedDB.
_Avoid_: local user

**Authenticated user**:
A user with a Compass session managed through SuperTokens.
_Avoid_: Google user

**Password-authenticated user**:
An authenticated user using email/password without necessarily having Google
Calendar connected.
_Avoid_: non-Google user

**Google-connected user**:
An authenticated user with usable Google credentials stored by the backend.

**Google authorization**:
The Google approval step that lets Compass sign a user in with Google or connect
Google Calendar to an active existing Compass session.
_Avoid_: Google login mode

**Google authorization intent**:
The user's Compass purpose for a Google authorization: Google sign-in/up or
Google Calendar connect/reconnect.
_Avoid_: auth mode

**Google revoked**:
The state where Google access is no longer usable and Google-origin data should
be pruned, ignored, or reconnected.
_Avoid_: logged out

### Events

**Event**:
A Compass calendar item represented by the shared event contract.

**Standalone Event**:
A single event that is not part of a recurring series.

**Timed Event**:
An event shown in a concrete time range on the calendar grid.

**Timed Grid**:
The calendar surface that lays out Timed Events by day column and time.
_Avoid_: day slots

**Day View**:
The single-date calendar view. When routed without a date, it opens on today,
but it can represent any selected date.
_Avoid_: Today view, unless referring specifically to the current date

**All-Day Event**:
An event shown in the all-day row.
_Avoid_: day event

**Grid Event**:
An event assigned to a concrete day/week calendar slot.

**Planner Sidebar**:
The calendar side panel that holds navigation, account context, and Someday
Events.
_Avoid_: Planning sidebar

**Someday Event**:
An unscheduled event stored in the sidebar instead of the calendar grid.
_Avoid_: Someday task

**Draft Event**:
A temporary event shape used while the user edits, drags, resizes, or
repositions before saving.

**Interaction Overlay**:
The temporary moving visual shown while a user drags or resizes an Event.

**Source Event Element**:
The original rendered Event element that an interaction starts from. During an
**Interaction Overlay**, the source can either stay visible as a dimmed
placeholder or be hidden while the overlay moves.

**Source Element Overlay Mode**:
The interaction choice for the **Source Event Element** while an
**Interaction Overlay** is active. `dim-source` means keep the original Event
visible, faded, and non-interactive so the user can still see where it came
from. `hide-source` means hide the original Event while the overlay is moving.
Use `dim-source` for drag interactions where the original slot should remain
visible; use `hide-source` only when showing both the source and overlay would
make the resize or motion state confusing.

**Base Event**:
A recurring event that owns the series recurrence rule.
_Avoid_: parent event

**Instance Event**:
One occurrence generated from a base event.
_Avoid_: child event

**Recurring Series**:
A base event plus its generated or persisted instance events.

**Update Scope**:
The user's recurring edit or delete choice: This Event, This and Following
Events, or All Events.
_Avoid_: recurrence mode

### Tasks

**Task**:
A local task item tied to a specific date.

**Date key**:
The storage-level date association for tasks.

**Now mode**:
The `/now` view that focuses on today's incomplete tasks and lets the user lock
in on one task.

### Google Sync And Realtime

**Primary Calendar**:
The main Google Calendar Compass currently syncs.

**Google Watch**:
A Google Calendar watch subscription used to notify Compass when Google-side
calendar data changes. Use "channel" only when referring to Google API fields
such as `channelId`.
_Avoid_: Sync Channel

**nextSyncToken**:
Google's cursor for incremental calendar sync.

**Server-Sent Events (SSE)**:
The realtime browser connection Compass uses for calendar refreshes, import
status, user metadata, and Google revocation.

**Import**:
A Google Calendar import into Compass.

**Repair**:
A Google sync recovery path that refreshes or restarts Google data when metadata
says the existing sync needs repair.

**Google Watch repair**:
A repair path that recreates missing, expired, stale, or incomplete **Google
Watches** for a **Google-connected user**. Repair should happen only when watch
state is broken; regular health checks should not repeatedly call Google when
watches are already healthy. When sync tokens are usable, watch repair should
also catch up missed Google-side changes through incremental import; when sync
tokens are missing or invalid, fall back to full **Repair**.

**Public watch notifications**:
Google-to-Compass webhook posts at `/api/sync/gcal/notifications`.

**Compass-to-Google event propagation**:
The backend flow that applies Compass Event writes and mirrors eligible Google
side effects.

**Google-to-Compass event propagation**:
The backend flow that applies Google Calendar event changes to Compass data
during Import or Public watch notification handling.

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

## Project Rules

- Google Calendar is optional.
- Missing Google credentials must not block Compass-local event writes.
- Treat recurring event changes as changes to a **Recurring Series**, not just
  isolated event rows.
- Do not use **Someday Event** and **Task** interchangeably.
- Do not describe the frontend as Tailwind-only or styled-components-only.
- Do not describe local self-hosting as proving continuous Google sync unless a
  public HTTPS webhook path has been configured and verified.
- When changing a shared event, sync, API, or error contract, keep the web,
  backend, and `core` package aligned.

## Example Dialogue

> **Dev:** "Can I move this Someday item into the task list?"
> **Domain expert:** "No. A **Someday Event** is still an **Event**; it can be
> scheduled onto the calendar grid. A **Task** is date-keyed local task data."

> **Dev:** "If Google is not connected, should authenticated event saves fail?"
> **Domain expert:** "No. A **Password-authenticated user** should still be able
> to save Compass **Events**. Google side effects are optional."

> **Dev:** "Does localhost support continuous Google sync?"
> **Domain expert:** "Browser API and **SSE** traffic can use localhost, but
> **Public watch notifications** from Google need a public HTTPS backend URL."

## Flagged Ambiguities

- "Account" can mean a Compass user, a SuperTokens session, or a Google account.
  Use the exact term for the layer being discussed.
- "Sync" can mean local IndexedDB persistence, backend event persistence, Google
  import, Google incremental sync, or SSE refresh. Name the specific flow.
- "Local" can mean browser IndexedDB, local Docker self-hosting, local backend
  development, or Compass-local event ownership. Use the precise phrase.
- "Recurring event" can mean a **Base Event**, an **Instance Event**, or the
  whole **Recurring Series**. Use the exact term before changing behavior.

## When To Update This File

Update this file when a new domain term becomes common, a term is being used
ambiguously, or a core relationship changes across events, tasks, auth, storage,
self-hosting, or Google sync. Keep detailed procedures in `docs/`.
