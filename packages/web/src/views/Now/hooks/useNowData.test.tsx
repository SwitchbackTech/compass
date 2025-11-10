import { act } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { Schema_WebEvent } from "@web/common/types/web.event.types";
import * as useTodayEventsHook from "@web/views/Day/hooks/events/useTodayEvents";
import { useNowData } from "@web/views/Now/hooks/useNowData";

describe("useNowData", () => {
  const start = dayjs().add(1, "minutes");

  const mockEvent: Schema_WebEvent = {
    ...createMockStandaloneEvent({}),
    origin: Origin.COMPASS,
    user: "test-user",
    priority: Priorities.RELATIONS,
    startDate: start.toISOString(),
    endDate: start.add(2, "seconds").toISOString(),
  };

  const pastEvent: Schema_WebEvent = {
    ...mockEvent,
    startDate: start.subtract(2, "minutes").toISOString(),
    endDate: start.subtract(61, "seconds").toISOString(),
  };

  it("initializes with undefined focusedEvent and nextEvent when no events are available", () => {
    const useTodayEventsSpy = jest.spyOn(useTodayEventsHook, "useTodayEvents");
    useTodayEventsSpy.mockReturnValue([]);

    const { result } = renderHook(() => useNowData());

    expect(result.current.focusedEvent).toBeNull();
    expect(result.current.nextEvent).toBeUndefined();
    expect(result.current.nextEventStarts).toBeUndefined();
    expect(result.current.countdown).toBeUndefined();
    expect(result.current.timeLeft).toBeUndefined();

    useTodayEventsSpy.mockRestore();
  });

  it("sets focusedEvent to nextEvent when no focusedEvent is set and nextEvent exists", async () => {
    const events: useTodayEventsHook.TodayEvent[] = [
      {
        id: pastEvent._id ?? "",
        title: pastEvent.title ?? "",
        startTime: new Date(pastEvent.startDate!),
        endTime: new Date(pastEvent.endDate!),
        isAllDay: false,
      },
      {
        id: mockEvent._id ?? "",
        title: mockEvent.title ?? "",
        startTime: new Date(mockEvent.startDate!),
        endTime: new Date(mockEvent.endDate!),
        isAllDay: false,
      },
    ];

    const useTodayEventsSpy = jest.spyOn(useTodayEventsHook, "useTodayEvents");
    useTodayEventsSpy.mockReturnValue(events);

    const { result } = renderHook(() => useNowData());

    await waitFor(() => {
      expect(result.current.nextEvent?._id).toBe(mockEvent._id);
      expect(result.current.focusedEvent?._id).toBe(mockEvent._id);
    });

    useTodayEventsSpy.mockRestore();
  });

  it("updates now on timer ticks", async () => {
    const useTodayEventsSpy = jest.spyOn(useTodayEventsHook, "useTodayEvents");
    useTodayEventsSpy.mockReturnValue([]);

    const { result } = renderHook(() => useNowData());

    const initialNow = result.current.now.getTime();

    await waitFor(
      () => {
        expect(result.current.now.getTime()).toBeGreaterThan(initialNow);
      },
      { timeout: 2000 },
    );

    useTodayEventsSpy.mockRestore();
  });

  it("updates countdown and timeLeft when focusedEvent is set and started", async () => {
    const useTodayEventsSpy = jest.spyOn(useTodayEventsHook, "useTodayEvents");
    useTodayEventsSpy.mockReturnValue([]);

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

    useTodayEventsSpy.mockRestore();
  });

  it("resets countdown and timeLeft when timer ends", async () => {
    const start = dayjs().add(1, "seconds");
    const shortEvent: Schema_WebEvent = {
      ...mockEvent,
      startDate: start.toISOString(),
      endDate: start.add(3, "seconds").toISOString(),
    };

    const useTodayEventsSpy = jest.spyOn(useTodayEventsHook, "useTodayEvents");
    useTodayEventsSpy.mockReturnValue([]);

    const { result } = renderHook(() => useNowData());

    act(() => {
      result.current.setFocusedEvent(shortEvent);
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

    useTodayEventsSpy.mockRestore();
  });

  it("allows manual start and end of the timer", async () => {
    const useTodayEventsSpy = jest.spyOn(useTodayEventsHook, "useTodayEvents");
    useTodayEventsSpy.mockReturnValue([]);

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

    useTodayEventsSpy.mockRestore();
  });

  it("handles event with past start date by starting timer immediately", async () => {
    const pastStartEvent: Schema_WebEvent = {
      ...mockEvent,
      startDate: new Date(Date.now() - 1000).toISOString(), // 1 second ago
      endDate: new Date(Date.now() + 1000).toISOString(), // 1 second from now
    };

    const useTodayEventsSpy = jest.spyOn(useTodayEventsHook, "useTodayEvents");
    useTodayEventsSpy.mockReturnValue([]);

    const { result } = renderHook(() => useNowData());

    act(() => {
      result.current.setFocusedEvent(pastStartEvent);
    });

    // Timer should start soon
    await waitFor(() => {
      expect(result.current.countdown).toBeDefined();
    });

    useTodayEventsSpy.mockRestore();
  });

  it("does not set focusedEvent if nextEvent is undefined", async () => {
    const useTodayEventsSpy = jest.spyOn(useTodayEventsHook, "useTodayEvents");

    useTodayEventsSpy.mockReturnValue([]);

    const { result } = renderHook(() => useNowData());

    await waitFor(() => {
      expect(result.current.focusedEvent).toBeNull();
    });

    useTodayEventsSpy.mockRestore();
  });

  it("updates nextEventStarts correctly", async () => {
    const events: useTodayEventsHook.TodayEvent[] = [
      {
        id: mockEvent._id ?? "",
        title: mockEvent.title ?? "",
        startTime: new Date(mockEvent.startDate!),
        endTime: new Date(mockEvent.endDate!),
        isAllDay: false,
      },
    ];

    const useTodayEventsSpy = jest.spyOn(useTodayEventsHook, "useTodayEvents");
    useTodayEventsSpy.mockReturnValue(events);

    const { result } = renderHook(() => useNowData());

    await waitFor(() => {
      expect(result.current.nextEventStarts).toBeDefined();
      expect(result.current.nextEventStarts?.toLowerCase()).toContain(
        "from now",
      );
    });

    useTodayEventsSpy.mockRestore();
  });
});
