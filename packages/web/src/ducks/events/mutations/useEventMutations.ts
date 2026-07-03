import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  type Payload_Order,
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
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
import { eventMutationKeys } from "./event.mutation.keys";
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

export function useEventMutations(): EventMutations {
  const queryClient = useQueryClient();
  const source = useEventRepositorySource();
  const repository = useMemo(
    () => getEventRepositoryBySource(source),
    [source],
  );

  const settle = () =>
    queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
  const rollback = (
    error: Error,
    _variables: unknown,
    context?: MutationContext,
  ) => {
    if (context) restoreEventQueries(queryClient, context.snapshots);
    handleError(error);
  };
  const snapshot = async () => {
    await queryClient.cancelQueries({ queryKey: eventQueryKeys.all });
    return { snapshots: snapshotEventQueries(queryClient, { source }) };
  };

  const createMutation = useMutation({
    mutationKey: eventMutationKeys.operation("create"),
    mutationFn: async (event: Schema_Event) => {
      await repository.create(event);
      await markAnonymousEventWrite();
      return event;
    },
    onMutate: async (event) => {
      const context = await snapshot();
      insertEventIntoQueries(queryClient, event, ({ metadata, scope }) => {
        if (metadata.source !== source) return false;
        if (event.isSomeday) return scope === "someday";
        return (
          scope !== "someday" &&
          eventMatchesRange(event, metadata.startDate, metadata.endDate)
        );
      });
      return context;
    },
    onError: rollback,
    onSettled: settle,
  });

  const editMutation = useMutation({
    mutationKey: eventMutationKeys.operation("edit"),
    mutationFn: async ({ _id, event, applyTo }: Payload_EditEvent) => {
      await repository.edit(_id, event, { applyTo });
      await markAnonymousEventWrite();
    },
    onMutate: async ({ _id, event, shouldRemove }) => {
      const context = await snapshot();
      if (shouldRemove) removeEventFromQueries(queryClient, _id, { source });
      else patchEventInQueries(queryClient, _id, event, { source });
      return context;
    },
    onError: rollback,
    onSettled: settle,
  });

  const deleteMutation = useMutation({
    mutationKey: eventMutationKeys.operation("delete"),
    mutationFn: async ({ _id, applyTo }: Payload_DeleteEvent) => {
      await repository.delete(_id, applyTo);
      await markAnonymousEventWrite();
    },
    onMutate: async ({ _id }) => {
      const context = await snapshot();
      removeEventFromQueries(queryClient, _id, { source });
      return context;
    },
    onError: rollback,
    onSettled: settle,
  });

  const convertToSomedayMutation = useMutation({
    mutationKey: eventMutationKeys.operation("convert-to-someday"),
    mutationFn: async ({ event }: Payload_ConvertEvent) => {
      const existing =
        findEventInCache(queryClient, event._id, source) ??
        findEventInCache(queryClient, event._id);
      if (!existing)
        throw new Error(`Event ${event._id} not found for conversion`);
      const converted = {
        ...existing,
        ...event,
        isSomeday: true,
      } as Schema_Event;
      const applyTo = converted.recurrence?.eventId
        ? RecurringEventUpdateScope.ALL_EVENTS
        : RecurringEventUpdateScope.THIS_EVENT;
      await repository.edit(event._id, converted, { applyTo });
      await markAnonymousEventWrite();
    },
    onMutate: async ({ event }) => {
      const context = await snapshot();
      const existing =
        findEventInCache(queryClient, event._id, source) ??
        findEventInCache(queryClient, event._id);
      if (!existing) return context;
      const converted = {
        ...existing,
        ...event,
        isSomeday: true,
      } as Schema_Event;
      removeEventFromQueries(queryClient, event._id, { source });
      insertEventIntoQueries(
        queryClient,
        converted,
        ({ metadata, scope }) =>
          metadata.source === source && scope === "someday",
      );
      return context;
    },
    onError: rollback,
    onSettled: settle,
  });

  const convertToCalendarMutation = useMutation({
    mutationKey: eventMutationKeys.operation("convert-to-calendar"),
    mutationFn: async ({ event }: Payload_ConvertEvent) => {
      const existing =
        findEventInCache(queryClient, event._id, source) ??
        findEventInCache(queryClient, event._id);
      if (!existing)
        throw new Error(`Event ${event._id} not found for conversion`);
      const converted = {
        ...existing,
        ...event,
        isSomeday: false,
      } as Schema_Event;
      delete converted.recurrence;
      await repository.edit(event._id, converted, {});
      await markAnonymousEventWrite();
    },
    onMutate: async ({ event }) => {
      const context = await snapshot();
      const existing =
        findEventInCache(queryClient, event._id, source) ??
        findEventInCache(queryClient, event._id);
      if (!existing) return context;
      const converted = {
        ...existing,
        ...event,
        isSomeday: false,
      } as Schema_Event;
      delete converted.recurrence;
      removeEventFromQueries(queryClient, event._id, { source });
      insertEventIntoQueries(
        queryClient,
        converted,
        ({ metadata, scope }) =>
          metadata.source === source &&
          scope !== "someday" &&
          eventMatchesRange(converted, metadata.startDate, metadata.endDate),
      );
      return context;
    },
    onError: rollback,
    onSettled: settle,
  });

  const deleteSomedayMutation = useMutation({
    mutationKey: eventMutationKeys.operation("delete-someday"),
    mutationFn: async ({ _id, applyTo }: Payload_DeleteEvent) => {
      await repository.delete(_id, applyTo);
      await markAnonymousEventWrite();
    },
    onMutate: async ({ _id }) => {
      const context = await snapshot();
      removeEventFromQueries(queryClient, _id, { source, scope: "someday" });
      return context;
    },
    onError: rollback,
    onSettled: settle,
  });

  const reorderSomedayMutation = useMutation({
    mutationKey: eventMutationKeys.operation("reorder-someday"),
    mutationFn: async (order: Payload_Order[]) => {
      await repository.reorder(order);
      await markAnonymousEventWrite();
    },
    onMutate: async (order) => {
      const context = await snapshot();
      reorderSomedayEventsInQueries(queryClient, order, source);
      return context;
    },
    onError: rollback,
    onSettled: settle,
  });

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
