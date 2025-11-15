import { act } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { Schema_WebEvent } from "@web/common/types/web.event.types";
import { useAppSelector } from "@web/store/store.hooks";
import { useDayEvents } from "@web/views/Day/hooks/events/useDayEvents";
import { useNowData } from "@web/views/Now/hooks/useNowData";

jest.mock("@web/store/store.hooks", () => ({
  useAppSelector: jest.fn(),
  useAppDispatch: jest.fn(() => jest.fn()),
}));

jest.mock("@web/views/Day/hooks/events/useDayEvents", () => ({
  useDayEvents: jest.fn(),
}));

describe("useNowData", () => {
  const start = dayjs().add(1, "minutes");

  const mockEvent: Schema_WebEvent = {
    ...createMockStandaloneEvent({}),
    origin: Origin.COMPASS,
    user: "test-user",
    priority: Priorities.RELATIONS,
    startDate: start.toISOString(),
    endDate: start.add(5, "seconds").toISOString(),
  };

  const pastEvent: Schema_WebEvent = {
    ...mockEvent,
    startDate: start.subtract(2, "minutes").toISOString(),
    endDate: start.subtract(61, "seconds").toISOString(),
  };

  beforeEach(() => {
    (useDayEvents as jest.Mock).mockImplementation(() => {});
    (useAppSelector as jest.Mock).mockReturnValue([]);
  });

  it("initializes with undefined focusedEvent and nextEvent when no events are available", () => {
    (useAppSelector as jest.Mock).mockReturnValue([]);

    const { result } = renderHook(() => useNowData());

    expect(result.current.focusedEvent).toBeNull();
    expect(result.current.nextEvent).toBeUndefined();
    expect(result.current.nextEventStarts).toBeUndefined();
    expect(result.current.countdown).toBeUndefined();
    expect(result.current.timeLeft).toBeUndefined();
  });

  it("sets focusedEvent to nextEvent when no focusedEvent is set and nextEvent exists", async () => {
    const reduxEvents = [pastEvent, mockEvent];

    (useAppSelector as jest.Mock).mockReturnValue(reduxEvents);

    const { result } = renderHook(() => useNowData());

    await waitFor(() => {
      expect(result.current.nextEvent?._id).toBe(mockEvent._id);
      expect(result.current.focusedEvent?._id).toBe(mockEvent._id);
    });
  });

  it("updates now on timer ticks", async () => {
    (useAppSelector as jest.Mock).mockReturnValue([]);

    const { result } = renderHook(() => useNowData());

    const initialNow = result.current.now.getTime();

    await waitFor(
      () => {
        expect(result.current.now.getTime()).toBeGreaterThan(initialNow);
      },
      { timeout: 2000 },
    );
  });

  it("updates countdown and timeLeft when focusedEvent is set and started", async () => {
    (useAppSelector as jest.Mock).mockReturnValue([]);

    const { result } = renderHook(() => useNowData());

    act(() => {
      result.current.setFocusedEvent(mockEvent);
    });

    act(() => {
      result.current.start?.();
    });

    await waitFor(() => {
      expect(result.current.countdown).toBeDefined();
      expect(result.current.timeLeft).toBeDefined();
    });

    // Wait for updates
    await waitFor(
      () => {
        expect(result.current.countdown).toMatch(/^\d{2}:\d{2}:\d{2}$/);
        expect(result.current.timeLeft).toContain("in");
      },
      { timeout: 3000 },
    );
  });

  it("resets countdown and timeLeft when timer ends", async () => {
    const start = dayjs().add(1, "seconds");
    const shortEvent: Schema_WebEvent = {
      ...mockEvent,
      startDate: start.toISOString(),
      endDate: start.add(3, "seconds").toISOString(),
    };

    (useAppSelector as jest.Mock).mockReturnValue([]);

    const { result } = renderHook(() => useNowData());

    act(() => {
      result.current.setFocusedEvent(shortEvent);
    });

    act(() => {
      result.current.start?.();
    });

    await waitFor(() => {
      expect(result.current.countdown).toBeDefined();
      result.current.end?.();
    });

    // Wait for end
    await waitFor(() => {
      expect(result.current.countdown).toBeUndefined();
      expect(result.current.timeLeft).toBeUndefined();
    });
  });

  it("allows manual start and end of the timer", async () => {
    (useAppSelector as jest.Mock).mockReturnValue([]);

    const { result } = renderHook(() => useNowData());

    act(() => {
      result.current.setFocusedEvent(mockEvent);
    });

    act(() => {
      result.current.start?.();
    });

    await waitFor(() => {
      expect(result.current.countdown).toBeDefined();
    });

    act(() => {
      result.current.end?.();
    });

    await waitFor(() => {
      expect(result.current.countdown).toBeUndefined();
    });
  });

  it.skip("handles event with past start date by starting timer immediately", async () => {
    const pastStartEvent: Schema_WebEvent = {
      ...mockEvent,
      startDate: new Date(Date.now() - 1000).toISOString(), // 1 second ago
      endDate: new Date(Date.now() + 1000).toISOString(), // 1 second from now
    };

    (useAppSelector as jest.Mock).mockReturnValue([]);

    const { result } = renderHook(() => useNowData());

    act(() => {
      result.current.setFocusedEvent(pastStartEvent);
    });

    // Timer should start soon
    await waitFor(() => {
      expect(result.current.countdown).toBeDefined();
    });
  });

  it("does not set focusedEvent if nextEvent is undefined", async () => {
    (useAppSelector as jest.Mock).mockReturnValue([]);

    const { result } = renderHook(() => useNowData());

    await waitFor(() => {
      expect(result.current.focusedEvent).toBeNull();
    });
  });

  it("updates nextEventStarts correctly", async () => {
    const reduxEvents = [mockEvent];

    (useAppSelector as jest.Mock).mockReturnValue(reduxEvents);

    const { result } = renderHook(() => useNowData());

    await waitFor(() => {
      expect(result.current.nextEventStarts).toBeDefined();
      expect(result.current.nextEventStarts?.toLowerCase()).toContain(
        "from now",
      );
    });
  });
});
