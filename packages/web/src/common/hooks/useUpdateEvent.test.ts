import { renderHook } from "@testing-library/react";
import { Schema_Event, WithCompassId } from "@core/types/event.types";
import { useUpdateEvent } from "@web/common/hooks/useUpdateEvent";
import { editEventSlice } from "@web/ducks/events/slices/event.slice";
import { updateEvent } from "@web/store/events";
import { useAppDispatch } from "@web/store/store.hooks";

jest.mock("@web/store/store.hooks", () => ({
  useAppDispatch: jest.fn(),
}));

jest.mock("@web/store/events", () => ({
  updateEvent: jest.fn(),
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
  });

  it("should update event in store and dispatch request when saveImmediate is true", () => {
    const { result } = renderHook(() => useUpdateEvent());
    const payload = { event: mockEvent };

    result.current(payload);

    expect(updateEvent).toHaveBeenCalledWith(mockEvent);
    expect(editEventSlice.actions.request).toHaveBeenCalledWith({
      ...payload,
      _id: mockEvent._id,
    });
    expect(mockDispatch).toHaveBeenCalled();
  });

  it("should update event in store but NOT dispatch request when saveImmediate is false", () => {
    const { result } = renderHook(() => useUpdateEvent());
    const payload = { event: mockEvent };

    result.current(payload, false);

    expect(updateEvent).toHaveBeenCalledWith(mockEvent);
    expect(editEventSlice.actions.request).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("should not do anything if event has no _id", () => {
    const { result } = renderHook(() => useUpdateEvent());
    const payload = { event: { ...mockEvent, _id: undefined } };

    // @ts-ignore
    result.current(payload);

    expect(updateEvent).not.toHaveBeenCalled();
    expect(editEventSlice.actions.request).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
