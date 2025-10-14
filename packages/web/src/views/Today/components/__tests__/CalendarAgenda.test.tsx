import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
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
    const mockEvents = {
      "event-1": {
        _id: "event-1",
        title: "Morning Meeting",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
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
    const mockEvents = {
      "event-1": {
        _id: "event-1",
        title: "Event 1",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 3600000).toISOString(),
        isAllDay: false,
      },
      "event-2": {
        _id: "event-2",
        title: "Event 2",
        startDate: new Date(Date.now() + 7200000).toISOString(), // 2 hours later
        endDate: new Date(Date.now() + 10800000).toISOString(), // 3 hours later
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
    const mockEvents = {
      "event-no-title": {
        _id: "event-no-title",
        title: "",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 3600000).toISOString(),
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
    const pastDate = new Date(Date.now() - 7200000); // 2 hours ago
    const mockEvents = {
      "past-event": {
        _id: "past-event",
        title: "Past Event",
        startDate: pastDate.toISOString(),
        endDate: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
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
  });

  it("should not apply opacity to current/future events", () => {
    const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
    const mockEvents = {
      "future-event": {
        _id: "future-event",
        title: "Future Event",
        startDate: futureDate.toISOString(),
        endDate: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
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
  });
});
