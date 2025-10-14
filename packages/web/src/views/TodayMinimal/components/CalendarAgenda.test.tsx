import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TodayMinimalProvider } from "../context/TodayMinimalProvider";
import { CalendarAgenda } from "./CalendarAgenda";

const renderWithProvider = () => {
  return render(
    <TodayMinimalProvider>
      <CalendarAgenda />
    </TodayMinimalProvider>,
  );
};

describe("CalendarAgenda", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render without crashing", () => {
    renderWithProvider();

    expect(screen.getByTestId("calendar-scroll")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-surface")).toBeInTheDocument();
  });

  it("should display time labels", () => {
    renderWithProvider();

    // Check for some time labels
    expect(screen.getByText("12am")).toBeInTheDocument();
    expect(screen.getByText("1am")).toBeInTheDocument();
    expect(screen.getByText("12pm")).toBeInTheDocument();
  });

  it("should display current time marker", () => {
    renderWithProvider();

    // Check for now marker elements
    expect(screen.getByTestId("calendar-scroll")).toContainElement(
      screen
        .getByTestId("calendar-scroll")
        ?.querySelector('[data-now-marker="true"]'),
    );
  });

  it("should display time blocks", () => {
    renderWithProvider();

    // Check for mock time blocks
    expect(screen.getByText("Morning standup")).toBeInTheDocument();
    expect(screen.getByText("Deep work session")).toBeInTheDocument();
    expect(screen.getByText("Lunch break")).toBeInTheDocument();
  });

  it("should create new event on calendar click", async () => {
    renderWithProvider();

    const calendarSurface = screen.getByTestId("calendar-surface");

    // Click on calendar surface to create event
    fireEvent.click(calendarSurface, { clientY: 100 }); // 100px from top

    // Should create a new event and start editing
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Event title")).toBeInTheDocument();
    });
  });

  it("should edit event title on double click", async () => {
    renderWithProvider();

    // Find first event block
    const eventBlocks = screen.getAllByText("Morning standup");
    const eventBlock = eventBlocks[0].closest('[data-calendar-event="true"]');

    // Double click to edit
    fireEvent.doubleClick(eventBlock!);

    // Should show input field
    await waitFor(() => {
      expect(screen.getByDisplayValue("Morning standup")).toBeInTheDocument();
    });
  });

  it("should save event title on Enter", async () => {
    renderWithProvider();

    // Find first event block and double click to edit
    const eventBlocks = screen.getAllByText("Morning standup");
    const eventBlock = eventBlocks[0].closest('[data-calendar-event="true"]');
    fireEvent.doubleClick(eventBlock!);

    // Get input field
    const input = await screen.findByDisplayValue("Morning standup");

    // Change title and press Enter
    fireEvent.change(input, { target: { value: "Updated standup" } });
    fireEvent.keyDown(input, { key: "Enter" });

    // Should save the title
    await waitFor(() => {
      expect(screen.getByText("Updated standup")).toBeInTheDocument();
    });
  });

  it("should cancel editing on Escape", async () => {
    renderWithProvider();

    // Find first event block and double click to edit
    const eventBlocks = screen.getAllByText("Morning standup");
    const eventBlock = eventBlocks[0].closest('[data-calendar-event="true"]');
    fireEvent.doubleClick(eventBlock!);

    // Get input field
    const input = await screen.findByDisplayValue("Morning standup");

    // Press Escape to cancel
    fireEvent.keyDown(input, { key: "Escape" });

    // Should cancel editing and show original title
    await waitFor(() => {
      expect(
        screen.queryByDisplayValue("Updated standup"),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Morning standup")).toBeInTheDocument();
    });
  });

  it("should delete empty event on Escape", async () => {
    renderWithProvider();

    const calendarSurface = screen.getByTestId("calendar-surface");

    // Click to create new event
    fireEvent.click(calendarSurface, { clientY: 100 });

    // Should be in edit mode
    const input = await screen.findByPlaceholderText("Event title");

    // Press Escape to cancel (should delete empty event)
    fireEvent.keyDown(input, { key: "Escape" });

    // Should delete the event
    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText("Event title"),
      ).not.toBeInTheDocument();
    });
  });

  it("should show context menu on right click", async () => {
    renderWithProvider();

    // Find first event block
    const eventBlocks = screen.getAllByText("Morning standup");
    const eventBlock = eventBlocks[0].closest('[data-calendar-event="true"]');

    // Right click to show context menu
    fireEvent.contextMenu(eventBlock!);

    // Should show context menu
    await waitFor(() => {
      expect(screen.getByTestId("event-context-menu")).toBeInTheDocument();
      expect(screen.getByText("Rename (E)")).toBeInTheDocument();
      expect(screen.getByText("Work (W)")).toBeInTheDocument();
      expect(screen.getByText("Self (S)")).toBeInTheDocument();
      expect(screen.getByText("Relationships (R)")).toBeInTheDocument();
      expect(screen.getByText("Delete (Del)")).toBeInTheDocument();
    });
  });

  it("should rename event from context menu", async () => {
    renderWithProvider();

    // Find first event block and right click
    const eventBlocks = screen.getAllByText("Morning standup");
    const eventBlock = eventBlocks[0].closest('[data-calendar-event="true"]');
    fireEvent.contextMenu(eventBlock!);

    // Click rename
    const renameButton = await screen.findByText("Rename (E)");
    fireEvent.click(renameButton);

    // Should start editing
    await waitFor(() => {
      expect(screen.getByDisplayValue("Morning standup")).toBeInTheDocument();
    });
  });

  it("should change priority from context menu", async () => {
    renderWithProvider();

    // Find first event block and right click
    const eventBlocks = screen.getAllByText("Morning standup");
    const eventBlock = eventBlocks[0].closest('[data-calendar-event="true"]');
    fireEvent.contextMenu(eventBlock!);

    // Click Self priority
    const selfButton = await screen.findByText("Self (S)");
    fireEvent.click(selfButton);

    // Should change priority (visual change would be in styling)
    await waitFor(() => {
      expect(
        screen.queryByTestId("event-context-menu"),
      ).not.toBeInTheDocument();
    });
  });

  it("should delete event from context menu", async () => {
    renderWithProvider();

    // Find first event block and right click
    const eventBlocks = screen.getAllByText("Morning standup");
    const eventBlock = eventBlocks[0].closest('[data-calendar-event="true"]');
    fireEvent.contextMenu(eventBlock!);

    // Click delete
    const deleteButton = await screen.findByText("Delete (Del)");
    fireEvent.click(deleteButton);

    // Should delete the event
    await waitFor(() => {
      expect(screen.queryByText("Morning standup")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("event-context-menu"),
      ).not.toBeInTheDocument();
    });
  });

  it("should show time chip on hover", async () => {
    renderWithProvider();

    // Find first event block
    const eventBlocks = screen.getAllByText("Morning standup");
    const eventBlock = eventBlocks[0].closest('[data-calendar-event="true"]');

    // Hover over event
    fireEvent.mouseEnter(eventBlock!);

    // Should show time chip (there are multiple, so use getAllByTestId)
    await waitFor(() => {
      expect(screen.getAllByTestId("event-time-chip")).toHaveLength(4);
    });
  });

  it("should focus event on click", async () => {
    renderWithProvider();

    // Find first event block
    const eventBlocks = screen.getAllByText("Morning standup");
    const eventBlock = eventBlocks[0].closest('[data-calendar-event="true"]');

    // Click on event
    fireEvent.click(eventBlock!);

    // Should focus the event (check for data-focused attribute)
    expect(eventBlock).toHaveAttribute("data-focused", "true");
  });

  it("should not create event when clicking on existing event", () => {
    renderWithProvider();

    const calendarSurface = screen.getByTestId("calendar-surface");
    const eventBlock = screen
      .getAllByText("Morning standup")[0]
      .closest('[data-calendar-event="true"]');

    // Click on existing event
    fireEvent.click(eventBlock!);

    // Should not create new event
    expect(
      screen.queryByPlaceholderText("Event title"),
    ).not.toBeInTheDocument();
  });

  it("should show past events with reduced opacity", () => {
    // Mock current time to be after the first event
    const mockTime = new Date();
    mockTime.setHours(10, 0, 0, 0); // 10:00 AM

    // Mock window.__TEST_TIME__ for the context
    (window as any).__TEST_TIME__ = mockTime.toISOString();

    renderWithProvider();

    // Past events should have opacity-60 class
    const eventBlocks = screen.getAllByText("Morning standup");
    const eventBlock = eventBlocks[0].closest('[data-calendar-event="true"]');
    expect(eventBlock).toHaveClass("opacity-60");
  });

  it("should handle keyboard shortcuts for context menu", async () => {
    renderWithProvider();

    // Find first event block and right click
    const eventBlocks = screen.getAllByText("Morning standup");
    const eventBlock = eventBlocks[0].closest('[data-calendar-event="true"]');
    fireEvent.contextMenu(eventBlock!);

    // Press 'w' to set Work priority
    fireEvent.keyDown(document, { key: "w" });

    // Should close context menu
    await waitFor(() => {
      expect(
        screen.queryByTestId("event-context-menu"),
      ).not.toBeInTheDocument();
    });
  });

  it("should close context menu on Escape", async () => {
    renderWithProvider();

    // Find first event block and right click
    const eventBlocks = screen.getAllByText("Morning standup");
    const eventBlock = eventBlocks[0].closest('[data-calendar-event="true"]');
    fireEvent.contextMenu(eventBlock!);

    // Press Escape
    fireEvent.keyDown(document, { key: "Escape" });

    // Should close context menu
    await waitFor(() => {
      expect(
        screen.queryByTestId("event-context-menu"),
      ).not.toBeInTheDocument();
    });
  });

  it("should close context menu on click outside", async () => {
    renderWithProvider();

    // Find first event block and right click
    const eventBlocks = screen.getAllByText("Morning standup");
    const eventBlock = eventBlocks[0].closest('[data-calendar-event="true"]');
    fireEvent.contextMenu(eventBlock!);

    // Click outside context menu
    fireEvent.click(document.body);

    // Should close context menu
    await waitFor(() => {
      expect(
        screen.queryByTestId("event-context-menu"),
      ).not.toBeInTheDocument();
    });
  });
});
