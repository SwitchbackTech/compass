import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { act, type PropsWithChildren } from "react";
import { Priorities } from "@core/constants/core.constants";
import { type EventId } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import {
  type CreateEventInput,
  type ReplaceEventInput,
} from "@core/types/event-command.contracts";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { type NormalizedEventQueryData } from "@web/events/queries/event.query.types";
import { type EventRepository } from "@web/events/repositories/event.repository.types";
import {
  runHistoryRestore,
  useUndoHistoryStore,
} from "@web/events/stores/undo.store";
import { useEventMutations } from "./useEventMutations";
import { useHasPendingEventMutations } from "./useEventPending";

const calendarKey = eventQueryKeys.week({
  source: "local",
  start: "2026-07-01T00:00:00.000Z",
  end: "2026-07-08T00:00:00.000Z",
});

const dayKey = eventQueryKeys.day({
  source: "local",
  start: "2026-07-02T00:00:00.000Z",
  end: "2026-07-03T00:00:00.000Z",
});

const timedSchedule = (start: string, end: string) => ({
  kind: "timed" as const,
  start: start as never,
  end: end as never,
  timeZone: "UTC" as never,
});

const event = (overrides: Partial<Event> = {}): Event =>
  createMockEvent({
    content: { kind: "details", title: "Original", description: "" },
    schedule: timedSchedule(
      "2026-07-02T16:00:00.000Z",
      "2026-07-02T17:00:00.000Z",
    ),
    ...overrides,
  });

const occurrence = (seriesId: EventId, overrides: Partial<Event> = {}): Event =>
  event({ recurrence: { kind: "occurrence", seriesId }, ...overrides });

