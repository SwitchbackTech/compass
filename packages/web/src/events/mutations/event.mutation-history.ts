import { type QueryClient } from "@tanstack/react-query";
import { type Event } from "@core/types/event.contracts";
import { type RecurrenceScope } from "@core/types/event-command.contracts";
import { showDeletedToast } from "@web/common/utils/toast/deleted-toast.util";
import { findEventInCache } from "@web/events/queries/event.query.cache";
import { type EventRepositorySource } from "@web/events/repositories/event.repository.factory";
import {
  isRestoringHistory,
  undoHistoryActions,
} from "@web/events/stores/undo.store";

// Recurring events are excluded from undo history entirely: series-wide ops
// can't be restored from a client snapshot (the server rewrites the series),
// undoing a deleted instance via `create` would spawn a duplicate standalone
// event instead of clearing the exdate, and even a "this"-scope instance edit
// confirms the instance server-side, so its pre-edit snapshot is stale by the
// time an undo would replay it.
export const isRecurringEvent = (event: Event): boolean =>
  event.recurrence.kind !== "single";

const isThisScope = (scope?: RecurrenceScope) => !scope || scope === "this";

export function recordEventEditHistory({
  id,
  after,
  scope,
  queryClient,
  source,
}: {
  id: string;
  after: Event;
  scope: RecurrenceScope;
  queryClient: QueryClient;
  source: EventRepositorySource;
}): void {
  if (isRestoringHistory() || !isThisScope(scope)) return;

  const before = findEventInCache(queryClient, id, source);
  if (!before || isRecurringEvent(before) || isRecurringEvent(after)) {
    return;
  }

  undoHistoryActions.record({ kind: "edit", id, before, after });
}

export function recordEventDeleteHistory({
  id,
  scope,
  queryClient,
  source,
}: {
  id: string;
  scope: RecurrenceScope;
  queryClient: QueryClient;
  source: EventRepositorySource;
}): Event | null {
  const existing = findEventInCache(queryClient, id, source);
  if (isRestoringHistory()) return existing;

  const undoable =
    !!existing && !isRecurringEvent(existing) && isThisScope(scope);
  if (undoable) undoHistoryActions.record({ kind: "delete", event: existing });
  showDeletedToast(undoable);
  return existing;
}
