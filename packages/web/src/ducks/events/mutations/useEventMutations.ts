import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  type Payload_Order,
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { type EventRepositorySource } from "@web/common/repositories/event/event.repository.factory";
import { type EventRepository } from "@web/common/repositories/event/event.repository.interface";
import { useEventRepositorySource } from "@web/common/repositories/event/event.repository.source.store";
import { getEventRepositoryBySource } from "@web/common/repositories/event/event.repository.util";
import { handleError, hasEventDates } from "@web/common/utils/event/event.util";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import {
  type Payload_ConvertEvent,
  type Payload_DeleteEvent,
  type Payload_EditEvent,
} from "@web/ducks/events/event.types";
import {
  findEventInCache,
  insertEventIntoQueries,
  patchEventInQueries,
  removeEventFromQueries,
  reorderSomedayEventsInQueries,
  restoreEventQueries,
  snapshotEventQueries,
} from "@web/ducks/events/queries/event.query.cache";
import { eventQueryKeys } from "@web/ducks/events/queries/event.query.keys";
import { type EventQuerySnapshot } from "@web/ducks/events/queries/event.query.types";
import {
  type EventMutationOperation,
  eventMutationKeys,
} from "./event.mutation.keys";
import { markAnonymousEventWrite } from "./event.mutation.runtime";

type MutationContext = { snapshots: EventQuerySnapshot[] };

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

const eventMatchesRange = (
  event: Schema_Event,
  startDate?: string,
  endDate?: string,
) => {
  if (!hasEventDates(event) || !startDate || !endDate) return false;
  return (
    dayjs(event.startDate).isBefore(dayjs(endDate)) &&
    dayjs(event.endDate).isAfter(dayjs(startDate))
  );
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
  const convertedEvent = (
    event: Payload_ConvertEvent["event"],
    isSomeday: boolean,
  ) => {
    const existing =
      findEventInCache(queryClient, event._id, source) ??
      findEventInCache(queryClient, event._id);
    if (!existing) return null;
    const converted = { ...existing, ...event, isSomeday } as Schema_Event;
    if (!isSomeday) delete converted.recurrence;
    return converted;
  };

  const createMutation = useMutation(
    buildMutation<Schema_Event>(
      "create",
      async (event) => {
        await repository.create(event);
        await markWrite();
        return event;
      },
      (event) =>
        insertEventIntoQueries(queryClient, event, ({ metadata, scope }) => {
          if (metadata.source !== source) return false;
          if (event.isSomeday) return scope === "someday";
          return (
            scope !== "someday" &&
            eventMatchesRange(event, metadata.startDate, metadata.endDate)
          );
        }),
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
        if (shouldRemove) removeEventFromQueries(queryClient, _id, { source });
        else patchEventInQueries(queryClient, _id, event, { source });
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
    buildMutation<Payload_ConvertEvent>(
      "convert-to-someday",
      async ({ event }) => {
        const converted = convertedEvent(event, true);
        if (!converted) {
          throw new Error(`Event ${event._id} not found for conversion`);
        }
        const applyTo = converted.recurrence?.eventId
          ? RecurringEventUpdateScope.ALL_EVENTS
          : RecurringEventUpdateScope.THIS_EVENT;
        await repository.edit(event._id, converted, { applyTo });
        await markWrite();
      },
      ({ event }) => {
        const converted = convertedEvent(event, true);
        if (!converted) return;
        removeEventFromQueries(queryClient, event._id, { source });
        insertEventIntoQueries(
          queryClient,
          converted,
          ({ metadata, scope }) =>
            metadata.source === source && scope === "someday",
        );
      },
    ),
  );

  const convertToCalendarMutation = useMutation(
    buildMutation<Payload_ConvertEvent>(
      "convert-to-calendar",
      async ({ event }) => {
        const converted = convertedEvent(event, false);
        if (!converted) {
          throw new Error(`Event ${event._id} not found for conversion`);
        }
        await repository.edit(event._id, converted, {});
        await markWrite();
      },
      ({ event }) => {
        const converted = convertedEvent(event, false);
        if (!converted) return;
        removeEventFromQueries(queryClient, event._id, { source });
        insertEventIntoQueries(
          queryClient,
          converted,
          ({ metadata, scope }) =>
            metadata.source === source &&
            scope !== "someday" &&
            eventMatchesRange(converted, metadata.startDate, metadata.endDate),
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
      convertToSomeday: convertToSomedayMutation.mutate,
      convertToCalendar: convertToCalendarMutation.mutate,
      deleteSomeday: deleteSomedayMutation.mutate,
      reorderSomeday: reorderSomedayMutation.mutate,
    }),
    [
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
