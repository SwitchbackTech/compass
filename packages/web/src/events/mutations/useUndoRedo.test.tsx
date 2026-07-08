import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { act, type PropsWithChildren } from "react";
import { Origin, Priorities } from "@core/constants/core.constants";
import {
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { type EventRepository } from "@web/common/repositories/event/event.repository.types";
import { type Schema_WebEvent } from "@web/common/types/web.event.types";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { type SomedayEventQueryData } from "@web/events/queries/event.query.types";
import { useUndoHistoryStore } from "@web/events/stores/undo.store";
import { useEventMutations } from "./useEventMutations";
import { useUndoRedo } from "./useUndoRedo";

const calendarKey = eventQueryKeys.list({
  source: "local",
  scope: "week",
  params: {
    startDate: "2026-07-01T00:00:00.000Z",
    endDate: "2026-07-08T00:00:00.000Z",
    someday: false,
  },
});

const somedayKey = eventQueryKeys.list({
  source: "local",
  scope: "someday",
  params: {
    startDate: "2026-07-01T00:00:00.000Z",
    endDate: "2026-08-01T00:00:00.000Z",
    someday: true,
  },
});

const event = (overrides: Partial<Schema_Event> = {}): Schema_Event => ({
  _id: "event-1",
  title: "Original",
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  isSomeday: false,
  gEventId: "g-event-1",
  startDate: "2026-07-02T16:00:00.000Z",
  endDate: "2026-07-02T17:00:00.000Z",
  ...overrides,
});

const normalized = (...events: Schema_Event[]) => ({
  ids: events.map(({ _id }) => _id as string),
  entities: Object.fromEntries(events.map((item) => [item._id, item])),
});

const setup = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const calls: Array<{ method: string; value: unknown }> = [];
  const repository: EventRepository = {
    create: async (value) => {
      calls.push({ method: "create", value });
    },
    get: async () => ({
      data: [],
      count: 0,
      pageSize: 0,
      startDate: "2026-07-01T00:00:00.000Z",
      endDate: "2026-07-08T00:00:00.000Z",
    }),
    edit: async (_id, value, params) => {
      calls.push({ method: "edit", value: { _id, event: value, params } });
    },
    delete: async (_id, applyTo) => {
      calls.push({ method: "delete", value: { _id, applyTo } });
    },
    reorder: async () => {},
  };
  const dependencies = {
    source: "local" as const,
    repository,
    markWrite: async () => {},
    reportError: () => {},
  };
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(
    () => ({
      mutations: useEventMutations(dependencies),
      undoRedo: useUndoRedo(dependencies),
    }),
    { wrapper },
  );
  return { calls, hook, queryClient };
};

