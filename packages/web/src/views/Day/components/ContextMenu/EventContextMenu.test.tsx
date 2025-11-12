import { ObjectId } from "bson";
import { act } from "react";
import { PreloadedState, configureStore } from "@reduxjs/toolkit";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { RootState } from "@web/store";
import { reducers } from "@web/store/reducers";
import { createInitialState } from "@web/views/Calendar/calendar.render.test.utils";
import { renderWithDayProviders } from "../../util/day.test-util";
import { AgendaEvents } from "../Agenda/Events/AgendaEvent/AgendaEvents";

jest.mock("../Agenda/Events/AgendaEventMenu/AgendaEventMenu", () => ({
  AgendaEventMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("../Agenda/Events/AgendaEventMenu/AgendaEventMenuContent", () => ({
  AgendaEventMenuContent: () => null,
}));

jest.mock("../Agenda/Events/AgendaEventMenu/AgendaEventMenuTrigger", () => ({
  AgendaEventMenuTrigger: ({
    children,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <>{children}</>,
}));

const createStoreWithEvents = (
  events: Schema_Event[],
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

const renderAgendaEvents = (events: Schema_Event[]) => {
  const store = createStoreWithEvents(events);
  const utils = renderWithDayProviders(<AgendaEvents />, { store });
  const dispatchSpy = jest.spyOn(store, "dispatch");
  const user = userEvent.setup();

  return { store, dispatchSpy, user, ...utils };
};

describe("EventContextMenu", () => {
  const baseEvent: Schema_Event = {
    _id: new ObjectId().toString(),
    title: "Test Event",
    description: "Test description",
    startDate: "2024-01-15T09:00:00Z",
    endDate: "2024-01-15T10:00:00Z",
    isAllDay: false,
    origin: Origin.COMPASS,
    priority: Priorities.UNASSIGNED,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should open context menu on right-click on an event", async () => {
    const { user, dispatchSpy } = renderAgendaEvents([baseEvent]);

    const eventButton = await screen.findByRole("button", {
      name: "Test Event",
    });

    await act(async () => {
      await user.pointer({ target: eventButton, keys: "[MouseRight]" });
    });

    await waitFor(() => {
      expect(screen.getByText("Delete Event")).toBeInTheDocument();
    });

    dispatchSpy.mockRestore();
  });

  it("should show Delete Event menu item when menu is open", async () => {
    const { user, dispatchSpy } = renderAgendaEvents([baseEvent]);

    const eventButton = await screen.findByRole("button", {
      name: "Test Event",
    });
    await act(async () => {
      await user.pointer({ target: eventButton, keys: "[MouseRight]" });
    });

    await waitFor(() => {
      const deleteMenuItem = screen.getByText("Delete Event");
      expect(deleteMenuItem).toBeInTheDocument();
      expect(deleteMenuItem.closest("li")).toHaveClass("cursor-pointer");
    });

    dispatchSpy.mockRestore();
  });

  it("should close menu when clicking outside", async () => {
    const { user, dispatchSpy } = renderAgendaEvents([baseEvent]);

    const eventButton = await screen.findByRole("button", {
      name: "Test Event",
    });
    await act(async () => {
      await user.pointer({ target: eventButton, keys: "[MouseRight]" });
    });

    await waitFor(() => {
      expect(screen.getByText("Delete Event")).toBeInTheDocument();
    });

    const calendarSurface = screen.getByTestId("calendar-surface");
    await act(async () => {
      await user.click(calendarSurface);
    });

    await waitFor(() => {
      expect(screen.queryByText("Delete Event")).not.toBeInTheDocument();
    });

    dispatchSpy.mockRestore();
  });

  it("should close menu when pressing Escape key", async () => {
    const { user, dispatchSpy } = renderAgendaEvents([baseEvent]);

    const eventButton = await screen.findByRole("button", {
      name: "Test Event",
    });
    await act(async () => {
      await user.pointer({ target: eventButton, keys: "[MouseRight]" });
    });

    await waitFor(() => {
      expect(screen.getByText("Delete Event")).toBeInTheDocument();
    });

    await act(async () => {
      await user.keyboard("{Escape}");
    });

    await waitFor(() => {
      expect(screen.queryByText("Delete Event")).not.toBeInTheDocument();
    });

    dispatchSpy.mockRestore();
  });

  it("should not open context menu when right-clicking on non-event elements", async () => {
    const { user, dispatchSpy } = renderAgendaEvents([baseEvent]);

    await screen.findByRole("button", { name: "Test Event" });

    const calendarSurface = screen.getByTestId("calendar-surface");
    await act(async () => {
      await user.pointer({ target: calendarSurface, keys: "[MouseRight]" });
    });

    expect(screen.queryByText("Delete Event")).not.toBeInTheDocument();

    dispatchSpy.mockRestore();
  });

  it("should work with multiple events", async () => {
    const mockEvents = [
      { ...baseEvent, _id: "event-1", title: "First Event" },
      { ...baseEvent, _id: "event-2", title: "Second Event" },
    ];

    const { user, dispatchSpy } = renderAgendaEvents(mockEvents);

    await screen.findByRole("button", { name: "First Event" });
    await screen.findByRole("button", { name: "Second Event" });

    const firstEventButton = screen.getByRole("button", {
      name: "First Event",
    });
    await act(async () => {
      await user.pointer({ target: firstEventButton, keys: "[MouseRight]" });
    });

    await waitFor(() => {
      expect(screen.getByText("Delete Event")).toBeInTheDocument();
    });

    const deleteButton = screen.getByText("Delete Event");
    await act(async () => {
      await user.click(deleteButton);
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining("deleteEvent/request"),
        payload: expect.objectContaining({
          _id: "event-1",
        }),
      }),
    );

    dispatchSpy.mockRestore();
  });
});
