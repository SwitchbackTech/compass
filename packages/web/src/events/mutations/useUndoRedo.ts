import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { type EventId } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import { UNDO_DECLINED_TOAST_ID } from "@web/common/constants/toast.constants";
import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import { showRestoredToast } from "@web/common/utils/toast/deleted-toast.util";
import {
  dismissRecurrenceScopeToast,
  dismissRecurrenceScopeToastFor,
} from "@web/common/utils/toast/recurrence-scope.toast";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { detailsLocation } from "@web/events/grid-event-draft.adapter";
import {
  type EventMutationDependencies,
  useEventMutations,
} from "@web/events/mutations/useEventMutations";
import {
  eventBelongsToEntry,
  findEventInCache,
  upsertEventAcrossQueries,
} from "@web/events/queries/event.query.cache";
import {
  recurrenceScopeOpportunityActions,
  useRecurrenceScopeOpportunityStore,
} from "@web/events/recurrence/recurrence-scope-opportunity.store";
import { useEventRepositorySource } from "@web/events/repositories/event.repository.source.store";
import {
  runHistoryRestore,
  selectCanRedo,
  selectCanUndo,
  type UndoHistoryEntry,
  undoHistoryActions,
  useUndoHistoryStore,
} from "@web/events/stores/undo.store";

const isCreateEntry = (
  entry: UndoHistoryEntry,
): entry is Extract<UndoHistoryEntry, { kind: "create" }> =>
  entry.kind === "create";

const isDeleteEntry = (
  entry: UndoHistoryEntry,
): entry is Extract<UndoHistoryEntry, { kind: "delete" }> =>
  entry.kind === "delete";

const entryEventId = (entry: UndoHistoryEntry): string =>
  isDeleteEntry(entry) || isCreateEntry(entry) ? entry.event.id : entry.id;

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

const showUndoDeclinedToast = () =>
  showStatusToast(UNDO_DECLINED_TOAST_ID, "Can't undo — event changed since");

// A snapshot recorded before this event was ever replayed may omit `location`
// entirely (an older local record, or any Event built without it) — replaying
// it always fills the key in (replaySnapshot below), since the editable-
// content contract requires a definite string. Comparing raw JSON.stringify
// output would then read "gained a location key" as an external change.
// Normalizing both sides the same way (via the same detailsLocation default
// replaySnapshot/undoDelete/redo use below) keeps the comparison about the
// actual value, not whether the key happened to be present.
const normalizedDetailsContent = (content: Event["content"]) =>
  content.kind === "details"
    ? { ...content, location: detailsLocation(content) }
    : content;

// Whether `current` still matches the state an undo/redo entry expects to
// find before it replays — the staleness guard. Deliberately narrow: it
// compares only the fields our own snapshots capture and our own replays
// write (calendar, content, schedule), not id/recurrence-linkage/timestamps,
// which our own replay writes always touch regardless of external activity.
// A mismatch means something ELSE (an SSE-driven refetch, another tab, a
// Google-side edit) changed the event since this entry was recorded, and
// blindly replaying the snapshot would silently clobber it — last-write-wins
// with no warning. Declining is the safe failure mode; the caller surfaces a
// toast instead of applying stale data.
function snapshotMatches(current: Event, expected: Event): boolean {
  if (current.calendarId !== expected.calendarId) return false;
  if (
    JSON.stringify(normalizedDetailsContent(current.content)) !==
    JSON.stringify(normalizedDetailsContent(expected.content))
  ) {
    return false;
  }
  return JSON.stringify(current.schedule) === JSON.stringify(expected.schedule);
}

/**
 * Replays undo history through the regular event mutations. Edits are
 * symmetric `replace` replays of the full before/after snapshots; deletes of
 * a single event are undone by recreating the snapshot under its original id
 * (A25), which resurrects the same provider-linked event server-side; a
 * recurring occurrence's delete is undone by replaying its snapshot back
 * (un-cancelling the tombstone) instead, since "create" would spawn a
 * duplicate standalone event rather than restore the instance; creates are
 * undone by deleting the optimistic event (scope "all" for a series, "this"
 * for a single) and redone by recreating it with the same recurrence.
 *
 * Every replay first checks snapshotMatches against the live cache — see its
 * docblock — and declines with a toast rather than clobbering when the event
 * has moved on since this entry was recorded.
 */
