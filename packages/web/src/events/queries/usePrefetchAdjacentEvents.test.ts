import { waitFor } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const fetchWeekEvents = mock(async () => ({
  ids: ["week-neighbor"],
  entities: {
    "week-neighbor": {
      _id: "week-neighbor",
      title: "Neighbor week event",
      startDate: "2025-11-03T09:00:00",
      endDate: "2025-11-03T10:00:00",
    },
  },
}));

mock.module("@web/events/queries/week.event.query", () => ({
  fetchWeekEvents,
}));

const { renderHook } =
  require("@web/__tests__/__mocks__/mock.render") as typeof import("@web/__tests__/__mocks__/mock.render");
const { createCompassQueryClient } =
  require("@web/common/query/query-client") as typeof import("@web/common/query/query-client");
const { eventQueryKeys } =
  require("@web/events/queries/event.query.keys") as typeof import("@web/events/queries/event.query.keys");
const { weekEventsQueryOptions } =
  require("@web/events/queries/event.query.options") as typeof import("@web/events/queries/event.query.options");
const { usePrefetchAdjacentEvents } =
  require("@web/events/queries/usePrefetchAdjacentEvents") as typeof import("@web/events/queries/usePrefetchAdjacentEvents");

const currentStart = dayjs.utc("2025-11-10T00:00:00Z");
const previousStart = currentStart.subtract(7, "day");
const nextStart = currentStart.add(7, "day");

const previous = {
  startDate: previousStart.format(),
  endDate: previousStart.endOf("week").format(),
};
const next = {
  startDate: nextStart.format(),
  endDate: nextStart.endOf("week").format(),
};

const previousKey = eventQueryKeys.list({
  source: "local",
  scope: "week",
  params: { ...previous, someday: false },
});
const nextKey = eventQueryKeys.list({
  source: "local",
  scope: "week",
  params: { ...next, someday: false },
});
const currentKey = eventQueryKeys.list({
  source: "local",
  scope: "week",
  params: {
    startDate: currentStart.format(),
    endDate: currentStart.endOf("week").format(),
    someday: false,
  },
});

describe("usePrefetchAdjacentEvents", () => {
  beforeEach(() => {
    fetchWeekEvents.mockClear();
  });

  it("populates the cache for the previous and next range under the read hook's own keys", async () => {
    const queryClient = createCompassQueryClient();

    renderHook(
      () => usePrefetchAdjacentEvents(weekEventsQueryOptions, previous, next),
      { queryClient },
    );

    type CachedWeekData = { ids: string[]; entities: Record<string, unknown> };
    await waitFor(() => {
      expect(queryClient.getQueryData<CachedWeekData>(previousKey)).toEqual({
        ids: ["week-neighbor"],
        entities: expect.any(Object),
      });
      expect(queryClient.getQueryData<CachedWeekData>(nextKey)).toEqual({
        ids: ["week-neighbor"],
        entities: expect.any(Object),
      });
    });
    expect(queryClient.getQueryData(currentKey)).toBeUndefined();
    expect(fetchWeekEvents.mock.calls.length).toBe(2);
  });

  it("does not refetch an already-cached, fresh adjacent range", async () => {
    const queryClient = createCompassQueryClient();

    const first = renderHook(
      () => usePrefetchAdjacentEvents(weekEventsQueryOptions, previous, next),
      { queryClient },
    );
    await waitFor(() => {
      expect(fetchWeekEvents.mock.calls.length).toBe(2);
    });
    first.unmount();

    renderHook(
      () => usePrefetchAdjacentEvents(weekEventsQueryOptions, previous, next),
      { queryClient },
    );

    // Give the effect a tick to (not) fire additional fetches.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(fetchWeekEvents.mock.calls.length).toBe(2);
  });
});
