import { renderHook } from "@testing-library/react";
import { type Schema_Event, type WithCompassId } from "@core/types/event.types";
import { type Schema_WebEvent } from "@web/common/types/web.event.types";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { afterAll } from "bun:test";

const mockDispatch = mock();
const useAppDispatch = mock(() => mockDispatch);
const eventsStore = {
  query: mock(),
};
const setDraft = mock();
const editEventSlice = {
  actions: {
    request: mock(),
  },
};

mock.module("@web/store/store.hooks", () => ({
  useAppDispatch,
}));

mock.module("@web/store/events", () => ({
  eventsStore,
  setDraft,
}));

mock.module("@web/ducks/events/slices/event.slice", () => ({
  editEventSlice,
}));

const { useUpdateEvent } =
  require("@web/common/hooks/useUpdateEvent") as typeof import("@web/common/hooks/useUpdateEvent");

describe("useUpdateEvent", () => {
  const mockEvent: WithCompassId<Schema_Event> = {
    _id: "123",
    title: "Test Event",
    startDate: "2023-01-01",
    endDate: "2023-01-01",
  };

  beforeEach(() => {
    editEventSlice.actions.request.mockClear();
    eventsStore.query.mockClear();
    mockDispatch.mockClear();
    setDraft.mockClear();
    useAppDispatch.mockClear();
    useAppDispatch.mockReturnValue(mockDispatch);
    eventsStore.query.mockReturnValue(mockEvent);
  });

  it("should update event in store and dispatch request when saveImmediate is true", () => {
    const { result } = renderHook(() => useUpdateEvent());
    const changedEvent = { ...mockEvent, title: "Updated Event" };
    const payload = { event: changedEvent as Schema_WebEvent };

    result.current(payload);

    expect(setDraft).toHaveBeenCalledWith(changedEvent);
    expect(editEventSlice.actions.request).toHaveBeenCalledWith({
      ...payload,
      _id: mockEvent._id,
    });
    expect(mockDispatch).toHaveBeenCalled();
  });

  it("should update event in store but NOT dispatch request when saveImmediate is false", () => {
    const { result } = renderHook(() => useUpdateEvent());
    const changedEvent = { ...mockEvent, title: "Updated Event" };
    const payload = { event: changedEvent as Schema_WebEvent };

    result.current(payload, false);

    expect(setDraft).toHaveBeenCalledWith(changedEvent);
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

afterAll(() => {
  mock.restore();
});