export function useUndoRedo(dependencies: EventMutationDependencies = {}) {
  const mutations = useEventMutations(dependencies);
  const queryClient = useQueryClient();
  const activeSource = useEventRepositorySource();
  const source = dependencies.source ?? activeSource;
  const canUndo = useUndoHistoryStore(selectCanUndo);
  const canRedo = useUndoHistoryStore(selectCanRedo);

  // History only ever records events whose content is "details" (a
  // busy-provider event is never user-edited through our mutations), so a
  // snapshot's content is always safe to replay as-is.
  const replaySnapshot = useCallback(
    (id: EventId, snapshot: Event) => {
      if (snapshot.content.kind !== "details") return;
      mutations.replace({
        id,
        input: {
          // Restores the snapshot's calendar too, so undoing a cross-calendar
          // move puts the event back on its original calendar.
          calendarId: snapshot.calendarId,
          content: {
            ...snapshot.content,
            location: detailsLocation(snapshot.content),
          },
          schedule: snapshot.schedule,
          // "preserve" keeps whatever recurrence linkage the target already
          // has (single, or one occurrence of a series) — scope "this"
          // never changes that linkage server-side regardless of what's
          // sent, so this is both correct and recurrence-agnostic.
          recurrence: { kind: "preserve" },
          scope: "this",
        },
      });
    },
    [mutations],
  );

  // Undo of a delete: a single event is recreated; a recurring occurrence is
  // instead replayed back via replace (un-cancelling its tombstone) — see
  // the module docblock for why "create" is wrong there. replace's own
  // optimistic callback only merges onto an event ALREADY in cache (it reads
  // `existing` and no-ops when absent), but a just-deleted occurrence isn't
  // — so this seeds the cache with the full snapshot first, the same insert
  // a create's optimistic callback would do, before the replace mutation
  // (whose own optimistic merge then finds it and is a harmless no-op
  // overwrite) carries it to the server.
  const undoDelete = useCallback(
    (event: Event) => {
      if (event.content.kind !== "details") return;
      if (event.recurrence.kind === "occurrence") {
        upsertEventAcrossQueries(
          queryClient,
          event,
          (entry) => eventBelongsToEntry(event, entry, source),
          { source },
        );
        replaySnapshot(event.id as EventId, event);
        return;
      }
      mutations.create({
        id: event.id,
        calendarId: event.calendarId,
        content: { ...event.content, location: detailsLocation(event.content) },
        schedule: event.schedule,
        recurrence:
          event.recurrence.kind === "series"
            ? { kind: "series", rules: event.recurrence.rules }
            : { kind: "single" },
      });
    },
    [queryClient, source, mutations, replaySnapshot],
  );

  // Undo of a create: delete the whole series for a series create (its own
  // id has no `::` occurrence separator, so scope barely matters
  // server-side, but "all" states the intent honestly), "this" otherwise.
  const undoCreate = useCallback(
    (event: Event) => {
      mutations.delete({
        id: event.id as EventId,
        scope: event.recurrence.kind === "series" ? "all" : "this",
      });
    },
    [mutations],
  );

  const undo = useCallback(() => {
    const entry = undoHistoryActions.peekUndo();
    if (!entry) return;

    // Remove a promotion affordance only when undoing its own narrow action.
    // Undoing a later, unrelated event must leave the earlier opportunity live.
    const opportunity =
      useRecurrenceScopeOpportunityStore.getState().opportunity;
    if (
      opportunity?.source === source &&
      opportunity.original.id === entryEventId(entry)
    ) {
      recurrenceScopeOpportunityActions.clear();
      dismissRecurrenceScopeToastFor(opportunity);
    }

    if (entry.kind === "edit") {
      const current = findEventInCache(queryClient, entry.id, source);
      // No cached copy to compare against (outside the loaded range) — fail
      // open, matching prior best-effort behavior; there's nothing to detect
      // staleness against.
      if (current && !snapshotMatches(current, entry.after)) {
        undoHistoryActions.dropTopUndo();
        showUndoDeclinedToast();
        return;
      }
    }

    undoHistoryActions.commitUndo();
    runHistoryRestore(() => {
      if (isDeleteEntry(entry)) {
        undoDelete(entry.event);
      } else if (isCreateEntry(entry)) {
        undoCreate(entry.event);
      } else {
        replaySnapshot(entry.id as EventId, entry.before);
      }
    });
    // A delete surfaced a "Deleted" toast; if it's still up, flip it to
    // "Restored" so it can't keep claiming the event is gone.
    if (isDeleteEntry(entry)) showRestoredToast();
    if (!isCreateEntry(entry)) refocusAfterReplay(entryEventId(entry));
  }, [queryClient, source, undoDelete, undoCreate, replaySnapshot]);

  const redo = useCallback(() => {
    const entry = undoHistoryActions.peekRedo();
    if (!entry) return;

    if (entry.kind === "edit") {
      const current = findEventInCache(queryClient, entry.id, source);
      if (current && !snapshotMatches(current, entry.before)) {
        undoHistoryActions.dropTopRedo();
        showUndoDeclinedToast();
        return;
      }
    }

    undoHistoryActions.commitRedo();
    runHistoryRestore(() => {
      if (isDeleteEntry(entry)) {
        mutations.delete({ id: entry.event.id as EventId, scope: "this" });
      } else if (isCreateEntry(entry)) {
        const { event } = entry;
        if (event.content.kind !== "details") return;
        mutations.create({
          id: event.id,
          calendarId: event.calendarId,
          content: {
            ...event.content,
            location: detailsLocation(event.content),
          },
          schedule: event.schedule,
          recurrence:
            event.recurrence.kind === "series"
              ? { kind: "series", rules: event.recurrence.rules }
              : { kind: "single" },
        });
      } else {
        replaySnapshot(entry.id as EventId, entry.after);
      }
    });
    if (isCreateEntry(entry)) {
      refocusAfterReplay(entry.event.id);
    } else if (!isDeleteEntry(entry)) {
      refocusAfterReplay(entry.id);
    }
  }, [queryClient, source, mutations, replaySnapshot]);

  return { undo, redo, canUndo, canRedo };
}
