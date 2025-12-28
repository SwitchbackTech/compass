import { renderHook } from "@testing-library/react";
import { Schema_Event, WithCompassId } from "@core/types/event.types";
import { useUpdateEvent } from "@web/common/hooks/useUpdateEvent";
import { Schema_WebEvent } from "@web/common/types/web.event.types";
import { editEventSlice } from "@web/ducks/events/slices/event.slice";
import { eventsStore, setDraft } from "@web/store/events";
import { useAppDispatch } from "@web/store/store.hooks";

jest.mock("@web/store/store.hooks", () => ({
  useAppDispatch: jest.fn(),
}));

jest.mock("@web/store/events", () => ({
  setDraft: jest.fn(),
  updateEvent: jest.fn(),
  eventsStore: {
    query: jest.fn(),
  },
}));

jest.mock("@web/ducks/events/slices/event.slice", () => ({
  editEventSlice: {
    actions: {
      request: jest.fn(),
    },
  },
}));

describe("useUpdateEvent", () => {
  const mockDispatch = jest.fn();
  const mockEvent: WithCompassId<Schema_Event> = {
    _id: "123",
    title: "Test Event",
    startDate: "2023-01-01",
    endDate: "2023-01-01",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (eventsStore.query as jest.Mock).mockReturnValue(mockEvent);
  });

  it("should update event in store and dispatch request when saveImmediate is true", () => {
    const { result } = renderHook(() => useUpdateEvent());
    const payload = { event: mockEvent as Schema_WebEvent };

    result.current(payload);

    expect(setDraft).toHaveBeenCalledWith(mockEvent);
    expect(editEventSlice.actions.request).toHaveBeenCalledWith({
      ...payload,
      _id: mockEvent._id,
    });
    expect(mockDispatch).toHaveBeenCalled();
  });

  it("should update event in store but NOT dispatch request when saveImmediate is false", () => {
    const { result } = renderHook(() => useUpdateEvent());
    const payload = { event: mockEvent as Schema_WebEvent };

    result.current(payload, false);

    expect(setDraft).toHaveBeenCalledWith(mockEvent);
    expect(editEventSlice.actions.request).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("should not do anything if event has no _id", () => {
    const { result } = renderHook(() => useUpdateEvent());
    const payload = {
      event: {
        ...mockEvent,
        _id: undefined,
      } as unknown as Schema_WebEvent,
    };

    result.current(payload);

    expect(setDraft).not.toHaveBeenCalled();
    expect(editEventSlice.actions.request).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
