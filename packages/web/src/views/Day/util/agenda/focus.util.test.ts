import { Schema_Event } from "@core/types/event.types";
import { focusFirstAgendaEvent } from "./focus.util";

// Mock document.querySelector
const mockQuerySelector = jest.fn();
const mockElement = {
  focus: jest.fn(),
  scrollIntoView: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  global.document.querySelector = mockQuerySelector;
  mockQuerySelector.mockReturnValue(mockElement);
});

describe("focusFirstAgendaEvent", () => {
  it("should return early when no events", () => {
    focusFirstAgendaEvent([]);
    expect(mockQuerySelector).not.toHaveBeenCalled();
  });

  it("should focus first all-day event (alphabetically sorted)", () => {
    const events: Schema_Event[] = [
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
        _id: "timed-1",
        title: "Timed Event",
        startDate: "2024-01-15T09:00:00Z",
        endDate: "2024-01-15T10:00:00Z",
        isAllDay: false,
      },
    ];

    focusFirstAgendaEvent(events);

    // Should focus "Apple Event" (first alphabetically)
    expect(mockQuerySelector).toHaveBeenCalledWith(
      '[data-event-id="all-day-1"]',
    );
    expect(mockElement.focus).toHaveBeenCalled();
    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "nearest",
    });
  });

  it("should focus current timed event when no all-day events", () => {
    // Mock current time to 10:30 AM
    const mockDate = new Date("2024-01-15T10:30:00Z");
    const DateSpy = jest
      .spyOn(global, "Date")
      .mockImplementation((() => mockDate) as any);

    const events: Schema_Event[] = [
      {
        _id: "timed-1",
        title: "Current Event",
        startDate: "2024-01-15T10:00:00Z",
        endDate: "2024-01-15T11:00:00Z",
        isAllDay: false,
      },
      {
        _id: "timed-2",
        title: "Future Event",
        startDate: "2024-01-15T14:00:00Z",
        endDate: "2024-01-15T15:00:00Z",
        isAllDay: false,
      },
    ];

    focusFirstAgendaEvent(events);

    expect(mockQuerySelector).toHaveBeenCalledWith('[data-event-id="timed-1"]');
    expect(mockElement.focus).toHaveBeenCalled();
    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "nearest",
    });

    // Cleanup
    DateSpy.mockRestore();
  });

  it("should focus next future event", () => {
    // Mock current time to 11:30 AM
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-15T11:30:00Z"));

    const events: Schema_Event[] = [
      {
        _id: "timed-1",
        title: "Past Event",
        startDate: "2024-01-15T09:00:00Z",
        endDate: "2024-01-15T10:00:00Z",
        isAllDay: false,
      },
      {
        _id: "timed-2",
        title: "Future Event",
        startDate: "2024-01-15T14:00:00Z",
        endDate: "2024-01-15T15:00:00Z",
        isAllDay: false,
      },
    ];

    focusFirstAgendaEvent(events);

    expect(mockQuerySelector).toHaveBeenCalledWith('[data-event-id="timed-2"]');
    expect(mockElement.focus).toHaveBeenCalled();
    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "nearest",
    });

    // Cleanup
    jest.useRealTimers();
  });

  it("should focus first timed event as fallback when all are past", () => {
    // Mock current time to 5:00 PM
    const mockDate = new Date("2024-01-15T17:00:00Z");
    const DateSpy = jest
      .spyOn(global, "Date")
      .mockImplementation((() => mockDate) as any);

    const events: Schema_Event[] = [
      {
        _id: "timed-1",
        title: "Morning Event",
        startDate: "2024-01-15T09:00:00Z",
        endDate: "2024-01-15T10:00:00Z",
        isAllDay: false,
      },
      {
        _id: "timed-2",
        title: "Afternoon Event",
        startDate: "2024-01-15T14:00:00Z",
        endDate: "2024-01-15T15:00:00Z",
        isAllDay: false,
      },
    ];

    focusFirstAgendaEvent(events);

    expect(mockQuerySelector).toHaveBeenCalledWith('[data-event-id="timed-1"]');
    expect(mockElement.focus).toHaveBeenCalled();
    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "nearest",
    });

    // Cleanup
    DateSpy.mockRestore();
  });

  it("should handle missing DOM element gracefully", () => {
    mockQuerySelector.mockReturnValue(null);

    const events: Schema_Event[] = [
      {
        _id: "all-day-1",
        title: "All Day Event",
        startDate: "2024-01-15T00:00:00Z",
        endDate: "2024-01-15T23:59:59Z",
        isAllDay: true,
      },
    ];

    // Should not throw an error
    expect(() => focusFirstAgendaEvent(events)).not.toThrow();
    expect(mockQuerySelector).toHaveBeenCalledWith(
      '[data-event-id="all-day-1"]',
    );
  });

  it("should sort timed events by start date", () => {
    // Mock current time to 12:00 PM
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-15T12:00:00Z"));

    const events: Schema_Event[] = [
      {
        _id: "timed-3",
        title: "Late Event",
        startDate: "2024-01-15T15:00:00Z",
        endDate: "2024-01-15T16:00:00Z",
        isAllDay: false,
      },
      {
        _id: "timed-1",
        title: "Early Event",
        startDate: "2024-01-15T13:00:00Z",
        endDate: "2024-01-15T14:00:00Z",
        isAllDay: false,
      },
      {
        _id: "timed-2",
        title: "Middle Event",
        startDate: "2024-01-15T14:00:00Z",
        endDate: "2024-01-15T15:00:00Z",
        isAllDay: false,
      },
    ];

    focusFirstAgendaEvent(events);

    // Should focus the earliest future event (timed-1)
    expect(mockQuerySelector).toHaveBeenCalledWith('[data-event-id="timed-1"]');
    expect(mockElement.focus).toHaveBeenCalled();

    // Cleanup
    jest.useRealTimers();
  });

  it("should sort all-day events alphabetically", () => {
    const events: Schema_Event[] = [
      {
        _id: "all-day-3",
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
        _id: "all-day-2",
        title: "Banana Event",
        startDate: "2024-01-15T00:00:00Z",
        endDate: "2024-01-15T23:59:59Z",
        isAllDay: true,
      },
    ];

    focusFirstAgendaEvent(events);

    // Should focus "Apple Event" (first alphabetically)
    expect(mockQuerySelector).toHaveBeenCalledWith(
      '[data-event-id="all-day-1"]',
    );
    expect(mockElement.focus).toHaveBeenCalled();
  });
});
