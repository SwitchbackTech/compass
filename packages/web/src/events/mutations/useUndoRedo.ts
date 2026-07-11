import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import { type Schema_WebEvent } from "@web/common/types/web.event.types";
import { showRestoredToast } from "@web/common/utils/toast/deleted-toast.util";
import {
  type EventMutationDependencies,
  useEventMutations,
} from "@web/events/mutations/useEventMutations";
import { findEventInCache } from "@web/events/queries/event.query.cache";
import { useEventRepositorySource } from "@web/events/repositories/event.repository.source.store";
import {
  runHistoryRestore,
  selectCanRedo,
  selectCanUndo,
  type UndoHistoryEntry,
  undoHistoryActions,
  useUndoHistoryStore,
} from "@web/events/stores/undo.store";

const isDeleteEntry = (
  entry: UndoHistoryEntry,
): entry is Extract<UndoHistoryEntry, { kind: "delete" | "delete-someday" }> =>
  entry.kind === "delete" || entry.kind === "delete-someday";

const entryEventId = (entry: UndoHistoryEntry): string =>
  isDeleteEntry(entry) ? (entry.event._id as string) : entry._id;

// Not `refocusEventElement`: that helper waits for the DOM node to be
// *replaced*, but an edit replay updates the node in place (same React key),
// so it would never fire. Here we just focus the event's element as soon as
// it exists — synchronously for edit replays (the node survives the
// re-render), with a short rAF retry loop for delete-undo, where the element
// reappears a frame or two after the optimistic insert.
const refocusAfterReplay = (eventId: string) => {
  let attempts = 0;
  const tryFocus = () => {
    const element = document.querySelector<HTMLElement>(
      `[${DATA_EVENT_ELEMENT_ID}="${eventId}"]`,
    );
    if (element) {
      element.focus();
      return;
    }
    if (++attempts < 30) requestAnimationFrame(tryFocus);
  };
  tryFocus();
};

/**
 * Replays undo history through the regular event mutations. Edits and
 * converts are symmetric `edit` replays of the full before/after snapshots
 * (the optimistic upsert handles someday<->calendar membership); deletes are
 * undone by recreating the snapshot, which preserves the Compass `_id` and
 * resurrects the same Google event (the backend re-confirms a cancelled
 * gcal id on create).
 */
export function useUndoRedo(dependencies: EventMutationDependencies = {}) {
  const mutations = useEventMutations(dependencies);
  const queryClient = useQueryClient();
  const activeSource = useEventRepositorySource();
  const source = dependencies.source ?? activeSource;
  const canUndo = useUndoHistoryStore(selectCanUndo);
  const canRedo = useUndoHistoryStore(selectCanRedo);

  // Snapshots merge over the current cache entry rather than replaying bare:
  // a snapshot captured before the create's settle-refetch lacks server-owned
  // fields (gEventId, updatedAt), and the backend PUT is a full document
  // replace — replaying the bare snapshot would strip those ids server-side
  // and break Google propagation ("cannot update gcal event without id").
  const replaySnapshot = useCallback(
    (_id: string, snapshot: Schema_Event) => {
      const current = findEventInCache(queryClient, _id, source);
      mutations.edit({
        _id,
        event: { ...current, ...snapshot } as Schema_WebEvent,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      });
    },
    [mutations, queryClient, source],
  );

  const undo = useCallback(() => {
    const entry = undoHistoryActions.popUndo();
    if (!entry) return;

    runHistoryRestore(() => {
      if (isDeleteEntry(entry)) {
        mutations.create(entry.event);
      } else {
        replaySnapshot(entry._id, entry.before);
      }
    });
    // A delete surfaced a "Deleted" toast; if it's still up, flip it to
    // "Restored" so it can't keep claiming the event is gone.
    if (isDeleteEntry(entry)) showRestoredToast();
    refocusAfterReplay(entryEventId(entry));
  }, [mutations, replaySnapshot]);

  const redo = useCallback(() => {
    const entry = undoHistoryActions.popRedo();
    if (!entry) return;

    runHistoryRestore(() => {
      if (isDeleteEntry(entry)) {
        const payload = {
          _id: entry.event._id as string,
          applyTo: RecurringEventUpdateScope.THIS_EVENT,
        };
        if (entry.kind === "delete") mutations.delete(payload);
        else mutations.deleteSomeday(payload);
      } else {
        replaySnapshot(entry._id, entry.after);
      }
    });
    if (!isDeleteEntry(entry)) {
      refocusAfterReplay(entry._id);
    }
  }, [mutations, replaySnapshot]);

  return { undo, redo, canUndo, canRedo };
}
