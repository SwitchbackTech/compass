import { SyntheticEvent } from "react";
import { onEventTargetVisibility } from "@web/common/utils/dom-events/event-target-visibility.util";

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();

global.IntersectionObserver = mockIntersectionObserver;

describe("onEventTargetVisibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIntersectionObserver.mockImplementation((callback) => ({
      observe: mockObserve,
      disconnect: mockDisconnect,
      callback,
    }));
  });

  it("should create an IntersectionObserver with the correct callback", () => {
    const mockCallback = jest.fn();
    const mockEvent = {
      currentTarget: document.createElement("div"),
    } as SyntheticEvent<HTMLDivElement>;

    const eventHandler = onEventTargetVisibility(mockCallback, false);
    eventHandler(mockEvent);

    expect(mockIntersectionObserver).toHaveBeenCalledWith(expect.any(Function));
    expect(mockObserve).toHaveBeenCalledWith(mockEvent.currentTarget);
  });

  it("should execute callback when target becomes visible (visible = true)", () => {
    const mockCallback = jest.fn();
    const mockEvent = {
      currentTarget: document.createElement("div"),
    } as SyntheticEvent<HTMLDivElement>;

    let observerCallback: (entries: IntersectionObserverEntry[]) => void;

    mockIntersectionObserver.mockImplementation((callback) => {
      observerCallback = callback;
      return {
        observe: mockObserve,
        disconnect: mockDisconnect,
      };
    });

    const eventHandler = onEventTargetVisibility(mockCallback, true);
    eventHandler(mockEvent);

    // Simulate intersection observer callback with isIntersecting = true
    observerCallback!([{ isIntersecting: true } as IntersectionObserverEntry]);

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it("should execute callback when target becomes hidden (visible = false)", () => {
    const mockCallback = jest.fn();
    const mockEvent = {
      currentTarget: document.createElement("div"),
    } as SyntheticEvent<HTMLDivElement>;

    let observerCallback: (entries: IntersectionObserverEntry[]) => void;

    mockIntersectionObserver.mockImplementation((callback) => {
      observerCallback = callback;
      return {
        observe: mockObserve,
        disconnect: mockDisconnect,
      };
    });

    const eventHandler = onEventTargetVisibility(mockCallback, false);
    eventHandler(mockEvent);

    // Simulate intersection observer callback with isIntersecting = false
    observerCallback!([{ isIntersecting: false } as IntersectionObserverEntry]);

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it("should not execute callback when visibility state doesn't match expected state", () => {
    const mockCallback = jest.fn();
    const mockEvent = {
      currentTarget: document.createElement("div"),
    } as SyntheticEvent<HTMLDivElement>;

    let observerCallback: (entries: IntersectionObserverEntry[]) => void;

    mockIntersectionObserver.mockImplementation((callback) => {
      observerCallback = callback;
      return {
        observe: mockObserve,
        disconnect: mockDisconnect,
      };
    });

    const eventHandler = onEventTargetVisibility(mockCallback, true);
    eventHandler(mockEvent);

    // Simulate intersection observer callback with isIntersecting = false (doesn't match expected true)
    observerCallback!([{ isIntersecting: false } as IntersectionObserverEntry]);

    expect(mockCallback).not.toHaveBeenCalled();
    expect(mockDisconnect).not.toHaveBeenCalled();
  });

  it("should default to visible = false when not specified", () => {
    const mockCallback = jest.fn();
    const mockEvent = {
      currentTarget: document.createElement("div"),
    } as SyntheticEvent<HTMLDivElement>;

    let observerCallback: (entries: IntersectionObserverEntry[]) => void;

    mockIntersectionObserver.mockImplementation((callback) => {
      observerCallback = callback;
      return {
        observe: mockObserve,
        disconnect: mockDisconnect,
      };
    });

    const eventHandler = onEventTargetVisibility(mockCallback);
    eventHandler(mockEvent);

    // Simulate intersection observer callback with isIntersecting = false (matches default)
    observerCallback!([{ isIntersecting: false } as IntersectionObserverEntry]);

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it("should handle multiple entries in intersection observer callback", () => {
    const mockCallback = jest.fn();
    const mockEvent = {
      currentTarget: document.createElement("div"),
    } as SyntheticEvent<HTMLDivElement>;

    let observerCallback: (entries: IntersectionObserverEntry[]) => void;

    mockIntersectionObserver.mockImplementation((callback) => {
      observerCallback = callback;
      return {
        observe: mockObserve,
        disconnect: mockDisconnect,
      };
    });

    const eventHandler = onEventTargetVisibility(mockCallback, true);
    eventHandler(mockEvent);

    // Simulate intersection observer callback with multiple entries
    observerCallback!([
      { isIntersecting: true } as IntersectionObserverEntry,
      { isIntersecting: false } as IntersectionObserverEntry,
    ]);

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it("should work with different HTML element types", () => {
    const mockCallback = jest.fn();
    const buttonEvent = {
      currentTarget: document.createElement("button"),
    } as SyntheticEvent<HTMLButtonElement>;

    const spanEvent = {
      currentTarget: document.createElement("span"),
    } as SyntheticEvent<HTMLSpanElement>;

    const eventHandler = onEventTargetVisibility(mockCallback, false);

    eventHandler(buttonEvent);
    eventHandler(spanEvent);

    expect(mockObserve).toHaveBeenCalledWith(buttonEvent.currentTarget);
    expect(mockObserve).toHaveBeenCalledWith(spanEvent.currentTarget);
    expect(mockObserve).toHaveBeenCalledTimes(2);
  });
});