const normalized = (...events: Event[]): NormalizedEventQueryData => ({
  ids: events.map(({ id }) => id),
  entities: Object.fromEntries(events.map((item) => [item.id, item])),
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
    list: async () => [],
    getById: async () => {
      throw new Error("not implemented in test fake");
    },
    create: async (input: CreateEventInput) => {
      calls.push({ method: "create", value: input });
      await pending.wait();
      return event({ id: (input.id ?? event().id) as EventId });
    },
    replace: async (id: EventId, input: ReplaceEventInput) => {
      calls.push({ method: "replace", value: { id, input } });
      await pending.wait();
      return event({ id });
    },
    delete: async (id: EventId, scope) => {
      calls.push({ method: "delete", value: { id, scope } });
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

const replacePayload = (
  id: EventId,
  overrides: Partial<ReplaceEventInput> = {},
) => ({
  id,
  input: {
    content: { kind: "details" as const, title: "Original", description: "" },
    schedule: timedSchedule(
      "2026-07-02T16:00:00.000Z",
      "2026-07-02T17:00:00.000Z",
    ),
    recurrence: { kind: "preserve" as const },
    priority: Priorities.UNASSIGNED,
    scope: "this" as const,
    ...overrides,
  },
});

describe("useEventMutations", () => {
  test("optimistically patches recurring instances across day and week caches", async () => {
    const context = setup();
    const seriesId = event().id;
    const first = occurrence(seriesId, {
      schedule: timedSchedule(
        "2026-07-02T16:00:00.000Z",
        "2026-07-02T17:00:00.000Z",
      ),
    });
    const second = occurrence(seriesId, {
      schedule: timedSchedule(
        "2026-07-03T16:00:00.000Z",
        "2026-07-03T17:00:00.000Z",
      ),
    });
    context.queryClient.setQueryData(calendarKey, normalized(first, second));
    context.queryClient.setQueryData(dayKey, normalized(first));

    act(() =>
      context.hook.result.current.mutations.replace(
        replacePayload(first.id, {
          content: {
            kind: "details",
            title: "Updated series",
            description: "",
          },
          schedule: first.schedule as ReplaceEventInput["schedule"],
          scope: "all",
        }),
      ),
    );

    await waitFor(() => {
      const week =
        context.queryClient.getQueryData<NormalizedEventQueryData>(
          calendarKey,
        )!;
      const day =
        context.queryClient.getQueryData<NormalizedEventQueryData>(dayKey)!;
      expect(week.entities[first.id].content).toMatchObject({
        title: "Updated series",
      });
      expect(week.entities[second.id].content).toMatchObject({
        title: "Updated series",
      });
      expect(day.entities[first.id].content).toMatchObject({
        title: "Updated series",
      });
    });

    context.pending.resolve();
  });

  test("optimistically moves only this-and-following instances", async () => {
    const context = setup();
    const seriesId = event().id;
    const instances = [1, 2, 3].map((day) =>
      occurrence(seriesId, {
        schedule: timedSchedule(
          `2026-07-0${day}T16:00:00.000Z`,
          `2026-07-0${day}T17:00:00.000Z`,
        ),
      }),
    );
    context.queryClient.setQueryData(calendarKey, normalized(...instances));

    act(() =>
      context.hook.result.current.mutations.replace(
        replacePayload(instances[1].id, {
          schedule: timedSchedule(
            "2026-07-02T18:00:00.000Z",
            "2026-07-02T19:00:00.000Z",
          ),
          scope: "thisAndFollowing",
        }),
      ),
    );

    await waitFor(() => {
      const cached =
        context.queryClient.getQueryData<NormalizedEventQueryData>(
          calendarKey,
        )!;
      const scheduleOf = (id: EventId) => {
        const schedule = cached.entities[id].schedule;
        return schedule.kind === "timed" ? schedule.start : null;
      };
      expect(scheduleOf(instances[0].id)).toBe("2026-07-01T16:00:00.000Z");
      expect(scheduleOf(instances[1].id)).toBe("2026-07-02T18:00:00+00:00");
      expect(scheduleOf(instances[2].id)).toBe("2026-07-03T18:00:00+00:00");
    });

    context.pending.resolve();
  });

  test("serializes series edits submitted through different instances", async () => {
    const context = setup();
    const seriesId = event().id;
    const first = occurrence(seriesId);
    const second = occurrence(seriesId, {
      schedule: timedSchedule(
        "2026-07-03T16:00:00.000Z",
        "2026-07-03T17:00:00.000Z",
      ),
    });
    context.queryClient.setQueryData(calendarKey, normalized(first, second));

    act(() =>
      context.hook.result.current.mutations.replace(
        replacePayload(first.id, {
          content: { kind: "details", title: "First edit", description: "" },
          scope: "all",
        }),
      ),
    );
    await waitFor(() =>
      expect(
        context.calls.filter(({ method }) => method === "replace"),
      ).toHaveLength(1),
    );

    act(() =>
      context.hook.result.current.mutations.replace(
        replacePayload(second.id, {
          content: { kind: "details", title: "Second edit", description: "" },
          scope: "all",
        }),
      ),
    );
    expect(
      context.calls.filter(({ method }) => method === "replace"),
    ).toHaveLength(1);

    act(() => context.pending.resolveNext());
    await waitFor(() =>
      expect(
        context.calls.filter(({ method }) => method === "replace"),
      ).toHaveLength(2),
    );
    context.pending.resolve();
  });

  test("creates optimistically, exposes pending state, and invalidates on success", async () => {
    const context = setup();
    context.queryClient.setQueryData(calendarKey, normalized());
    const created = event({
      content: { kind: "details", title: "Created", description: "" },
    });

    act(() =>
      context.hook.result.current.mutations.create({
        id: created.id,
        calendarId: created.calendarId,
        content: created.content as {
          kind: "details";
          title: string;
          description: string;
        },
        schedule: created.schedule as never,
        recurrence: { kind: "single" },
        priority: created.priority,
      }),
    );

    await waitFor(() => {
      expect(context.hook.result.current.hasPending).toBe(true);
      expect(
        context.queryClient.getQueryData<NormalizedEventQueryData>(calendarKey)
          ?.entities[created.id],
      ).toBeDefined();
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

  test("reports the error and invalidates instead of rolling back when a replace fails", async () => {
    const context = setup();
    const original = event();
    context.queryClient.setQueryData(calendarKey, normalized(original));

    act(() =>
      context.hook.result.current.mutations.replace(
        replacePayload(original.id, {
          content: { kind: "details", title: "Changed", description: "" },
        }),
      ),
    );

    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<NormalizedEventQueryData>(calendarKey)
          ?.entities[original.id].content,
      ).toMatchObject({ title: "Changed" });
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
      context.queryClient.getQueryData<NormalizedEventQueryData>(calendarKey)
        ?.entities[original.id].content,
    ).toMatchObject({ title: "Changed" });
  });

  test("keeps a newer edit's optimistic value when an older edit for the same event fails", async () => {
    const context = setup();
    const original = event();
    context.queryClient.setQueryData(calendarKey, normalized(original));
    const editEvent = (title: string) =>
      context.hook.result.current.mutations.replace(
        replacePayload(original.id, {
          content: { kind: "details", title, description: "" },
        }),
      );

    act(() => editEvent("First"));
    await waitFor(() => {
      expect(
        context.calls.filter(({ method }) => method === "replace"),
      ).toHaveLength(1);
    });
    act(() => editEvent("Second"));
    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<NormalizedEventQueryData>(calendarKey)
          ?.entities[original.id].content,
      ).toMatchObject({ title: "Second" });
    });

    act(() => context.pending.rejectNext(new Error("first edit failed")));

    await waitFor(() => {
      expect(context.errors[0]?.message).toBe("first edit failed");
    });
    // The newer edit's optimistic value survives the older edit's failure,
    // and no refetch fires while the newer mutation is still in flight.
    expect(
      context.queryClient.getQueryData<NormalizedEventQueryData>(calendarKey)
        ?.entities[original.id].content,
    ).toMatchObject({ title: "Second" });
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

  test("serializes rapid edits to the same event so writes never overlap", async () => {
    const context = setup();
    const original = event();
    context.queryClient.setQueryData(calendarKey, normalized(original));
    const editEvent = (title: string) =>
      context.hook.result.current.mutations.replace(
        replacePayload(original.id, {
          content: { kind: "details", title, description: "" },
        }),
      );

    act(() => editEvent("First"));
    await waitFor(() => {
      expect(
        context.calls.filter(({ method }) => method === "replace"),
      ).toHaveLength(1);
    });
    act(() => editEvent("Second"));

    // The optimistic update lands immediately, but the second repository
    // write must wait for the first to settle: overlapping PUTs on one
    // document surface as backend write-conflict 500s.
    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<NormalizedEventQueryData>(calendarKey)
          ?.entities[original.id].content,
      ).toMatchObject({ title: "Second" });
    });
    expect(
      context.calls.filter(({ method }) => method === "replace"),
    ).toHaveLength(1);

    act(() => context.pending.resolveNext());

    await waitFor(() => {
      expect(
        context.calls.filter(({ method }) => method === "replace"),
      ).toHaveLength(2);
    });
    const lastEdit = context.calls.filter(
      ({ method }) => method === "replace",
    )[1];
    expect(
      (lastEdit.value as { input: ReplaceEventInput }).input.content,
    ).toMatchObject({ title: "Second" });
    context.pending.resolve();
  });

  test("coalesces a burst of edits to one event into a single write of the final state", async () => {
    const context = setup();
    const original = event();
    context.queryClient.setQueryData(calendarKey, normalized(original));
    const editEvent = (title: string) =>
      context.hook.result.current.mutations.replace(
        replacePayload(original.id, {
          content: { kind: "details", title, description: "" },
        }),
      );

    // A held-key nudge (or drag) fires many edits before any write lands. Each
    // earlier edit sees a newer edit already queued and skips its network write,
    // so only the final position is actually persisted — no per-keystroke PUT,
    // no trailing "replay" as the serialized queue drains after the user stops.
    act(() => {
      editEvent("First");
      editEvent("Second");
      editEvent("Third");
    });

    // Optimistic UI still reflects every step, ending on the final title.
    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<NormalizedEventQueryData>(calendarKey)
          ?.entities[original.id].content,
      ).toMatchObject({ title: "Third" });
    });

    // Exactly one repository write, carrying the final state.
    await waitFor(() => {
      expect(
        context.calls.filter(({ method }) => method === "replace"),
      ).toHaveLength(1);
    });
    const edits = context.calls.filter(({ method }) => method === "replace");
    expect(
      (edits[0].value as { input: ReplaceEventInput }).input.content,
    ).toMatchObject({ title: "Third" });

    context.pending.resolve();

    // Every edit still marks a write (anon-change tracking) even though two
    // skipped the network.
    await waitFor(() => {
      expect(context.markedWrites).toHaveLength(3);
      expect(context.hook.result.current.hasPending).toBe(false);
    });
    expect(
      context.calls.filter(({ method }) => method === "replace"),
    ).toHaveLength(1);
  });

  test("a failed edit leaves a concurrent edit to another event untouched", async () => {
    const context = setup();
    const doomed = event();
    const other = event({
      content: { kind: "details", title: "Other", description: "" },
    });
    context.queryClient.setQueryData(calendarKey, normalized(doomed, other));

    act(() =>
      context.hook.result.current.mutations.replace(
        replacePayload(doomed.id, {
          content: { kind: "details", title: "Doomed", description: "" },
        }),
      ),
    );
    await waitFor(() => {
      expect(
        context.calls.filter(({ method }) => method === "replace"),
      ).toHaveLength(1);
    });
    act(() =>
      context.hook.result.current.mutations.replace(
        replacePayload(other.id, {
          content: { kind: "details", title: "Survivor", description: "" },
        }),
      ),
    );
    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<NormalizedEventQueryData>(calendarKey)
          ?.entities[other.id].content,
      ).toMatchObject({ title: "Survivor" });
    });

    act(() => context.pending.rejectNext(new Error("doomed edit failed")));

    await waitFor(() => {
      expect(context.errors[0]?.message).toBe("doomed edit failed");
    });
    expect(
      context.queryClient.getQueryData<NormalizedEventQueryData>(calendarKey)
        ?.entities[other.id].content,
    ).toMatchObject({ title: "Survivor" });

    act(() => context.pending.resolveNext());
    await waitFor(() => {
      expect(context.hook.result.current.hasPending).toBe(false);
    });
  });

  test("removes calendar events optimistically", async () => {
    const context = setup();
    const calendarEvent = event();
    context.queryClient.setQueryData(calendarKey, normalized(calendarEvent));

    act(() =>
      context.hook.result.current.mutations.delete({
        id: calendarEvent.id,
        scope: "this",
      }),
    );

    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<NormalizedEventQueryData>(calendarKey)
          ?.ids,
      ).toEqual([]);
    });
    context.pending.resolve();
  });

  test("defers deletion until the in-flight create persists, then deletes server-side", async () => {
    const context = setup();
    context.queryClient.setQueryData(calendarKey, normalized());
    const created = event({
      content: { kind: "details", title: "Created", description: "" },
    });

    act(() =>
      context.hook.result.current.mutations.create({
        id: created.id,
        calendarId: created.calendarId,
        content: created.content as {
          kind: "details";
          title: string;
          description: string;
        },
        schedule: created.schedule as never,
        recurrence: { kind: "single" },
        priority: created.priority,
      }),
    );
    await waitFor(() => {
      expect(context.hook.result.current.hasPending).toBe(true);
    });

    act(() =>
      context.hook.result.current.mutations.delete({
        id: created.id,
        scope: "this",
      }),
    );

    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<NormalizedEventQueryData>(calendarKey)
          ?.ids,
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
    const created = event();

    act(() =>
      context.hook.result.current.mutations.create({
        id: created.id,
        calendarId: created.calendarId,
        content: created.content as {
          kind: "details";
          title: string;
          description: string;
        },
        schedule: created.schedule as never,
        recurrence: { kind: "single" },
        priority: created.priority,
      }),
    );
    await waitFor(() => {
      expect(context.hook.result.current.hasPending).toBe(true);
    });
    act(() =>
      context.hook.result.current.mutations.delete({
        id: created.id,
        scope: "this",
      }),
    );

    context.pending.reject(new Error("create failed"));

    await waitFor(() => {
      expect(context.errors[0]?.message).toBe("create failed");
      expect(context.hook.result.current.hasPending).toBe(false);
    });
    // The event never existed server-side, so there is nothing to delete.
    expect(context.calls.some(({ method }) => method === "delete")).toBe(false);
  });

  test("defers a replace until the in-flight create persists", async () => {
    const context = setup();
    context.queryClient.setQueryData(calendarKey, normalized());
    const created = event();

    act(() =>
      context.hook.result.current.mutations.create({
        id: created.id,
        calendarId: created.calendarId,
        content: created.content as {
          kind: "details";
          title: string;
          description: string;
        },
        schedule: created.schedule as never,
        recurrence: { kind: "single" },
        priority: created.priority,
      }),
    );
    await waitFor(() => {
      expect(context.calls.some(({ method }) => method === "create")).toBe(
        true,
      );
    });

    act(() =>
      context.hook.result.current.mutations.replace(
        replacePayload(created.id, {
          content: { kind: "details", title: "Edited", description: "" },
        }),
      ),
    );

    // The replace's repository write must wait for the create to persist; an
    // early write would target an id the backend does not know yet.
    expect(context.calls.some(({ method }) => method === "replace")).toBe(
      false,
    );

    context.pending.resolve();

    await waitFor(() => {
      expect(context.calls.some(({ method }) => method === "replace")).toBe(
        true,
      );
    });
  });

  test("does not persist deletion for an event absent from cache", async () => {
    const context = setup();
    context.queryClient.setQueryData(calendarKey, normalized());
    const ghostId = event().id;

    act(() =>
      context.hook.result.current.mutations.delete({
        id: ghostId,
        scope: "this",
      }),
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
    // The event is already known to the cache from an unrelated read (e.g.
    // an earlier day view), just not a member of the week range yet — the
    // ReplaceEventInput itself carries no calendarId (replace can't move
    // calendars), so the optimistic merge needs a cached original to build
    // a full `Event` from.
    const movedIn = event();
    context.queryClient.setQueryData(dayKey, normalized(movedIn));

    act(() =>
      context.hook.result.current.mutations.replace(
        replacePayload(movedIn.id, {
          content: { kind: "details", title: "Moved In", description: "" },
          schedule: timedSchedule(
            "2026-07-04T16:00:00.000Z",
            "2026-07-04T17:00:00.000Z",
          ),
        }),
      ),
    );

    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<NormalizedEventQueryData>(calendarKey)
          ?.entities[movedIn.id]?.content,
      ).toMatchObject({ title: "Moved In" });
    });
    context.pending.resolve();
  });

  test("removes an edited event from a range it no longer belongs to", async () => {
    const context = setup();
    const original = event();
    context.queryClient.setQueryData(calendarKey, normalized(original));

    act(() =>
      context.hook.result.current.mutations.replace(
        replacePayload(original.id, {
          // Push the event well outside the cached 2026-07-01..08 week.
          schedule: timedSchedule(
            "2026-09-01T16:00:00.000Z",
            "2026-09-01T17:00:00.000Z",
          ),
        }),
      ),
    );

    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<NormalizedEventQueryData>(calendarKey)
          ?.ids,
      ).toEqual([]);
    });
    context.pending.resolve();
  });
});

