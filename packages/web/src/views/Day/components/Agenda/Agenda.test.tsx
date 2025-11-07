import { act } from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useDayEvents } from "../../data/day.data";
import { Agenda } from "./Agenda";

// Mock the useDayEvents hook
jest.mock("../../data/day.data");
const mockUseDayEvents = useDayEvents as jest.MockedFunction<
  typeof useDayEvents
>;

describe("CalendarAgenda", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render time labels", () => {
    mockUseDayEvents.mockReturnValue({
      events: [],
      isLoading: false,
      error: null,
    });

    render(<Agenda />);

    expect(screen.getByText("12am")).toBeInTheDocument();
    expect(screen.getByText("12pm")).toBeInTheDocument();
    expect(screen.getByText("6am")).toBeInTheDocument();
    expect(screen.getByText("6pm")).toBeInTheDocument();
  });

  it("should render multiple events", () => {
    const mockEvents = [
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

    mockUseDayEvents.mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
    });

    render(<Agenda />);

    expect(screen.getByText("Event 1")).toBeInTheDocument();
    expect(screen.getByText("Event 2")).toBeInTheDocument();
  });
  it("should render all-day events", () => {
    const mockEvents = [
      {
        _id: "event-all-day",
        title: "All Day Event",
        startDate: "2024-01-15T00:00:00Z",
        endDate: "2024-01-15T23:59:59Z",
        isAllDay: true,
      },
    ];

    mockUseDayEvents.mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
    });

    render(<Agenda />);

    expect(screen.getByText("All Day Event")).toBeInTheDocument();
  });

  it("should show skeleton during loading", () => {
    mockUseDayEvents.mockReturnValue({
      events: [],
      isLoading: true,
      error: null,
    });

    render(<Agenda />);

    // Check for skeleton elements (they have animate-pulse class)
    const skeletonElements = document.querySelectorAll(".animate-pulse");
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it("should not show skeleton or error when events are loaded", () => {
    const mockEvents = [
      {
        _id: "event-1",
        title: "Test Event",
        startDate: "2024-01-15T10:00:00Z",
        endDate: "2024-01-15T11:00:00Z",
        isAllDay: false,
      },
    ];

    mockUseDayEvents.mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
    });

    render(<Agenda />);

    // Should not show skeleton
    const skeletonElements = document.querySelectorAll(".animate-pulse");
    expect(skeletonElements).toHaveLength(0);

    // Should not show error
    expect(screen.queryByText("Failed to load events")).not.toBeInTheDocument();

    // Should show events
    expect(screen.getByText("Test Event")).toBeInTheDocument();
  });

  it("should render events with correct tabIndex and data attributes", () => {
    const mockEvents = [
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

    mockUseDayEvents.mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
    });

    render(<Agenda />);

    // Check that all-day events are rendered with correct attributes
    const allDayEvent = screen.getByRole("button", {
      name: "All Day Event 1",
    });
    expect(allDayEvent).toHaveAttribute("tabIndex", "0");
    expect(allDayEvent).toHaveAttribute("role", "button");
    expect(allDayEvent).toHaveAttribute("data-event-id", "all-day-1");

    // Check that timed events are rendered with correct attributes
    const timedEvent = screen.getByRole("button", {
      name: "Timed Event 1",
    });
    expect(timedEvent).toHaveAttribute("tabIndex", "0");
    expect(timedEvent).toHaveAttribute("role", "button");
  });

  it("should render events in correct TAB navigation order", async () => {
    const user = userEvent.setup();
    const mockEvents = [
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

    mockUseDayEvents.mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
    });

    render(<Agenda />);

    // Focus the first element (should be Apple Event - all-day events sorted alphabetically)
    await act(async () => {
      await user.tab();
    });
    expect(document.activeElement).toHaveTextContent("Apple Event");

    // Tab to second element (should be Zebra Event - all-day events sorted alphabetically)
    await act(async () => {
      await user.tab();
    });
    expect(document.activeElement).toHaveTextContent("Zebra Event");

    // Tab to third element (should be Breakfast Event - timed events sorted by start time)
    await act(async () => {
      await user.tab();
    });
    expect(document.activeElement).toHaveTextContent("Breakfast Event");

    // Tab to fourth element (should be Lunch Event - timed events sorted by start time)
    await act(async () => {
      await user.tab();
    });
    expect(document.activeElement).toHaveTextContent("Lunch Event");
  });
});
