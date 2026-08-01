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
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import {
  buildCalendarLookup,
  isEventReadOnly,
} from "@web/calendars/useCalendarLookup";
import { handleError } from "@web/common/utils/event/event.util";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { dismissRecurrenceScopeToast } from "@web/common/utils/toast/recurrence-scope.toast";
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
import {
  flushOwedEventInvalidation,
  invalidateAllEventQueries,
  markEventInvalidationOwed,
} from "@web/events/queries/event.query.invalidation";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { type NormalizedEventQueryData } from "@web/events/queries/event.query.types";
import {
  projectRecurringDelete,
  projectRecurringEdit,
  projectSeriesMaterialization,
  projectSeriesRulesChange,
} from "@web/events/recurrence/projectRecurringEdit";
import {
  type RecurrenceScopeOpportunity,
  recurrenceScopeOpportunityActions,
} from "@web/events/recurrence/recurrence-scope-opportunity.store";
import { type EventRepositorySource } from "@web/events/repositories/event.repository.factory";
import { useEventRepositorySource } from "@web/events/repositories/event.repository.source.store";
import { type EventRepository } from "@web/events/repositories/event.repository.types";
import { getEventRepositoryBySource } from "@web/events/repositories/event.repository.util";
import {
  isRestoringHistory,
  undoHistoryActions,
} from "@web/events/stores/undo.store";
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
function seriesIdOf(event: Event | null | undefined): EventId | null {
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
  originalOverride?: Event;
  opportunityId?: number;
};
type DeleteVariables = {
  id: EventId;
  scope: RecurrenceScope;
  writeKey: EventId;
  skipRepository: boolean;
  originalOverride?: Event;
  opportunityId?: number;
};

export type EventMutations = {
  create: (input: CreateEventInput) => void;
  replace: (payload: { id: EventId; input: ReplaceEventInput }) => void;
  delete: (payload: { id: EventId; scope: RecurrenceScope }) => void;
  promoteRecurring: (
    opportunity: RecurrenceScopeOpportunity,
    scope: "thisAndFollowing" | "all",
  ) => void;
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

  // Shared by the create and replace optimistic callbacks: the query-cache
  // ranges a series expansion should materialize instances into.
  const cachedRanges = () =>
    getEventQueryEntries(queryClient, { source }).map(({ metadata }) => ({
      start: metadata.start,
      end: metadata.end,
    }));

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
  //
  // The count>0 branch marks the invalidation OWED rather than dropping it.
  // Every mutation's onSettled runs this same function, so whichever one
  // finishes last will eventually observe count 0 and flush it — without
  // this, a settle whose deferred check raced a brand-new mutation starting
  // could silently never invalidate, leaving an edit/delete that already
  // failed server-side (or an SSE signal that arrived mid-burst) stuck
  // showing stale optimistic state until an unrelated refetch happened to
  // cover it.
  const settle = () => {
    setTimeout(() => {
      if (
        queryClient.isMutating({ mutationKey: eventMutationKeys.all }) === 0
      ) {
        invalidateAllEventQueries(queryClient);
        flushOwedEventInvalidation(queryClient);
      } else {
        markEventInvalidationOwed(queryClient);
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
      const opportunityId = (variables as { opportunityId?: number })
        .opportunityId;
      if (opportunityId) {
        dismissRecurrenceScopeToast(opportunityId);
        recurrenceScopeOpportunityActions.complete(opportunityId);
      }
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
              ranges: cachedRanges(),
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
          // A promotion replays the saved occurrence mutation at a broader
          // scope. It must reach the repository even if a later narrow edit
          // shares its occurrence write key.
          { coalesce: !variables.originalOverride },
        );
      },
      ({ id, input, originalOverride }) => {
        const existing =
          findEventInCache(queryClient, id, source) ?? originalOverride;
        if (!existing) return;
        const edited = mergeReplaceInput(existing, input);
        const original = originalOverride ?? existing;
        const seriesId = seriesIdOf(original);

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
            applyEventProjectionAcrossQueries(
              queryClient,
              projectSeriesRulesChange({
                scope: input.scope,
                edited,
                original,
                seriesId,
                seriesEvents: seriesId
                  ? findSeriesEventsInCache(queryClient, seriesId, source)
                  : [],
                ranges: cachedRanges(),
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
      ({ id, scope, originalOverride }) => {
        const existing =
          findEventInCache(queryClient, id, source) ?? originalOverride;
        const seriesId = seriesIdOf(originalOverride ?? existing);

        if (existing && seriesId && scope !== "this") {
          applyEventProjectionAcrossQueries(
            queryClient,
            projectRecurringDelete({
              scope,
              target: originalOverride ?? existing,
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
        const opportunityId =
          original &&
          original.recurrence.kind === "occurrence" &&
          payload.input.scope === "this" &&
          payload.input.recurrence.kind === "preserve" &&
          !isRestoringHistory()
            ? recurrenceScopeOpportunityActions.begin({
                kind: "replace",
                original,
                input: payload.input,
                source,
              })
            : undefined;
        if (original) {
          recordEventEditHistory({
            id: payload.id,
            after: mergeReplaceInput(original, payload.input),
            scope: payload.input.scope,
            queryClient,
            source,
          });
        }
        replaceMutation.mutate({ ...payload, writeKey, opportunityId });
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
        const original = findEventInCache(queryClient, payload.id, source);
        const opportunityId =
          original &&
          original.recurrence.kind === "occurrence" &&
          payload.scope === "this" &&
          !isRestoringHistory()
            ? recurrenceScopeOpportunityActions.begin({
                kind: "delete",
                original,
                source,
              })
            : undefined;
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
          opportunityId,
        });
      },
      promoteRecurring: (
        opportunity: RecurrenceScopeOpportunity,
        scope: "thisAndFollowing" | "all",
      ) => {
        if (opportunity.source !== source) {
          dismissRecurrenceScopeToast(opportunity.id);
          recurrenceScopeOpportunityActions.complete(opportunity.id);
          return;
        }
        // Broader recurring operations rewrite/split this series, so its
        // narrow client snapshots are no longer safe to replay. Keep history
        // for unrelated events the user changed while this toast was live.
        const seriesId = seriesIdOf(opportunity.original);
        if (seriesId) undoHistoryActions.discardSeries(seriesId);

        const onSettled = () => {
          recurrenceScopeOpportunityActions.complete(opportunity.id);
        };
        if (opportunity.kind === "replace") {
          replaceMutation.mutate(
            {
              id: opportunity.original.id as EventId,
              input: { ...opportunity.input, scope },
              // Serialize behind the narrow write for this occurrence. The
              // optimistic projection still uses originalOverride so a
              // deleted/overridden cache entry cannot lose the promotion.
              writeKey: opportunity.original.id as EventId,
              originalOverride: opportunity.original,
            },
            { onSettled },
          );
          return;
        }

        deleteMutation.mutate(
          {
            id: opportunity.original.id as EventId,
            scope,
            writeKey: opportunity.original.id as EventId,
            skipRepository: false,
            originalOverride: opportunity.original,
          },
          { onSettled },
        );
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
