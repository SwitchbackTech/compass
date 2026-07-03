import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren } from "react";
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
import { usePendingEventIds } from "./useEventPending";

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

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

const setup = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const pending = deferred<void>();
  const calls: Array<{ method: string; value: unknown }> = [];
  const repository: EventRepository = {
    create: async (value) => {
      calls.push({ method: "create", value });
      await pending.promise;
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
      await pending.promise;
    },
    delete: async (_id, applyTo) => {
      calls.push({ method: "delete", value: { _id, applyTo } });
      await pending.promise;
    },
    reorder: async (value) => {
      calls.push({ method: "reorder", value });
      await pending.promise;
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
      pendingIds: usePendingEventIds(),
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
      expect(context.hook.result.current.pendingIds).toEqual(["created"]);
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
      expect(context.hook.result.current.pendingIds).toEqual([]);
      expect(context.markedWrites).toEqual(["marked"]);
      expect(
        context.queryClient.getQueryState(calendarKey)?.isInvalidated,
      ).toBe(true);
    });
  });

  test("restores the complete snapshot when an edit fails", async () => {
    const context = setup();
    const original = normalized(event());
    context.queryClient.setQueryData(calendarKey, original);

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
      expect(context.queryClient.getQueryData(calendarKey)).toEqual(original);
      expect(context.errors[0]?.message).toBe("write failed");
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
