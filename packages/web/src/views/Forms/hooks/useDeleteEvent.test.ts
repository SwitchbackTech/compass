import { addEntities } from "@ngneat/elf-entities";
import { renderHook } from "@testing-library/react";
import {
  RecurringEventUpdateScope,
  type Schema_Event,
  type WithCompassId,
} from "@core/types/event.types";
import {
  closeFloatingAtCursor,
  nodeId$,
  open$,
} from "@web/common/hooks/useOpenAtCursor";
import { deleteEventSlice } from "@web/ducks/events/slices/event.slice";
import { eventsStore, setDraft } from "@web/store/events";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { afterAll } from "bun:test";

const mockDispatch = mock();
const confirmMock = mock();
const actualStoreHooks = await import("@web/store/store.hooks");

mock.module("@web/store/store.hooks", () => ({
  ...actualStoreHooks,
  useAppDispatch: () => mockDispatch,
}));

const { useDeleteEvent } =
  require("./useDeleteEvent") as typeof import("./useDeleteEvent");

describe("useDeleteEvent Integration", () => {
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
    mockDispatch.mockClear();
    confirmMock.mockClear();
    eventsStore.reset();
    closeFloatingAtCursor();
    global.confirm = confirmMock as typeof global.confirm;
  });

  it("should dispatch delete action when confirmed and event exists in store", () => {
    // Setup Store
    eventsStore.update(addEntities(mockEvent));
    confirmMock.mockReturnValue(true);

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
    confirmMock.mockReturnValue(true);

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
    confirmMock.mockReturnValue(false);

    const { result } = renderHook(() => useDeleteEvent(mockEventId));

    result.current();

    expect(global.confirm).toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("should NOT dispatch delete action but should reset draft if event is only a draft (not in store)", () => {
    // Setup Draft instead of entities
    setDraft(mockEvent);
    confirmMock.mockReturnValue(true);

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

    confirmMock.mockReturnValue(true);

    const { result } = renderHook(() => useDeleteEvent(mockEventId));

    result.current();

    expect(open$.getValue()).toBe(false);
    expect(nodeId$.getValue()).toBe(null);
  });

  it("should fallback to 'this event' title if title is missing", () => {
    const eventNoTitle = { ...mockEvent, title: undefined };
    eventsStore.update(addEntities(eventNoTitle));
    confirmMock.mockReturnValue(true);

    const { result } = renderHook(() => useDeleteEvent(mockEventId));

    result.current();

    expect(global.confirm).toHaveBeenCalledWith(
      expect.stringContaining("Delete this event?"),
    );
  });
});

afterAll(() => {
  mock.restore();
});
