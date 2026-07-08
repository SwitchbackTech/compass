import { type QueryClient } from "@tanstack/react-query";
import {
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { type EventRepositorySource } from "@web/common/repositories/event/event.repository.factory";
import { showDeletedToast } from "@web/common/utils/toast/deleted-toast.util";
import {
  type Payload_ConvertEvent,
  type Payload_DeleteEvent,
  type Payload_EditEvent,
} from "@web/events/event.types";
import { findEventInCache } from "@web/events/queries/event.query.cache";
import {
  isRestoringHistory,
  undoHistoryActions,
} from "@web/events/stores/undo.store";

// Recurring events are excluded from undo history entirely: series-wide ops
// can't be restored from a client snapshot (the server rewrites the series),
// undoing a deleted instance via `create` would spawn a duplicate standalone
// event instead of clearing the exdate, and even a THIS_EVENT instance edit
// confirms the instance server-side, so its pre-edit snapshot is stale by
// the time an undo would replay it.
const isRecurring = (event: Schema_Event) =>
  Boolean(event.recurrence?.eventId || event.recurrence?.rule?.length);

const isThisEventScope = (applyTo?: RecurringEventUpdateScope) =>
  !applyTo || applyTo === RecurringEventUpdateScope.THIS_EVENT;

export function recordEventEditHistory({
  payload,
  queryClient,
  source,
}: {
  payload: Payload_EditEvent;
  queryClient: QueryClient;
  source: EventRepositorySource;
}): void {
  if (isRestoringHistory() || !isThisEventScope(payload.applyTo)) return;

  const before = findEventInCache(queryClient, payload._id, source);
  if (
    !before ||
    isRecurring(before) ||
    isRecurring(payload.event as Schema_Event)
  ) {
    return;
  }

  undoHistoryActions.record({
    kind: "edit",
    _id: payload._id,
    before,
    // Merge over `before` so fields the payload dropped (e.g. provider ids)
    // survive a redo replay.
    after: { ...before, ...payload.event, _id: payload._id },
  });
}

export function recordEventDeleteHistory({
  kind,
  payload,
  queryClient,
  source,
}: {
  kind: "delete" | "delete-someday";
  payload: Payload_DeleteEvent;
  queryClient: QueryClient;
  source: EventRepositorySource;
}): Schema_Event | null {
  const existing = findEventInCache(queryClient, payload._id, source);
  if (isRestoringHistory()) return existing;

  const undoable =
    !!existing && !isRecurring(existing) && isThisEventScope(payload.applyTo);
  if (undoable) undoHistoryActions.record({ kind, event: existing });
  showDeletedToast(undoable);
  return existing;
}

export function recordEventConvertHistory({
  event,
  converted,
  existing,
  isSomeday,
}: {
  event: Payload_ConvertEvent["event"];
  converted: Schema_Event | null;
  existing: Schema_Event | null;
  isSomeday: boolean;
}): void {
  if (
    isRestoringHistory() ||
    !existing ||
    !converted ||
    isRecurring(existing)
  ) {
    return;
  }

  undoHistoryActions.record({
    kind: isSomeday ? "convert-to-someday" : "convert-to-calendar",
    _id: event._id,
    before: existing,
    after: converted,
  });
}
