import { ObjectId } from "bson";
import { act } from "react";
import { screen, waitFor } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { renderAgenda } from "@web/__tests__/utils/agenda/agenda.test.util";
import { AppDispatch } from "@web/store";
import * as reduxHooks from "@web/store/store.hooks";

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
    const { user } = renderAgenda([baseEvent]);

    const eventButton = await screen.findByRole("button", {
      name: "Test Event",
    });

    await act(async () => {
      await user.pointer({ target: eventButton, keys: "[MouseRight]" });
    });

    await waitFor(() => {
      expect(screen.getByText("Delete Event")).toBeInTheDocument();
    });
  });

  it("should show Delete Event menu item when menu is open", async () => {
    const { user } = renderAgenda([baseEvent]);

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
  });

  it("should close menu when clicking outside", async () => {
    const { user } = renderAgenda([baseEvent]);
    const eventButton = await screen.findByRole("button", {
      name: "Test Event",
    });
    await act(async () => {
      await user.pointer({ target: eventButton, keys: "[MouseRight]" });
    });

    await waitFor(() => {
      expect(screen.getByText("Delete Event")).toBeInTheDocument();
    });

    const timedAgendas = screen.getByTestId("timed-agendas");

    await act(async () => {
      await user.click(timedAgendas);
    });

    await waitFor(() => {
      expect(screen.queryByText("Delete Event")).not.toBeInTheDocument();
    });
  });

  it("should close menu when pressing Escape key", async () => {
    const { user } = renderAgenda([baseEvent]);

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
  });

  it("should not open context menu when right-clicking on non-event elements", async () => {
    const { user } = renderAgenda([baseEvent]);

    await screen.findByRole("button", { name: "Test Event" });

    const timedAgendas = screen.getByTestId("timed-agendas");

    await act(async () => {
      await user.pointer({ target: timedAgendas, keys: "[MouseRight]" });
    });

    expect(screen.queryByText("Delete Event")).not.toBeInTheDocument();
  });

  it("should work with multiple events", async () => {
    jest.spyOn(window, "confirm").mockImplementation(() => true);

    const mockEvents = [
      { ...baseEvent, _id: "event-1", title: "First Event" },
      { ...baseEvent, _id: "event-2", title: "Second Event" },
    ];

    const useDispatchSpy = jest.spyOn(reduxHooks, "useAppDispatch");
    const mockDispatchFn = jest.fn(() => Promise.resolve());

    useDispatchSpy.mockReturnValue(mockDispatchFn as unknown as AppDispatch);

    const { user } = renderAgenda(mockEvents);

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

    expect(mockDispatchFn).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining("deleteEvent/request"),
        payload: expect.objectContaining({
          _id: "event-1",
        }),
      }),
    );
  });
});