describe("undo history recording", () => {
  test("records an edit with before/after snapshots", () => {
    const context = setup();
    const original = event();
    context.queryClient.setQueryData(calendarKey, normalized(original));

    act(() =>
      context.hook.result.current.mutations.replace(
        replacePayload(original.id, {
          content: { kind: "details", title: "Moved", description: "" },
        }),
      ),
    );

    const { past } = useUndoHistoryStore.getState();
    expect(past).toHaveLength(1);
    expect(past[0]).toMatchObject({
      kind: "edit",
      id: original.id,
      before: { content: { title: "Original" } },
      after: { content: { title: "Moved" } },
    });
    context.pending.resolve();
  });

  test("skips series-scope edits and edits missing from cache", () => {
    const context = setup();
    const original = event();
    context.queryClient.setQueryData(calendarKey, normalized(original));

    act(() =>
      context.hook.result.current.mutations.replace(
        replacePayload(original.id, { scope: "all" }),
      ),
    );
    act(() =>
      context.hook.result.current.mutations.replace(replacePayload(event().id)),
    );

    expect(useUndoHistoryStore.getState().past).toHaveLength(0);
    context.pending.resolve();
  });

  test("skips recurring edits even at this-event scope", () => {
    const context = setup();
    const seriesId = event().id;
    const instance = occurrence(seriesId);
    context.queryClient.setQueryData(
      calendarKey,
      normalized(instance, event()),
    );

    act(() =>
      context.hook.result.current.mutations.replace(
        replacePayload(instance.id, {
          content: { kind: "details", title: "Moved", description: "" },
        }),
      ),
    );
    expect(useUndoHistoryStore.getState().past).toHaveLength(0);
    context.pending.resolve();
  });

  test("records delete snapshots but skips recurring deletes", () => {
    const context = setup();
    const seriesId = event().id;
    const recurring = occurrence(seriesId);
    const standalone = event();
    context.queryClient.setQueryData(
      calendarKey,
      normalized(standalone, recurring),
    );

    act(() =>
      context.hook.result.current.mutations.delete({
        id: recurring.id,
        scope: "this",
      }),
    );
    expect(useUndoHistoryStore.getState().past).toHaveLength(0);

    act(() =>
      context.hook.result.current.mutations.delete({
        id: standalone.id,
        scope: "this",
      }),
    );
    expect(useUndoHistoryStore.getState().past).toEqual([
      { kind: "delete", event: standalone },
    ]);
    context.pending.resolve();
  });

  test("does not record replays run inside runHistoryRestore", () => {
    const context = setup();
    const original = event();
    context.queryClient.setQueryData(calendarKey, normalized(original));

    runHistoryRestore(() => {
      act(() =>
        context.hook.result.current.mutations.replace(
          replacePayload(original.id, {
            content: { kind: "details", title: "Replayed", description: "" },
          }),
        ),
      );
      act(() =>
        context.hook.result.current.mutations.delete({
          id: original.id,
          scope: "this",
        }),
      );
    });

    expect(useUndoHistoryStore.getState().past).toHaveLength(0);
    context.pending.resolve();
  });

  test("defers an undo-restore create until the in-flight delete persists", async () => {
    const context = setup();
    const original = event();
    context.queryClient.setQueryData(calendarKey, normalized(original));

    act(() =>
      context.hook.result.current.mutations.delete({
        id: original.id,
        scope: "this",
      }),
    );
    await waitFor(() => {
      expect(context.calls.some(({ method }) => method === "delete")).toBe(
        true,
      );
    });

    act(() =>
      context.hook.result.current.mutations.create({
        id: original.id,
        calendarId: original.calendarId,
        content: original.content as {
          kind: "details";
          title: string;
          description: string;
        },
        schedule: original.schedule as never,
        recurrence: { kind: "single" },
        priority: original.priority,
      }),
    );

    // The POST must not race the still-in-flight DELETE, or the restore
    // could land server-side before the delete and be wiped by it.
    expect(context.calls.some(({ method }) => method === "create")).toBe(false);

    act(() => context.pending.resolveNext());
    await waitFor(() => {
      expect(context.calls.some(({ method }) => method === "create")).toBe(
        true,
      );
    });
    context.pending.resolve();
  });

  test("skips the restore create when the delete fails", async () => {
    const context = setup();
    const original = event();
    context.queryClient.setQueryData(calendarKey, normalized(original));

    act(() =>
      context.hook.result.current.mutations.delete({
        id: original.id,
        scope: "this",
      }),
    );
    await waitFor(() => {
      expect(context.calls.some(({ method }) => method === "delete")).toBe(
        true,
      );
    });

    act(() =>
      context.hook.result.current.mutations.create({
        id: original.id,
        calendarId: original.calendarId,
        content: original.content as {
          kind: "details";
          title: string;
          description: string;
        },
        schedule: original.schedule as never,
        recurrence: { kind: "single" },
        priority: original.priority,
      }),
    );
    act(() => context.pending.rejectNext(new Error("delete failed")));

    await waitFor(() => {
      expect(context.errors[0]?.message).toBe("delete failed");
      expect(context.hook.result.current.hasPending).toBe(false);
    });
    // The event still exists server-side, so there is nothing to recreate.
    expect(context.calls.some(({ method }) => method === "create")).toBe(false);
  });
});
