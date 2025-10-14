import { act, renderHook } from "@testing-library/react";
import { useContextMenu } from "./useContextMenu";

// Mock window properties
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

Object.defineProperty(window, "innerWidth", {
  value: 1000,
  writable: true,
});

Object.defineProperty(window, "innerHeight", {
  value: 800,
  writable: true,
});

describe("useContextMenu", () => {
  const mockActions = {
    onRename: jest.fn(),
    onSetPriority: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with closed state", () => {
    const { result } = renderHook(() =>
      useContextMenu({ actions: mockActions }),
    );

    expect(result.current.contextMenu).toBeNull();
    expect(result.current.isOpen).toBe(false);
  });

  it("should show context menu at specified coordinates", () => {
    const { result } = renderHook(() =>
      useContextMenu({ actions: mockActions }),
    );

    act(() => {
      result.current.showContextMenu(100, 200, "event-1");
    });

    expect(result.current.contextMenu).toEqual({
      x: 100,
      y: 200,
      eventId: "event-1",
    });
    expect(result.current.isOpen).toBe(true);
  });

  it("should clamp coordinates to viewport bounds", () => {
    const { result } = renderHook(() =>
      useContextMenu({ actions: mockActions }),
    );

    // Test coordinates outside viewport
    act(() => {
      result.current.showContextMenu(2000, 2000, "event-1");
    });

    expect(result.current.contextMenu?.x).toBe(772); // 1000 - 220 - 8
    expect(result.current.contextMenu?.y).toBe(612); // 800 - 180 - 8
  });

  it("should clamp coordinates to minimum bounds", () => {
    const { result } = renderHook(() =>
      useContextMenu({ actions: mockActions }),
    );

    // Test negative coordinates
    act(() => {
      result.current.showContextMenu(-100, -100, "event-1");
    });

    expect(result.current.contextMenu?.x).toBe(8);
    expect(result.current.contextMenu?.y).toBe(8);
  });

  it("should hide context menu", () => {
    const { result } = renderHook(() =>
      useContextMenu({ actions: mockActions }),
    );

    act(() => {
      result.current.showContextMenu(100, 200, "event-1");
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.hideContextMenu();
    });

    expect(result.current.contextMenu).toBeNull();
    expect(result.current.isOpen).toBe(false);
  });

  it("should call onClose when hiding menu", () => {
    const onClose = jest.fn();
    const { result } = renderHook(() =>
      useContextMenu({
        actions: mockActions,
        onClose,
      }),
    );

    act(() => {
      result.current.showContextMenu(100, 200, "event-1");
    });

    act(() => {
      result.current.hideContextMenu();
    });

    expect(onClose).toHaveBeenCalled();
  });

  it("should handle Escape key to close menu", () => {
    const { result } = renderHook(() =>
      useContextMenu({ actions: mockActions }),
    );

    act(() => {
      result.current.showContextMenu(100, 200, "event-1");
    });

    expect(result.current.isOpen).toBe(true);

    // Simulate Escape key press
    const keydownHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "keydown",
    )?.[1];

    act(() => {
      keydownHandler?.({
        key: "Escape",
        preventDefault: jest.fn(),
      } as any);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("should handle W key to set Work priority", () => {
    const { result } = renderHook(() =>
      useContextMenu({ actions: mockActions }),
    );

    act(() => {
      result.current.showContextMenu(100, 200, "event-1");
    });

    const keydownHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "keydown",
    )?.[1];

    act(() => {
      keydownHandler?.({
        key: "w",
        preventDefault: jest.fn(),
      } as any);
    });

    expect(mockActions.onSetPriority).toHaveBeenCalledWith("event-1", "Work");
    expect(result.current.isOpen).toBe(false);
  });

  it("should handle S key to set Self priority", () => {
    const { result } = renderHook(() =>
      useContextMenu({ actions: mockActions }),
    );

    act(() => {
      result.current.showContextMenu(100, 200, "event-1");
    });

    const keydownHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "keydown",
    )?.[1];

    act(() => {
      keydownHandler?.({
        key: "s",
        preventDefault: jest.fn(),
      } as any);
    });

    expect(mockActions.onSetPriority).toHaveBeenCalledWith("event-1", "Self");
    expect(result.current.isOpen).toBe(false);
  });

  it("should handle R key to set Relationships priority", () => {
    const { result } = renderHook(() =>
      useContextMenu({ actions: mockActions }),
    );

    act(() => {
      result.current.showContextMenu(100, 200, "event-1");
    });

    const keydownHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "keydown",
    )?.[1];

    act(() => {
      keydownHandler?.({
        key: "r",
        preventDefault: jest.fn(),
      } as any);
    });

    expect(mockActions.onSetPriority).toHaveBeenCalledWith(
      "event-1",
      "Relationships",
    );
    expect(result.current.isOpen).toBe(false);
  });

  it("should handle case insensitive key matching", () => {
    const { result } = renderHook(() =>
      useContextMenu({ actions: mockActions }),
    );

    act(() => {
      result.current.showContextMenu(100, 200, "event-1");
    });

    const keydownHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "keydown",
    )?.[1];

    act(() => {
      keydownHandler?.({
        key: "W", // Uppercase W
        preventDefault: jest.fn(),
      } as any);
    });

    expect(mockActions.onSetPriority).toHaveBeenCalledWith("event-1", "Work");
    expect(result.current.isOpen).toBe(false);
  });

  it("should not handle other keys when menu is open", () => {
    const { result } = renderHook(() =>
      useContextMenu({ actions: mockActions }),
    );

    act(() => {
      result.current.showContextMenu(100, 200, "event-1");
    });

    const keydownHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "keydown",
    )?.[1];

    act(() => {
      keydownHandler?.({
        key: "a", // Random key
        preventDefault: jest.fn(),
      } as any);
    });

    expect(mockActions.onSetPriority).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(true);
  });

  it("should not handle keys when menu is closed", () => {
    const { result } = renderHook(() =>
      useContextMenu({ actions: mockActions }),
    );

    const keydownHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "keydown",
    )?.[1];

    act(() => {
      keydownHandler?.({
        key: "w",
        preventDefault: jest.fn(),
      } as any);
    });

    expect(mockActions.onSetPriority).not.toHaveBeenCalled();
  });

  it("should add and remove event listeners", () => {
    const { unmount } = renderHook(() =>
      useContextMenu({ actions: mockActions }),
    );

    // Should add keydown listener
    expect(mockAddEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );

    // Should add click and contextmenu listeners when menu opens
    act(() => {
      result.current.showContextMenu(100, 200, "event-1");
    });

    expect(mockAddEventListener).toHaveBeenCalledWith(
      "click",
      expect.any(Function),
    );
    expect(mockAddEventListener).toHaveBeenCalledWith(
      "contextmenu",
      expect.any(Function),
    );

    unmount();

    // Should remove all listeners
    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );
    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      "click",
      expect.any(Function),
    );
    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      "contextmenu",
      expect.any(Function),
    );
  });

  it("should handle click outside to close menu", () => {
    const { result } = renderHook(() =>
      useContextMenu({ actions: mockActions }),
    );

    act(() => {
      result.current.showContextMenu(100, 200, "event-1");
    });

    const clickHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "click",
    )?.[1];

    // Mock element that doesn't contain the context menu
    const mockElement = document.createElement("div");
    jest.spyOn(mockElement, "closest").mockReturnValue(null);

    act(() => {
      clickHandler?.({
        target: mockElement,
      } as any);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("should not close menu when clicking on context menu element", () => {
    const { result } = renderHook(() =>
      useContextMenu({ actions: mockActions }),
    );

    act(() => {
      result.current.showContextMenu(100, 200, "event-1");
    });

    const clickHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "click",
    )?.[1];

    // Mock element that contains the context menu
    const mockElement = document.createElement("div");
    const contextMenuElement = document.createElement("div");
    contextMenuElement.setAttribute("data-testid", "event-context-menu");
    jest
      .spyOn(mockElement, "closest")
      .mockReturnValue(contextMenuElement as any);

    act(() => {
      clickHandler?.({
        target: mockElement,
      } as any);
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("should handle context menu event to close menu", () => {
    const { result } = renderHook(() =>
      useContextMenu({ actions: mockActions }),
    );

    act(() => {
      result.current.showContextMenu(100, 200, "event-1");
    });

    const contextMenuHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "contextmenu",
    )?.[1];

    const mockEvent = {
      preventDefault: jest.fn(),
    };

    act(() => {
      contextMenuHandler?.(mockEvent as any);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
  });
});
