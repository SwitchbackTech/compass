import dayjs from "dayjs";
import { faker } from "@faker-js/faker";
import { renderHook, waitFor } from "@testing-library/react";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { useAppSelector } from "@web/store/store.hooks";
import { useDayEvents } from "@web/views/Day/hooks/events/useDayEvents";
import { useRealtimeFocusData } from "./useRealtimeFocusData";

jest.mock("@web/store/store.hooks", () => ({
  useAppSelector: jest.fn(),
  useAppDispatch: jest.fn(() => jest.fn()),
}));

jest.mock("@web/views/Day/hooks/events/useDayEvents", () => ({
  useDayEvents: jest.fn(),
}));

describe("useRealtimeFocusData", () => {
  beforeEach(() => {
    (useDayEvents as jest.Mock).mockImplementation(() => {});
    (useAppSelector as jest.Mock).mockReturnValue([]);
  });

  it("updates the current time from timer ticks", async () => {
    (useAppSelector as jest.Mock).mockReturnValue([]);

    const { result, unmount } = renderHook(() => useRealtimeFocusData());

    try {
      const initial = result.current.now.getTime();
      await waitFor(() =>
        expect(result.current.now.getTime()).toBeGreaterThan(initial),
      );
    } finally {
      unmount();
    }
  });

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

    const reduxEvents = [pastEvent, futureEvent];

    (useAppSelector as jest.Mock).mockReturnValue(reduxEvents);

    const { result, unmount } = renderHook(() => useRealtimeFocusData());

    try {
      await waitFor(() =>
        expect(result.current.nextEvent?._id).toBe(futureEvent._id),
      );
      await waitFor(() => {
        expect(result.current.nextEventStarts).toBeDefined();
        expect(result.current.nextEventStarts?.toLowerCase()).toContain(
          "from now",
        );
      });
    } finally {
      unmount();
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

    const reduxEvents = [pastEvent];

    (useAppSelector as jest.Mock).mockReturnValue(reduxEvents);

    const { result, unmount } = renderHook(() => useRealtimeFocusData());

    try {
      await waitFor(() => {
        expect(result.current.nextEvent).toBeUndefined();
        expect(result.current.nextEventStarts).toBeUndefined();
      });
    } finally {
      unmount();
    }
  });
});
