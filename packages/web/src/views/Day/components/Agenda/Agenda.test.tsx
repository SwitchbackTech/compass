import { act } from "react";
import { PreloadedState, configureStore } from "@reduxjs/toolkit";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Schema_Event } from "@core/types/event.types";
import { RootState } from "@web/store";
import { reducers } from "@web/store/reducers";
import { createInitialState } from "@web/views/Calendar/calendar.render.test.utils";
import { renderWithDayProviders } from "../../util/day.test-util";
import { Agenda } from "./Agenda";

const createStoreWithEvents = (
  events: Schema_Event[] = [],
  options: { isProcessing?: boolean } = {},
) => {
  const preloadedState = createInitialState();
  const entities = events.reduce<Record<string, Schema_Event>>((acc, event) => {
    if (event._id) {
      acc[event._id] = event;
    }
    return acc;
  }, {});

  preloadedState.events.entities.value = entities;
  preloadedState.events.getDayEvents = {
    value: {
      data: events
        .filter((event) => Boolean(event._id))
        .map((event) => event._id as string),
      count: events.length,
      pageSize: events.length || 1,
      page: 1,
      offset: 0,
    },
    isProcessing: options.isProcessing ?? false,
    isSuccess: !options.isProcessing,
    error: null,
    reason: null,
  };

  return configureStore({
    reducer: reducers,
    preloadedState: preloadedState as PreloadedState<RootState>,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: false,
        serializableCheck: false,
        immutableCheck: false,
      }),
  });
};

const renderAgenda = (
  events: Schema_Event[] = [],
  options?: { isProcessing?: boolean },
) => {
  const store = createStoreWithEvents(events, options);
  return renderWithDayProviders(<Agenda />, { store });
};

describe("CalendarAgenda", () => {
  it("should render time labels", () => {
    renderAgenda();

    expect(screen.getByText("12am")).toBeInTheDocument();
    expect(screen.getByText("12pm")).toBeInTheDocument();
    expect(screen.getByText("6am")).toBeInTheDocument();
    expect(screen.getByText("6pm")).toBeInTheDocument();
  });

  it("should render multiple events", () => {
    const mockEvents: Schema_Event[] = [
      {
        _id: "event-1",
        title: "Event 1",
        startDate: "2024-01-15T09:00:00Z",
        endDate: "2024-01-15T10:00:00Z",
        isAllDay: false,
      },
      {
        _id: "event-2",
        title: "Event 2",
        startDate: "2024-01-15T14:00:00Z",
        endDate: "2024-01-15T15:00:00Z",
        isAllDay: false,
      },
    ];

    renderAgenda(mockEvents);

    expect(screen.getByText("Event 1")).toBeInTheDocument();
    expect(screen.getByText("Event 2")).toBeInTheDocument();
  });

  it("should render all-day events", () => {
    const mockEvents: Schema_Event[] = [
      {
        _id: "event-all-day",
        title: "All Day Event",
        startDate: "2024-01-15T00:00:00Z",
        endDate: "2024-01-15T23:59:59Z",
        isAllDay: true,
      },
    ];

    renderAgenda(mockEvents);

    expect(screen.getByText("All Day Event")).toBeInTheDocument();
  });

  it("should show skeleton during loading", () => {
    renderAgenda([], { isProcessing: true });

    const skeletonElements = document.querySelectorAll(".animate-pulse");
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it("should not show skeleton or error when events are loaded", () => {
    const mockEvents: Schema_Event[] = [
      {
        _id: "event-1",
        title: "Test Event",
        startDate: "2024-01-15T10:00:00Z",
        endDate: "2024-01-15T11:00:00Z",
        isAllDay: false,
      },
    ];

    renderAgenda(mockEvents);

    const skeletonElements = document.querySelectorAll(".animate-pulse");
    expect(skeletonElements).toHaveLength(0);
    expect(screen.queryByText("Failed to load events")).not.toBeInTheDocument();
    expect(screen.getByText("Test Event")).toBeInTheDocument();
  });

  it("should render events with correct tabIndex and data attributes", () => {
    const mockEvents: Schema_Event[] = [
      {
        _id: "all-day-1",
        title: "All Day Event 1",
        startDate: "2024-01-15T00:00:00Z",
        endDate: "2024-01-15T23:59:59Z",
        isAllDay: true,
      },
      {
        _id: "timed-1",
        title: "Timed Event 1",
        startDate: "2024-01-15T09:00:00Z",
        endDate: "2024-01-15T10:00:00Z",
        isAllDay: false,
      },
    ];

    renderAgenda(mockEvents);

    const allDayEvent = screen.getByRole("button", {
      name: "All Day Event 1",
    });
    expect(allDayEvent).toHaveAttribute("tabIndex", "0");
    expect(allDayEvent).toHaveAttribute("role", "button");
    expect(allDayEvent).toHaveAttribute("data-event-id", "all-day-1");

    const timedEvent = screen.getByRole("button", {
      name: "Timed Event 1",
    });
    expect(timedEvent).toHaveAttribute("tabIndex", "0");
    expect(timedEvent).toHaveAttribute("role", "button");
  });

  it("should render events in correct TAB navigation order", async () => {
    const mockEvents: Schema_Event[] = [
      {
        _id: "all-day-2",
        title: "Zebra Event",
        startDate: "2024-01-15T00:00:00Z",
        endDate: "2024-01-15T23:59:59Z",
        isAllDay: true,
      },
      {
        _id: "all-day-1",
        title: "Apple Event",
        startDate: "2024-01-15T00:00:00Z",
        endDate: "2024-01-15T23:59:59Z",
        isAllDay: true,
      },
      {
        _id: "timed-2",
        title: "Lunch Event",
        startDate: "2024-01-15T12:00:00Z",
        endDate: "2024-01-15T13:00:00Z",
        isAllDay: false,
      },
      {
        _id: "timed-1",
        title: "Breakfast Event",
        startDate: "2024-01-15T08:00:00Z",
        endDate: "2024-01-15T09:00:00Z",
        isAllDay: false,
      },
    ];

    const { user } = renderAgenda(mockEvents);

    await act(async () => {
      await user.tab();
    });
    expect(document.activeElement).toHaveTextContent("Apple Event");

    await act(async () => {
      await user.tab();
    });
    expect(document.activeElement).toHaveTextContent("Zebra Event");

    await act(async () => {
      await user.tab();
    });
    expect(document.activeElement).toHaveTextContent("Breakfast Event");

    await act(async () => {
      await user.tab();
    });
    expect(document.activeElement).toHaveTextContent("Lunch Event");
  });

  it("should filter out deleted events immediately", () => {
    const mockEvents: Schema_Event[] = [
      {
        _id: "event-1",
        title: "Event 1",
        startDate: "2024-01-15T09:00:00Z",
        endDate: "2024-01-15T10:00:00Z",
        isAllDay: false,
      },
      {
        _id: "event-2",
        title: "Event 2",
        startDate: "2024-01-15T14:00:00Z",
        endDate: "2024-01-15T15:00:00Z",
        isAllDay: false,
      },
    ];

    const firstRender = renderAgenda(mockEvents);

    expect(screen.getByText("Event 1")).toBeInTheDocument();
    expect(screen.getByText("Event 2")).toBeInTheDocument();

    firstRender.unmount();

    renderAgenda([mockEvents[0]]);

    expect(screen.getByText("Event 1")).toBeInTheDocument();
    expect(screen.queryByText("Event 2")).not.toBeInTheDocument();
  });
});
