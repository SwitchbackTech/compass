import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { renderHook } from "@testing-library/react";
import { useTodayEvents } from "./useTodayEvents";

const mockEventEntities = {
  "event-1": {
    _id: "event-1",
    title: "Morning Meeting",
    startDate: new Date("2025-01-15T09:00:00").toISOString(),
    endDate: new Date("2025-01-15T10:00:00").toISOString(),
    isAllDay: false,
    category: "Work",
  },
  "event-2": {
    _id: "event-2",
    title: "All Day Event",
    startDate: new Date("2025-01-15T00:00:00").toISOString(),
    endDate: new Date("2025-01-15T23:59:59").toISOString(),
    isAllDay: true,
    category: "Personal",
  },
  "event-3": {
    _id: "event-3",
    title: "Yesterday's Event",
    startDate: new Date("2025-01-14T14:00:00").toISOString(),
    endDate: new Date("2025-01-14T15:00:00").toISOString(),
    isAllDay: false,
    category: "Work",
  },
  "event-4": {
    _id: "event-4",
    title: "Tomorrow's Event",
    startDate: new Date("2025-01-16T14:00:00").toISOString(),
    endDate: new Date("2025-01-16T15:00:00").toISOString(),
    isAllDay: false,
    category: "Work",
  },
  "event-5": {
    _id: "event-5",
    title: "Afternoon Event",
    startDate: new Date("2025-01-15T14:00:00").toISOString(),
    endDate: new Date("2025-01-15T15:30:00").toISOString(),
    isAllDay: false,
    category: "Meeting",
  },
};

const createMockStore = (eventEntities = mockEventEntities) => {
  return configureStore({
    reducer: {
      events: () => ({
        entities: {
          value: eventEntities,
        },
      }),
    },
  });
};

const createWrapper = (store: ReturnType<typeof createMockStore>) => {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };
};

describe("useTodayEvents", () => {
  it("should return events for today", () => {
    const store = createMockStore();
    const currentDate = new Date("2025-01-15T12:00:00");

    const { result } = renderHook(() => useTodayEvents(currentDate), {
      wrapper: createWrapper(store),
    });

    expect(result.current).toHaveLength(3);
    expect(result.current[0].title).toBe("All Day Event");
    expect(result.current[1].title).toBe("Morning Meeting");
    expect(result.current[2].title).toBe("Afternoon Event");
  });

  it("should sort events by start time", () => {
    const store = createMockStore();
    const currentDate = new Date("2025-01-15T12:00:00");

    const { result } = renderHook(() => useTodayEvents(currentDate), {
      wrapper: createWrapper(store),
    });

    expect(result.current[0].startTime.getHours()).toBe(0);
    expect(result.current[1].startTime.getHours()).toBe(9);
    expect(result.current[2].startTime.getHours()).toBe(14);
  });

  it("should exclude events from other days", () => {
    const store = createMockStore();
    const currentDate = new Date("2025-01-15T12:00:00");

    const { result } = renderHook(() => useTodayEvents(currentDate), {
      wrapper: createWrapper(store),
    });

    const titles = result.current.map((e) => e.title);
    expect(titles).not.toContain("Yesterday's Event");
    expect(titles).not.toContain("Tomorrow's Event");
  });

  it("should handle empty event entities", () => {
    const store = createMockStore({});
    const currentDate = new Date("2025-01-15T12:00:00");

    const { result } = renderHook(() => useTodayEvents(currentDate), {
      wrapper: createWrapper(store),
    });

    expect(result.current).toEqual([]);
  });

  it("should filter out events with missing dates", () => {
    const eventsWithMissing = {
      ...mockEventEntities,
      "event-bad": {
        _id: "event-bad",
        title: "Bad Event",
        startDate: null,
        endDate: null,
        isAllDay: false,
      },
    };

    const store = createMockStore(eventsWithMissing as any);
    const currentDate = new Date("2025-01-15T12:00:00");

    const { result } = renderHook(() => useTodayEvents(currentDate), {
      wrapper: createWrapper(store),
    });

    const titles = result.current.map((e) => e.title);
    expect(titles).not.toContain("Bad Event");
  });

  it("should include events that span across today", () => {
    const spanningEvents = {
      "event-span": {
        _id: "event-span",
        title: "Multi-day Event",
        startDate: new Date("2025-01-14T20:00:00").toISOString(),
        endDate: new Date("2025-01-16T08:00:00").toISOString(),
        isAllDay: false,
        category: "Conference",
      },
    };

    const store = createMockStore(spanningEvents);
    const currentDate = new Date("2025-01-15T12:00:00");

    const { result } = renderHook(() => useTodayEvents(currentDate), {
      wrapper: createWrapper(store),
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].title).toBe("Multi-day Event");
  });

  it("should use default current date when not provided", () => {
    const store = createMockStore({});

    const { result } = renderHook(() => useTodayEvents(), {
      wrapper: createWrapper(store),
    });

    expect(Array.isArray(result.current)).toBe(true);
  });

  it("should handle events with Untitled when title is missing", () => {
    const noTitleEvents = {
      "event-no-title": {
        _id: "event-no-title",
        title: "",
        startDate: new Date("2025-01-15T10:00:00").toISOString(),
        endDate: new Date("2025-01-15T11:00:00").toISOString(),
        isAllDay: false,
      },
    };

    const store = createMockStore(noTitleEvents);
    const currentDate = new Date("2025-01-15T12:00:00");

    const { result } = renderHook(() => useTodayEvents(currentDate), {
      wrapper: createWrapper(store),
    });

    expect(result.current[0].title).toBe("Untitled");
  });
});
