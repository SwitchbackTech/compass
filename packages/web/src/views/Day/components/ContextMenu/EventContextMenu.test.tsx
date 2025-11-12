import { ObjectId } from "bson";
import { act } from "react";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { store } from "@web/store";
import { useDayEvents } from "../../hooks/events/useDayEvents";
import { renderWithDayProviders } from "../../util/day.test-util";
import { AgendaEvents } from "../Agenda/Events/AgendaEvent/AgendaEvents";

// Mock the useDayEvents hook
jest.mock("../../hooks/events/useDayEvents");
const mockUseDayEvents = useDayEvents as jest.MockedFunction<
  typeof useDayEvents
>;

// Mock the AgendaEventMenu components to simplify testing
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

  let dispatchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    dispatchSpy = jest.spyOn(store, "dispatch");
    mockUseDayEvents.mockReturnValue({
      events: [],
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    dispatchSpy.mockRestore();
  });

  it("should open context menu on right-click on an event", async () => {
    const user = userEvent.setup();
    const mockEvents = [baseEvent];

    mockUseDayEvents.mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
    });

    renderWithDayProviders(<AgendaEvents />);

    // Wait for event to render and right-click on it
    const eventButton = await screen.findByRole("button", {
      name: "Test Event",
    });

    await act(async () => {
      await user.pointer({ target: eventButton, keys: "[MouseRight]" });
    });

    // Check that context menu appears
    await waitFor(() => {
      expect(screen.getByText("Delete Event")).toBeInTheDocument();
    });
  });

  it("should show Delete Event menu item when menu is open", async () => {
    const user = userEvent.setup();
    const mockEvents = [baseEvent];

    mockUseDayEvents.mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
    });

    renderWithDayProviders(<AgendaEvents />);

    // Right-click on the event
    const eventButton = await screen.findByRole("button", {
      name: "Test Event",
    });
    await act(async () => {
      await user.pointer({ target: eventButton, keys: "[MouseRight]" });
    });

    // Check that Delete Event menu item is visible
    await waitFor(() => {
      const deleteMenuItem = screen.getByText("Delete Event");
      expect(deleteMenuItem).toBeInTheDocument();
      expect(deleteMenuItem.closest("li")).toHaveClass("cursor-pointer");
    });
  });

  it("should close menu when clicking outside", async () => {
    const user = userEvent.setup();
    const mockEvents = [baseEvent];

    mockUseDayEvents.mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
    });

    renderWithDayProviders(<AgendaEvents />);

    // Right-click on the event
    const eventButton = await screen.findByRole("button", {
      name: "Test Event",
    });
    await act(async () => {
      await user.pointer({ target: eventButton, keys: "[MouseRight]" });
    });

    // Check that menu is open
    await waitFor(() => {
      expect(screen.getByText("Delete Event")).toBeInTheDocument();
    });

    // Click outside the menu (on the calendar surface)
    const calendarSurface = screen.getByTestId("calendar-surface");
    await act(async () => {
      await user.click(calendarSurface);
    });

    // Check that menu is closed
    await waitFor(() => {
      expect(screen.queryByText("Delete Event")).not.toBeInTheDocument();
    });
  });

  it("should close menu when pressing Escape key", async () => {
    const user = userEvent.setup();
    const mockEvents = [baseEvent];

    mockUseDayEvents.mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
    });

    renderWithDayProviders(<AgendaEvents />);

    // Right-click on the event
    const eventButton = await screen.findByRole("button", {
      name: "Test Event",
    });
    await act(async () => {
      await user.pointer({ target: eventButton, keys: "[MouseRight]" });
    });

    // Check that menu is open
    await waitFor(() => {
      expect(screen.getByText("Delete Event")).toBeInTheDocument();
    });

    // Press Escape key
    await act(async () => {
      await user.keyboard("{Escape}");
    });

    // Check that menu is closed
    await waitFor(() => {
      expect(screen.queryByText("Delete Event")).not.toBeInTheDocument();
    });
  });

  it("should not open context menu when right-clicking on non-event elements", async () => {
    const user = userEvent.setup();
    const mockEvents = [baseEvent];

    mockUseDayEvents.mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
    });

    renderWithDayProviders(<AgendaEvents />);

    // Wait for event to render
    await screen.findByRole("button", { name: "Test Event" });

    // Right-click on the calendar surface (not on an event)
    const calendarSurface = screen.getByTestId("calendar-surface");
    await act(async () => {
      await user.pointer({ target: calendarSurface, keys: "[MouseRight]" });
    });

    // Check that no context menu appears
    expect(screen.queryByText("Delete Event")).not.toBeInTheDocument();
  });

  it("should work with multiple events", async () => {
    const user = userEvent.setup();
    const mockEvents = [
      { ...baseEvent, _id: "event-1", title: "First Event" },
      { ...baseEvent, _id: "event-2", title: "Second Event" },
    ];

    mockUseDayEvents.mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
    });

    renderWithDayProviders(<AgendaEvents />);

    // Wait for events to render
    await screen.findByRole("button", { name: "First Event" });
    await screen.findByRole("button", { name: "Second Event" });

    // Right-click on the first event
    const firstEventButton = screen.getByRole("button", {
      name: "First Event",
    });
    await act(async () => {
      await user.pointer({ target: firstEventButton, keys: "[MouseRight]" });
    });

    // Check that menu appears
    await waitFor(() => {
      expect(screen.getByText("Delete Event")).toBeInTheDocument();
    });

    // Click Delete Event
    const deleteButton = screen.getByText("Delete Event");
    await act(async () => {
      await user.click(deleteButton);
    });

    // Check that delete action was dispatched for the first event
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining("deleteEvent/request"),
        payload: {
          _id: "event-1",
          applyTo: expect.any(String),
        },
      }),
    );
  });
});
