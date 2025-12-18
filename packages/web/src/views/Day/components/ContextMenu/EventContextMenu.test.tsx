import { ObjectId } from "bson";
import { act } from "react";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { createStoreWithEvents } from "@web/__tests__/utils/state/store.test.util";
import { useFloatingAtCursor } from "@web/common/hooks/useFloatingAtCursor";
import { setDraft } from "@web/views/Calendar/components/Draft/context/useDraft";
import { TimedAgendaEvents } from "@web/views/Day/components/Agenda/Events/TimedAgendaEvent/TimedAgendaEvents";
import { EventContextMenu } from "@web/views/Day/components/ContextMenu/EventContextMenu";
import { useAgendaInteractionsAtCursor } from "@web/views/Day/hooks/events/useAgendaInteractionsAtCursor";
import { renderWithDayProviders } from "@web/views/Day/util/day.test-util";

const TestWrapper = () => {
  const openChange = (open: boolean) => {
    if (!open) setDraft(null);
  };
  const floating = useFloatingAtCursor(openChange);
  const interactions = useAgendaInteractionsAtCursor(floating);

  return (
    <>
      <TimedAgendaEvents interactions={interactions} />
      <EventContextMenu floating={floating} interactions={interactions} />
    </>
  );
};

const renderAgendaEvents = (events: Schema_Event[]) => {
  const store = createStoreWithEvents(events);

  const utils = renderWithDayProviders(<TestWrapper />, { store });
  const dispatchSpy = jest.spyOn(store, "dispatch");

  return { store, dispatchSpy, ...utils };
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

    const timedAgendas = screen.getByTestId("timed-agendas");

    await act(async () => {
      await user.click(timedAgendas);
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

    const timedAgendas = screen.getByTestId("timed-agendas");

    await act(async () => {
      await user.pointer({ target: timedAgendas, keys: "[MouseRight]" });
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
