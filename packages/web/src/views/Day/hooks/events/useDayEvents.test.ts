import { type QueryClient } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const fetchDayEvents = mock(async () => ({
  ids: ["event-1"],
  entities: {
    "event-1": {
      _id: "event-1",
      title: "Focus",
      startDate: "2025-11-11T09:00:00",
      endDate: "2025-11-11T10:00:00",
    },
  },
}));

mock.module("@web/events/queries/day.event.query", () => ({
  fetchDayEvents,
}));

const { renderHook } =
  require("@web/__tests__/__mocks__/mock.render") as typeof import("@web/__tests__/__mocks__/mock.render");
const { createCompassQueryClient } =
  require("@web/api/query-client") as typeof import("@web/api/query-client");
const { useDayEvents } =
  require("@web/views/Day/hooks/events/useDayEvents") as typeof import("@web/views/Day/hooks/events/useDayEvents");

describe("useDayEvents", () => {
  beforeEach(() => {
    fetchDayEvents.mockClear();
  });

  // Source-agnostic: the active repository source can be "local" or "remote"
  // depending on process-wide auth state, so match cache entries by their
  // date-range metadata (like the read hooks' own keys do) rather than
  // asserting a specific source.
  const findDayEntry = (queryClient: QueryClient, date: dayjs.Dayjs) => {
    const startDate = date.startOf("day").utc(true).format();
    const endDate = date.endOf("day").utc(true).format();
    const match = queryClient
      .getQueriesData({ queryKey: eventQueryKeys.scope("day") })
      .find(([key]) => {
        const metadata = key[2] as
          | { startDate?: string; endDate?: string }
          | undefined;
        return (
          metadata?.startDate === startDate && metadata?.endDate === endDate
        );
      });
    return match?.[1];
  };

  it("fetches day events into the query cache", async () => {
    const queryClient = createCompassQueryClient();
    const date = dayjs.utc("2025-11-11T00:00:00Z");

    renderHook(() => useDayEvents(date), { queryClient });

    await waitFor(() => {
      expect(findDayEntry(queryClient, date)).toEqual(
        expect.objectContaining({ ids: ["event-1"] }),
      );
    });
    // Also prefetches the adjacent days (see usePrefetchAdjacentEvents).
    await waitFor(() => {
      expect(findDayEntry(queryClient, date.subtract(1, "day"))).toEqual(
        expect.objectContaining({ ids: ["event-1"] }),
      );
      expect(findDayEntry(queryClient, date.add(1, "day"))).toEqual(
        expect.objectContaining({ ids: ["event-1"] }),
      );
    });
  });

  it("re-fetches with a new key when the date changes", async () => {
    const queryClient = createCompassQueryClient();
    const initialDate = dayjs.utc("2025-11-11T00:00:00Z");

    const { rerender } = renderHook(({ date }) => useDayEvents(date), {
      initialProps: { date: initialDate },
      queryClient,
    });

    await waitFor(() => {
      expect(findDayEntry(queryClient, initialDate)).toBeDefined();
    });

    const nextDate = initialDate.add(1, "day");
    rerender({ date: nextDate });

    await waitFor(() => {
      expect(findDayEntry(queryClient, nextDate)).toEqual(
        expect.objectContaining({ ids: ["event-1"] }),
      );
    });
  });
});
