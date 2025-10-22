import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
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
  it("should not render all-day events", () => {
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

    expect(screen.queryByText("All Day Event")).not.toBeInTheDocument();
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

  it.skip("should show error message when loading fails", () => {
    const errorMessage = "Network error";
    mockUseDayEvents.mockReturnValue({
      events: [],
      isLoading: false,
      error: errorMessage,
    });

    render(<Agenda />);

    expect(screen.getByText("Failed to load events")).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
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
});
