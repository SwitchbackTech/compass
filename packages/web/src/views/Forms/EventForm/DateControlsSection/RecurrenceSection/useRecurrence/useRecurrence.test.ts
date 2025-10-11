import { act } from "react";
import { Frequency } from "rrule";
import { renderHook } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { assembleGridEvent } from "@web/common/utils/event/event.util";
import { useRecurrence } from "./useRecurrence";

describe("useRecurrence hook", () => {
  const baseEvent = (): Schema_GridEvent =>
    assembleGridEvent({
      _id: "1",
      title: "Test Event",
      description: "desc",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 3600000).toISOString(),
      priority: Priorities.UNASSIGNED,
      origin: Origin.COMPASS,
      isSomeday: false,
      user: "user1",
    });

  it("initializes with no recurrence", () => {
    const event = baseEvent();
    const setEvent = jest.fn();
    const { result } = renderHook(() => useRecurrence(event, { setEvent }));

    expect(result.current.hasRecurrence).toBe(false);
    expect(result.current.interval).toBe(1);
    expect(result.current.freq).toBe(Frequency.DAILY);
    expect(result.current.weekDays).toEqual([]);
    expect(result.current.until).toBeNull();
  });

  it("can toggle recurrence", () => {
    const event = baseEvent();
    const setEvent = jest.fn();
    const { result } = renderHook(() => useRecurrence(event, { setEvent }));
    act(() => {
      result.current.toggleRecurrence();
    });
    expect(setEvent).toHaveBeenCalled();
  });

  it("can set interval", () => {
    const event = baseEvent();
    const setEvent = jest.fn();
    const { result } = renderHook(() => useRecurrence(event, { setEvent }));

    act(() => {
      result.current.toggleRecurrence();
      result.current.setInterval(3);
    });

    expect(setEvent).toHaveBeenCalled();
    expect(result.current.interval).toBe(3);
  });

  it("can set frequency", () => {
    const event = baseEvent();
    const setEvent = jest.fn();
    const { result } = renderHook(() => useRecurrence(event, { setEvent }));

    act(() => {
      result.current.toggleRecurrence();
      result.current.setFreq(Frequency.MONTHLY);
    });

    expect(setEvent).toHaveBeenCalled();
    expect(result.current.freq).toBe(Frequency.MONTHLY);
  });

  it("can set weekDays", () => {
    const event = baseEvent();
    const setEvent = jest.fn();
    const { result } = renderHook(() => useRecurrence(event, { setEvent }));

    act(() => {
      result.current.toggleRecurrence();
      result.current.setWeekDays(["monday", "friday"]);
    });

    expect(setEvent).toHaveBeenCalled();
    expect(result.current.weekDays).toEqual(["monday", "friday"]);
  });

  it("can set until date", () => {
    const event = baseEvent();
    const setEvent = jest.fn();
    const { result } = renderHook(() => useRecurrence(event, { setEvent }));
    const date = new Date();

    act(() => {
      result.current.toggleRecurrence();
      result.current.setUntil(date);
    });

    expect(setEvent).toHaveBeenCalled();
    expect(result.current.until).toEqual(date);
  });

  it("initializes with recurrence", () => {
    const event = {
      ...baseEvent(),
      recurrence: { rule: ["RRULE:FREQ=MONTHLY;INTERVAL=2;COUNT=5"] },
    };

    const setEvent = jest.fn();
    const { result } = renderHook(() => useRecurrence(event, { setEvent }));

    expect(result.current.hasRecurrence).toBe(true);
    expect(result.current.freq).toBe(Frequency.MONTHLY);
    expect(result.current.interval).toBe(2);
  });
});
