import { RecurringEventUpdateScope } from "@core/types/event.types";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { renderHook } from "@web/__tests__/__mocks__/mock.render";
import {
  createEventSlice,
  editEventSlice,
} from "@web/ducks/events/slices/event.slice";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { afterAll } from "bun:test";

const mockDispatch = mock();
mock.module("@web/store/store.hooks", () => ({
  useAppDispatch: () => mockDispatch,
}));

const mockCloseEventForm = mock();
mock.module("@web/views/Forms/hooks/useCloseEventForm", () => ({
  useCloseEventForm: () => mockCloseEventForm,
}));

const mockSelectEventById = mock();
mock.module("@web/ducks/events/selectors/event.selectors", () => ({
  selectEventById: mockSelectEventById,
}));

const { useSaveEventForm } =
  require("@web/views/Forms/hooks/useSaveEventForm") as typeof import("@web/views/Forms/hooks/useSaveEventForm");

describe("useSaveEventForm", () => {
  const createEventRequestSpy = spyOn(createEventSlice.actions, "request");
  const editEventRequestSpy = spyOn(editEventSlice.actions, "request");

  beforeEach(() => {
    createEventRequestSpy.mockClear();
    editEventRequestSpy.mockClear();
    mockCloseEventForm.mockClear();
    mockDispatch.mockClear();
    mockSelectEventById.mockReset();
  });

  it("should dispatch createEventSlice.actions.request when not existing", () => {
    mockSelectEventById.mockReturnValue(null);
    const { result } = renderHook(() => useSaveEventForm());

    const event = createMockStandaloneEvent();

    result.current(event);

    expect(createEventRequestSpy).toHaveBeenCalledWith(
      expect.objectContaining(event),
    );

    expect(mockCloseEventForm).toHaveBeenCalled();
  });

  it("should dispatch editEventSlice.actions.request when existing", () => {
    mockSelectEventById.mockReturnValue({});
    const { result } = renderHook(() => useSaveEventForm());

    const event = createMockStandaloneEvent();

    result.current(event);

    expect(editEventRequestSpy).toHaveBeenCalledWith({
      _id: event._id,
      event: expect.objectContaining(event),
      applyTo: RecurringEventUpdateScope.THIS_EVENT,
    });

    expect(mockCloseEventForm).toHaveBeenCalled();
  });

  it("should close form without saving if draft is null", () => {
    const { result } = renderHook(() => useSaveEventForm());

    result.current(null);

    expect(createEventRequestSpy).not.toHaveBeenCalled();
    expect(editEventRequestSpy).not.toHaveBeenCalled();
    expect(mockCloseEventForm).toHaveBeenCalled();
  });
});

afterAll(() => {
  mock.restore();
});
