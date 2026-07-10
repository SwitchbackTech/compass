# 06 — Sync CalendarList changes and route watches

## Goal

Implement the requirements archived from #1070 so changes to a user's Google
calendar set reconcile Compass calendars, event sync state, and watches. Keep
the #734 no-work decision because the existing stored watch association is the
authoritative router.

Depends on: `05-calendar-aware-crud.md`.

## Routing decision

Keep the public endpoint unchanged. The verified channel token identifies the
resource type; `(channelId, resourceId)` finds one stored watch; that watch owns
the user and Google calendar id. Never accept a URL calendar id that could
disagree with the stored watch.

## Primary code anchors

- `packages/backend/src/sync/sync.routes.config.ts`
- `packages/backend/src/sync/services/public-watch-notifications/public-watch-notification.ingress.ts`
- `packages/backend/src/sync/services/notify/handler/gcal.notification.handler.ts`
- `packages/backend/src/sync/services/watch/google-watch.service.ts`
- `packages/backend/src/sync/services/records/sync-records.repository.ts`
- `packages/core/src/constants/sse.constants.ts`
- `packages/web/src/sse/hooks/useEventSSE.ts`

## Implementation steps

1. Split notification handling into resource-specific handlers behind the
   current ingress: Events changes and CalendarList changes.
2. Implement paginated incremental CalendarList fetch using its stored sync
   token. Preserve the original sync token on every page and store only the
   final new token.
3. Reconcile one complete change set:
   - add/unhide: reactivate/upsert the same calendar row; for event-capable
     roles, full-import events, persist a token, and start an Events watch; for
     `freeBusyReader`, retain only calendar metadata for range availability;
   - metadata/access/color/name change: update provider fields while preserving
     Compass visibility; an access transition to/from `freeBusyReader` removes
     or initializes event sync state and watches idempotently;
   - delete/hide/lost access: mark its calendar inactive, stop its watch, remove
     its Events sync record, and remove only that calendar's Google events;
   - primary change: enforce at most one primary and recompute default writable
     calendar.
4. Make the operation idempotent for duplicate/out-of-order webhook deliveries.
   Advance the CalendarList token only after all database changes succeed.
5. On CalendarList token 410, run a targeted calendar-list/full-event
   reconciliation. Preserve Compass-local events and visibility preferences for
   provider calendars that still exist.
6. Publish a shared `CALENDARS_CHANGED` SSE event and calendar-scoped event
   changes. Suppress event-change publication when the resolved calendar is not
   visible. Update core/backend/web event contracts together.
7. Return a successful webhook status for stale/duplicate notifications that
   are safely ignored so Google is not encouraged to retry them.
8. Add structured outcomes: `INITIALIZED`, `PROCESSED`, `IGNORED`,
   `RECONCILED`, and `REPAIR_STARTED`, including user/calendar only in internal
   logs.
9. Preserve the archived #734 rationale in the ledger and prove with tests that
   stored watch state routes secondary-calendar notifications correctly.

## Tests

- Add, rename, recolor, hide, delete, role change, and primary change.
- Hide/delete then re-add preserves the Compass calendar id and visibility.
- Multiple changes in one page and across pages.
- Duplicate, stale, late, missing-record, wrong-resource-id, and expired-watch
  notifications.
- New calendar import failure does not advance CalendarList token.
- Removed calendar cleanup cannot delete another calendar's same-id event.
- A Google-side move of an event between two imported calendars (Google emits
  a cancellation in the source and an upsert in the target with the same
  provider event id) converges to exactly one Compass event on the target
  calendar.
- 410 recovery and revoked credential paths preserve Compass-local data.
- Notification route contains no calendar id and still routes every calendar.

## Exit criteria

- [ ] CalendarList notifications no longer log “NOT IMPLEMENTED.”
- [ ] Normal calendar changes reconcile without a full user reset.
- [ ] Event watches and sync records exactly match imported event-capable
      calendars; free/busy-only calendars have neither.
- [ ] Every archived #1070 requirement is implemented and the #734 no-work
      disposition remains valid.

Suggested commit: `feat(sync): reconcile google calendar list changes`
