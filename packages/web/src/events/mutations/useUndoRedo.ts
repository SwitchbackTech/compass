import { useCallback } from "react";
import { RecurringEventUpdateScope } from "@core/types/event.types";
import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import { type Schema_WebEvent } from "@web/common/types/web.event.types";
import {
  type EventMutationDependencies,
  useEventMutations,
} from "@web/events/mutations/useEventMutations";
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
  const canUndo = useUndoHistoryStore(selectCanUndo);
  const canRedo = useUndoHistoryStore(selectCanRedo);

  const undo = useCallback(() => {
    const entry = undoHistoryActions.popUndo();
    if (!entry) return;

    runHistoryRestore(() => {
      if (isDeleteEntry(entry)) {
        mutations.create(entry.event);
      } else {
        mutations.edit({
          _id: entry._id,
          event: entry.before as Schema_WebEvent,
          applyTo: RecurringEventUpdateScope.THIS_EVENT,
        });
      }
    });
    refocusAfterReplay(entryEventId(entry));
  }, [mutations]);

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
        mutations.edit({
          _id: entry._id,
          event: entry.after as Schema_WebEvent,
          applyTo: RecurringEventUpdateScope.THIS_EVENT,
        });
      }
    });
    if (!isDeleteEntry(entry)) {
      refocusAfterReplay(entry._id);
    }
  }, [mutations]);

  return { undo, redo, canUndo, canRedo };
}