describe("useUndoRedo", () => {
  test("undoes an edit by replaying the before snapshot, redoes with after", async () => {
    const context = setup();
    context.queryClient.setQueryData(calendarKey, normalized(event()));

    act(() =>
      context.hook.result.current.mutations.edit({
        _id: "event-1",
        event: event({
          startDate: "2026-07-03T16:00:00.000Z",
          endDate: "2026-07-03T17:00:00.000Z",
        }) as Schema_WebEvent,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      }),
    );
    await waitFor(() => {
      expect(context.hook.result.current.undoRedo.canUndo).toBe(true);
    });

    act(() => context.hook.result.current.undoRedo.undo());

    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<ReturnType<typeof normalized>>(
          calendarKey,
        )?.entities["event-1"].startDate,
      ).toBe("2026-07-02T16:00:00.000Z");
    });
    // The replay persisted the before snapshot and did not re-record itself.
    const editCalls = context.calls.filter(({ method }) => method === "edit");
    expect(editCalls).toHaveLength(2);
    expect(useUndoHistoryStore.getState().past).toHaveLength(0);
    expect(context.hook.result.current.undoRedo.canRedo).toBe(true);

    act(() => context.hook.result.current.undoRedo.redo());

    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<ReturnType<typeof normalized>>(
          calendarKey,
        )?.entities["event-1"].startDate,
      ).toBe("2026-07-03T16:00:00.000Z");
    });
    expect(context.hook.result.current.undoRedo.canUndo).toBe(true);
  });

  test("merges replays over the current cache entry so server-owned fields survive", async () => {
    const context = setup();
    // The snapshot era: the optimistic cache entry has no gEventId yet.
    const optimistic = event();
    delete optimistic.gEventId;
    context.queryClient.setQueryData(calendarKey, normalized(optimistic));

    act(() =>
      context.hook.result.current.mutations.edit({
        _id: "event-1",
        event: {
          ...optimistic,
          startDate: "2026-07-03T16:00:00.000Z",
          endDate: "2026-07-03T17:00:00.000Z",
        } as Schema_WebEvent,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      }),
    );
    await waitFor(() => {
      expect(context.hook.result.current.undoRedo.canUndo).toBe(true);
    });

    // A settle-refetch then enriches the cache with the server-assigned id.
    act(() =>
      context.queryClient.setQueryData(
        calendarKey,
        normalized(
          event({
            startDate: "2026-07-03T16:00:00.000Z",
            endDate: "2026-07-03T17:00:00.000Z",
          }),
        ),
      ),
    );

    act(() => context.hook.result.current.undoRedo.undo());

    await waitFor(() => {
      expect(
        context.calls.filter(({ method }) => method === "edit"),
      ).toHaveLength(2);
    });
    // The replay restores the snapshot's fields but keeps gEventId from the
    // current cache entry: the backend PUT is a full replace, so a bare
    // snapshot would strip the id and break Google propagation.
    const replay = context.calls.filter(({ method }) => method === "edit")[1];
    expect((replay.value as { event: Schema_Event }).event).toMatchObject({
      startDate: "2026-07-02T16:00:00.000Z",
      gEventId: "g-event-1",
    });
  });

  test("undoes a delete by recreating the snapshot with its original ids", async () => {
    const context = setup();
    context.queryClient.setQueryData(calendarKey, normalized(event()));

    act(() => context.hook.result.current.mutations.delete({ _id: "event-1" }));
    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<ReturnType<typeof normalized>>(
          calendarKey,
        )?.ids,
      ).toEqual([]);
    });

    act(() => context.hook.result.current.undoRedo.undo());

    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<ReturnType<typeof normalized>>(
          calendarKey,
        )?.entities["event-1"],
      ).toEqual(event());
    });
    const createCall = context.calls.find(({ method }) => method === "create");
    expect(createCall?.value).toMatchObject({
      _id: "event-1",
      gEventId: "g-event-1",
    });

    act(() => context.hook.result.current.undoRedo.redo());

    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<ReturnType<typeof normalized>>(
          calendarKey,
        )?.ids,
      ).toEqual([]);
    });
    expect(
      context.calls.filter(({ method }) => method === "delete"),
    ).toHaveLength(2);
  });

  test("undoes a someday convert by restoring calendar membership", async () => {
    const context = setup();
    context.queryClient.setQueryData(calendarKey, normalized(event()));
    context.queryClient.setQueryData(somedayKey, {
      ...normalized(),
      pagination: { data: [], page: 1, pageSize: 10, count: 0, offset: 0 },
    });

    act(() =>
      context.hook.result.current.mutations.convertToSomeday({
        event: { _id: "event-1" },
      }),
    );
    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<SomedayEventQueryData>(somedayKey)
          ?.entities["event-1"]?.isSomeday,
      ).toBe(true);
    });

    act(() => context.hook.result.current.undoRedo.undo());

    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<SomedayEventQueryData>(somedayKey)
          ?.ids,
      ).toEqual([]);
      expect(
        context.queryClient.getQueryData<ReturnType<typeof normalized>>(
          calendarKey,
        )?.entities["event-1"].isSomeday,
      ).toBe(false);
    });
  });

  test("undo and redo are no-ops with empty history", () => {
    const context = setup();

    act(() => context.hook.result.current.undoRedo.undo());
    act(() => context.hook.result.current.undoRedo.redo());

    expect(context.calls).toEqual([]);
    expect(context.hook.result.current.undoRedo.canUndo).toBe(false);
    expect(context.hook.result.current.undoRedo.canRedo).toBe(false);
  });
});
