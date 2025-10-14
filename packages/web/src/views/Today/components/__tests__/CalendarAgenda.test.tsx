import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { CalendarAgenda } from "../CalendarAgenda";

const createMockStore = (eventEntities = {}) => {
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

describe("CalendarAgenda", () => {
  it("should render without crashing", () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <CalendarAgenda />
      </Provider>,
    );

    expect(screen.getByTestId("calendar-scroll")).toBeInTheDocument();
  });

  it("should render time labels", () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <CalendarAgenda />
      </Provider>,
    );

    expect(screen.getByText("12am")).toBeInTheDocument();
    expect(screen.getByText("12pm")).toBeInTheDocument();
    expect(screen.getByText("6am")).toBeInTheDocument();
    expect(screen.getByText("6pm")).toBeInTheDocument();
  });

  it("should render current time marker", () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <CalendarAgenda />
      </Provider>,
    );

    const marker = screen
      .getByTestId("calendar-scroll")
      .querySelector('[data-now-marker="true"]');
    expect(marker).toBeInTheDocument();
  });

  it("should render calendar events", () => {
    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      10,
      0,
      0,
    );
    const endDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      11,
      0,
      0,
    );

    const mockEvents = {
      "event-1": {
        _id: "event-1",
        title: "Morning Meeting",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isAllDay: false,
        category: "Work",
      },
    };

    const store = createMockStore(mockEvents);

    render(
      <Provider store={store}>
        <CalendarAgenda />
      </Provider>,
    );

    expect(screen.getByText("Morning Meeting")).toBeInTheDocument();
  });

  it("should not render all-day events", () => {
    const mockEvents = {
      "event-all-day": {
        _id: "event-all-day",
        title: "All Day Event",
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        isAllDay: true,
        category: "Personal",
      },
    };

    const store = createMockStore(mockEvents);

    render(
      <Provider store={store}>
        <CalendarAgenda />
      </Provider>,
    );

    expect(screen.queryByText("All Day Event")).not.toBeInTheDocument();
  });

  it("should render multiple events", () => {
    const now = new Date();
    const event1Start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      9,
      0,
      0,
    );
    const event1End = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      10,
      0,
      0,
    );
    const event2Start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      14,
      0,
      0,
    );
    const event2End = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      15,
      0,
      0,
    );

    const mockEvents = {
      "event-1": {
        _id: "event-1",
        title: "Event 1",
        startDate: event1Start.toISOString(),
        endDate: event1End.toISOString(),
        isAllDay: false,
      },
      "event-2": {
        _id: "event-2",
        title: "Event 2",
        startDate: event2Start.toISOString(),
        endDate: event2End.toISOString(),
        isAllDay: false,
      },
    };

    const store = createMockStore(mockEvents);

    render(
      <Provider store={store}>
        <CalendarAgenda />
      </Provider>,
    );

    expect(screen.getByText("Event 1")).toBeInTheDocument();
    expect(screen.getByText("Event 2")).toBeInTheDocument();
  });

  it("should show Untitled for events without title", () => {
    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      13,
      0,
      0,
    );
    const endDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      14,
      0,
      0,
    );

    const mockEvents = {
      "event-no-title": {
        _id: "event-no-title",
        title: "",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isAllDay: false,
      },
    };

    const store = createMockStore(mockEvents);

    render(
      <Provider store={store}>
        <CalendarAgenda />
      </Provider>,
    );

    expect(screen.getByText("Untitled")).toBeInTheDocument();
  });

  it("should render calendar surface with correct height", () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <CalendarAgenda />
      </Provider>,
    );

    const surface = screen.getByTestId("calendar-surface");
    expect(surface).toHaveStyle({ height: `${24 * 4 * 20}px` }); // 24 hours * 4 slots/hour * 20px/slot
  });

  it("should apply opacity to past events", () => {
    // Use fake timers to set current time to noon
    jest.useFakeTimers();
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    jest.setSystemTime(now);

    // Event from 8am-9am is in the past (before noon)
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      8,
      0,
      0,
    );
    const endDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      9,
      0,
      0,
    );

    const mockEvents = {
      "past-event": {
        _id: "past-event",
        title: "Past Event",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isAllDay: false,
      },
    };

    const store = createMockStore(mockEvents);

    render(
      <Provider store={store}>
        <CalendarAgenda />
      </Provider>,
    );

    const eventElement = screen.getByText("Past Event").closest("div");
    expect(eventElement).toHaveClass("opacity-60");

    jest.useRealTimers();
  });

  it("should not apply opacity to current/future events", () => {
    // Use fake timers to set current time to noon
    jest.useFakeTimers();
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    jest.setSystemTime(now);

    // Event from 2pm-3pm is in the future (after noon)
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      14,
      0,
      0,
    );
    const endDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      15,
      0,
      0,
    );

    const mockEvents = {
      "future-event": {
        _id: "future-event",
        title: "Future Event",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isAllDay: false,
      },
    };

    const store = createMockStore(mockEvents);

    render(
      <Provider store={store}>
        <CalendarAgenda />
      </Provider>,
    );

    const eventElement = screen.getByText("Future Event").closest("div");
    expect(eventElement).not.toHaveClass("opacity-60");

    jest.useRealTimers();
  });
});
