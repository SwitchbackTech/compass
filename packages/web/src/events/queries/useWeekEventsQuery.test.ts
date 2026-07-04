import { waitFor } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const fetchWeekEvents = mock(async () => ({
  ids: ["week-1"],
  entities: {
    "week-1": {
      _id: "week-1",
      title: "Sprint",
      startDate: "2025-11-10T09:00:00",
      endDate: "2025-11-10T10:00:00",
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
const { useWeekEventsQuery } =
  require("@web/events/queries/useWeekEventsQuery") as typeof import("@web/events/queries/useWeekEventsQuery");

const range = () => {
  const start = dayjs.utc("2025-11-10T00:00:00Z");
  return { startOfView: start, endOfView: start.endOf("week") };
};

describe("useWeekEventsQuery", () => {
  beforeEach(() => {
    fetchWeekEvents.mockClear();
  });

  it("returns fetched week events without syncing Redux", async () => {
    const queryClient = createCompassQueryClient();

    const result = renderHook(() => useWeekEventsQuery(range()), {
      queryClient,
    });

    await waitFor(() => {
      expect(result.result.current.data?.ids).toEqual(["week-1"]);
    });
  });

  it("serves a cached remount from cache without a second fetch", async () => {
    const queryClient = createCompassQueryClient();

    const first = renderHook(() => useWeekEventsQuery(range()), {
      queryClient,
    });
    await waitFor(() => {
      expect(first.result.current.isSuccess).toBe(true);
    });
    first.unmount();
    const callsAfterFirst = fetchWeekEvents.mock.calls.length;

    // Same key within staleTime → cache hit, no network.
    const second = renderHook(() => useWeekEventsQuery(range()), {
      queryClient,
    });
    await waitFor(() => {
      expect(second.result.current.data?.ids).toEqual(["week-1"]);
    });
    expect(fetchWeekEvents.mock.calls.length).toBe(callsAfterFirst);
  });

  it("returns query error when the fetch rejects", async () => {
    fetchWeekEvents.mockImplementationOnce(async () => {
      throw new Error("boom");
    });
    const queryClient = createCompassQueryClient();

    const result = renderHook(() => useWeekEventsQuery(range()), {
      queryClient,
    });

    await waitFor(() => {
      expect(result.result.current.error?.message).toBe("boom");
    });
  });
});
