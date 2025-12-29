import { addEntities } from "@ngneat/elf-entities";
import { renderHook } from "@testing-library/react";
import {
  RecurringEventUpdateScope,
  Schema_Event,
  WithCompassId,
} from "@core/types/event.types";
import {
  closeFloatingAtCursor,
  nodeId$,
  open$,
} from "@web/common/hooks/useOpenAtCursor";
import { deleteEventSlice } from "@web/ducks/events/slices/event.slice";
import { eventsStore, setDraft } from "@web/store/events";
import { useAppDispatch } from "@web/store/store.hooks";
import { useDeleteEvent } from "./useDeleteEvent";

// Mock useAppDispatch
jest.mock("@web/store/store.hooks", () => ({
  useAppDispatch: jest.fn(),
}));

describe("useDeleteEvent Integration", () => {
  const mockDispatch = jest.fn();
  const mockEventId = "event-123";
  const mockEvent = {
    _id: mockEventId,
    title: "Test Event",
    startDate: "2023-01-01",
    endDate: "2023-01-01",
    isAllDay: false,
    priority: "high",
  } as unknown as WithCompassId<Schema_Event>;

  beforeEach(() => {
    jest.clearAllMocks();
    eventsStore.reset();
    closeFloatingAtCursor();
    (useAppDispatch as jest.Mock).mockReturnValue(mockDispatch);

    // Mock window.confirm
    global.confirm = jest.fn();
  });

  it("should dispatch delete action when confirmed and event exists in store", () => {
    // Setup Store
    eventsStore.update(addEntities(mockEvent));
    (global.confirm as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useDeleteEvent(mockEventId));

    // Trigger delete
    result.current();

    // Assertions
    expect(global.confirm).toHaveBeenCalledWith(
      expect.stringContaining("Delete Test Event?"),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      deleteEventSlice.actions.request({
        _id: mockEventId,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      }),
    );
  });

  it("should dispatch delete action with correct scope when provided", () => {
    eventsStore.update(addEntities(mockEvent));
    (global.confirm as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useDeleteEvent(mockEventId));

    // Trigger delete with scope
    result.current(RecurringEventUpdateScope.ALL_EVENTS);

    // Assertions
    expect(global.confirm).toHaveBeenCalledWith(
      expect.stringContaining("Delete all instances of - Test Event?"),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      deleteEventSlice.actions.request({
        _id: mockEventId,
        applyTo: RecurringEventUpdateScope.ALL_EVENTS,
      }),
    );
  });

  it("should NOT dispatch delete action when user cancels confirmation", () => {
    eventsStore.update(addEntities(mockEvent));
    (global.confirm as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useDeleteEvent(mockEventId));

    result.current();

    expect(global.confirm).toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("should NOT dispatch delete action but should reset draft if event is only a draft (not in store)", () => {
    // Setup Draft instead of entities
    setDraft(mockEvent);
    (global.confirm as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useDeleteEvent(mockEventId));

    result.current();

    expect(global.confirm).toHaveBeenCalledWith(
      expect.stringContaining("Delete Test Event?"),
    );
    // Should NOT dispatch because it's not an existing event (persisted)
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("should reset draft and close floating menu after delete attempt", () => {
    eventsStore.update(addEntities(mockEvent));
    setDraft(mockEvent);
    // Open floating menu to verify it closes
    open$.next(true);

    (global.confirm as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useDeleteEvent(mockEventId));

    result.current();

    expect(open$.getValue()).toBe(false);
    expect(nodeId$.getValue()).toBe(null);
  });

  it("should fallback to 'this event' title if title is missing", () => {
    const eventNoTitle = { ...mockEvent, title: undefined };
    eventsStore.update(addEntities(eventNoTitle));
    (global.confirm as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useDeleteEvent(mockEventId));

    result.current();

    expect(global.confirm).toHaveBeenCalledWith(
      expect.stringContaining("Delete this event?"),
    );
  });
});
