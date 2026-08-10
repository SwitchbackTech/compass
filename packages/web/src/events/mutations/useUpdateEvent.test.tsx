import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import { type Event } from "@core/types/event.contracts";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { type GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { editGridEventDraft } from "@web/events/grid-event-draft.adapter";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { type NormalizedEventQueryData } from "@web/events/queries/event.query.types";
import {
  draftActions,
  initialDraftState,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { useUpdateEvent } from "./useUpdateEvent";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const calendarKey = eventQueryKeys.week({
  source: "local",
  start: "2026-07-01T00:00:00.000Z",
  end: "2026-07-08T00:00:00.000Z",
});

const normalized = (...events: Event[]): NormalizedEventQueryData => ({
  ids: events.map(({ id }) => id),
  entities: Object.fromEntries(events.map((item) => [item.id, item])),
});

function toGridEvent(event: Event): GridEvent {
  if (event.schedule.kind !== "timed") {
    throw new Error("expected timed schedule");
  }
  return {
    _id: event.id,
    title: event.content.kind === "details" ? event.content.title : "",
    description:
      event.content.kind === "details" ? event.content.description : "",
    startDate: event.schedule.start,
    endDate: event.schedule.end,
    isAllDay: false,
    origin: event.origin ?? ("compass" as never),
    position: gridEventDefaultPosition,
    user: "user-1",
  };
}

function createWrapper(events: Event[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(calendarKey, normalized(...events));

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return { queryClient, Wrapper };
}

describe("useUpdateEvent", () => {
  beforeEach(() => {
    draftActions.discard();
  });

  it("runs onOptimisticApplied after the optimistic cache write", async () => {
    const existing = createMockEvent({
      content: {
        kind: "details",
        title: "Timed",
        description: "",
      },
      schedule: {
        kind: "timed",
        start: "2026-07-02T16:00:00.000Z" as never,
        end: "2026-07-02T17:00:00.000Z" as never,
        timeZone: "UTC" as never,
      },
    });
    const draft = editGridEventDraft(existing);
    if (!draft) throw new Error("expected edit draft");
    draftActions.startGridDraft({ activity: "gridClick", draft });

    const { queryClient, Wrapper } = createWrapper([existing]);
    const { result } = renderHook(() => useUpdateEvent(), {
      wrapper: Wrapper,
    });

    let startAtCallback: unknown;
    const onOptimisticApplied = mock(() => {
      startAtCallback = (
        queryClient.getQueryData<NormalizedEventQueryData>(calendarKey)
          ?.entities[existing.id].schedule as { start?: string }
      ).start;
      draftActions.discard();
    });

    const moved = toGridEvent(existing);
    moved.startDate = "2026-07-02T18:00:00.000Z";
    moved.endDate = "2026-07-02T19:00:00.000Z";

    expect(useDraftStore.getState().gridDraft).not.toBeNull();

    act(() => {
      result.current({ event: moved }, true, { onOptimisticApplied });
    });

    // Discard must not run synchronously before onMutate's cache write.
    expect(onOptimisticApplied).not.toHaveBeenCalled();
    expect(useDraftStore.getState().gridDraft).not.toBeNull();

    await waitFor(() => {
      expect(onOptimisticApplied).toHaveBeenCalledTimes(1);
    });
    expect(startAtCallback).toBe("2026-07-02T18:00:00Z");
    expect(useDraftStore.getState()).toEqual(initialDraftState);
  });
});
