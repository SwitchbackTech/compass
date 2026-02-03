import { renderHook } from "@testing-library/react";
import { useChunkLoadErrorHandler } from "./useChunkLoadErrorHandler";

describe("useChunkLoadErrorHandler", () => {
  let reloadMock: jest.Mock;
  const originalLocation = window.location;

  beforeEach(() => {
    reloadMock = jest.fn();
    // Mock location with reload function
    delete (window as any).location;
    window.location = { ...originalLocation, reload: reloadMock } as any;
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it("should set up error event listeners", () => {
    const addEventListenerSpy = jest.spyOn(window, "addEventListener");

    renderHook(() => useChunkLoadErrorHandler());

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "error",
      expect.any(Function),
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "unhandledrejection",
      expect.any(Function),
    );
  });

  it("should clean up event listeners on unmount", () => {
    const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useChunkLoadErrorHandler());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "error",
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "unhandledrejection",
      expect.any(Function),
    );
  });

  it("should reload page when ChunkLoadError is detected in error event", () => {
    renderHook(() => useChunkLoadErrorHandler());

    // Simulate a ChunkLoadError
    const errorEvent = new ErrorEvent("error", {
      message: "Loading chunk 123 failed",
      error: new Error("Loading chunk 123 failed"),
    });

    window.dispatchEvent(errorEvent);

    expect(reloadMock).toHaveBeenCalled();
  });

  it("should reload page when ChunkLoadError is detected in promise rejection", () => {
    renderHook(() => useChunkLoadErrorHandler());

    // Simulate a ChunkLoadError in promise rejection by dispatching custom event
    const rejectionEvent = new Event("unhandledrejection") as any;
    rejectionEvent.reason = {
      name: "ChunkLoadError",
      message: "Loading chunk failed",
    };
    rejectionEvent.preventDefault = jest.fn();

    window.dispatchEvent(rejectionEvent);

    expect(reloadMock).toHaveBeenCalled();
  });

  it("should not reload page for non-chunk errors", () => {
    renderHook(() => useChunkLoadErrorHandler());

    // Simulate a regular error
    const errorEvent = new ErrorEvent("error", {
      message: "Regular error",
      error: new Error("Regular error"),
    });

    window.dispatchEvent(errorEvent);

    expect(reloadMock).not.toHaveBeenCalled();
  });
});
