import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { type Calendar } from "@core/types/calendar.contracts";
import { DateTimeSchema, type EventId } from "@core/types/domain-primitives";
import { type Event, type EventRecurrence } from "@core/types/event.contracts";
import {
  type CreateEventInput,
  type RecurrenceScope,
  type ReorderEventsInput,
  type ReplaceEventInput,
  type TransitionEventInput,
} from "@core/types/event-command.contracts";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { getLocalCalendarSentinelId } from "@web/calendars/local-calendar.sentinel";
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
  isRecurringEvent,
  recordEventDeleteHistory,
  recordEventEditHistory,
  recordEventTransitionHistory,
} from "./event.mutation-history";

const nowDateTime = () => DateTimeSchema.parse(new Date().toISOString());

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
    priority: input.priority,
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
    content: input.content,
    schedule: input.schedule,
    recurrence,
    priority: input.priority,
    updatedAt: nowDateTime(),
  };
}

// Optimistic best-effort of the server's transition result. `unschedule`'s
// real target is the user's server-assigned local calendar (unknown client
// side); the sentinel id stands in until the settle-time refetch corrects it
// (no per-mutation rollback — see the mutation architecture note below).
function transitionedEvent(
  existing: Event,
  input: TransitionEventInput,
): Event {
  return input.kind === "schedule"
    ? {
        ...existing,
        calendarId: input.targetCalendarId,
        schedule: input.schedule,
        updatedAt: nowDateTime(),
      }
    : {
        ...existing,
        calendarId: getLocalCalendarSentinelId(),
        schedule: input.schedule,
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
type TransitionVariables = {
  id: EventId;
  input: TransitionEventInput;
  writeKey: EventId;
  after: Event | null;
};

export type EventMutations = {
  create: (input: CreateEventInput) => void;
  replace: (payload: { id: EventId; input: ReplaceEventInput }) => void;
  delete: (payload: { id: EventId; scope: RecurrenceScope }) => void;
  transition: (payload: { id: EventId; input: TransitionEventInput }) => void;
  reorderSomeday: (input: ReorderEventsInput) => void;
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
    if (canWrite(preceding)) await write();
    await markWrite();
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
        const seriesId =
          existing.recurrence.kind === "occurrence"
            ? existing.recurrence.seriesId
            : existing.recurrence.kind === "series"
              ? existing.id
              : null;

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
      ({ id }) => removeEventFromQueries(queryClient, id, { source }),
    ),
  );

  const transitionMutation = useMutation(
    buildMutation<TransitionVariables>(
      "transition",
      async (variables) => {
        if (!variables.after) {
          throw new Error(`Event ${variables.id} not found for transition`);
        }
        await writeAfterPreceding(
          variables.writeKey,
          variables,
          precedingCreateOk,
          () => repository.transition(variables.id, variables.input),
        );
      },
      ({ id, after }) => {
        if (!after) return;
        removeEventFromQueries(queryClient, id, { source });
        insertEventIntoQueries(queryClient, after, (entry) =>
          eventBelongsToEntry(after, entry, source),
        );
      },
    ),
  );

  const reorderSomedayMutation = useMutation(
    buildMutation<ReorderEventsInput>(
      "reorder-someday",
      async (input) => {
        await repository.reorder(input);
        await markWrite();
      },
      (input) =>
        reorderSomedayEventsInQueries(queryClient, input.items, source),
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
      transition: (payload: { id: EventId; input: TransitionEventInput }) => {
        const existing = findEventInCache(queryClient, payload.id, source);
        if (isTargetReadOnly(existing)) {
          console.warn(
            `[useEventMutations] blocked transition on read-only event ${payload.id}`,
          );
          return;
        }
        const after = existing
          ? transitionedEvent(existing, payload.input)
          : null;
        recordEventTransitionHistory({
          id: payload.id,
          before: existing,
          after,
        });
        transitionMutation.mutate({
          ...payload,
          writeKey: payload.id,
          after,
        });
      },
      reorderSomeday: reorderSomedayMutation.mutate,
    }),
    [
      queryClient,
      source,
      isTargetReadOnly,
      createMutation.mutate,
      deleteMutation.mutate,
      replaceMutation.mutate,
      transitionMutation.mutate,
      reorderSomedayMutation.mutate,
    ],
  );
}

export { isRecurringEvent };
