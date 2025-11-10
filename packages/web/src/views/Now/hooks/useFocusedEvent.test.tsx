import { ObjectId } from "bson";
import { act } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { Schema_WebEvent } from "@web/common/types/web.event.types";
import { useFocusedEvent } from "@web/views/Now/hooks/useFocusedEvent";

describe("useFocusedEvent", () => {
  const start = dayjs().add(1, "minutes");

  const mockEvent: Schema_WebEvent = {
    ...createMockStandaloneEvent({}),
    origin: Origin.COMPASS,
    user: new ObjectId().toString(),
    priority: Priorities.RELATIONS,
    startDate: start.toISOString(),
    endDate: start.add(2, "seconds").toISOString(),
  };

  it("initializes with undefined states when no event is set", () => {
    const { result } = renderHook(() => useFocusedEvent());

    expect(result.current.focusedEvent).toBeUndefined();
    expect(result.current.countdown).toBeUndefined();
    expect(result.current.timeLeft).toBeUndefined();
    expect(result.current.start).toBeUndefined();
    expect(result.current.end).toBeUndefined();
  });

  it("sets focused event and initializes timer when event is provided", async () => {
    const { result } = renderHook(() => useFocusedEvent());

    act(() => {
      result.current.setFocusedEvent(mockEvent);
    });

    await waitFor(() => {
      expect(result.current.focusedEvent).toEqual(mockEvent);
      expect(result.current.start).toBeDefined();
      expect(result.current.end).toBeDefined();
    });
  });

  it("updates countdown and timeLeft on timer tick", async () => {
    const { result } = renderHook(() => useFocusedEvent());

    act(() => {
      result.current.setFocusedEvent(mockEvent);
    });

    act(() => {
      result.current.start?.();
    });

    // Wait for start event
    await waitFor(() => {
      expect(result.current.countdown).toBeDefined();
    });

    // Wait for tick updates
    await waitFor(
      () => {
        expect(result.current.countdown).toMatch(/^\d{2}:\d{2}:\d{2}$/);
        expect(result.current.timeLeft).toBeDefined();
      },
      { timeout: 500 },
    );
  });

  it("calls onEventStart callback when timer starts", async () => {
    const onEventStart = jest.fn();
    const { result } = renderHook(() => useFocusedEvent({ onEventStart }));

    act(() => {
      result.current.setFocusedEvent(mockEvent);
    });

    act(() => {
      result.current.start?.();
    });

    await waitFor(() => {
      expect(onEventStart).toHaveBeenCalled();
    });
  });

  it("calls onEventTick callback on each tick", async () => {
    const onEventTick = jest.fn();
    const { result } = renderHook(() => useFocusedEvent({ onEventTick }));

    act(() => {
      result.current.setFocusedEvent(mockEvent);
    });

    act(() => {
      result.current.start?.();
    });

    await waitFor(
      () => {
        expect(onEventTick).toHaveBeenCalled(); // At least once
      },
      { timeout: 300 },
    );
  });

  it("calls onEventEnd callback when timer ends", async () => {
    const onEventEnd = jest.fn();
    const { result } = renderHook(() => useFocusedEvent({ onEventEnd }));

    act(() => {
      result.current.setFocusedEvent(mockEvent);
    });

    act(() => {
      result.current.start?.();
    });

    await waitFor(
      () => {
        expect(onEventEnd).toHaveBeenCalled();
      },
      { timeout: 6000 },
    );
  });

  it("allows manual start before scheduled start date", async () => {
    const futureEvent: Schema_WebEvent = {
      ...mockEvent,
      startDate: dayjs().add(2, "seconds").toISOString(),
      endDate: dayjs().add(3, "seconds").toISOString(),
    };

    const onEventStart = jest.fn();
    const { result } = renderHook(() => useFocusedEvent({ onEventStart }));

    act(() => {
      result.current.setFocusedEvent(futureEvent);
    });

    act(() => {
      result.current.start?.();
    });

    await waitFor(() => {
      expect(onEventStart).toHaveBeenCalled();
    });
  });

  it("allows manual end before timer completes", async () => {
    const onEventEnd = jest.fn();
    const { result } = renderHook(() => useFocusedEvent({ onEventEnd }));

    act(() => {
      result.current.setFocusedEvent(mockEvent);
    });

    act(() => {
      result.current.start?.();
    });

    act(() => {
      result.current.end?.();
    });

    await waitFor(() => {
      expect(onEventEnd).toHaveBeenCalled();
    });
  });

  it("resets countdown and timeLeft when timer ends", async () => {
    const start = dayjs();

    const event: Schema_WebEvent = {
      ...mockEvent,
      startDate: start.toISOString(),
      endDate: start.add(4, "seconds").toISOString(),
    };

    const { result } = renderHook(() => useFocusedEvent());

    act(() => {
      result.current.setFocusedEvent(event);
    });

    // Wait for end
    await waitFor(() => {
      expect(result.current.countdown).toBeUndefined();
      expect(result.current.timeLeft).toBeUndefined();
    });
  });

  it("handles event with past start date", async () => {
    const pastEvent: Schema_WebEvent = {
      ...mockEvent,
      startDate: start.subtract(1, "day").toISOString(),
    };

    const { result } = renderHook(() => useFocusedEvent());

    act(() => {
      result.current.setFocusedEvent(pastEvent);
    });

    await waitFor(() => {
      expect(result.current.focusedEvent).toEqual(pastEvent);
      expect(result.current.start).toBeDefined();
    });

    // Timer should start immediately or soon
    await waitFor(() => {
      expect(result.current.countdown).toBeDefined();
    });
  });

  it("does not create timer if event lacks required fields", () => {
    const incompleteEvent = { _id: "incomplete" }; // Missing startDate and endDate
    const { result } = renderHook(() => useFocusedEvent());

    act(() => {
      result.current.setFocusedEvent(incompleteEvent as Schema_WebEvent);
    });

    expect(result.current.start).toBeUndefined();
    expect(result.current.end).toBeUndefined();
  });
});
