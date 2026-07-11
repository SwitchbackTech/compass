import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import {
  type Payload_Order,
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { handleError } from "@web/common/utils/event/event.util";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import {
  type Payload_ConvertEvent,
  type Payload_DeleteEvent,
  type Payload_EditEvent,
} from "@web/events/event.types";
import {
  applyEventProjectionAcrossQueries,
  eventBelongsToEntry,
  findEventInCache,
  findSeriesEventsInCache,
  insertEventIntoQueries,
  removeEventFromQueries,
  reorderSomedayEventsInQueries,
  upsertEventAcrossQueries,
} from "@web/events/queries/event.query.cache";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { projectRecurringEdit } from "@web/events/recurrence/projectRecurringEdit";
import { type EventRepositorySource } from "@web/events/repositories/event.repository.factory";
import { useEventRepositorySource } from "@web/events/repositories/event.repository.source.store";
import { type EventRepository } from "@web/events/repositories/event.repository.types";
import { getEventRepositoryBySource } from "@web/events/repositories/event.repository.util";
import {
  type EventMutationOperation,
  eventMutationKeys,
} from "./event.mutation.keys";
import {
  isSupersededByLaterEditWrite,
  markAnonymousEventWrite,
  type PrecedingEventWrites,
  precedingCreateOk,
  precedingDeleteOk,
  waitForPrecedingEventWrites,
} from "./event.mutation.runtime";
import {
  recordEventConvertHistory,
  recordEventDeleteHistory,
  recordEventEditHistory,
} from "./event.mutation-history";

// Convert mutations capture the fully-resolved converted event at the
// `.mutate()` boundary (see wrappers below) so `onMutate` and the async
// `mutationFn` operate on the identical snapshot even if the cache changes
// (SSE/refetch) between them.
type ConvertVariables = {
  event: Payload_ConvertEvent["event"];
  converted: Schema_Event | null;
};

// Someday deletes capture, at the `.mutate()` boundary, whether the event is
// absent from the cache (nothing to delete server-side); the optimistic
// removal still runs but no repository write is issued.
type DeleteSomedayVariables = Payload_DeleteEvent & { skipRepository: boolean };

export type EventMutations = {
  create: (event: Schema_Event) => void;
  edit: (payload: Payload_EditEvent) => void;
  delete: (payload: Payload_DeleteEvent) => void;
  convertToSomeday: (payload: Payload_ConvertEvent) => void;
  convertToCalendar: (payload: Payload_ConvertEvent) => void;
  deleteSomeday: (payload: Payload_DeleteEvent) => void;
  reorderSomeday: (payload: Payload_Order[]) => void;
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
  const reportError = dependencies.reportError ?? handleError;

  // No per-mutation rollback: failed mutations leave their optimistic write
  // in place and rely on the settle-time refetch to restore server truth.
  // Invalidation only runs once NO event mutation remains in flight, so a
  // refetch never overwrites another mutation's live optimistic update.
  // The check is deferred to a macrotask because a settling mutation still
  // counts as pending during its own onSettled — deferring lets simultaneous
  // settles reliably observe count 0 instead of each seeing the other and skipping.
  const settle = () => {
    setTimeout(() => {
      if (
        queryClient.isMutating({ mutationKey: eventMutationKeys.all }) === 0
      ) {
        void queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
      }
    }, 0);
  };
  const buildMutation = <Variables>(
    operation: EventMutationOperation,
    mutationFn: (variables: Variables) => Promise<unknown>,
    optimistic: (variables: Variables) => void,
  ) => ({
    mutationKey: eventMutationKeys.operation(operation),
    mutationFn,
    onMutate: async (variables: Variables) => {
      await queryClient.cancelQueries({ queryKey: eventQueryKeys.all });
      optimistic(variables);
    },
    onError: (error: Error) => reportError(error),
    onSettled: settle,
  });
  // Shared by every mutationFn below: wait for earlier writes to the same
  // event to finish, run the repository write only if `canWrite` says the
  // preceding outcome allows it, then mark the write regardless.
  const writeAfterPreceding = async (
    eventId: string,
    variables: unknown,
    canWrite: (preceding: PrecedingEventWrites) => boolean,
    write: () => Promise<unknown>,
    { coalesce = false }: { coalesce?: boolean } = {},
  ) => {
    const preceding = await waitForPrecedingEventWrites(
      queryClient,
      eventId,
      variables,
    );
    // A newer edit for this event is already queued and will persist the final
    // state, so this write is redundant — skip the network call but still mark
    // the write (anon-change tracking) so a burst collapses to one request.
    if (
      coalesce &&
      isSupersededByLaterEditWrite(queryClient, eventId, variables)
    ) {
      await markWrite();
      return;
    }
    if (canWrite(preceding)) await write();
    await markWrite();
  };
  const convertedEvent = useCallback(
    (event: Payload_ConvertEvent["event"], isSomeday: boolean) => {
      const existing = findEventInCache(queryClient, event._id, source);
      if (!existing) return { existing: null, converted: null };
      const converted = { ...existing, ...event, isSomeday } as Schema_Event;
      if (!isSomeday) delete converted.recurrence;
      return { existing, converted };
    },
    [queryClient, source],
  );

  const createMutation = useMutation(
    buildMutation<Schema_Event>(
      "create",
      async (event) => {
        // Undo-of-delete restores via create with the original _id; waiting
        // here keeps the POST from landing before the DELETE server-side.
        // Normal creates use fresh ids and resolve immediately.
        await writeAfterPreceding(
          event._id as string,
          event,
          precedingDeleteOk,
          () => repository.create(event),
        );
        return event;
      },
      (event) =>
        insertEventIntoQueries(queryClient, event, (entry) =>
          eventBelongsToEntry(event, entry, source),
        ),
    ),
  );

  const editMutation = useMutation(
    buildMutation<Payload_EditEvent>(
      "edit",
      async (variables) => {
        const { _id, event, applyTo } = variables;
        const seriesScope =
          applyTo === RecurringEventUpdateScope.ALL_EVENTS ||
          applyTo === RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS;
        const writeKey =
          seriesScope && event.recurrence?.eventId
            ? event.recurrence.eventId
            : _id;
        await writeAfterPreceding(
          writeKey,
          variables,
          precedingCreateOk,
          () => repository.edit(_id, event, { applyTo }),
          { coalesce: true },
        );
      },
      ({ _id, event, shouldRemove, applyTo }) => {
        if (shouldRemove) {
          removeEventFromQueries(queryClient, _id, { source });
          return;
        }
        const edited = { ...event, _id };
        const original = findEventInCache(queryClient, _id, source);
        const seriesId = original?.recurrence?.eventId;
        const scope = applyTo ?? RecurringEventUpdateScope.THIS_EVENT;
        if (original && seriesId) {
          applyEventProjectionAcrossQueries(
            queryClient,
            projectRecurringEdit({
              applyTo: scope,
              edited,
              original,
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
    buildMutation<Payload_DeleteEvent>(
      "delete",
      async (variables) => {
        const { _id, applyTo } = variables;
        await writeAfterPreceding(_id, variables, precedingCreateOk, () =>
          repository.delete(_id, applyTo),
        );
      },
      ({ _id }) => removeEventFromQueries(queryClient, _id, { source }),
    ),
  );

  const convertToSomedayMutation = useMutation(
    buildMutation<ConvertVariables>(
      "convert-to-someday",
      async (variables) => {
        const { event, converted } = variables;
        if (!converted) {
          throw new Error(`Event ${event._id} not found for conversion`);
        }
        const applyTo = converted.recurrence?.eventId
          ? RecurringEventUpdateScope.ALL_EVENTS
          : RecurringEventUpdateScope.THIS_EVENT;
        await writeAfterPreceding(event._id, variables, precedingCreateOk, () =>
          repository.edit(event._id, converted, { applyTo }),
        );
      },
      ({ event, converted }) => {
        if (!converted) return;
        removeEventFromQueries(queryClient, event._id, { source });
        insertEventIntoQueries(queryClient, converted, (entry) =>
          eventBelongsToEntry(converted, entry, source),
        );
      },
    ),
  );

  const convertToCalendarMutation = useMutation(
    buildMutation<ConvertVariables>(
      "convert-to-calendar",
      async (variables) => {
        const { event, converted } = variables;
        if (!converted) {
          throw new Error(`Event ${event._id} not found for conversion`);
        }
        // Persist the captured event even when it overlaps no cached calendar
        // range (off-screen target): the optimistic insert simply matches
        // nothing, and settle-time invalidation establishes canonical membership.
        await writeAfterPreceding(event._id, variables, precedingCreateOk, () =>
          repository.edit(event._id, converted, {}),
        );
      },
      ({ event, converted }) => {
        if (!converted) return;
        removeEventFromQueries(queryClient, event._id, { source });
        insertEventIntoQueries(queryClient, converted, (entry) =>
          eventBelongsToEntry(converted, entry, source),
        );
      },
    ),
  );

  const deleteSomedayMutation = useMutation(
    buildMutation<DeleteSomedayVariables>(
      "delete-someday",
      async (variables) => {
        const { _id, applyTo, skipRepository } = variables;
        await writeAfterPreceding(
          _id,
          variables,
          (preceding) => !skipRepository && precedingCreateOk(preceding),
          () => repository.delete(_id, applyTo),
        );
      },
      ({ _id }) =>
        removeEventFromQueries(queryClient, _id, { source, scope: "someday" }),
    ),
  );

  const reorderSomedayMutation = useMutation(
    buildMutation<Payload_Order[]>(
      "reorder-someday",
      async (order) => {
        await repository.reorder(order);
        await markWrite();
      },
      (order) => reorderSomedayEventsInQueries(queryClient, order, source),
    ),
  );

  // Undo recording happens here at the `.mutate()` boundary: it's the one
  // place every caller funnels through and the cache still holds the
  // pre-mutation event. Replays from useUndoRedo set the restoring flag so
  // they don't record themselves.
  return useMemo(() => {
    const recordDelete = (
      payload: Payload_DeleteEvent,
      kind: "delete" | "delete-someday",
    ) => recordEventDeleteHistory({ payload, kind, queryClient, source });

    const recordConvert = (
      event: Payload_ConvertEvent["event"],
      isSomeday: boolean,
    ) => {
      const { existing, converted } = convertedEvent(event, isSomeday);
      recordEventConvertHistory({ event, existing, converted, isSomeday });
      return converted;
    };

    return {
      create: (event: Schema_Event) =>
        createMutation.mutate({
          ...event,
          _id: event._id ?? createObjectIdString(),
        }),
      edit: (payload: Payload_EditEvent) => {
        recordEventEditHistory({ payload, queryClient, source });
        editMutation.mutate(payload);
      },
      delete: (payload: Payload_DeleteEvent) => {
        recordDelete(payload, "delete");
        deleteMutation.mutate(payload);
      },
      convertToSomeday: (payload: Payload_ConvertEvent) =>
        convertToSomedayMutation.mutate({
          event: payload.event,
          converted: recordConvert(payload.event, true),
        }),
      convertToCalendar: (payload: Payload_ConvertEvent) =>
        convertToCalendarMutation.mutate({
          event: payload.event,
          converted: recordConvert(payload.event, false),
        }),
      deleteSomeday: (payload: Payload_DeleteEvent) => {
        const existing = recordDelete(payload, "delete-someday");
        deleteSomedayMutation.mutate({
          ...payload,
          skipRepository: !existing,
        });
      },
      reorderSomeday: reorderSomedayMutation.mutate,
    };
  }, [
    convertedEvent,
    queryClient,
    source,
    createMutation.mutate,
    deleteMutation.mutate,
    deleteSomedayMutation.mutate,
    editMutation.mutate,
    convertToCalendarMutation.mutate,
    convertToSomedayMutation.mutate,
    reorderSomedayMutation.mutate,
  ]);
}
