import { act } from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Schema_Event } from "@core/types/event.types";
import { AgendaEventMenu } from "./AgendaEventMenu";
import { AgendaEventMenuContent } from "./AgendaEventMenuContent";
import { AgendaEventMenuTrigger } from "./AgendaEventMenuTrigger";

const mockEvent: Schema_Event = {
  _id: "test-event-1",
  title: "Test Event",
  description: "This is a test event description",
  startDate: "2024-01-15T09:00:00Z",
  endDate: "2024-01-15T10:00:00Z",
  isAllDay: false,
};

const TestComponent = ({ event }: { event: Schema_Event }) => (
  <AgendaEventMenu>
    <AgendaEventMenuTrigger asChild>
      <button>Event Trigger</button>
    </AgendaEventMenuTrigger>
    <AgendaEventMenuContent event={event} />
  </AgendaEventMenu>
);

describe("AgendaEventMenu", () => {
  it("should not show menu initially", () => {
    render(<TestComponent event={mockEvent} />);

    expect(screen.queryByText("Test Event")).not.toBeInTheDocument();
  });

  it("should show menu on hover after delay", async () => {
    const user = userEvent.setup();
    render(<TestComponent event={mockEvent} />);

    const trigger = screen.getByRole("button", {
      name: "Event Trigger",
    });

    await user.hover(trigger);

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
      expect(
        screen.getByText("This is a test event description"),
      ).toBeInTheDocument();
    });
  });

  it("should show menu on focus", async () => {
    const user = userEvent.setup();
    render(<TestComponent event={mockEvent} />);

    const trigger = screen.getByRole("button", {
      name: "Event Trigger",
    });
    await act(async () => {
      await user.tab();
    });

    expect(document.activeElement).toBe(trigger);

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
      expect(
        screen.getByText("This is a test event description"),
      ).toBeInTheDocument();
    });
  });

  it("should display correct event title", async () => {
    const user = userEvent.setup();
    render(<TestComponent event={mockEvent} />);

    const trigger = screen.getByRole("button", {
      name: "Event Trigger",
    });
    await user.hover(trigger);

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });
  });

  it("should display formatted time range", async () => {
    const user = userEvent.setup();
    render(<TestComponent event={mockEvent} />);

    const trigger = screen.getByRole("button", {
      name: "Event Trigger",
    });
    await user.hover(trigger);

    const timeRegex = /^\d{1,2}:\d{2}(am|pm) - \d{1,2}:\d{2}(am|pm)$/;
    await waitFor(() => {
      expect(screen.getByText(timeRegex)).toBeInTheDocument();
    });
  });

  it("should display description when present", async () => {
    const user = userEvent.setup();
    render(<TestComponent event={mockEvent} />);

    const trigger = screen.getByRole("button", {
      name: "Event Trigger",
    });
    await user.hover(trigger);

    await waitFor(() => {
      expect(
        screen.getByText("This is a test event description"),
      ).toBeInTheDocument();
    });
  });

  it("should close menu on outside click", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <TestComponent event={mockEvent} />
        <button>Outside Button</button>
      </div>,
    );

    const trigger = screen.getByRole("button", {
      name: "Event Trigger",
    });
    await act(async () => {
      await user.hover(trigger);
    });

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });

    const outsideButton = screen.getByRole("button", {
      name: "Outside Button",
    });
    await act(async () => {
      await user.click(outsideButton);
    });

    await waitFor(() => {
      expect(screen.queryByText("Test Event")).not.toBeInTheDocument();
    });
  });

  it("should close menu on ESC key press", async () => {
    const user = userEvent.setup();
    render(<TestComponent event={mockEvent} />);

    const trigger = screen.getByRole("button", {
      name: "Event Trigger",
    });
    await act(async () => {
      await user.hover(trigger);
    });

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });

    await act(async () => {
      await user.keyboard("{Escape}");
    });

    await waitFor(() => {
      expect(screen.queryByText("Test Event")).not.toBeInTheDocument();
    });
  });

  it("should close menu when focus is lost", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <TestComponent event={mockEvent} />
        <button>Other Button</button>
      </div>,
    );

    const trigger = screen.getByRole("button", {
      name: "Event Trigger",
    });
    await act(async () => {
      await user.tab();
    });

    expect(document.activeElement).toBe(trigger);

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });

    const otherButton = screen.getByRole("button", {
      name: "Other Button",
    });
    await act(async () => {
      await user.tab();
    });

    expect(document.activeElement).toBe(otherButton);

    await waitFor(() => {
      expect(screen.queryByText("Test Event")).not.toBeInTheDocument();
    });
  });

  it("should not close menu when clicking the event itself", async () => {
    const user = userEvent.setup();
    render(<TestComponent event={mockEvent} />);

    const trigger = screen.getByRole("button", {
      name: "Event Trigger",
    });
    await user.hover(trigger);

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });

    // Click the event trigger itself
    await act(async () => {
      await user.click(trigger);
    });

    // Menu should still be visible
    expect(screen.getByText("Test Event")).toBeInTheDocument();
  });

  describe("All-day events", () => {
    const singleDayAllDayEvent: Schema_Event = {
      _id: "test-allday-1",
      title: "Single Day All Day Event",
      description: "This is a single day all day event",
      startDate: "2024-01-15T00:00:00Z",
      endDate: "2024-01-15T23:59:59Z",
      isAllDay: true,
    };

    const multiDayAllDayEvent: Schema_Event = {
      _id: "test-allday-2",
      title: "Multi Day All Day Event",
      description: "This is a multi day all day event",
      startDate: "2024-01-15T00:00:00Z",
      endDate: "2024-01-17T23:59:59Z",
      isAllDay: true,
    };

    it("should show menu for single-day all-day event without time display", async () => {
      const user = userEvent.setup();
      render(<TestComponent event={singleDayAllDayEvent} />);

      const trigger = screen.getByRole("button", {
        name: "Event Trigger",
      });
      await user.hover(trigger);

      await waitFor(() => {
        expect(
          screen.getByText("Single Day All Day Event"),
        ).toBeInTheDocument();
        expect(
          screen.getByText("This is a single day all day event"),
        ).toBeInTheDocument();
      });

      // Should not show any time/date info for all-day events
      expect(screen.queryByText(/2024-01-15/)).not.toBeInTheDocument();
      expect(screen.queryByText(/2024-01-17/)).not.toBeInTheDocument();
    });

    it("should show menu for multi-day all-day event without time display", async () => {
      const user = userEvent.setup();
      render(<TestComponent event={multiDayAllDayEvent} />);

      const trigger = screen.getByRole("button", {
        name: "Event Trigger",
      });
      await user.hover(trigger);

      await waitFor(() => {
        expect(screen.getByText("Multi Day All Day Event")).toBeInTheDocument();
        expect(
          screen.getByText("This is a multi day all day event"),
        ).toBeInTheDocument();
      });

      // Should not show any time/date info for all-day events
      expect(screen.queryByText(/2024-01-15/)).not.toBeInTheDocument();
      expect(screen.queryByText(/2024-01-17/)).not.toBeInTheDocument();
    });

    it("should show menu on focus for all-day events", async () => {
      const user = userEvent.setup();
      render(<TestComponent event={singleDayAllDayEvent} />);

      const trigger = screen.getByRole("button", {
        name: "Event Trigger",
      });
      await act(async () => {
        await user.tab();
      });

      expect(document.activeElement).toBe(trigger);

      await waitFor(() => {
        expect(
          screen.getByText("Single Day All Day Event"),
        ).toBeInTheDocument();
      });
    });

    it("should close menu on outside click for all-day events", async () => {
      const user = userEvent.setup();
      render(
        <div>
          <TestComponent event={multiDayAllDayEvent} />
          <button>Outside Button</button>
        </div>,
      );

      const trigger = screen.getByRole("button", {
        name: "Event Trigger",
      });
      await act(async () => {
        await user.hover(trigger);
      });

      await waitFor(() => {
        expect(screen.getByText("Multi Day All Day Event")).toBeInTheDocument();
      });

      const outsideButton = screen.getByRole("button", {
        name: "Outside Button",
      });
      await act(async () => {
        await user.click(outsideButton);
      });

      await waitFor(() => {
        expect(
          screen.queryByText("Multi Day All Day Event"),
        ).not.toBeInTheDocument();
      });
    });
  });
});
