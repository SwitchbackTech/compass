import { waitFor } from "@testing-library/react";
import { type EventId } from "@core/types/domain-primitives";
import dayjs from "@core/util/date/dayjs";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { toUTCOffset } from "@web/common/utils/datetime/web.date.util";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { normalizeEventList } from "@web/events/queries/event.query.normalize";
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
  require("@web/api/query-client") as typeof import("@web/api/query-client");
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
      expect(result.result.current.data?.ids).toEqual([
        "week-1",
      ] as unknown as EventId[]);
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
      expect(second.result.current.data?.ids).toEqual([
        "week-1",
      ] as unknown as EventId[]);
    });
    expect(fetchWeekEvents.mock.calls.length).toBe(callsAfterFirst);
  });

  it("returns query error when the fetch rejects", async () => {
    fetchWeekEvents.mockImplementationOnce(async () => {
      throw new Error("boom");
    });
    const queryClient = createCompassQueryClient();

    const result = renderHook(
      () => useWeekEventsQuery({ ...range(), reportError: () => {} }),
      { queryClient },
    );

    await waitFor(() => {
      expect(result.result.current.error?.message).toBe("boom");
    });
  });

  it("serves overlapping placeholder data from cache while fetching a shifted range", async () => {
    const queryClient = createCompassQueryClient();
    const start = dayjs.utc("2025-11-10T00:00:00Z");
    const end = start.add(6, "day").endOf("day");
    const event = createMockEvent({
      schedule: {
        kind: "timed",
        start: "2025-11-11T09:00:00",
        end: "2025-11-11T10:00:00",
        timeZone: "UTC",
      },
    });
    queryClient.setQueryData(
      eventQueryKeys.week({
        source: "local",
        start: toUTCOffset(start),
        end: toUTCOffset(end),
      }),
      normalizeEventList([event]),
    );

    const shiftedStart = start.add(1, "day");
    const shiftedEnd = shiftedStart.add(6, "day").endOf("day");

    const result = renderHook(
      () =>
        useWeekEventsQuery({
          startOfView: shiftedStart,
          endOfView: shiftedEnd,
        }),
      { queryClient },
    );

    expect(result.result.current.data?.ids).toEqual([event.id]);
    expect(result.result.current.isPlaceholderData).toBe(true);
  });
});
