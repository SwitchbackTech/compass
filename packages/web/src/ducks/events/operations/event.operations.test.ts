import { QueryClient } from "@tanstack/react-query";
import { RecurringEventUpdateScope } from "@core/types/event.types";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { createStoreWithEvents } from "@web/__tests__/utils/state/store.test.util";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  convertCalendarToSomedayEvent,
  createCalendarEvent,
  deleteCalendarEvent,
  deleteSomedayEvent,
  editCalendarEvent,
  reorderSomedayEvents,
} from "@web/ducks/events/operations/event.mutation.operations";
import { eventQueryKeys } from "@web/ducks/events/queries/event.query.keys";
import { createEventSlice } from "@web/ducks/events/slices/event.slice";
import { pendingEventsSlice } from "@web/ducks/events/slices/pending.slice";
import { describe, expect, mock, spyOn, test } from "bun:test";

const createRepository = () => ({
  create: mock(async () => undefined),
  delete: mock(async () => undefined),
  edit: mock(async () => undefined),
  get: mock(async () => ({
    data: [],
    count: 0,
    page: 1,
    pageSize: 0,
    offset: 0,
    startDate: "",
    endDate: "",
  })),
  reorder: mock(async () => undefined),
});

const createStoreRuntime = (
  events = [createMockStandaloneEvent({ _id: "event-1" })],
) => {
  const store = createStoreWithEvents(events);
  const repository = createRepository();
  const reportError = mock(() => undefined);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateQueries = spyOn(queryClient, "invalidateQueries");
  return {
    store,
    repository,
    reportError,
    invalidateQueries,
    runtime: {
      dispatch: store.dispatch,
      getState: store.getState,
      queryClient,
      signal: new AbortController().signal,
      doesSessionExist: async () => true,
      getRepository: () => repository,
      getRepositorySource: () => "remote" as const,
      reportError,
    },
  };
};

describe("event mutation operations", () => {
  test("restores the previous event when an edit fails", async () => {
    const previous = createMockStandaloneEvent({
      _id: "event-1",
      title: "Before",
    });
    const { runtime, repository, store, reportError, invalidateQueries } =
      createStoreRuntime([previous]);
    const failure = new Error("edit failed");
    repository.edit.mockImplementation(async () => Promise.reject(failure));

    await editCalendarEvent(runtime, {
      _id: "event-1",
      event: { ...previous, title: "After" } as Schema_GridEvent,
    });

    expect(store.getState().events.entities.value["event-1"]?.title).toBe(
      "Before",
    );
    expect(store.getState().events.pendingEvents.eventIds).toEqual([]);
    expect(reportError).toHaveBeenCalledWith(failure);
    // Revert paths never touched the repository, so they must not invalidate.
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  test("does not persist deletion of an event that is still pending", async () => {
    const { runtime, repository, store } = createStoreRuntime();
    store.dispatch(pendingEventsSlice.actions.add("event-1"));

    await deleteCalendarEvent(runtime, { _id: "event-1" });

    expect(repository.delete).not.toHaveBeenCalled();
    expect(store.getState().events.entities.value["event-1"]).toBeUndefined();
  });

  test("uses all-events scope when converting a recurring instance", async () => {
    const eventId = "507f1f77bcf86cd799439011";
    const recurring = createMockStandaloneEvent({
      _id: eventId,
      recurrence: {
        eventId: "507f1f77bcf86cd799439012",
        rule: ["RRULE:FREQ=WEEKLY;INTERVAL=1"],
      },
    });
    const { runtime, repository, reportError } = createStoreRuntime([
      recurring,
    ]);

    await convertCalendarToSomedayEvent(runtime, {
      event: { _id: eventId, isSomeday: true },
    });

    expect(reportError).not.toHaveBeenCalled();
    expect(repository.edit).toHaveBeenCalledWith(eventId, expect.anything(), {
      applyTo: RecurringEventUpdateScope.ALL_EVENTS,
    });
  });

  test("restores a Someday event when deletion fails", async () => {
    const event = createMockStandaloneEvent({
      _id: "event-1",
      isSomeday: true,
    });
    const { runtime, repository, store } = createStoreRuntime([event]);
    repository.delete.mockImplementation(async () =>
      Promise.reject(new Error("delete failed")),
    );

    await deleteSomedayEvent(runtime, { _id: "event-1" });

    expect(store.getState().events.entities.value["event-1"]).toEqual(event);
  });

  test("updates valid Someday ordering before persisting it", async () => {
    const event = createMockStandaloneEvent({
      _id: "event-1",
      isSomeday: true,
      order: 1,
    });
    const { runtime, repository, store } = createStoreRuntime([event]);

    await reorderSomedayEvents(runtime, [{ _id: "event-1", order: 4 }]);

    expect(store.getState().events.entities.value["event-1"]?.order).toBe(4);
    expect(repository.reorder).toHaveBeenCalledWith([
      { _id: "event-1", order: 4 },
    ]);
  });

  test("invalidates all event reads after a persisted mutation succeeds", async () => {
    const event = createMockStandaloneEvent({
      _id: "event-1",
      isSomeday: true,
      order: 1,
    });
    const { runtime, invalidateQueries } = createStoreRuntime([event]);

    await reorderSomedayEvents(runtime, [{ _id: "event-1", order: 4 }]);

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: eventQueryKeys.all,
    });
  });
});

