# Google sub-calendars v1 master plan

This directory replaces GitHub Project 6, **Google Subcalendars**, as the
implementation source of truth. The project query
`org:SwitchbackTech project:SwitchbackTech/6` returned 25 cards on 2026-07-10:
12 open issues and 13 completed cards.

All 12 issues that were open in Project 6 were closed as `not planned` on
2026-07-10 because Compass no longer uses GitHub issues for this work. Closure
does not mean implementation is complete. `00-project-ledger.md` preserves the
requirements, and the checkboxes in these files are the only progress tracker.

## v1 outcome

A v1 user can connect Google, import every non-hidden and non-deleted calendar,
see events or availability from chosen calendars, create/edit/delete events on
any writable Google calendar, receive ongoing Google changes, and recover
automatically from missing or expired notification watches. Existing password-
only, offline, someday, priority, all-day, and recurring-event behavior
continues to work.

V1 is complete only when all of the following are true:

- [ ] Every event belongs to a Compass calendar and the active event
      collection uses the final validated schema.
- [ ] Existing event data migrates without silent drops and has a tested
      rollback path.
- [ ] Initial Google import handles all eligible calendars with bounded
      concurrency, resumable pagination, and per-calendar sync tokens.
- [ ] Event CRUD resolves the owning calendar, enforces access roles, and never
      silently falls back to the Google primary calendar.
- [ ] Calendar-list changes add, update, and remove calendars and their watches
      without a full user reset in the normal case.
- [ ] Watch health is inspected and repaired through one idempotent path.
- [ ] Every Google Calendar API request flows through one request context with
      centralized bounded retries; the context supplies a stable `quotaUser` as
      hardening (A33).
- [ ] The sidebar lists calendars with persistent visibility controls, forms
      select writable target calendars, and calendar identity is not conveyed by
      color alone.
- [ ] The release migration, rollback, observability, performance, and manual
      acceptance runbooks have been exercised on production-shaped data.

## Ordered execution

Work through these files in order. A later plan may be researched while an
earlier one is in review, but it must not be merged when its dependency is
unfinished.

- [x] 00. [Project ledger](./00-project-ledger.md) — reconcile and retire issue
      cards.
- [x] 01. [Domain contracts](./01-domain-contracts.md) — freeze calendar/event/API
      semantics before migration work. Shipped in PR #2015. Use the companion
      [full schemas](./01a-proposed-contract-schemas.md) and
      [examples/flows](./01b-contract-examples-and-flows.md) as the concrete
      implementation reference.
- [x] 02. [Safe event data migration](./02-safe-event-data-migration.md) — build and
      verify the non-destructive v2 backfill plus the calendar-collection
      migration (A32).
- [x] 03. [Event runtime cutover](./03-event-runtime-cutover.md) — move the codebase
      from the legacy user-owned event shape to calendar-owned storage.
- [x] 04. [Initial multi-calendar import](./04-initial-multi-calendar-import.md) —
      import all eligible Google calendars and events; starts with the request
      context, retry policy, and 7-day channel expiration pulled forward from
      `07` (A30). Shipped in PRs #2036, #2038, #2040, #2043.
- [x] 05. [Calendar-aware CRUD](./05-calendar-aware-crud.md) — route writes to the
      correct provider calendar and enforce permissions. Shipped in PRs
      #2046, #2049, #2050.
- [x] 06. [Calendar-list sync and watch routing](./06-calendar-list-sync-and-watch-routing.md)
      — keep the calendar set current. Shipped in PRs #2054, #2055, #2056.
- [x] 07. [Watch repair, quota, and retries](./07-watch-repair-quota-and-retries.md) —
      self-heal notifications and control Google API pressure. Shipped in
      PRs #2058, #2059, #2060.
- [ ] 08. [Web calendar experience](./08-web-calendar-experience.md) — ship visibility,
      identity, selection, and read-only UX.
- [ ] 09. [V1 release hardening](./09-v1-release-hardening.md) — prove migration,
      reliability, performance, accessibility, and rollback.

## Progress rules for agents

1. Read this file, the target plan, `AGENTS.md`, and every dependency plan. If
   `01-domain-contracts.md` is a target or dependency, also read its `01a` full
   schema and `01b` examples/flows companions.
