import dayjs from "dayjs";
import { faker } from "@faker-js/faker";
import { renderHook, waitFor } from "@testing-library/react";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import * as useTodayEventsHook from "@web/views/Day/hooks/events/useTodayEvents";
import { useUpcomingEvent } from "./useUpcomingEvent";

describe("useUpcomingEvent", () => {
  it("identifies the next upcoming event and relative start time", async () => {
    const pastStartDate = faker.date.past({ refDate: new Date() });
    const futureStartDate = faker.date.future({ refDate: new Date() });

    const pastEvent = createMockStandaloneEvent({
      title: "Past Event",
      startDate: pastStartDate.toISOString(),
    });

    const futureEvent = createMockStandaloneEvent({
      title: "Future Event",
      startDate: futureStartDate.toISOString(),
    });

    const events: useTodayEventsHook.TodayEvent[] = [
      pastEvent,
      futureEvent,
    ].map((e) => ({
      id: e._id,
      title: e.title ?? "",
      startTime: new Date(e.startDate!),
      endTime: new Date(e.endDate!),
      isAllDay: e.isAllDay ?? false,
    }));

    const useTodayEventsSpy = jest.spyOn(useTodayEventsHook, "useTodayEvents");

    useTodayEventsSpy.mockImplementation(() => events);

    const { result, unmount } = renderHook(() => useUpcomingEvent());

    try {
      await waitFor(() =>
        expect(result.current.event?._id).toBe(futureEvent._id),
      );
      await waitFor(() => {
        expect(result.current.starts).toBeDefined();
        expect(result.current.starts?.toLowerCase()).toContain("from now");
      });
    } finally {
      unmount();
      useTodayEventsSpy.mockRestore();
    }
  });

  it("returns undefined when there are no upcoming events", async () => {
    const pastStartDate = faker.date.past({
      refDate: dayjs().subtract(1, "year").toDate(),
    });

    const pastEvent = createMockStandaloneEvent({
      title: "Completed Event",
      startDate: pastStartDate.toISOString(),
    });

    const events: useTodayEventsHook.TodayEvent[] = [pastEvent].map((e) => ({
      id: e._id,
      title: e.title ?? "",
      startTime: new Date(e.startDate!),
      endTime: new Date(e.endDate!),
      isAllDay: e.isAllDay ?? false,
    }));

    const useTodayEventsSpy = jest.spyOn(useTodayEventsHook, "useTodayEvents");

    useTodayEventsSpy.mockImplementation(() => events);

    const { result, unmount } = renderHook(() => useUpcomingEvent());

    try {
      await waitFor(() => {
        expect(result.current.event).toBeUndefined();
        expect(result.current.starts).toBeUndefined();
      });
    } finally {
      unmount();
      useTodayEventsSpy.mockRestore();
    }
  });
});
