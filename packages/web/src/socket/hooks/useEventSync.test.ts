import { useDispatch } from "react-redux";
import { renderHook } from "@testing-library/react";
import {
  EVENT_CHANGED,
  SOMEDAY_EVENT_CHANGED,
} from "@core/constants/websocket.constants";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import { triggerFetch } from "@web/ducks/events/slices/sync.slice";
import { socket } from "../client/socket.client";
import { useEventSync } from "./useEventSync";

// Mock dependencies
jest.mock("react-redux", () => ({
  useDispatch: jest.fn(),
}));
jest.mock("../client/socket.client", () => ({
  socket: {
    on: jest.fn(),
    removeListener: jest.fn(),
  },
}));
jest.mock("@web/ducks/events/slices/sync.slice", () => ({
  triggerFetch: jest.fn(),
}));

describe("useEventSync", () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
  });

  it("sets up socket listeners for EVENT_CHANGED and SOMEDAY_EVENT_CHANGED", () => {
    renderHook(() => useEventSync());

    expect(socket.on).toHaveBeenCalledWith(EVENT_CHANGED, expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith(
      SOMEDAY_EVENT_CHANGED,
      expect.any(Function),
    );
  });

  it("dispatches triggerFetch when EVENT_CHANGED event is received", () => {
    let eventChangedHandler: () => void;
    (socket.on as jest.Mock).mockImplementation((event, handler) => {
      if (event === EVENT_CHANGED) {
        eventChangedHandler = handler;
      }
    });

    renderHook(() => useEventSync());

    // Simulate event
    if (eventChangedHandler!) {
      eventChangedHandler();
    }

    expect(triggerFetch).toHaveBeenCalledWith({
      reason: Sync_AsyncStateContextReason.SOCKET_EVENT_CHANGED,
    });
    expect(mockDispatch).toHaveBeenCalled();
  });

  it("dispatches triggerFetch when SOMEDAY_EVENT_CHANGED event is received", () => {
    let somedayEventChangedHandler: () => void;
    (socket.on as jest.Mock).mockImplementation((event, handler) => {
      if (event === SOMEDAY_EVENT_CHANGED) {
        somedayEventChangedHandler = handler;
      }
    });

    renderHook(() => useEventSync());

    // Simulate event
    if (somedayEventChangedHandler!) {
      somedayEventChangedHandler();
    }

    expect(triggerFetch).toHaveBeenCalledWith({
      reason: Sync_AsyncStateContextReason.SOCKET_SOMEDAY_EVENT_CHANGED,
    });
    expect(mockDispatch).toHaveBeenCalled();
  });

  it("cleans up listeners on unmount", () => {
    const { unmount } = renderHook(() => useEventSync());

    unmount();

    expect(socket.removeListener).toHaveBeenCalledWith(
      EVENT_CHANGED,
      expect.any(Function),
    );
    expect(socket.removeListener).toHaveBeenCalledWith(
      SOMEDAY_EVENT_CHANGED,
      expect.any(Function),
    );
  });
});
