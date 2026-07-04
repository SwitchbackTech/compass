import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { act, type PropsWithChildren } from "react";
import { Origin, Priorities } from "@core/constants/core.constants";
import {
  type Payload_Order,
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { type EventRepository } from "@web/common/repositories/event/event.repository.interface";
import { type Schema_WebEvent } from "@web/common/types/web.event.types";
import { eventQueryKeys } from "@web/ducks/events/queries/event.query.keys";
import { type SomedayEventQueryData } from "@web/ducks/events/queries/event.query.types";
import { useEventMutations } from "./useEventMutations";
import { useHasPendingEventMutations } from "./useEventPending";

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
  startDate: "2026-07-02T16:00:00.000Z",
  endDate: "2026-07-02T17:00:00.000Z",
  ...overrides,
});

const normalized = (...events: Schema_Event[]) => ({
  ids: events.map(({ _id }) => _id as string),
  entities: Object.fromEntries(events.map((item) => [item._id, item])),
});

// Each repository call blocks on its own waiter (FIFO). `resolve`/`reject`
// settle every current and future call. `resolveNext`/`rejectNext` settle
// only the oldest in-flight call so tests can interleave outcomes of concurrent mutations.
const pendingControl = () => {
  type Waiter = { resolve: () => void; reject: (reason?: unknown) => void };
  const waiters: Waiter[] = [];
  let settledAll:
    | { mode: "resolve" }
    | { mode: "reject"; reason: unknown }
    | null = null;
  const wait = () =>
    new Promise<void>((resolve, reject) => {
      if (settledAll) {
        if (settledAll.mode === "resolve") resolve();
        else reject(settledAll.reason);
        return;
      }
      waiters.push({ resolve, reject });
    });
  return {
    wait,
    resolve: () => {
      settledAll = { mode: "resolve" };
      for (const waiter of waiters.splice(0)) waiter.resolve();
    },
    reject: (reason?: unknown) => {
      settledAll = { mode: "reject", reason };
      for (const waiter of waiters.splice(0)) waiter.reject(reason);
    },
    resolveNext: () => waiters.shift()?.resolve(),
    rejectNext: (reason?: unknown) => waiters.shift()?.reject(reason),
  };
};

const setup = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const pending = pendingControl();
  const calls: Array<{ method: string; value: unknown }> = [];
  const repository: EventRepository = {
    create: async (value) => {
      calls.push({ method: "create", value });
      await pending.wait();
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
      await pending.wait();
    },
    delete: async (_id, applyTo) => {
      calls.push({ method: "delete", value: { _id, applyTo } });
      await pending.wait();
    },
    reorder: async (value) => {
      calls.push({ method: "reorder", value });
      await pending.wait();
    },
  };
  const markedWrites: string[] = [];
  const errors: Error[] = [];
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(
    () => ({
      mutations: useEventMutations({
        source: "local",
        repository,
        markWrite: async () => markedWrites.push("marked"),
        reportError: (error) => errors.push(error),
      }),
      hasPending: useHasPendingEventMutations(),
    }),
    { wrapper },
  );
  return { calls, errors, hook, markedWrites, pending, queryClient };
};

