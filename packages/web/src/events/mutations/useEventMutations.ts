import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import {
  type Payload_Order,
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { type EventRepositorySource } from "@web/common/repositories/event/event.repository.factory";
import { useEventRepositorySource } from "@web/common/repositories/event/event.repository.source.store";
import { type EventRepository } from "@web/common/repositories/event/event.repository.types";
import { getEventRepositoryBySource } from "@web/common/repositories/event/event.repository.util";
import { handleError } from "@web/common/utils/event/event.util";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import {
  type Payload_ConvertEvent,
  type Payload_DeleteEvent,
  type Payload_EditEvent,
} from "@web/events/event.types";
import {
  eventBelongsToEntry,
  findEventInCache,
  insertEventIntoQueries,
  removeEventFromQueries,
  reorderSomedayEventsInQueries,
  upsertEventAcrossQueries,
} from "@web/events/queries/event.query.cache";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import {
  type EventMutationOperation,
  eventMutationKeys,
} from "./event.mutation.keys";
import {
  markAnonymousEventWrite,
  waitForPendingEventCreate,
} from "./event.mutation.runtime";

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
        const createOutcome = await waitForPendingEventCreate(queryClient, _id);
        if (createOutcome !== "error") {
          await repository.edit(_id, event, { applyTo });
        }
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
        const createOutcome = await waitForPendingEventCreate(queryClient, _id);
        if (createOutcome !== "error") {
          await repository.delete(_id, applyTo);
        }
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
        const createOutcome = await waitForPendingEventCreate(
          queryClient,
          event._id,
        );
        if (createOutcome !== "error") {
          await repository.edit(event._id, converted, { applyTo });
        }
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
        const createOutcome = await waitForPendingEventCreate(
          queryClient,
          event._id,
        );
        if (createOutcome !== "error") {
          await repository.edit(event._id, converted, {});
        }
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
    buildMutation<DeleteSomedayVariables>(
      "delete-someday",
      async ({ _id, applyTo, skipRepository }) => {
        const createOutcome = await waitForPendingEventCreate(queryClient, _id);
        if (!skipRepository && createOutcome !== "error") {
          await repository.delete(_id, applyTo);
        }
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
      deleteSomeday: (payload: Payload_DeleteEvent) =>
        deleteSomedayMutation.mutate({
          ...payload,
          skipRepository: !findEventInCache(queryClient, payload._id, source),
        }),
      reorderSomeday: reorderSomedayMutation.mutate,
    }),
    [
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
    ],
  );
}