2. Confirm the target plan's current-state statements against the current
   branch; paths and APIs may have changed since 2026-07-10.
3. Keep the target plan's scope in one branch/PR where practical. If a step is
   too large, split only at the explicit commit boundaries in that plan.
4. Add behavior-focused regression tests before or with the implementation.
   Do not retain temporary probes or one-off debug code.
5. Run the focused package tests first, then `bun type-check`, `bun lint`, and
   `bun run verify` before handoff. A migration change also requires
   `bun test:scripts`; shared contracts require every affected package test.
6. Update checkboxes and the decision log only after the corresponding code and
   tests are committed. Record deviations; do not silently rewrite an earlier
   assumption.
7. Do not edit already-executed 2025 migration files. Correct them with a new,
   forward-only migration.
8. Do not delete the legacy event collection in v1. It is the rollback source.

### Copy/paste agent kickoff

> Work the next unchecked file in `handoff/someday/master-doc.md`. Read the
> master assumptions, `00-project-ledger.md`, the target file, its dependencies,
> and `AGENTS.md`. If `01` is involved, read both `01a` and `01b`. Implement
> only that packet, run its focused verification,
> update its completed checkboxes and the master execution checkbox, and commit
> with the suggested conventional scope. If current code contradicts the plan,
> record a dated decision in `master-doc.md` before changing direction.
> Rollout is staging-first (A36): merged packets auto-deploy to staging, which
> is already cut over; never run the `Deploy Production` action — production
> cuts over once, after the `09` gates pass on staging.

## Current-state summary

- `CompassCalendarSchema`, the `calendar` collection, migrations, backend list
  and selection routes, and Google calendar mapping already exist.
- `POST /api/calendars` accepts a client-supplied calendar document even though
  v1 calendar lifecycle is server-owned; the plan removes that unused authority.