describe("useEventMutations", () => {
  test("creates optimistically, exposes pending state, and invalidates on success", async () => {
    const context = setup();
    context.queryClient.setQueryData(calendarKey, normalized());
    const created = event({ _id: "created", title: "Created" });

    act(() => context.hook.result.current.mutations.create(created));

    await waitFor(() => {
      expect(context.hook.result.current.hasPending).toBe(true);
      expect(
        context.queryClient.getQueryData<ReturnType<typeof normalized>>(
          calendarKey,
        )?.entities.created,
      ).toEqual(created);
    });
    expect(
      context.queryClient.getMutationCache().getAll()[0].options.mutationKey,
    ).toEqual(["events", "mutation", "create"]);

    context.pending.resolve();

    await waitFor(() => {
      expect(context.hook.result.current.hasPending).toBe(false);
      expect(context.markedWrites).toEqual(["marked"]);
      expect(
        context.queryClient.getQueryState(calendarKey)?.isInvalidated,
      ).toBe(true);
    });
  });

  test("reports the error and invalidates instead of rolling back when an edit fails", async () => {
    const context = setup();
    context.queryClient.setQueryData(calendarKey, normalized(event()));

    act(() =>
      context.hook.result.current.mutations.edit({
        _id: "event-1",
        event: event({ title: "Changed" }) as Schema_WebEvent,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      }),
    );

    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<ReturnType<typeof normalized>>(
          calendarKey,
        )?.entities["event-1"].title,
      ).toBe("Changed");
    });
    context.pending.reject(new Error("write failed"));

    await waitFor(() => {
      expect(context.errors[0]?.message).toBe("write failed");
      // No in-memory rollback: the settle-time invalidation refetches server
      // truth instead of restoring a snapshot.
      expect(
        context.queryClient.getQueryState(calendarKey)?.isInvalidated,
      ).toBe(true);
    });
    expect(
      context.queryClient.getQueryData<ReturnType<typeof normalized>>(
        calendarKey,
      )?.entities["event-1"].title,
    ).toBe("Changed");
  });

  test("keeps a newer edit's optimistic value when an older edit for the same event fails", async () => {
    const context = setup();
    context.queryClient.setQueryData(calendarKey, normalized(event()));
    const editEvent = (title: string) =>
      context.hook.result.current.mutations.edit({
        _id: "event-1",
        event: event({ title }) as Schema_WebEvent,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      });

    act(() => editEvent("First"));
    await waitFor(() => {
      expect(
        context.calls.filter(({ method }) => method === "edit"),
      ).toHaveLength(1);
    });
    act(() => editEvent("Second"));
    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<ReturnType<typeof normalized>>(
          calendarKey,
        )?.entities["event-1"].title,
      ).toBe("Second");
    });

    act(() => context.pending.rejectNext(new Error("first edit failed")));

    await waitFor(() => {
      expect(context.errors[0]?.message).toBe("first edit failed");
    });
    // The newer edit's optimistic value survives the older edit's failure,
    // and no refetch fires while the newer mutation is still in flight.
    expect(
      context.queryClient.getQueryData<ReturnType<typeof normalized>>(
        calendarKey,
      )?.entities["event-1"].title,
    ).toBe("Second");
    expect(context.queryClient.getQueryState(calendarKey)?.isInvalidated).toBe(
      false,
    );

    act(() => context.pending.resolveNext());
    await waitFor(() => {
      expect(context.hook.result.current.hasPending).toBe(false);
      expect(
        context.queryClient.getQueryState(calendarKey)?.isInvalidated,
      ).toBe(true);
    });
  });

  test("a failed edit leaves a concurrent edit to another event untouched", async () => {
    const context = setup();
    const other = event({ _id: "event-2", title: "Other" });
    context.queryClient.setQueryData(calendarKey, normalized(event(), other));

    act(() =>
      context.hook.result.current.mutations.edit({
        _id: "event-1",
        event: event({ title: "Doomed" }) as Schema_WebEvent,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      }),
    );
    await waitFor(() => {
      expect(
        context.calls.filter(({ method }) => method === "edit"),
      ).toHaveLength(1);
    });
    act(() =>
      context.hook.result.current.mutations.edit({
        _id: "event-2",
        event: event({ _id: "event-2", title: "Survivor" }) as Schema_WebEvent,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      }),
    );
    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<ReturnType<typeof normalized>>(
          calendarKey,
        )?.entities["event-2"].title,
      ).toBe("Survivor");
    });

    act(() => context.pending.rejectNext(new Error("event-1 edit failed")));

    await waitFor(() => {
      expect(context.errors[0]?.message).toBe("event-1 edit failed");
    });
    expect(
      context.queryClient.getQueryData<ReturnType<typeof normalized>>(
        calendarKey,
      )?.entities["event-2"].title,
    ).toBe("Survivor");

    act(() => context.pending.resolveNext());
    await waitFor(() => {
      expect(context.hook.result.current.hasPending).toBe(false);
    });
  });

  test("removes calendar and Someday events optimistically", async () => {
    const context = setup();
    context.queryClient.setQueryData(calendarKey, normalized(event()));
    const someday = event({ _id: "someday", isSomeday: true });
    context.queryClient.setQueryData(somedayKey, {
      ...normalized(someday),
      pagination: {
        data: [someday],
        page: 1,
        pageSize: 10,
        count: 1,
        offset: 0,
      },
    });

    act(() => context.hook.result.current.mutations.delete({ _id: "event-1" }));
    act(() =>
      context.hook.result.current.mutations.deleteSomeday({ _id: "someday" }),
    );

    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<ReturnType<typeof normalized>>(
          calendarKey,
        )?.ids,
      ).toEqual([]);
      expect(
        context.queryClient.getQueryData<SomedayEventQueryData>(somedayKey)
          ?.ids,
      ).toEqual([]);
    });
    context.pending.resolve();
  });

  test("moves events between calendar and Someday caches", async () => {
    const toSomeday = setup();
    toSomeday.queryClient.setQueryData(calendarKey, normalized(event()));
    toSomeday.queryClient.setQueryData(somedayKey, {
      ...normalized(),
      pagination: { data: [], page: 1, pageSize: 10, count: 0, offset: 0 },
    });

    act(() =>
      toSomeday.hook.result.current.mutations.convertToSomeday({
        event: { _id: "event-1" },
      }),
    );

    await waitFor(() => {
      expect(
        toSomeday.queryClient.getQueryData<ReturnType<typeof normalized>>(
          calendarKey,
        )?.ids,
      ).toEqual([]);
      expect(
        toSomeday.queryClient.getQueryData<SomedayEventQueryData>(somedayKey)
          ?.entities["event-1"].isSomeday,
      ).toBe(true);
    });
    toSomeday.pending.resolve();

    const toCalendar = setup();
    const someday = event({ _id: "someday", isSomeday: true });
    toCalendar.queryClient.setQueryData(calendarKey, normalized());
    toCalendar.queryClient.setQueryData(somedayKey, {
      ...normalized(someday),
      pagination: {
        data: [someday],
        page: 1,
        pageSize: 10,
        count: 1,
        offset: 0,
      },
    });

    act(() =>
      toCalendar.hook.result.current.mutations.convertToCalendar({
        event: {
          _id: "someday",
          startDate: "2026-07-03T16:00:00.000Z",
          endDate: "2026-07-03T17:00:00.000Z",
        },
      }),
    );

    await waitFor(() => {
      expect(
        toCalendar.queryClient.getQueryData<SomedayEventQueryData>(somedayKey)
          ?.ids,
      ).toEqual([]);
      expect(
        toCalendar.queryClient.getQueryData<ReturnType<typeof normalized>>(
          calendarKey,
        )?.entities.someday.isSomeday,
      ).toBe(false);
    });
    toCalendar.pending.resolve();
  });

  test("defers deletion until the in-flight create persists, then deletes server-side", async () => {
    const context = setup();
    context.queryClient.setQueryData(calendarKey, normalized());
    const created = event({ _id: "created", title: "Created" });

    act(() => context.hook.result.current.mutations.create(created));
    await waitFor(() => {
      expect(context.hook.result.current.hasPending).toBe(true);
    });

    act(() => context.hook.result.current.mutations.delete({ _id: "created" }));

    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<ReturnType<typeof normalized>>(
          calendarKey,
        )?.ids,
      ).toEqual([]);
    });
    // The create has not persisted yet, so the backend delete must wait —
    // deleting now would 404, and skipping it would resurrect the event once
    // the create lands.
    expect(context.calls.some(({ method }) => method === "delete")).toBe(false);

    context.pending.resolve();

    await waitFor(() => {
      expect(context.calls.some(({ method }) => method === "delete")).toBe(
        true,
      );
    });
  });

  test("skips the deferred deletion when the create fails", async () => {
    const context = setup();
    context.queryClient.setQueryData(calendarKey, normalized());
    const created = event({ _id: "created", title: "Created" });

    act(() => context.hook.result.current.mutations.create(created));
    await waitFor(() => {
      expect(context.hook.result.current.hasPending).toBe(true);
    });
    act(() => context.hook.result.current.mutations.delete({ _id: "created" }));

    context.pending.reject(new Error("create failed"));

    await waitFor(() => {
      expect(context.errors[0]?.message).toBe("create failed");
      expect(context.hook.result.current.hasPending).toBe(false);
    });
    // The event never existed server-side, so there is nothing to delete.
    expect(context.calls.some(({ method }) => method === "delete")).toBe(false);
  });

  test("defers an edit until the in-flight create persists", async () => {
    const context = setup();
    context.queryClient.setQueryData(calendarKey, normalized());
    const created = event({ _id: "created", title: "Created" });

    act(() => context.hook.result.current.mutations.create(created));
    await waitFor(() => {
      expect(context.calls.some(({ method }) => method === "create")).toBe(
        true,
      );
    });

    act(() =>
      context.hook.result.current.mutations.edit({
        _id: "created",
        event: event({ _id: "created", title: "Edited" }) as Schema_WebEvent,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      }),
    );

    // The edit's repository write must wait for the create to persist; an
    // early write would target an id the backend does not know yet.
    expect(context.calls.some(({ method }) => method === "edit")).toBe(false);

    context.pending.resolve();

    await waitFor(() => {
      expect(context.calls.some(({ method }) => method === "edit")).toBe(true);
    });
  });

  test("does not persist Someday deletion for an event absent from cache", async () => {
    const context = setup();
    context.queryClient.setQueryData(somedayKey, {
      ...normalized(),
      pagination: { data: [], page: 1, pageSize: 10, count: 0, offset: 0 },
    });

    act(() =>
      context.hook.result.current.mutations.deleteSomeday({ _id: "ghost" }),
    );

    await waitFor(() => {
      expect(context.markedWrites).toEqual(["marked"]);
    });
    expect(context.calls.some(({ method }) => method === "delete")).toBe(false);
    expect(context.errors).toEqual([]);
  });

  test("inserts an edited event into a newly-matching cached range", async () => {
    const context = setup();
    context.queryClient.setQueryData(calendarKey, normalized());
    const movedIn = event({
      _id: "mover",
      title: "Moved In",
      startDate: "2026-07-04T16:00:00.000Z",
      endDate: "2026-07-04T17:00:00.000Z",
    });

    act(() =>
      context.hook.result.current.mutations.edit({
        _id: "mover",
        event: movedIn as Schema_WebEvent,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      }),
    );

    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<ReturnType<typeof normalized>>(
          calendarKey,
        )?.entities.mover?.title,
      ).toBe("Moved In");
    });
    context.pending.resolve();
  });

  test("removes an edited event from a range it no longer belongs to", async () => {
    const context = setup();
    context.queryClient.setQueryData(calendarKey, normalized(event()));
    const movedOut = event({
      // Push the event well outside the cached 2026-07-01..08 week.
      startDate: "2026-09-01T16:00:00.000Z",
      endDate: "2026-09-01T17:00:00.000Z",
    });

    act(() =>
      context.hook.result.current.mutations.edit({
        _id: "event-1",
        event: movedOut as Schema_WebEvent,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      }),
    );

    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<ReturnType<typeof normalized>>(
          calendarKey,
        )?.ids,
      ).toEqual([]);
    });
    context.pending.resolve();
  });

  test("convertToCalendar to an off-screen range persists without throwing", async () => {
    const context = setup();
    const someday = event({ _id: "someday", isSomeday: true });
    context.queryClient.setQueryData(calendarKey, normalized());
    context.queryClient.setQueryData(somedayKey, {
      ...normalized(someday),
      pagination: {
        data: [someday],
        page: 1,
        pageSize: 10,
        count: 1,
        offset: 0,
      },
    });

    act(() =>
      context.hook.result.current.mutations.convertToCalendar({
        event: {
          _id: "someday",
          // Target date is outside the cached 2026-07 week range.
          startDate: "2026-08-20T16:00:00.000Z",
          endDate: "2026-08-20T17:00:00.000Z",
        },
      }),
    );

    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<SomedayEventQueryData>(somedayKey)
          ?.ids,
      ).toEqual([]);
    });
    context.pending.resolve();

    await waitFor(() => {
      expect(context.calls.some(({ method }) => method === "edit")).toBe(true);
      expect(context.errors).toEqual([]);
    });
  });

  test("marks the converting event pending during convertToSomeday", async () => {
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
      expect(context.hook.result.current.hasPending).toBe(true);
    });
    context.pending.resolve();
    await waitFor(() => {
      expect(context.hook.result.current.hasPending).toBe(false);
    });
  });

  test("marks the converting event pending during convertToCalendar", async () => {
    const context = setup();
    const someday = event({ _id: "someday", isSomeday: true });
    context.queryClient.setQueryData(calendarKey, normalized());
    context.queryClient.setQueryData(somedayKey, {
      ...normalized(someday),
      pagination: {
        data: [someday],
        page: 1,
        pageSize: 10,
        count: 1,
        offset: 0,
      },
    });

    act(() =>
      context.hook.result.current.mutations.convertToCalendar({
        event: {
          _id: "someday",
          startDate: "2026-07-03T16:00:00.000Z",
          endDate: "2026-07-03T17:00:00.000Z",
        },
      }),
    );

    await waitFor(() => {
      expect(context.hook.result.current.hasPending).toBe(true);
    });
    context.pending.resolve();
    await waitFor(() => {
      expect(context.hook.result.current.hasPending).toBe(false);
    });
  });

  test("counts an in-flight reorderSomeday toward the pending sync state", async () => {
    const context = setup();
    const first = event({ _id: "first", isSomeday: true, order: 0 });
    const second = event({ _id: "second", isSomeday: true, order: 1 });
    context.queryClient.setQueryData(somedayKey, {
      ...normalized(first, second),
      pagination: {
        data: [first, second],
        page: 1,
        pageSize: 10,
        count: 2,
        offset: 0,
      },
    });

    act(() =>
      context.hook.result.current.mutations.reorderSomeday([
        { _id: "first", order: 1 },
        { _id: "second", order: 0 },
      ]),
    );

    await waitFor(() => {
      expect(context.calls).toEqual([
        {
          method: "reorder",
          value: [
            { _id: "first", order: 1 },
            { _id: "second", order: 0 },
          ],
        },
      ]);
    });
    expect(context.hook.result.current.hasPending).toBe(true);
    context.pending.resolve();
    await waitFor(() => {
      expect(context.hook.result.current.hasPending).toBe(false);
    });
  });

  test("converts the source-scoped event, never a cross-source cache entry", async () => {
    const context = setup();
    const remoteCalendarKey = eventQueryKeys.list({
      source: "remote",
      scope: "week",
      params: {
        startDate: "2026-07-01T00:00:00.000Z",
        endDate: "2026-07-08T00:00:00.000Z",
        someday: false,
      },
    });
    // Same id in both sources with divergent fields; the active source is local.
    context.queryClient.setQueryData(
      calendarKey,
      normalized(event({ title: "Local" })),
    );
    context.queryClient.setQueryData(
      remoteCalendarKey,
      normalized(event({ title: "Remote" })),
    );

    act(() =>
      context.hook.result.current.mutations.convertToSomeday({
        event: { _id: "event-1" },
      }),
    );

    await waitFor(() => {
      const editCall = context.calls.find(({ method }) => method === "edit");
      expect(editCall).toBeDefined();
      expect((editCall?.value as { event: Schema_Event }).event.title).toBe(
        "Local",
      );
    });
    context.pending.resolve();
  });

  test("persists the payload captured at mutate time despite later cache changes", async () => {
    const context = setup();
    const someday = event({
      _id: "someday",
      isSomeday: true,
      title: "Original",
    });
    context.queryClient.setQueryData(calendarKey, normalized());
    context.queryClient.setQueryData(somedayKey, {
      ...normalized(someday),
      pagination: {
        data: [someday],
        page: 1,
        pageSize: 10,
        count: 1,
        offset: 0,
      },
    });

    act(() =>
      context.hook.result.current.mutations.convertToCalendar({
        event: {
          _id: "someday",
          startDate: "2026-07-03T16:00:00.000Z",
          endDate: "2026-07-03T17:00:00.000Z",
        },
      }),
    );

    // Simulate an SSE/refetch landing between mutate and settle.
    act(() =>
      context.queryClient.setQueryData(somedayKey, {
        ...normalized(
          event({ _id: "someday", isSomeday: true, title: "Changed" }),
        ),
        pagination: {
          data: [],
          page: 1,
          pageSize: 10,
          count: 1,
          offset: 0,
        },
      }),
    );

    await waitFor(() => {
      const editCall = context.calls.find(({ method }) => method === "edit");
      expect(editCall).toBeDefined();
      // The persisted value is the one snapshotted at mutate time, not the
      // post-mutate cache value.
      expect((editCall?.value as { event: Schema_Event }).event.title).toBe(
        "Original",
      );
    });
    context.pending.resolve();
  });

  test("reorders Someday events optimistically", async () => {
    const context = setup();
    const first = event({ _id: "first", isSomeday: true, order: 0 });
    const second = event({ _id: "second", isSomeday: true, order: 1 });
    context.queryClient.setQueryData(somedayKey, {
      ...normalized(first, second),
      pagination: {
        data: [first, second],
        page: 1,
        pageSize: 10,
        count: 2,
        offset: 0,
      },
    });
    const order: Payload_Order[] = [
      { _id: "first", order: 1 },
      { _id: "second", order: 0 },
    ];

    act(() => context.hook.result.current.mutations.reorderSomeday(order));

    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<SomedayEventQueryData>(somedayKey)
          ?.ids,
      ).toEqual(["second", "first"]);
      expect(context.calls).toEqual([{ method: "reorder", value: order }]);
    });
    context.pending.resolve();
  });
});
