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

// A "series" row (the master/base) can't be undone from a client snapshot:
// it's only ever written at scope "all"/"thisAndFollowing" (never "this",
// gated below), and the server rewrites/splits the series rather than
// applying a client-computable inverse. A "single" event or one recurring
// "occurrence" (always scope "this") both DO have a real inverse — replace
// back to the snapshot, or un-cancel/recreate under the original id — so
// both are undoable.
export const isUndoableRecurrence = (event: Event): boolean =>
  event.recurrence.kind !== "series";

/**
 * @public Kept for external callers that only care about "is this a
 * recurring instance" (unrelated to undo-history eligibility) — no current
 * caller, deliberately exported ahead of one.
 */
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
  if (
    !before ||
    !isUndoableRecurrence(before) ||
    !isUndoableRecurrence(after)
  ) {
    return;
  }

  undoHistoryActions.record({ kind: "edit", id, before, after });
}

export function recordEventCreateHistory({ event }: { event: Event }): void {
  // Unlike edit/delete, isUndoableRecurrence does not gate this: a create's
  // EditableRecurrence is only ever "single" or "series" (never
  // "occurrence"/"exception" — a create can't target a bare instance), and
  // BOTH are undoable — a single event's undo deletes it, a brand-new
  // series' undo deletes the whole series (scope "all", see
  // useUndoRedo.undoCreate).
  if (isRestoringHistory()) return;
  undoHistoryActions.record({ kind: "create", event });
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
    !!existing && isUndoableRecurrence(existing) && isThisScope(scope);
  if (undoable) undoHistoryActions.record({ kind: "delete", event: existing });
  showDeletedToast(undoable);
  return existing;
}
