import { renderHook } from "@testing-library/react";
import { RecurringEventUpdateScope } from "@core/types/event.types";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import {
  createEventSlice,
  editEventSlice,
} from "@web/ducks/events/slices/event.slice";
import { useSaveEventForm } from "@web/views/Forms/hooks/useSaveEventForm";

jest.mock("@web/store/store.hooks");
jest.mock("@web/ducks/events/slices/event.slice", () => ({
  createEventSlice: {
    actions: {
      request: jest.fn(),
    },
  },
  editEventSlice: {
    actions: {
      request: jest.fn(),
    },
  },
}));

describe("useSaveEventForm", () => {
  const mockDispatch = jest.fn();
  const mockCloseEventForm = jest.fn();
  const { useAppDispatch } = jest.requireMock("@web/store/store.hooks");

  beforeEach(() => {
    jest.clearAllMocks();
    useAppDispatch.mockReturnValue(mockDispatch);
  });

  it("should dispatch createEventSlice.actions.request when not existing", () => {
    const { result } = renderHook(() =>
      useSaveEventForm({ existing: false, closeEventForm: mockCloseEventForm }),
    );

    const event = createMockStandaloneEvent();

    result.current(event);

    expect(createEventSlice.actions.request).toHaveBeenCalledWith(
      expect.objectContaining(event),
    );

    expect(mockCloseEventForm).toHaveBeenCalled();
  });

  it("should dispatch editEventSlice.actions.request when existing", () => {
    const { result } = renderHook(() =>
      useSaveEventForm({ existing: true, closeEventForm: mockCloseEventForm }),
    );

    const event = createMockStandaloneEvent();

    result.current(event);

    expect(editEventSlice.actions.request).toHaveBeenCalledWith({
      _id: event._id,
      event: expect.objectContaining(event),
      applyTo: RecurringEventUpdateScope.THIS_EVENT,
    });

    expect(mockCloseEventForm).toHaveBeenCalled();
  });

  it("should close form without saving if draft is null", () => {
    const { result } = renderHook(() =>
      useSaveEventForm({ existing: false, closeEventForm: mockCloseEventForm }),
    );

    result.current(null);

    expect(createEventSlice.actions.request).not.toHaveBeenCalled();
    expect(editEventSlice.actions.request).not.toHaveBeenCalled();
    expect(mockCloseEventForm).toHaveBeenCalled();
  });
});
