import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { Schema_WebEvent } from "@web/common/types/web.event.types";
import { FocusedEvent } from "./FocusedEvent";

describe("FocusedEvent", () => {
  const mockEvent: Schema_WebEvent = {
    ...createMockStandaloneEvent({}),
    _id: "test-event-id",
    title: "Test Event",
    description: "Test Description",
    origin: Origin.COMPASS,
    user: "test-user",
    priority: Priorities.RELATIONS,
    startDate: dayjs().toISOString(),
    endDate: dayjs().add(1, "hour").toISOString(),
  };

  const mockStart = jest.fn();
  const mockEnd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when event is null", () => {
    const { container } = render(<FocusedEvent event={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when event is undefined", () => {
    const { container } = render(<FocusedEvent />);
    expect(container.firstChild).toBeNull();
  });

  it("renders event title correctly", () => {
    render(<FocusedEvent event={mockEvent} />);
    expect(screen.getByText("Test Event")).toBeInTheDocument();
  });

  it("renders 'Untitled Event' when title is missing", () => {
    const eventWithoutTitle = { ...mockEvent, title: undefined };
    render(<FocusedEvent event={eventWithoutTitle} />);
    expect(screen.getByText("Untitled Event")).toBeInTheDocument();
  });

  it("renders event start and end dates", () => {
    render(<FocusedEvent event={mockEvent} />);
    expect(screen.getByText("Start:")).toBeInTheDocument();
    expect(screen.getByText("End:")).toBeInTheDocument();
  });

  it("renders event description when present", () => {
    render(<FocusedEvent event={mockEvent} />);
    expect(screen.getByText("Test Description")).toBeInTheDocument();
  });

  it("does not render description section when description is missing", () => {
    const eventWithoutDescription = { ...mockEvent, description: undefined };
    render(<FocusedEvent event={eventWithoutDescription} />);
    expect(screen.queryByText("Test Description")).not.toBeInTheDocument();
  });

  it("renders Start button when not running", () => {
    render(<FocusedEvent event={mockEvent} start={mockStart} />);
    const button = screen.getByRole("button", { name: /start/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Start");
  });

  it("renders Stop button when running", () => {
    render(
      <FocusedEvent
        event={mockEvent}
        countdown="00:05:30"
        end={mockEnd}
        timeLeft="54 minutes"
      />,
    );
    const button = screen.getByRole("button", { name: /stop/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Stop");
  });

  it("calls start function when Start button is clicked", () => {
    render(<FocusedEvent event={mockEvent} start={mockStart} />);
    const button = screen.getByRole("button", { name: /start/i });
    fireEvent.click(button);
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it("calls end function when Stop button is clicked", () => {
    render(
      <FocusedEvent
        event={mockEvent}
        countdown="00:05:30"
        end={mockEnd}
        timeLeft="54 minutes"
      />,
    );
    const button = screen.getByRole("button", { name: /stop/i });
    fireEvent.click(button);
    expect(mockEnd).toHaveBeenCalledTimes(1);
  });

  it("displays countdown timer when running", () => {
    render(
      <FocusedEvent event={mockEvent} countdown="00:05:30" start={mockStart} />,
    );
    expect(screen.getByText("Elapsed")).toBeInTheDocument();
    expect(screen.getByText("00:05:30")).toBeInTheDocument();
  });

  it("displays time remaining when running", () => {
    render(
      <FocusedEvent
        event={mockEvent}
        countdown="00:05:30"
        timeLeft="54 minutes"
      />,
    );
    expect(screen.getByText("Remaining")).toBeInTheDocument();
    expect(screen.getByText("54 minutes")).toBeInTheDocument();
  });

  it("does not display countdown when not running", () => {
    render(<FocusedEvent event={mockEvent} start={mockStart} />);
    expect(screen.queryByText("Elapsed")).not.toBeInTheDocument();
  });

  it("does not display time remaining when not running", () => {
    render(<FocusedEvent event={mockEvent} start={mockStart} />);
    expect(screen.queryByText("Remaining")).not.toBeInTheDocument();
  });

  it("applies correct aria-label to container", () => {
    render(<FocusedEvent event={mockEvent} />);
    expect(screen.getByRole("article")).toHaveAttribute(
      "aria-label",
      "Focused event",
    );
  });

  it("applies correct button styles for Start state", () => {
    render(<FocusedEvent event={mockEvent} start={mockStart} />);
    const button = screen.getByRole("button", { name: /start/i });
    expect(button).toHaveClass("bg-green-600");
  });

  it("applies correct button styles for Stop state", () => {
    render(
      <FocusedEvent
        event={mockEvent}
        countdown="00:05:30"
        end={mockEnd}
        timeLeft="54 minutes"
      />,
    );
    const button = screen.getByRole("button", { name: /stop/i });
    expect(button).toHaveClass("bg-red-600");
  });

  it("applies green color for countdown over 15 minutes", () => {
    render(<FocusedEvent event={mockEvent} countdown="00:20:00" />);
    const countdownElement = screen.getByText("00:20:00");
    expect(countdownElement).toHaveClass("text-green-400");
  });

  it("applies yellow color for countdown between 5-15 minutes", () => {
    render(<FocusedEvent event={mockEvent} countdown="00:10:00" />);
    const countdownElement = screen.getByText("00:10:00");
    expect(countdownElement).toHaveClass("text-yellow-400");
  });

  it("applies red color for countdown under 5 minutes", () => {
    render(<FocusedEvent event={mockEvent} countdown="00:04:30" />);
    const countdownElement = screen.getByText("00:04:30");
    expect(countdownElement).toHaveClass("text-red-400");
  });

  it("handles event without startDate gracefully", () => {
    const eventWithoutStart = { ...mockEvent, startDate: undefined };
    render(<FocusedEvent event={eventWithoutStart} />);
    expect(screen.getByText("Test Event")).toBeInTheDocument();
  });

  it("handles event without endDate gracefully", () => {
    const eventWithoutEnd = { ...mockEvent, endDate: undefined };
    render(<FocusedEvent event={eventWithoutEnd} />);
    expect(screen.getByText("Test Event")).toBeInTheDocument();
  });

  it("renders with all props provided", () => {
    render(
      <FocusedEvent
        event={mockEvent}
        countdown="00:15:30"
        start={mockStart}
        end={mockEnd}
        timeLeft="44 minutes"
      />,
    );
    expect(screen.getByText("Test Event")).toBeInTheDocument();
    expect(screen.getByText("00:15:30")).toBeInTheDocument();
    expect(screen.getByText("44 minutes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /stop/i })).toBeInTheDocument();
  });
});
