import { renderHook } from "@testing-library/react";
import { useCalendarEventKeyboard } from "./useCalendarEventKeyboard";

// Mock window.addEventListener and removeEventListener
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

Object.defineProperty(window, "addEventListener", {
  value: mockAddEventListener,
  writable: true,
});

Object.defineProperty(window, "removeEventListener", {
  value: mockRemoveEventListener,
  writable: true,
});

// Mock HTMLElement methods
const mockFocus = jest.fn();
const mockScrollIntoView = jest.fn();
const mockQuerySelector = jest.fn();

const createMockElement = (id: string, part: string) => ({
  focus: mockFocus,
  scrollIntoView: mockScrollIntoView,
  getAttribute: jest.fn((attr) => {
    if (attr === "data-event-id") return id;
    if (attr === "data-event-part") return part;
    return null;
  }),
});

describe("useCalendarEventKeyboard", () => {
  const mockActions = {
    setFocusedTaskId: jest.fn(),
    setFocusedEventId: jest.fn(),
    setFocusedEventPart: jest.fn(),
  };

  const mockTimeBlocks = [
    {
      id: "event-1",
      startTime: "09:00",
      endTime: "10:00",
      title: "Event 1",
      priority: "Work" as const,
      category: "Meeting",
    },
    {
      id: "event-2",
      startTime: "10:00",
      endTime: "11:00",
      title: "Event 2",
      priority: "Self" as const,
      category: "Personal",
    },
  ];

  const mockCalendarScrollRef = {
    current: {
      querySelector: mockQuerySelector,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should add and remove event listeners", () => {
    const { unmount } = renderHook(() =>
      useCalendarEventKeyboard({
        timeBlocks: mockTimeBlocks,
        focusedEventId: null,
        focusedEventPart: null,
        calendarScrollRef: mockCalendarScrollRef as any,
        actions: mockActions,
      }),
    );

    expect(mockAddEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );
    expect(mockRemoveEventListener).not.toHaveBeenCalled();

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );
  });

  it("should not handle keys when no event is focused", () => {
    renderHook(() =>
      useCalendarEventKeyboard({
        timeBlocks: mockTimeBlocks,
        focusedEventId: null,
        focusedEventPart: null,
        calendarScrollRef: mockCalendarScrollRef as any,
        actions: mockActions,
      }),
    );

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "Tab",
      preventDefault: jest.fn(),
    };

    // Mock document.activeElement to not have event attributes
    Object.defineProperty(document, "activeElement", {
      value: document.createElement("div"),
      writable: true,
    });

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    expect(mockActions.setFocusedEventId).not.toHaveBeenCalled();
  });

  it("should handle Tab navigation within event parts", () => {
    renderHook(() =>
      useCalendarEventKeyboard({
        timeBlocks: mockTimeBlocks,
        focusedEventId: "event-1",
        focusedEventPart: "start",
        calendarScrollRef: mockCalendarScrollRef as any,
        actions: mockActions,
      }),
    );

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "Tab",
      preventDefault: jest.fn(),
    };

    // Mock document.activeElement to be focused on event-1 start
    const mockElement = createMockElement("event-1", "start");
    Object.defineProperty(document, "activeElement", {
      value: mockElement,
      writable: true,
    });

    // Mock querySelector to return the next part element
    mockQuerySelector.mockReturnValue(createMockElement("event-1", "block"));

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockActions.setFocusedTaskId).toHaveBeenCalledWith(null);
    expect(mockActions.setFocusedEventId).toHaveBeenCalledWith("event-1");
    expect(mockActions.setFocusedEventPart).toHaveBeenCalledWith("block");
    expect(mockFocus).toHaveBeenCalled();
  });

  it("should handle Shift+Tab navigation within event parts", () => {
    renderHook(() =>
      useCalendarEventKeyboard({
        timeBlocks: mockTimeBlocks,
        focusedEventId: "event-1",
        focusedEventPart: "block",
        calendarScrollRef: mockCalendarScrollRef as any,
        actions: mockActions,
      }),
    );

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "Tab",
      shiftKey: true,
      preventDefault: jest.fn(),
    };

    // Mock document.activeElement to be focused on event-1 block
    const mockElement = createMockElement("event-1", "block");
    Object.defineProperty(document, "activeElement", {
      value: mockElement,
      writable: true,
    });

    // Mock querySelector to return the previous part element
    mockQuerySelector.mockReturnValue(createMockElement("event-1", "start"));

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockActions.setFocusedTaskId).toHaveBeenCalledWith(null);
    expect(mockActions.setFocusedEventId).toHaveBeenCalledWith("event-1");
    expect(mockActions.setFocusedEventPart).toHaveBeenCalledWith("start");
    expect(mockFocus).toHaveBeenCalled();
  });

  it("should navigate to next event when at end of current event", () => {
    renderHook(() =>
      useCalendarEventKeyboard({
        timeBlocks: mockTimeBlocks,
        focusedEventId: "event-1",
        focusedEventPart: "end",
        calendarScrollRef: mockCalendarScrollRef as any,
        actions: mockActions,
      }),
    );

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "Tab",
      preventDefault: jest.fn(),
    };

    // Mock document.activeElement to be focused on event-1 end
    const mockElement = createMockElement("event-1", "end");
    Object.defineProperty(document, "activeElement", {
      value: mockElement,
      writable: true,
    });

    // Mock querySelector to return the next event's start element
    mockQuerySelector.mockReturnValue(createMockElement("event-2", "start"));

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockActions.setFocusedEventId).toHaveBeenCalledWith("event-2");
    expect(mockActions.setFocusedEventPart).toHaveBeenCalledWith("start");
    expect(mockFocus).toHaveBeenCalled();
  });

  it("should navigate to previous event when at start of current event with Shift+Tab", () => {
    renderHook(() =>
      useCalendarEventKeyboard({
        timeBlocks: mockTimeBlocks,
        focusedEventId: "event-2",
        focusedEventPart: "start",
        calendarScrollRef: mockCalendarScrollRef as any,
        actions: mockActions,
      }),
    );

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "Tab",
      shiftKey: true,
      preventDefault: jest.fn(),
    };

    // Mock document.activeElement to be focused on event-2 start
    const mockElement = createMockElement("event-2", "start");
    Object.defineProperty(document, "activeElement", {
      value: mockElement,
      writable: true,
    });

    // Mock querySelector to return the previous event's end element
    mockQuerySelector.mockReturnValue(createMockElement("event-1", "end"));

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockActions.setFocusedEventId).toHaveBeenCalledWith("event-1");
    expect(mockActions.setFocusedEventPart).toHaveBeenCalledWith("end");
    expect(mockFocus).toHaveBeenCalled();
  });

  it("should handle focus errors gracefully", () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    renderHook(() =>
      useCalendarEventKeyboard({
        timeBlocks: mockTimeBlocks,
        focusedEventId: "event-1",
        focusedEventPart: "start",
        calendarScrollRef: mockCalendarScrollRef as any,
        actions: mockActions,
      }),
    );

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "Tab",
      preventDefault: jest.fn(),
    };

    // Mock document.activeElement to be focused on event-1 start
    const mockElement = createMockElement("event-1", "start");
    Object.defineProperty(document, "activeElement", {
      value: mockElement,
      writable: true,
    });

    // Mock querySelector to return an element that throws on focus
    const mockTargetElement = createMockElement("event-1", "block");
    mockTargetElement.focus = jest.fn().mockImplementation(() => {
      throw new Error("Focus failed");
    });
    mockQuerySelector.mockReturnValue(mockTargetElement);

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockActions.setFocusedEventId).toHaveBeenCalledWith("event-1");
    expect(mockActions.setFocusedEventPart).toHaveBeenCalledWith("block");
    // Should not throw error
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should handle scrollIntoView errors gracefully", () => {
    renderHook(() =>
      useCalendarEventKeyboard({
        timeBlocks: mockTimeBlocks,
        focusedEventId: "event-1",
        focusedEventPart: "start",
        calendarScrollRef: mockCalendarScrollRef as any,
        actions: mockActions,
      }),
    );

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "Tab",
      preventDefault: jest.fn(),
    };

    // Mock document.activeElement to be focused on event-1 start
    const mockElement = createMockElement("event-1", "start");
    Object.defineProperty(document, "activeElement", {
      value: mockElement,
      writable: true,
    });

    // Mock querySelector to return an element that throws on scrollIntoView
    const mockTargetElement = createMockElement("event-1", "block");
    mockTargetElement.scrollIntoView = jest.fn().mockImplementation(() => {
      throw new Error("Scroll failed");
    });
    mockQuerySelector.mockReturnValue(mockTargetElement);

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockActions.setFocusedEventId).toHaveBeenCalledWith("event-1");
    expect(mockActions.setFocusedEventPart).toHaveBeenCalledWith("block");
    // Should not throw error
  });

  it("should handle empty timeBlocks array", () => {
    renderHook(() =>
      useCalendarEventKeyboard({
        timeBlocks: [],
        focusedEventId: "event-1",
        focusedEventPart: "start",
        calendarScrollRef: mockCalendarScrollRef as any,
        actions: mockActions,
      }),
    );

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "Tab",
      preventDefault: jest.fn(),
    };

    // Mock document.activeElement to be focused on event-1 start
    const mockElement = createMockElement("event-1", "start");
    Object.defineProperty(document, "activeElement", {
      value: mockElement,
      writable: true,
    });

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    // Should not call any actions when no time blocks exist
    expect(mockActions.setFocusedEventId).not.toHaveBeenCalled();
  });

  it("should handle case insensitive key matching", () => {
    renderHook(() =>
      useCalendarEventKeyboard({
        timeBlocks: mockTimeBlocks,
        focusedEventId: "event-1",
        focusedEventPart: "start",
        calendarScrollRef: mockCalendarScrollRef as any,
        actions: mockActions,
      }),
    );

    const keydownHandler = mockAddEventListener.mock.calls[0][1];
    const mockEvent = {
      key: "TAB", // Uppercase Tab
      preventDefault: jest.fn(),
    };

    // Mock document.activeElement to be focused on event-1 start
    const mockElement = createMockElement("event-1", "start");
    Object.defineProperty(document, "activeElement", {
      value: mockElement,
      writable: true,
    });

    mockQuerySelector.mockReturnValue(createMockElement("event-1", "block"));

    keydownHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockActions.setFocusedEventId).toHaveBeenCalledWith("event-1");
  });
});