- `getCalendarsToSync()` returns every eligible Google calendar (packet `04`,
  PRs #2036/#2038/#2040/#2043) and initial sync imports/watches all of them;
  `importLatestGoogleCalendarChanges` (the incremental/webhook-triggered path)
  remains intentionally primary-only, since multi-calendar incremental sync is
  driven by per-calendar watches rather than this function.
- `event_new.types.ts` and an `event_new` collection/backfill exist, but the
  application still reads/writes the legacy `event` collection and legacy
  `Schema_Event` with a `user` field.
- The dormant event schema cannot represent live all-day/someday behavior and
  drops someday `order`; it also omits the legacy but currently unused
  `allDayOrder`. The existing backfill can silently skip invalid rows,
  choose the wrong calendar, and accumulate the whole migration in memory.
- ~~Google event create/update/delete still default to `GCAL_PRIMARY`.~~
  (2026-07-11 correction, packet 05: only `GCalService.getEvent`'s read
  path ever had this default; `createEvent`/`updateEvent`/`deleteEvent`
  already required an explicit calendar id entering packet 05, and
  Compass-to-Google propagation already resolved the target from
  `calendar.source.calendarId`. This bullet was stale by the time packet 05
  started — likely already fixed as a side effect of packet 04's per-calendar
  fan-out work without this summary being updated.)
- The public notification endpoint already resolves a stored watch by channel
  id/resource id and derives its Google calendar. A calendar id in the route is
  unnecessary and less trustworthy than that stored association.
- ~~Event watch notifications work per stored Google calendar id. Calendar-list
  notifications reach `GCalNotificationHandler` but are explicitly ignored.~~
  (2026-07-12, packet 06: calendarlist notifications now drive an incremental
  reconcile — `googleCalendarListService.reconcileCalendarList` — with
  archive/import/watch side effects, per-user serialization, token-advance
  only after success, and targeted full-list recovery on a rejected token.
  Events notifications additionally suppress SSE for invisible calendars on
  the webhook path. PRs #2054, #2055, #2056.)
- ~~`quotaUser` is used only by watch start/stop paths and is sometimes a new
  random id. Normal list/get/insert/update/delete requests do not carry it.~~
  (2026-07-12, packet 07: stale since packet 04's request context — every
  GCalService method already carried the stable user id; PR #2060 adds the
  table-driven proof with a reflection guard.)
- ~~The two `invalid_grant` paths diverge dangerously: the interactive path runs
  `pruneGoogleData` (preserves Compass-local data), but the watch-maintenance
  planner calls `deleteCompassDataForUser`, deleting every event, calendar,
  priority, and the user document (`google-watch-maintenance.planner.ts:95-97`).
  Plan `07` must remove that wipe path (A29).~~ (2026-07-12, packet 07:
  implemented in PR #2059 — every revoked-access site funnels through one
  `pruneGoogleDataAndNotifyRevoked` helper; `deleteCompassDataForUser`
  remains only for the account-deletion CLI.)
- Google event updates go through `events.update` (full resource replace) with a
  partial body, so fields Compass does not model (attendees, location,
  reminders) are silently wiped on Google today. Plan `05` switches writes to
  `events.patch` (A28).
- ~~Watch channels default to a 10-minute expiration
  (`CHANNEL_EXPIRATION_MIN` default `"10"`), while the renew-soon buffer is 3
  days, so every live watch is permanently classified as expiring.~~
  (2026-07-12 correction, packet 07: stale — packet 04 shipped the 7-day
  default (`"10080"`, A30). PR #2060 pins the default and that watches
  persist Google's returned expiration; short TTLs are a dev/test override.)
- Timed events store only offset strings; no IANA time zone exists anywhere in
  the event data, and the Google mapper guesses the server zone at write time.
- The merged domain-module refactor from issue #1719 is present. An unmerged
  remote branch, `origin/refactor/google-sync-domain-modules-1719`, contains
  useful watch-repair work in commits `61c3bc0db` and `b572a3ca4`; port the
  relevant ideas, not the divergent branch wholesale.
- The web has no calendar query/store/sidebar controls or target-calendar form
  field. Event cards are currently colored by priority.

## Assumption and decision log

These assumptions resolve missing or contradictory issue details. Change one
only by appending a dated decision and updating every affected plan.

| ID  | Assumption / decision                                                                                                                                                                                                                                                                                                                                                                | Reason                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | V1 supports Google and local Compass calendars. Outlook and iCalendar adapters, sharing administration, reminders, and mobile apps are future work.                                                                                                                                                                                                                                  | Matches current product scope and keeps a narrow extension point without implementing unused providers.                                                                                                    |
| A2  | Import every CalendarList entry except `deleted: true` or `hidden: true`, regardless of access role.                                                                                                                                                                                                                                                                                 | Explicit #553 scope. Read-only roles still need display support.                                                                                                                                           |
| A3  | Google `selected` seeds Compass `isVisible` only on first insert. Later Google refreshes and archive/reactivate cycles preserve Compass visibility.                                                                                                                                                                                                                                  | Prevents Google UI choices from overwriting Compass user choices and avoids using one name for two preferences.                                                                                            |
| A4  | Every user owns one Compass-local calendar. Someday events belong to it. A Google-connected scheduled draft defaults to the primary writable Google calendar; otherwise it defaults to the Compass-local calendar.                                                                                                                                                                   | Supports password-only/offline users and removes the migration's missing-calendar failure.                                                                                                                 |
| A5  | An event has one owning calendar and at most one provider reference. Use a discriminated provider object, not an array of provider metadata.                                                                                                                                                                                                                                         | One event cannot be written to several provider calendars in v1; an array adds states the product cannot uphold.                                                                                           |
| A6  | Calendar assignment is immutable for an existing event in v1. Users choose a calendar when creating or duplicating; moving an existing/recurring event between calendars is deferred.                                                                                                                                                                                                | Cross-calendar moves have distinct Google and recurrence semantics and are not required for CRUD within each calendar.                                                                                     |
| A7  | `owner` and `writer` calendars are writable. `reader` calendars sync events but private events use explicit busy content. `freeBusyReader` calendars use bounded free/busy range queries and never manufacture event records.                                                                                                                                                        | Mirrors Google access roles, preserves privacy, and keeps identity-dependent event behavior honest.                                                                                                        |
| A8  | Events watches and incremental sync continue for all imported active calendars that expose Events, even if hidden in Compass. `freeBusyReader` calendars retain CalendarList tracking but fetch availability on demand. The backend suppresses event-change SSE for invisible calendars.                                                                                             | Visibility is a presentation preference, while Google's free/busy resource has no persistent event identity or watch stream.                                                                               |
| A9  | Calendar identity appears as an accent/marker and text label while priority remains the event-card fill.                                                                                                                                                                                                                                                                             | Preserves an established priority workflow and avoids color-only identification.                                                                                                                           |
| A10 | A short, documented write pause is acceptable for the one-time event collection cutover. Dual-write and CDC are not justified for v1.                                                                                                                                                                                                                                                | Simplest reliable migration with an untouched rollback collection.                                                                                                                                         |
| A11 | Open baseline-migration issues #783, #1038, and #1039 are retired as not planned, matching their already-retired siblings. Incremental Umzug migrations remain the supported model.                                                                                                                                                                                                  | Blank baseline children no longer describe the implemented migration architecture.                                                                                                                         |
| A12 | #735 is retired as superseded by #1135, and #734 is retired because stored watch routing already supplies the authoritative calendar id.                                                                                                                                                                                                                                             | Avoids duplicate or weaker implementations.                                                                                                                                                                |
| A13 | Existing 2025 migrations may already be recorded as executed in user databases and are immutable.                                                                                                                                                                                                                                                                                    | Editing them would not repair upgraded installations.                                                                                                                                                      |
| A14 | The 24-character Compass user ObjectId is an acceptable stable opaque `quotaUser`. It must be reused, never randomly regenerated per request.                                                                                                                                                                                                                                        | It is within Google's limit, contains no email/token, and makes quota accounting consistent.                                                                                                               |
| A15 | Calendar lifecycle is server-owned in v1. Clients may list calendars and change Compass visibility but may not create/delete provider calendars.                                                                                                                                                                                                                                     | Google owns its CalendarList; Compass creates its one local calendar internally. Removing generic calendar CRUD reduces authority and API surface.                                                         |
| A16 | A removed/hidden Google calendar is archived with `isActive: false`, not deleted. Reactivation reuses its Compass id and visibility preference.                                                                                                                                                                                                                                      | Prevents preference loss, dangling identity changes, and needless duplicate calendar rows.                                                                                                                 |
| A17 | Event scheduling is a `timed` / `allDay` / `someday` discriminated union. Recurrence is a `single` / `series` / `occurrence` discriminated union.                                                                                                                                                                                                                                    | Makes required fields depend on the actual event state and removes invalid boolean/optional-property combinations.                                                                                         |
| A18 | Detail events require `title` and `description` strings; both may be empty. Redacted events use an explicit `busy` content variant.                                                                                                                                                                                                                                                  | Keeps normal UI/backend code strict without fabricating private Google data.                                                                                                                               |
| A19 | Timed instants use BSON Dates in Mongo and RFC 3339 strings with offsets over HTTP, with a required IANA time zone. All-day/someday dates remain date-only strings and all-day ends are exclusive.                                                                                                                                                                                   | Preserves instants and DST recurrence semantics without shifting date-only values through time zones.                                                                                                      |
| A20 | `sortOrder` is required only for someday schedules. Legacy `allDayOrder` has no production reader and is explicitly retired after migration audit. A separate ordering relation is deferred until independent per-view/per-user ordering is needed.                                                                                                                                  | Preserves the only user-controlled persisted ordering without carrying an unused field or adding an offline/concurrency subsystem.                                                                         |
| A21 | The cutover is a breaking release performed during downtime. API, web, backend, migration, and local-storage versions move together; there is no legacy payload compatibility or calendar fallback.                                                                                                                                                                                  | The team explicitly accepts downtime and migrations, allowing one strict contract instead of prolonged dual behavior.                                                                                      |
| A22 | Contract names use `Record` for persistence, `Input` for commands, `Response` for transport envelopes, `Draft` for incomplete web state, and `View`/`Layout` for derived presentation. Canonical read models are `Calendar` and `Event`.                                                                                                                                             | Replaces inconsistent `Schema_*`, `Core*`, `Web*`, and `Payload_*` names with boundary-based language.                                                                                                     |
| A23 | Google is the only external adapter in v1. Provider identities are discriminated unions that gain Outlook/iCalendar members only when those adapters are implemented.                                                                                                                                                                                                                | Leaves a stable extension point without building a speculative provider framework.                                                                                                                         |
| A24 | (2026-07-10) Someday↔scheduled conversion is an explicit transition command, not a replace. It is the only sanctioned calendar-ownership change in v1; `ReplaceEventInput` still never moves calendars.                                                                                                                                                                              | Drag conversions are existing core UX (`convertToSomeday`/`convertToCalendar`); the replace contract has no calendar field, so A6 needs one carve-out.                                                     |
| A25 | (2026-07-10) `CreateEventInput` accepts an optional client-generated event id (validated ObjectId; server enforces uniqueness and ownership).                                                                                                                                                                                                                                        | Preserves the current optimistic-create id behavior and undo-of-delete, which restores an event under its original `_id`.                                                                                  |
| A26 | (2026-07-10) Timed `timeZone` stays required. Migration derives it: Google event → its calendar's time zone; else the user's primary Google calendar time zone; else UTC. The derivation counts are recorded. New clients send the browser IANA zone.                                                                                                                                | Legacy events store only an offset string and no zone; today's Google mapping guesses the SERVER zone (`dayjs.tz.guess()` in `map.event.ts`).                                                              |
| A27 | (2026-07-10) The SSE `ServerMessage` union covers every published message: events/calendars/sync-status changes plus import-completion (with counts) and user-metadata. No legacy SSE name survives outside the union.                                                                                                                                                               | Web actively consumes `IMPORT_GCAL_END` payloads and `USER_METADATA`; a partial union silently breaks onboarding and account status.                                                                       |
| A28 | (2026-07-10) Provider event writes use Google `events.patch` scoped to Compass-owned fields (summary, description, start, end, recurrence), never full `events.update`.                                                                                                                                                                                                              | `update` replaces the whole resource and would wipe attendees/location/reminders on shared-calendar events Compass does not model.                                                                         |
| A29 | (2026-07-10) Credential errors never delete Compass data. The maintenance-path `invalid_grant` handler (currently `deleteCompassDataForUser`, a full account wipe) is replaced by the same prune-and-notify used interactively.                                                                                                                                                      | `google-watch-maintenance.planner.ts:95-97` deletes priorities, all events, and the user document today; multi-calendar maintenance multiplies exposure.                                                   |
| A30 | (2026-07-10) The Google request context (stable `quotaUser`, centralized retry/backoff) and the 7-day channel expiration are prerequisites inside plan `04`, before multi-calendar fan-out. Plan `07` keeps inspection, repair, and the lease.                                                                                                                                       | A 25-calendar import without backoff hits rate limits, and 10-minute channels cannot survive multi-calendar renewal churn.                                                                                 |
| A31 | (2026-07-10) The cutover renames collections during the pause (`event` → legacy archive name, `event_new` → `event`); `Collections` constants stay stable.                                                                                                                                                                                                                           | Validators and indexes travel with a rename; repointing constants would touch every consumer and diverge dev (`_dev.`) naming.                                                                             |
| A32 | (2026-07-10) Migrating the `calendar` collection to the final record shape (`user`→`userId`, `selected`→`isVisible`, `primary`→`isPrimary`, `metadata`→`source`, add `isActive`/timestamps, new partial unique indexes, one local calendar per user) is in scope for plan `02`.                                                                                                      | No packet owned the calendar-side migration even though every plan depends on the new calendar contract.                                                                                                   |
| A33 | (2026-07-10) `quotaUser` ships as cheap hardening via the shared request context but is not a release gate. Google attributes per-user quota to the authenticated OAuth user automatically; the guide's `quotaUser` advice targets domain-wide-delegation service accounts.                                                                                                          | Corrects the A14 rationale without abandoning the mechanism the request context provides for free.                                                                                                         |
| A34 | (2026-07-10) `EventRecord` has no `origin` field. Provider cleanup and backfill use `calendar.source.provider` plus `externalReference` (null = never synced). Restore `origin` only if plan `03` names a concrete consumer.                                                                                                                                                         | Legacy `origin` (`compass`/`google`/`googleimport`/`unsure`) duplicates information the calendar and external reference already carry.                                                                     |
| A35 | (2026-07-10) Someday list queries drop cursor pagination; the query is period + anchor date only. `LocalEventRecord` drops the `syncState` field.                                                                                                                                                                                                                                    | The product caps someday lists at 9 per period, and local sync is push-all-then-clear on connect; both fields modeled machinery that does not exist.                                                       |
| A36 | (2026-07-11) The v1 rollout is staging-first: the collection cutover runs on STAGING with the runtime-cutover merge, packets `03`-`09` merge continuously (main auto-deploys staging), and production stays on the pre-cutover release until every `09` gate passes on staging — then one production migration run plus one manual `Deploy Production` action completes the rollout. | Staging becomes the living integration test for the whole v1; production sees exactly one change window instead of nine, and the rerunnable backfill absorbs everything production writes in the meantime. |
| A37 | (2026-07-12) An access transition to `freeBusyReader` deletes that calendar's previously-synced Compass events along with its watch and events sync entry; the calendar row stays active with the new role.                                                                                                                                                             | A7 says freeBusyReader calendars never manufacture event records; keeping already-synced events that can no longer receive updates would display silently-stale data. Packet 06, PR #2055.                  |
| A38 | (2026-07-12) A calendarlist delta entry flagged `hidden` is reconciled identically to `deleted`: archive the row and tear down its watch/sync entry/events. Re-adding either way reuses the archived row's id and visibility (A16).                                                                                                                                       | A2 makes hidden calendars ineligible for import; in delta form an ineligible calendar must be reconciled away, not skipped the way the initial full-list filter does. Packet 06, PR #2055.                  |
| A39 | (2026-07-12) A rejected CalendarList sync token (410) recovers via a targeted full-list reconcile inside the calendarlist reconciler — surviving calendars keep their events, per-calendar events tokens, watches, and visibility. The controller's event-deleting full repair now serves only events-token 410s.                                                        | The calendarlist token's validity is independent of per-calendar events tokens, so discarding every google event to rebuild one list token was disproportionate. Packet 06, PR #2056.                       |
| A40 | (2026-07-12) Watch-maintenance activity is `lastSeenAt` (a new `Schema_User` field touched fire-and-forget on every SSE (re)connect) or `lastLoggedInAt` within the 14-day window — not event-edit history.                                                                                                                                                              | The prior gate queried EventRecord `user`/`origin` fields that post-cutover records never have, so it always returned false: maintenance classified every user inactive and pruned all watches each run. Packet 07, PR #2060. |

## Complexity guardrails

The simplify-code pass reduced the plan to a few durable owners. Preserve these
boundaries unless real behavior proves they are insufficient:

- Extend the existing calendar service and recurrence event repository; do not
  create parallel “v2” services that survive the cutover.
- Keep one provider discriminant on a calendar/event. Do not build a provider
  plugin framework, registry, or generic factory before a second provider
  exists.
- Keep one Google request context, one watch-state inspector, and one repair
  coordinator. Import, maintenance, health, and webhook paths call them instead
  of implementing their own retry/repair rules.
- Use the controlled write pause in A10. Do not introduce dual-write, change
  streams, a job queue, or a feature-flag framework for the one-time cutover.
- Keep optionality at the edges: incomplete web drafts and untrusted Google
  responses. Persisted records, API events, commands, and SSE messages are
  strict and discriminated.
- Keep Events and CalendarList notification handlers separate behind the small
  existing ingress; their reconciliation behavior is genuinely different.
- Do not add cross-calendar event moves to make the calendar picker look more
  complete. Draft targeting is the v1 requirement.

## External protocol references

- [Google Calendar incremental sync](https://developers.google.com/workspace/calendar/api/guides/sync)
  — final-page tokens, pagination consistency, deleted entries, and 410 recovery.
- [Google Calendar push notifications](https://developers.google.com/workspace/calendar/api/guides/push)
  — one Events watch per calendar, one CalendarList watch per user, renewal,
  dropped-delivery expectations, and channel-token guidance.
- [Google Calendar quota guidance](https://developers.google.com/workspace/calendar/api/guides/quota)
  — stable per-user attribution and truncated exponential backoff.
- [Google CalendarList access roles](https://developers.google.com/workspace/calendar/api/v3/reference/calendarList)
  — writer/reader/free-busy capabilities and intentionally hidden details.
