import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { act, type PropsWithChildren } from "react";
import { type EventId } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import {
  type CreateEventInput,
  type ReplaceEventInput,
  type TransitionEventInput,
} from "@core/types/event-command.contracts";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { type NormalizedEventQueryData } from "@web/events/queries/event.query.types";
import { type EventRepository } from "@web/events/repositories/event.repository.types";
import { useUndoHistoryStore } from "@web/events/stores/undo.store";
import { useEventMutations } from "./useEventMutations";
import { useUndoRedo } from "./useUndoRedo";

const calendarKey = eventQueryKeys.week({
  source: "local",
  start: "2026-07-01T00:00:00.000Z",
  end: "2026-07-08T00:00:00.000Z",
});

const somedayKey = eventQueryKeys.someday({
  source: "local",
  period: "week",
  anchorDate: "2026-07-01",
});

const event = (overrides: Partial<Event> = {}): Event =>
  createMockEvent({
    content: { kind: "details", title: "Original", description: "" },
    schedule: {
      kind: "timed",
      start: "2026-07-02T16:00:00.000Z" as never,
      end: "2026-07-02T17:00:00.000Z" as never,
      timeZone: "UTC" as never,
    },
    ...overrides,
  });

const normalized = (...events: Event[]): NormalizedEventQueryData => ({
  ids: events.map(({ id }) => id),
  entities: Object.fromEntries(events.map((item) => [item.id, item])),
});

const setup = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const calls: Array<{ method: string; value: unknown }> = [];
  const repository: EventRepository = {
    list: async () => [],
    getById: async () => {
      throw new Error("not implemented in test fake");
    },
    create: async (input: CreateEventInput) => {
      calls.push({ method: "create", value: input });
      return event({ id: (input.id ?? event().id) as EventId });
    },
    replace: async (id: EventId, input: ReplaceEventInput) => {
      calls.push({ method: "replace", value: { id, input } });
      return event({ id });
    },
    delete: async (id: EventId, scope) => {
      calls.push({ method: "delete", value: { id, scope } });
    },
    reorder: async () => {},
    transition: async (id: EventId, input: TransitionEventInput) => {
      calls.push({ method: "transition", value: { id, input } });
      return event({ id });
    },
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
    const original = event();
    context.queryClient.setQueryData(calendarKey, normalized(original));

    act(() =>
      context.hook.result.current.mutations.replace({
        id: original.id,
        input: {
          content: original.content as {
            kind: "details";
            title: string;
            description: string;
          },
          schedule: {
            kind: "timed",
            start: "2026-07-03T16:00:00.000Z" as never,
            end: "2026-07-03T17:00:00.000Z" as never,
            timeZone: "UTC" as never,
          },
          recurrence: { kind: "preserve" },
          priority: original.priority,
          scope: "this",
        },
      }),
    );
    await waitFor(() => {
      expect(context.hook.result.current.undoRedo.canUndo).toBe(true);
    });

    act(() => context.hook.result.current.undoRedo.undo());

    await waitFor(() => {
      const schedule =
        context.queryClient.getQueryData<NormalizedEventQueryData>(calendarKey)
          ?.entities[original.id].schedule;
      expect(schedule?.kind === "timed" && schedule.start).toBe(
        "2026-07-02T16:00:00.000Z",
      );
    });
    // The replay persisted the before snapshot and did not re-record itself.
    const replayCalls = context.calls.filter(
      ({ method }) => method === "replace",
    );
    expect(replayCalls).toHaveLength(2);
    expect(useUndoHistoryStore.getState().past).toHaveLength(0);
    expect(context.hook.result.current.undoRedo.canRedo).toBe(true);

    act(() => context.hook.result.current.undoRedo.redo());

    await waitFor(() => {
      const schedule =
        context.queryClient.getQueryData<NormalizedEventQueryData>(calendarKey)
          ?.entities[original.id].schedule;
      expect(schedule?.kind === "timed" && schedule.start).toBe(
        "2026-07-03T16:00:00.000Z",
      );
    });
    expect(context.hook.result.current.undoRedo.canUndo).toBe(true);
  });

  test("undoes a delete by recreating the snapshot with its original id", async () => {
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
      expect(
        context.queryClient.getQueryData<NormalizedEventQueryData>(calendarKey)
          ?.ids,
      ).toEqual([]);
    });

    act(() => context.hook.result.current.undoRedo.undo());

    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<NormalizedEventQueryData>(calendarKey)
          ?.entities[original.id],
      ).toBeDefined();
    });
    const createCall = context.calls.find(({ method }) => method === "create");
    expect((createCall?.value as CreateEventInput).id).toBe(original.id);

    act(() => context.hook.result.current.undoRedo.redo());

    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<NormalizedEventQueryData>(calendarKey)
          ?.ids,
      ).toEqual([]);
    });
    expect(
      context.calls.filter(({ method }) => method === "delete"),
    ).toHaveLength(2);
  });

  test("undoes a someday transition by restoring calendar membership", async () => {
    const context = setup();
    const original = event();
    context.queryClient.setQueryData(calendarKey, normalized(original));
    context.queryClient.setQueryData(somedayKey, normalized());

    act(() =>
      context.hook.result.current.mutations.transition({
        id: original.id,
        input: {
          kind: "unschedule",
          schedule: {
            kind: "someday",
            period: "week",
            anchorDate: "2026-07-01" as never,
            sortOrder: 0,
          },
        },
      }),
    );
    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<NormalizedEventQueryData>(somedayKey)
          ?.entities[original.id]?.schedule.kind,
      ).toBe("someday");
    });

    act(() => context.hook.result.current.undoRedo.undo());

    await waitFor(() => {
      expect(
        context.queryClient.getQueryData<NormalizedEventQueryData>(somedayKey)
          ?.ids,
      ).toEqual([]);
      expect(
        context.queryClient.getQueryData<NormalizedEventQueryData>(calendarKey)
          ?.entities[original.id]?.schedule.kind,
      ).toBe("timed");
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
