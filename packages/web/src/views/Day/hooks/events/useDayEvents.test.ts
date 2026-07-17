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
const { dayEventQueryRange, useDayEvents } =
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
    const { startDate, endDate } = dayEventQueryRange(date);
    const match = queryClient
      .getQueriesData({ queryKey: eventQueryKeys.scope("day") })
      .find(([key]) => {
        const metadata = key[2] as { start?: string; end?: string } | undefined;
        return metadata?.start === startDate && metadata?.end === endDate;
      });
    return match?.[1];
  };

  // Regression: the bounds must be the real local-midnight instants. They
  // were previously relabeled as UTC via .utc(true), which shifted the whole
  // window earlier by the local offset (6h in MDT) and dropped evening events
  // from the day view and the Up Next card. Pins an explicit offset zone so
  // the assertion holds regardless of the machine's timezone.
  it("keeps the local offset so evening events stay inside the day window", () => {
    const date = dayjs.tz("2026-07-16 12:00", "America/Denver");
    const { startDate, endDate } = dayEventQueryRange(date);

    const eveningEvent = dayjs.tz("2026-07-16 21:00", "America/Denver");
    expect(eveningEvent.valueOf()).toBeGreaterThanOrEqual(
      Date.parse(startDate),
    );
    expect(eveningEvent.valueOf()).toBeLessThan(Date.parse(endDate));
  });

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
