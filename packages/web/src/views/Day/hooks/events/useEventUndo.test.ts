import { toast } from "react-toastify";
import { act, renderHook } from "@testing-library/react";
import { Schema_Event } from "@core/types/event.types";
import { createEventSlice } from "@web/ducks/events/slices/event.slice";
import { showUndoDeleteToast } from "@web/views/Day/components/Toasts/UndoToast/UndoDeleteToast";
import { useEventUndo } from "./useEventUndo";

// Mock dependencies
jest.mock("react-toastify");
jest.mock("@web/store/store.hooks", () => ({
  useAppDispatch: () => jest.fn(),
}));
jest.mock("@web/ducks/events/slices/event.slice", () => ({
  createEventSlice: {
    actions: {
      request: jest.fn((payload) => ({ type: "CREATE_EVENT", payload })),
    },
  },
}));
jest.mock("@web/views/Day/components/Toasts/UndoToast/UndoDeleteToast", () => ({
  showUndoDeleteToast: jest.fn(() => "mock-toast-id"),
}));

const mockDispatch = jest.fn();

describe("useEventUndo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(require("@web/store/store.hooks"), "useAppDispatch")
      .mockReturnValue(mockDispatch);
  });

  const mockEvent: Schema_Event = {
    _id: "event-1",
    title: "Test Event",
    startDate: "2024-01-15T09:00:00Z",
    endDate: "2024-01-15T10:00:00Z",
    isAllDay: false,
  };

  it("should initialize with null undo state", () => {
    const { result } = renderHook(() => useEventUndo());

    expect(result.current.undoState).toBeNull();
    expect(result.current.undoToastId).toBeNull();
  });

  it("should store event and show toast when deleteEvent is called", () => {
    const { result } = renderHook(() => useEventUndo());

    act(() => {
      result.current.deleteEvent(mockEvent);
    });

    expect(result.current.undoState).not.toBeNull();
    expect(result.current.undoState?.event).toEqual(mockEvent);
    expect(result.current.undoToastId).toBe("mock-toast-id");
    expect(showUndoDeleteToast).toHaveBeenCalledTimes(1);
  });

  it("should restore event when restoreEvent is called", () => {
    const { result } = renderHook(() => useEventUndo());

    // First delete an event
    act(() => {
      result.current.deleteEvent(mockEvent);
    });

    expect(result.current.undoState).not.toBeNull();

    // Then restore it
    act(() => {
      result.current.restoreEvent();
    });

    // Should dispatch create event action without _id
    expect(mockDispatch).toHaveBeenCalledWith(
      createEventSlice.actions.request({
        title: mockEvent.title,
        startDate: mockEvent.startDate,
        endDate: mockEvent.endDate,
        isAllDay: mockEvent.isAllDay,
        recurrence: mockEvent.recurrence,
      }),
    );

    // Should clear undo state
    expect(result.current.undoState).toBeNull();
    expect(toast.dismiss).toHaveBeenCalledWith("mock-toast-id");
  });

  it("should not restore if no undo state exists", () => {
    const { result } = renderHook(() => useEventUndo());

    act(() => {
      result.current.restoreEvent();
    });

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("should clear undo state when clearUndoState is called", () => {
    const { result } = renderHook(() => useEventUndo());

    // Delete an event
    act(() => {
      result.current.deleteEvent(mockEvent);
    });

    expect(result.current.undoState).not.toBeNull();

    // Clear undo state
    act(() => {
      result.current.clearUndoState();
    });

    expect(result.current.undoState).toBeNull();
    expect(toast.dismiss).toHaveBeenCalledWith("mock-toast-id");
  });

  it("should handle multiple deletions (only most recent can be undone)", () => {
    const { result } = renderHook(() => useEventUndo());

    const event1: Schema_Event = {
      ...mockEvent,
      _id: "event-1",
      title: "Event 1",
    };
    const event2: Schema_Event = {
      ...mockEvent,
      _id: "event-2",
      title: "Event 2",
    };

    // Delete first event
    act(() => {
      result.current.deleteEvent(event1);
    });

    expect(result.current.undoState?.event._id).toBe("event-1");

    // Delete second event (should replace first)
    act(() => {
      result.current.deleteEvent(event2);
    });

    expect(result.current.undoState?.event._id).toBe("event-2");

    // Restore should restore the most recent (event2)
    act(() => {
      result.current.restoreEvent();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      createEventSlice.actions.request({
        title: event2.title,
        startDate: event2.startDate,
        endDate: event2.endDate,
        isAllDay: event2.isAllDay,
        recurrence: event2.recurrence,
      }),
    );
  });
});
