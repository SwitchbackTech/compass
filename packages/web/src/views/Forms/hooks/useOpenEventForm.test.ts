import { act } from "react";
import { Origin, Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import { renderHook } from "@web/__tests__/__mocks__/mock.render";
import {
  CLASS_TIMED_CALENDAR_EVENT,
  DATA_EVENT_ELEMENT_ID,
} from "@web/common/constants/web.constants";
import { useOpenEventForm } from "@web/views/Forms/hooks/useOpenEventForm";

// Mocks
jest.mock("@web/auth/auth.util");
jest.mock("@web/common/context/mouse-position");
jest.mock("@web/common/utils/dom-events/event-emitter.util");
jest.mock("@web/views/Day/hooks/navigation/useDateInView");
jest.mock("@web/views/Day/util/agenda/agenda.util");
jest.mock("@web/views/Day/util/agenda/focus.util");
jest.mock("@web/ducks/events/selectors/event.selectors");

describe("useOpenEventForm", () => {
  const { getUserId } = jest.requireMock("@web/auth/auth.util");

  const {
    getCursorPosition,
    getMousePointRef,
    isOverAllDayRow,
    isOverMainGrid,
    isOverSidebar,
    isOverSomedayWeek,
    isOverSomedayMonth,
  } = jest.requireMock("@web/common/context/mouse-position");

  const { getElementAtPoint } = jest.requireMock(
    "@web/common/utils/dom-events/event-emitter.util",
  );

  const { useDateInView } = jest.requireMock(
    "@web/views/Day/hooks/navigation/useDateInView",
  );

  const { getEventTimeFromPosition, toNearestFifteenMinutes } =
    jest.requireMock("@web/views/Day/util/agenda/agenda.util");

  const { getEventClass } = jest.requireMock(
    "@web/views/Day/util/agenda/focus.util",
  );

  const { selectEventById } = jest.requireMock(
    "@web/ducks/events/selectors/event.selectors",
  );

  const mockSetDraft = jest.fn();
  const mockSetExisting = jest.fn();
  const mockSetOpenAtMousePosition = jest.fn();
  const mockSetReference = jest.fn();
  const mockDateInView = dayjs("2023-01-01T12:00:00Z");

  beforeEach(() => {
    jest.clearAllMocks();
    useDateInView.mockReturnValue(mockDateInView);
    getUserId.mockResolvedValue("user-123");
    toNearestFifteenMinutes.mockReturnValue(0);
    getCursorPosition.mockReturnValue({ clientX: 100, clientY: 100 });
    getElementAtPoint.mockReturnValue({ element: null });
    getEventClass.mockReturnValue(null);
    getMousePointRef.mockReturnValue({});

    // Default mouse state
    isOverAllDayRow.mockReturnValue(false);
    isOverMainGrid.mockReturnValue(false);
    isOverSidebar.mockReturnValue(false);
    isOverSomedayWeek.mockReturnValue(false);
    isOverSomedayMonth.mockReturnValue(false);
  });

  it("should open form for new timed event when over main grid", async () => {
    const mockStartTime = dayjs("2023-01-01T10:00:00Z");
    const mockEndTime = dayjs("2023-01-01T10:15:00Z");

    isOverMainGrid.mockReturnValue(true);
    getEventTimeFromPosition.mockReturnValue(mockStartTime);

    const { result } = renderHook(() =>
      useOpenEventForm({
        setDraft: mockSetDraft,
        setExisting: mockSetExisting,
        setReference: mockSetReference,
        setOpenAtMousePosition: mockSetOpenAtMousePosition,
      }),
    );

    await act(async () => {
      await result.current();
    });

    expect(mockSetExisting).toHaveBeenCalledWith(false);
    expect(mockSetDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: mockStartTime.toISOString(),
        endDate: mockEndTime.toISOString(),
        isAllDay: false,
        user: "user-123",
        priority: Priorities.UNASSIGNED,
        origin: Origin.COMPASS,
      }),
    );
    expect(mockSetOpenAtMousePosition).toHaveBeenCalledWith(true);
  });

  it("should open form for new all-day event when over all-day row", async () => {
    isOverAllDayRow.mockReturnValue(true);

    const { result } = renderHook(() =>
      useOpenEventForm({
        setDraft: mockSetDraft,
        setExisting: mockSetExisting,
        setReference: mockSetReference,
        setOpenAtMousePosition: mockSetOpenAtMousePosition,
      }),
    );

    await act(async () => {
      await result.current();
    });

    expect(mockSetExisting).toHaveBeenCalledWith(false);
    expect(mockSetDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: mockDateInView.startOf("day").toISOString(),
        endDate: mockDateInView.startOf("day").add(1, "day").toISOString(),
        isAllDay: true,
      }),
    );
  });

  it("should open form for existing event", async () => {
    const mockEventElement = document.createElement("div");
    mockEventElement.classList.add(CLASS_TIMED_CALENDAR_EVENT);
    mockEventElement.setAttribute(DATA_EVENT_ELEMENT_ID, "event-123");

    const mockEvent = {
      _id: "event-123",
      title: "Existing Event",
    };

    getElementAtPoint.mockReturnValue({ element: mockEventElement });
    getEventClass.mockReturnValue(CLASS_TIMED_CALENDAR_EVENT);
    selectEventById.mockReturnValue(mockEvent);

    const { result } = renderHook(() =>
      useOpenEventForm({
        setDraft: mockSetDraft,
        setExisting: mockSetExisting,
        setReference: mockSetReference,
        setOpenAtMousePosition: mockSetOpenAtMousePosition,
      }),
    );

    await act(async () => {
      await result.current();
    });

    expect(mockSetExisting).toHaveBeenCalledWith(true);
    expect(mockSetDraft).toHaveBeenCalledWith(mockEvent);
    expect(mockSetReference).toHaveBeenCalled();
  });
});
