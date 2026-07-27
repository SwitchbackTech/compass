import {
  type QueryKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { type Calendar } from "@core/types/calendar.contracts";
import { DateTimeSchema, type EventId } from "@core/types/domain-primitives";
import { type Event, type EventRecurrence } from "@core/types/event.contracts";
import {
  type CreateEventInput,
  type RecurrenceScope,
  type ReplaceEventInput,
} from "@core/types/event-command.contracts";
import dayjs from "@core/util/date/dayjs";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import {
  buildCalendarLookup,
  isEventReadOnly,
} from "@web/calendars/useCalendarLookup";
import { handleError } from "@web/common/utils/event/event.util";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import {
  applyEventProjectionAcrossQueries,
  eventBelongsToEntry,
  findEventInCache,
  findSeriesEventsInCache,
  getEventQueryEntries,
  insertEventIntoQueries,
  isEventQueryKey,
  removeEventFromQueries,
  upsertEventAcrossQueries,
} from "@web/events/queries/event.query.cache";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { type NormalizedEventQueryData } from "@web/events/queries/event.query.types";
import {
  projectRecurringDelete,
  projectRecurringEdit,
  projectSeriesMaterialization,
} from "@web/events/recurrence/projectRecurringEdit";
import { type EventRepositorySource } from "@web/events/repositories/event.repository.factory";
import { useEventRepositorySource } from "@web/events/repositories/event.repository.source.store";
import { type EventRepository } from "@web/events/repositories/event.repository.types";
import { getEventRepositoryBySource } from "@web/events/repositories/event.repository.util";
import { isRestoringHistory } from "@web/events/stores/undo.store";
import {
  type EventMutationOperation,
  eventMutationKeys,
} from "./event.mutation.keys";
import {
  hasOtherPendingWriteForKey,
  isSupersededByLaterEditWrite,
  markAnonymousEventWrite,
  type PrecedingEventWrites,
  precedingCreateOk,
  precedingDeleteOk,
  showAnonymousSaveToastIfEligible,
  waitForPrecedingEventWrites,
} from "./event.mutation.runtime";
import {
  isRecurringEvent,
  recordEventCreateHistory,
  recordEventDeleteHistory,
  recordEventEditHistory,
} from "./event.mutation-history";

type EventMutationContext = {
  previousQueries: Array<[QueryKey, unknown]>;
};

function restoreWriteKeyFromSnapshot(
  queryClient: ReturnType<typeof useQueryClient>,
  writeKey: EventId,
  previousQueries: Array<[QueryKey, unknown]>,
) {
  const snapByKey = new Map(
    previousQueries.map(([queryKey, data]) => [
      JSON.stringify(queryKey),
      data as NormalizedEventQueryData | undefined,
    ]),
  );

  for (const [
    queryKey,
    current,
  ] of queryClient.getQueriesData<NormalizedEventQueryData>({
    queryKey: eventQueryKeys.all,
  })) {
    if (!current || !isEventQueryKey(queryKey)) continue;
    const snap = snapByKey.get(JSON.stringify(queryKey));
    const snapEvent = snap?.entities[writeKey];
    const currentEvent = current.entities[writeKey];
    if (!snapEvent && !currentEvent) continue;

    const entities = { ...current.entities };
    let ids = [...current.ids];
    if (snapEvent) {
      entities[writeKey] = snapEvent;
      if (!ids.includes(writeKey)) ids = [...ids, writeKey];
    } else {
      delete entities[writeKey];
      ids = ids.filter((candidate) => candidate !== writeKey);
    }
    // Preserve optional fields like demoEventIds on the query payload.
    queryClient.setQueryData(queryKey, { ...current, ids, entities });
  }
}

const nowDateTime = () => DateTimeSchema.parse(new Date().toISOString());

// An occurrence's series is its own recurrence pointer; the series base's
// series is itself. Shared by the replace and delete optimistic callbacks,
// which both need the series id to gather every cached instance.
function seriesIdOf(event: Event | null): EventId | null {
  if (event?.recurrence.kind === "occurrence") return event.recurrence.seriesId;
  if (event?.recurrence.kind === "series") return event.id;
  return null;
}

// A create's optimistic insert needs a full Event before the server response
// lands; recurrence is a strict subset of EditableRecurrence ("single" |
// "series"), so it's assignable as-is.
function optimisticEventFromCreate(input: CreateEventInput): Event {
  return {
    id: input.id as EventId,
    calendarId: input.calendarId,
    content: input.content,
    schedule: input.schedule,
    recurrence: input.recurrence as EventRecurrence,
    createdAt: nowDateTime(),
    updatedAt: null,
  };
}

function mergeReplaceInput(existing: Event, input: ReplaceEventInput): Event {
  const recurrence: EventRecurrence =
    input.recurrence.kind === "preserve"
      ? existing.recurrence
      : input.recurrence.kind === "series"
        ? { kind: "series", rules: input.recurrence.rules }
        : { kind: "single" };

  return {
    ...existing,
    calendarId: input.calendarId ?? existing.calendarId,
    content: input.content,
    schedule: input.schedule,
    recurrence,
    updatedAt: nowDateTime(),
  };
}

// A series-scope replace ("all"/"thisAndFollowing") serializes against the
// series id, not the (arbitrary) instance id the edit was submitted through
// — otherwise concurrent edits to different instances of the same series
// wouldn't serialize against each other.
function seriesWriteKey(
  original: Event | null,
  scope: RecurrenceScope,
  fallbackId: EventId,
): EventId {
  if (scope === "this" || !original) return fallbackId;
  if (original.recurrence.kind === "occurrence") {
    return original.recurrence.seriesId;
  }
  return original.id;
}

type CreateVariables = { input: CreateEventInput; writeKey: EventId };
type ReplaceVariables = {
  id: EventId;
  input: ReplaceEventInput;
  writeKey: EventId;
};
type DeleteVariables = {
  id: EventId;
  scope: RecurrenceScope;
  writeKey: EventId;
  skipRepository: boolean;
};

export type EventMutations = {
  create: (input: CreateEventInput) => void;
  replace: (payload: { id: EventId; input: ReplaceEventInput }) => void;
  delete: (payload: { id: EventId; scope: RecurrenceScope }) => void;
};

export type EventMutationDependencies = {
  source?: EventRepositorySource;
  repository?: EventRepository;
  markWrite?: () => Promise<unknown>;
  reportError?: (error: Error) => void;
};

export function useEventMutations(
  dependencies: EventMutationDependencies = {},
): EventMutations {
  const queryClient = useQueryClient();
  const activeSource = useEventRepositorySource();
  const source = dependencies.source ?? activeSource;
  const repository = useMemo(
    () => dependencies.repository ?? getEventRepositoryBySource(source),
    [dependencies.repository, source],
  );
  const markWrite = dependencies.markWrite ?? markAnonymousEventWrite;
  const showAnonymousSaveToast =
    dependencies.markWrite === undefined
      ? showAnonymousSaveToastIfEligible
      : undefined;
  const reportError = dependencies.reportError ?? handleError;

  // Backstop only - the real enforcement is the UI gates (cards, shortcuts,
  // context menu, form) that block a read-only mutation before it ever
  // reaches here (packet 08 step 8). Reads the calendars query's cache
  // snapshot directly via `queryClient.getQueryData` rather than calling
  // useCalendarLookup()/useCalendarsQuery() as hooks, which would pull in
  // useSession() as a new dependency this hook doesn't otherwise have -
  // this hook's existing test harness (useEventMutations.test.tsx) renders
  // it with a bare QueryClientProvider, no session/auth context. A cache
  // miss (calendars not fetched yet) resolves the same way an unresolved
  // calendarId does in isEventReadOnly - fails open as writable.
  //
  // useCallback (not a plain closure) so this has a referentially stable
  // identity across renders when `queryClient` doesn't change - the mutate
  // object below is memoized on it, and a fresh function reference every
  // render would recompute that memo on every render too.
  const isTargetReadOnly = useCallback(
    (event: Event | null): boolean => {
      if (!event) return false;
      const lookup = buildCalendarLookup(
        queryClient.getQueryData<Calendar[]>(calendarQueryKeys.all),
      );
      return isEventReadOnly(
        lookup,
        event.calendarId,
        event.content.kind === "busy",
      );
    },
    [queryClient],
  );

  // Snapshot + conditional rollback: a failed mutation restores its pre-image.
  // Alone in flight → full query restore. Concurrent writes → restore only
  // entities owned by this writeKey so another event's optimistic update is
  // preserved. Settle-time invalidation still converges to server truth once
  // no event mutation remains in flight. Invalidation is deferred to a
  // macrotask because a settling mutation still counts as pending during its
  // own onSettled — deferring lets simultaneous settles reliably observe
  // count 0 instead of each seeing the other and skipping.
  const settle = () => {
    setTimeout(() => {
      if (
        queryClient.isMutating({ mutationKey: eventMutationKeys.all }) === 0
      ) {
        // refetchType "all" so inactive entries (prefetched neighbor weeks,
        // recently visited ranges) refetch too instead of serving stale
        // instances until the user navigates back onto them.
        void queryClient.invalidateQueries({
          queryKey: eventQueryKeys.all,
          refetchType: "all",
        });
      }
    }, 0);
  };
  const buildMutation = <Variables extends { writeKey: EventId }>(
    operation: EventMutationOperation,
    mutationFn: (variables: Variables) => Promise<unknown>,
    optimistic: (variables: Variables) => void,
  ) => ({
    mutationKey: eventMutationKeys.operation(operation),
    mutationFn,
    onMutate: async (variables: Variables): Promise<EventMutationContext> => {
      await queryClient.cancelQueries({ queryKey: eventQueryKeys.all });
      const previousQueries = queryClient.getQueriesData<unknown>({
        queryKey: eventQueryKeys.all,
      });
      optimistic(variables);
      return { previousQueries };
    },
    onError: (
      error: Error,
      variables: Variables,
      context: EventMutationContext | undefined,
    ) => {
      reportError(error);
      if (!context) return;
      // TanStack still counts *this* mutation as pending while onError runs
      // (it dispatches status "error" only afterwards), so isMutating === 1
      // means we are alone and a full snapshot restore is safe.
      const pendingEventMutations = queryClient.isMutating({
        mutationKey: eventMutationKeys.all,
      });
      if (pendingEventMutations <= 1) {
        for (const [queryKey, data] of context.previousQueries) {
          queryClient.setQueryData(queryKey, data);
        }
        return;
      }
      // Another mutation shares this write key (newer optimistic edit) — leave
      // the cache alone so we do not clobber it. Deletes wait for settle when
      // concurrent (recurring deletes touch more than writeKey). Different-key
      // create/replace concurrency restores only entities[writeKey].
      if (
        operation === "delete" ||
        hasOtherPendingWriteForKey(queryClient, variables.writeKey, variables)
      ) {
        return;
      }
      restoreWriteKeyFromSnapshot(
        queryClient,
        variables.writeKey,
        context.previousQueries,
      );
    },
    onSettled: settle,
  });
  // Shared by every mutationFn below: wait for earlier writes to the same
  // event to finish, run the repository write only if `canWrite` says the
  // preceding outcome allows it, then mark the write regardless.
  const writeAfterPreceding = async (
    writeKey: string,
    variables: unknown,
    canWrite: (preceding: PrecedingEventWrites) => boolean,
    write: () => Promise<unknown>,
    { coalesce = false }: { coalesce?: boolean } = {},
  ) => {
    const preceding = await waitForPrecedingEventWrites(
      queryClient,
      writeKey,
      variables,
    );
    // A newer edit for this event is already queued and will persist the final
    // state, so this write is redundant — skip the network call but still mark
    // the write (anon-change tracking) so a burst collapses to one request.
    if (
      coalesce &&
      isSupersededByLaterEditWrite(queryClient, writeKey, variables)
    ) {
      await markWrite();
      return;
    }
    const wrote = canWrite(preceding);
    if (wrote) await write();
    await markWrite();
    if (wrote) await showAnonymousSaveToast?.();
  };

  const createMutation = useMutation(
    buildMutation<CreateVariables>(
      "create",
      async (variables) => {
        // Undo-of-delete restores via create with the original id; waiting
        // here keeps the POST from landing before the DELETE server-side.
        // Normal creates use fresh ids and resolve immediately.
        await writeAfterPreceding(
          variables.writeKey,
          variables,
          precedingDeleteOk,
          () => repository.create(variables.input),
        );
      },
      ({ input }) => {
        const event = optimisticEventFromCreate(input);
        // A recurring create's base is metadata-only (the grid filters
        // series bases), so expand its instances too or the event would be
        // invisible until the settle refetch.
        if (event.recurrence.kind === "series") {
          applyEventProjectionAcrossQueries(
            queryClient,
            projectSeriesMaterialization({
              base: event,
              ranges: getEventQueryEntries(queryClient, { source }).map(
                ({ metadata }) => ({
                  start: metadata.start,
                  end: metadata.end,
                }),
              ),
            }),
            source,
          );
          return;
        }
        insertEventIntoQueries(queryClient, event, (entry) =>
          eventBelongsToEntry(event, entry, source),
        );
      },
    ),
  );

  const replaceMutation = useMutation(
    buildMutation<ReplaceVariables>(
      "replace",
      async (variables) => {
        await writeAfterPreceding(
          variables.writeKey,
          variables,
          precedingCreateOk,
          () => repository.replace(variables.id, variables.input),
          { coalesce: true },
        );
      },
      ({ id, input }) => {
        const existing = findEventInCache(queryClient, id, source);
        if (!existing) return;
        const edited = mergeReplaceInput(existing, input);
        const seriesId = seriesIdOf(existing);

        // (Re)defining recurrence rules changes which instances exist, so
        // shifting cached instances isn't enough: expand the new rules into
        // optimistic occurrences, mirroring the server's materialization.
        // Scope "this" on an occurrence keeps its occurrence recurrence
        // server-side, so it stays on the plain upsert path below.
        if (
          edited.recurrence.kind === "series" &&
          (input.scope !== "this" || existing.recurrence.kind !== "occurrence")
        ) {
          const currentBase =
            existing.recurrence.kind === "series"
              ? existing
              : seriesId
                ? findEventInCache(queryClient, seriesId, source)
                : null;
          const rulesChanged =
            currentBase?.recurrence.kind !== "series" ||
            currentBase.recurrence.rules.join("\n") !==
              edited.recurrence.rules.join("\n");

          if (rulesChanged) {
            const seriesEvents = seriesId
              ? findSeriesEventsInCache(queryClient, seriesId, source)
              : [];
            applyEventProjectionAcrossQueries(
              queryClient,
              projectSeriesMaterialization({
                // Mirror the server's plan: "all" rewrites the series base in
                // place; "thisAndFollowing" splits, re-basing at the edited
                // event and keeping earlier instances; single→series keeps
                // the edited event's own id as the new base id.
                base:
                  input.scope === "all" && seriesId
                    ? { ...edited, id: seriesId }
                    : edited,
                cachedSeriesEvents:
                  input.scope === "thisAndFollowing"
                    ? seriesEvents.filter(
                        (event) =>
                          !dayjs(event.schedule.start).isBefore(
                            existing.schedule.start,
                          ),
                      )
                    : seriesEvents,
                ranges: getEventQueryEntries(queryClient, { source }).map(
                  ({ metadata }) => ({
                    start: metadata.start,
                    end: metadata.end,
                  }),
                ),
              }),
              source,
            );
            return;
          }
        }

        if (seriesId && input.scope !== "this") {
          applyEventProjectionAcrossQueries(
            queryClient,
            projectRecurringEdit({
              scope: input.scope,
              edited,
              original: existing,
              seriesEvents: findSeriesEventsInCache(
                queryClient,
                seriesId,
                source,
              ),
            }),
            source,
          );
          return;
        }
        // Upsert (not patch) so an event edited/dragged into a currently-cached
        // range it wasn't previously a member of renders optimistically, and
        // one dragged out of a range is removed from it.
        upsertEventAcrossQueries(
          queryClient,
          edited,
          (entry) => eventBelongsToEntry(edited, entry, source),
          { source },
        );
      },
    ),
  );

  const deleteMutation = useMutation(
    buildMutation<DeleteVariables>(
      "delete",
      async (variables) => {
        await writeAfterPreceding(
          variables.writeKey,
          variables,
          (preceding) =>
            !variables.skipRepository && precedingCreateOk(preceding),
          () => repository.delete(variables.id, variables.scope),
        );
      },
      ({ id, scope }) => {
        const existing = findEventInCache(queryClient, id, source);
        const seriesId = seriesIdOf(existing);

        if (existing && seriesId && scope !== "this") {
          applyEventProjectionAcrossQueries(
            queryClient,
            projectRecurringDelete({
              scope,
              target: existing,
              seriesId,
              seriesEvents: findSeriesEventsInCache(
                queryClient,
                seriesId,
                source,
              ),
            }),
            source,
          );
          return;
        }
        removeEventFromQueries(queryClient, id, { source });
      },
    ),
  );

  // Undo recording happens here at the `.mutate()` boundary: it's the one
  // place every caller funnels through and the cache still holds the
  // pre-mutation event. Replays from useUndoRedo set the restoring flag so
  // they don't record themselves.
  return useMemo(
    () => ({
      create: (input: CreateEventInput) => {
        const id = input.id ?? (createObjectIdString() as EventId);
        const finalInput = { ...input, id };
        recordEventCreateHistory({
          event: optimisticEventFromCreate(finalInput),
        });
        createMutation.mutate({ input: finalInput, writeKey: id });
      },
      replace: (payload: { id: EventId; input: ReplaceEventInput }) => {
        const original = findEventInCache(queryClient, payload.id, source);
        if (isTargetReadOnly(original)) {
          console.warn(
            `[useEventMutations] blocked replace on read-only event ${payload.id}`,
          );
          return;
        }
        const writeKey = seriesWriteKey(
          original,
          payload.input.scope,
          payload.id,
        );
        if (original) {
          recordEventEditHistory({
            id: payload.id,
            after: mergeReplaceInput(original, payload.input),
            scope: payload.input.scope,
            queryClient,
            source,
          });
        }
        replaceMutation.mutate({ ...payload, writeKey });
      },
      delete: (payload: { id: EventId; scope: RecurrenceScope }) => {
        if (
          !isRestoringHistory() &&
          isTargetReadOnly(findEventInCache(queryClient, payload.id, source))
        ) {
          console.warn(
            `[useEventMutations] blocked delete on read-only event ${payload.id}`,
          );
          return;
        }
        const existing = recordEventDeleteHistory({
          id: payload.id,
          scope: payload.scope,
          queryClient,
          source,
        });
        deleteMutation.mutate({
          ...payload,
          writeKey: payload.id,
          skipRepository: !existing,
        });
      },
    }),
    [
      queryClient,
      source,
      isTargetReadOnly,
      createMutation.mutate,
      deleteMutation.mutate,
      replaceMutation.mutate,
    ],
  );
}

export { isRecurringEvent };
