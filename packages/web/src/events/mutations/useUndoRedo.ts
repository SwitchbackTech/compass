import { useCallback } from "react";
import { type EventId } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import { showRestoredToast } from "@web/common/utils/toast/deleted-toast.util";
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
): entry is Extract<UndoHistoryEntry, { kind: "delete" }> =>
  entry.kind === "delete";

const entryEventId = (entry: UndoHistoryEntry): string =>
  isDeleteEntry(entry) ? entry.event.id : entry.id;

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
 * Replays undo history through the regular event mutations. Edits are
 * symmetric `replace` replays of the full before/after snapshots; deletes are
 * undone by recreating the snapshot under its original id (A25), which
 * resurrects the same provider-linked event server-side.
 */
export function useUndoRedo(dependencies: EventMutationDependencies = {}) {
  const mutations = useEventMutations(dependencies);
  const canUndo = useUndoHistoryStore(selectCanUndo);
  const canRedo = useUndoHistoryStore(selectCanRedo);

  // History only ever records non-recurring events (event.mutation-history.ts
  // excludes recurring snapshots), so a snapshot's recurrence is always
  // "single" and its content is always "details" (busy-provider events are
  // never user-edited through our mutations).
  const replaySnapshot = useCallback(
    (id: EventId, snapshot: Event) => {
      if (snapshot.content.kind !== "details") return;
      mutations.replace({
        id,
        input: {
          content: snapshot.content,
          schedule: snapshot.schedule,
          recurrence: { kind: "single" },
          priority: snapshot.priority,
          scope: "this",
        },
      });
    },
    [mutations],
  );

  const undo = useCallback(() => {
    const entry = undoHistoryActions.popUndo();
    if (!entry) return;

    runHistoryRestore(() => {
      if (isDeleteEntry(entry)) {
        const { event } = entry;
        if (event.content.kind !== "details") return;
        mutations.create({
          id: event.id,
          calendarId: event.calendarId,
          content: event.content,
          schedule: event.schedule,
          recurrence:
            event.recurrence.kind === "series"
              ? { kind: "series", rules: event.recurrence.rules }
              : { kind: "single" },
          priority: event.priority,
        });
      } else {
        replaySnapshot(entry.id as EventId, entry.before);
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
        mutations.delete({ id: entry.event.id as EventId, scope: "this" });
      } else {
        replaySnapshot(entry.id as EventId, entry.after);
      }
    });
    if (!isDeleteEntry(entry)) {
      refocusAfterReplay(entry.id);
    }
  }, [mutations, replaySnapshot]);

  return { undo, redo, canUndo, canRedo };
}
