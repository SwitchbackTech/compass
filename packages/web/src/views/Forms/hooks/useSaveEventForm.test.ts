import { RecurringEventUpdateScope } from "@core/types/event.types";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { renderHook } from "@web/__tests__/__mocks__/mock.render";
import { selectEventById } from "@web/ducks/events/selectors/event.selectors";
import {
  createEventSlice,
  editEventSlice,
} from "@web/ducks/events/slices/event.slice";
import { useCloseEventForm } from "@web/views/Forms/hooks/useCloseEventForm";
import { useSaveEventForm } from "@web/views/Forms/hooks/useSaveEventForm";

jest.mock("@web/store/store.hooks");
jest.mock("@web/views/Forms/hooks/useCloseEventForm");
jest.mock("@web/ducks/events/selectors/event.selectors");

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
  deleteEventSlice: {
    actions: {
      request: jest.fn(),
    },
  },
  eventsEntitiesSlice: {
    reducer: jest.fn(() => ({})),
  },
  getCurrentMonthEventsSlice: { reducer: jest.fn(() => ({})) },
  getSomedayEventsSlice: { reducer: jest.fn(() => ({})) },
  getWeekEventsSlice: { reducer: jest.fn(() => ({})) },
  getDayEventsSlice: { reducer: jest.fn(() => ({})) },
}));

describe("useSaveEventForm", () => {
  const mockDispatch = jest.fn();
  const mockCloseEventForm = jest.fn();
  const { useAppDispatch } = jest.requireMock("@web/store/store.hooks");

  beforeEach(() => {
    jest.clearAllMocks();
    useAppDispatch.mockReturnValue(mockDispatch);
    (useCloseEventForm as jest.Mock).mockReturnValue(mockCloseEventForm);
  });

  it("should dispatch createEventSlice.actions.request when not existing", () => {
    (selectEventById as jest.Mock).mockReturnValue(null);
    const { result } = renderHook(() => useSaveEventForm());

    const event = createMockStandaloneEvent();

    result.current(event);

    expect(createEventSlice.actions.request).toHaveBeenCalledWith(
      expect.objectContaining(event),
    );

    expect(mockCloseEventForm).toHaveBeenCalled();
  });

  it("should dispatch editEventSlice.actions.request when existing", () => {
    (selectEventById as jest.Mock).mockReturnValue({});
    const { result } = renderHook(() => useSaveEventForm());

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
    const { result } = renderHook(() => useSaveEventForm());

    result.current(null);

    expect(createEventSlice.actions.request).not.toHaveBeenCalled();
    expect(editEventSlice.actions.request).not.toHaveBeenCalled();
    expect(mockCloseEventForm).toHaveBeenCalled();
  });
});