describe("createCalendarEvent", () => {
  test("clears pending state after persistence succeeds", async () => {
    const dispatched: Array<{ type: string; payload?: unknown }> = [];
    const create = mock(async () => undefined);
    const event = createMockStandaloneEvent({ _id: "event-1" });
    const runtime = {
      dispatch: (action: { type: string; payload?: unknown }) => {
        dispatched.push(action);
        return action;
      },
      getState: () => ({}) as never,
      queryClient: new QueryClient(),
      signal: new AbortController().signal,
      doesSessionExist: async () => true,
      getRepository: () => ({ create }) as never,
      getRepositorySource: () => "remote" as const,
      reportError: mock(() => undefined),
    };

    await createCalendarEvent(runtime, event);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "event-1" }),
    );
    expect(dispatched.map(({ type }) => type)).toContain(
      createEventSlice.actions.success.type,
    );
    expect(dispatched.at(-1)).toEqual(
      pendingEventsSlice.actions.remove("event-1"),
    );
  });

  test("rolls back the optimistic event and clears pending state on failure", async () => {
    const dispatched: Array<{ type: string; payload?: unknown }> = [];
    const failure = new Error("write failed");
    const reportError = mock(() => undefined);
    const event = createMockStandaloneEvent({ _id: "event-1" });
    const runtime = {
      dispatch: (action: { type: string; payload?: unknown }) => {
        dispatched.push(action);
        return action;
      },
      getState: () => ({}) as never,
      queryClient: new QueryClient(),
      signal: new AbortController().signal,
      doesSessionExist: async () => true,
      getRepository: () =>
        ({ create: mock(async () => Promise.reject(failure)) }) as never,
      getRepositorySource: () => "remote" as const,
      reportError,
    };

    await createCalendarEvent(runtime, event);

    expect(dispatched.map(({ type }) => type)).toContain(
      createEventSlice.actions.error.type,
    );
    expect(reportError).toHaveBeenCalledWith(failure);
    expect(dispatched.at(-1)).toEqual(
      pendingEventsSlice.actions.remove("event-1"),
    );
  });

  test("marks the sign-up prompt only after an anonymous write succeeds", async () => {
    const event = createMockStandaloneEvent({ _id: "event-1" });
    const dispatched: Array<{ type: string; payload?: unknown }> = [];
    const create = mock(async () => undefined);
    const markAnonymousChange = mock(() => undefined);
    const runtime = {
      dispatch: (action: { type: string; payload?: unknown }) => {
        dispatched.push(action);
        return action;
      },
      getState: () => ({}) as never,
      queryClient: new QueryClient(),
      signal: new AbortController().signal,
      doesSessionExist: async () => false,
      getRepository: () => ({ create }) as never,
      getRepositorySource: () => "local" as const,
      reportError: mock(() => undefined),
      hasUserEverAuthenticated: () => false,
      isGoogleRevoked: () => false,
      markAnonymousChange,
    };

    await createCalendarEvent(runtime, event);
    expect(markAnonymousChange).toHaveBeenCalledTimes(1);

    markAnonymousChange.mockClear();
    create.mockImplementation(async () => Promise.reject(new Error("failed")));
    await createCalendarEvent(runtime, event);
    expect(markAnonymousChange).not.toHaveBeenCalled();
  });
});
