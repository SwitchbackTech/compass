import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import {
  type Payload_Order,
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { type EventRepositorySource } from "@web/common/repositories/event/event.repository.factory";
import { type EventRepository } from "@web/common/repositories/event/event.repository.interface";
import { useEventRepositorySource } from "@web/common/repositories/event/event.repository.source.store";
import { getEventRepositoryBySource } from "@web/common/repositories/event/event.repository.util";
import { handleError } from "@web/common/utils/event/event.util";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import {
  type Payload_ConvertEvent,
  type Payload_DeleteEvent,
  type Payload_EditEvent,
} from "@web/ducks/events/event.types";
import {
  eventBelongsToEntry,
  findEventInCache,
  insertEventIntoQueries,
  removeEventFromQueries,
  reorderSomedayEventsInQueries,
  restoreEventQueries,
  snapshotEventQueries,
  upsertEventAcrossQueries,
} from "@web/ducks/events/queries/event.query.cache";
import { eventQueryKeys } from "@web/ducks/events/queries/event.query.keys";
import { type EventQuerySnapshot } from "@web/ducks/events/queries/event.query.types";
import {
  type EventMutationOperation,
  eventMutationKeys,
} from "./event.mutation.keys";
import { markAnonymousEventWrite } from "./event.mutation.runtime";

type MutationContext = { snapshots: EventQuerySnapshot[] };

// Convert mutations capture the fully-resolved converted event at the
// `.mutate()` boundary (see wrappers below) so `onMutate` and the async
// `mutationFn` operate on the identical snapshot even if the cache changes
// (SSE/refetch) between them.
type ConvertVariables = {
  event: Payload_ConvertEvent["event"];
  converted: Schema_Event | null;
};

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

  const settle = () =>
    queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
  const rollback = (
    error: Error,
    _variables: unknown,
    context?: MutationContext,
  ) => {
    if (context) restoreEventQueries(queryClient, context.snapshots);
    reportError(error);
  };
  const snapshot = async () => {
    await queryClient.cancelQueries({ queryKey: eventQueryKeys.all });
    return { snapshots: snapshotEventQueries(queryClient, { source }) };
  };
  const buildMutation = <Variables>(
    operation: EventMutationOperation,
    mutationFn: (variables: Variables) => Promise<unknown>,
    optimistic: (variables: Variables) => void,
  ) => ({
    mutationKey: eventMutationKeys.operation(operation),
    mutationFn,
    onMutate: async (variables: Variables) => {
      const context = await snapshot();
      optimistic(variables);
      return context;
    },
    onError: rollback,
    onSettled: settle,
  });
  const convertedEvent = useCallback(
    (event: Payload_ConvertEvent["event"], isSomeday: boolean) => {
      const existing = findEventInCache(queryClient, event._id, source);
      if (!existing) return null;
      const converted = { ...existing, ...event, isSomeday } as Schema_Event;
      if (!isSomeday) delete converted.recurrence;
      return converted;
    },
    [queryClient, source],
  );

  const createMutation = useMutation(
    buildMutation<Schema_Event>(
      "create",
      async (event) => {
        await repository.create(event);
        await markWrite();
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
      async ({ _id, event, applyTo }) => {
        await repository.edit(_id, event, { applyTo });
        await markWrite();
      },
      ({ _id, event, shouldRemove }) => {
        if (shouldRemove) {
          removeEventFromQueries(queryClient, _id, { source });
          return;
        }
        // Upsert (not patch) so an event edited/dragged into a currently-cached
        // range it wasn't previously a member of renders optimistically, and
        // one dragged out of a range is removed from it.
        upsertEventAcrossQueries(
          queryClient,
          { ...event, _id },
          (entry) => eventBelongsToEntry({ ...event, _id }, entry, source),
          { source },
        );
      },
    ),
  );

  const deleteMutation = useMutation(
    buildMutation<Payload_DeleteEvent>(
      "delete",
      async ({ _id, applyTo }) => {
        await repository.delete(_id, applyTo);
        await markWrite();
      },
      ({ _id }) => removeEventFromQueries(queryClient, _id, { source }),
    ),
  );

  const convertToSomedayMutation = useMutation(
    buildMutation<ConvertVariables>(
      "convert-to-someday",
      async ({ event, converted }) => {
        if (!converted) {
          throw new Error(`Event ${event._id} not found for conversion`);
        }
        const applyTo = converted.recurrence?.eventId
          ? RecurringEventUpdateScope.ALL_EVENTS
          : RecurringEventUpdateScope.THIS_EVENT;
        await repository.edit(event._id, converted, { applyTo });
        await markWrite();
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
      async ({ event, converted }) => {
        if (!converted) {
          throw new Error(`Event ${event._id} not found for conversion`);
        }
        // Persist the captured event even when it overlaps no cached calendar
        // range (off-screen target): the optimistic insert simply matches
        // nothing, and settle-time invalidation establishes canonical membership.
        await repository.edit(event._id, converted, {});
        await markWrite();
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
    buildMutation<Payload_DeleteEvent>(
      "delete-someday",
      async ({ _id, applyTo }) => {
        await repository.delete(_id, applyTo);
        await markWrite();
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

  return useMemo(
    () => ({
      create: (event: Schema_Event) =>
        createMutation.mutate({
          ...event,
          _id: event._id ?? createObjectIdString(),
        }),
      edit: editMutation.mutate,
      delete: deleteMutation.mutate,
      convertToSomeday: (payload: Payload_ConvertEvent) =>
        convertToSomedayMutation.mutate({
          event: payload.event,
          converted: convertedEvent(payload.event, true),
        }),
      convertToCalendar: (payload: Payload_ConvertEvent) =>
        convertToCalendarMutation.mutate({
          event: payload.event,
          converted: convertedEvent(payload.event, false),
        }),
      deleteSomeday: deleteSomedayMutation.mutate,
      reorderSomeday: reorderSomedayMutation.mutate,
    }),
    [
      convertedEvent,
      createMutation.mutate,
      deleteMutation.mutate,
      deleteSomedayMutation.mutate,
      editMutation.mutate,
      convertToCalendarMutation.mutate,
      convertToSomedayMutation.mutate,
      reorderSomedayMutation.mutate,
    ],
  );
}
