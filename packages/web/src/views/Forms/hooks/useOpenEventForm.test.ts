import { ObjectId } from "bson";
import { act } from "react";
import { renderHook } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import {
  CLASS_TIMED_CALENDAR_EVENT,
  DATA_EVENT_ELEMENT_ID,
} from "@web/common/constants/web.constants";
import { isElementInViewport } from "@web/common/context/pointer-position";
import { openFloatingAtCursor } from "@web/common/hooks/useOpenAtCursor";
import { getCalendarEventElementFromGrid } from "@web/common/utils/event/event.util";
import { eventsStore, setDraft } from "@web/store/events";
import { useOpenEventForm } from "@web/views/Forms/hooks/useOpenEventForm";

// Mocks
jest.mock("@web/auth/auth.util");
jest.mock("@web/common/context/pointer-position");
jest.mock("@web/common/utils/dom/event-emitter.util");
jest.mock("@web/views/Day/hooks/navigation/useDateInView");
jest.mock("@web/views/Day/util/agenda/agenda.util");
jest.mock("@web/views/Day/util/agenda/focus.util");
jest.mock("@web/common/hooks/useOpenAtCursor", () => ({
  openFloatingAtCursor: jest.fn(),
  CursorItem: { EventForm: "EventForm" },
}));
jest.mock("@web/store/events", () => ({
  eventsStore: {
    query: jest.fn(),
  },
  getDraft: jest.fn(),
  setDraft: jest.fn(),
}));
jest.mock("@web/common/utils/event/event.util", () => ({
  getCalendarEventElementFromGrid: jest.fn(),
}));
jest.mock("@web/store/store.hooks", () => ({
  useAppSelector: jest.fn((selector) => {
    // Mock pending events - return empty Set by default
    if (typeof selector === "function") {
      return selector({
        events: {
          pendingEvents: {
            eventIds: new Set<string>(),
          },
        },
      });
    }
    return selector;
  }),
}));

describe("useOpenEventForm", () => {
  beforeAll(() => {
    (getCalendarEventElementFromGrid as jest.Mock).mockImplementation(() => {
      return document.createElement("div");
    });
    (isElementInViewport as jest.Mock).mockReturnValue(true);
  });

  const { getUserId } = jest.requireMock("@web/auth/auth.util");

  const {
    getPointerPosition,
    getPointerRef,
    isOverAllDayRow,
    isOverMainGrid,
    isOverSidebar,
    isOverSomedayWeek,
    isOverSomedayMonth,
  } = jest.requireMock("@web/common/context/pointer-position");

  const { getElementAtPoint } = jest.requireMock(
    "@web/common/utils/dom/event-emitter.util",
  );

  const { useDateInView } = jest.requireMock(
    "@web/views/Day/hooks/navigation/useDateInView",
  );

  const { getEventTimeFromPosition, roundToNearestFifteenWithinHour } =
    jest.requireMock("@web/views/Day/util/agenda/agenda.util");

  const { getEventClass } = jest.requireMock(
    "@web/views/Day/util/agenda/focus.util",
  );

  const mockSetDraft = jest.fn();
  const mockSetOpenAtMousePosition = jest.fn();
  const mockDateInView = dayjs("2023-01-01T12:00:00Z");

  beforeEach(() => {
    jest.clearAllMocks();
    (setDraft as jest.Mock).mockImplementation(mockSetDraft);
    (openFloatingAtCursor as jest.Mock).mockImplementation(
      mockSetOpenAtMousePosition,
    );
    useDateInView.mockReturnValue(mockDateInView);
    getUserId.mockResolvedValue("user-123");
    roundToNearestFifteenWithinHour.mockReturnValue(0);
    getPointerPosition.mockReturnValue({ clientX: 100, clientY: 100 });
    getElementAtPoint.mockReturnValue(null);
    getEventClass.mockReturnValue(null);
    getPointerRef.mockReturnValue({});

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

    const { result } = renderHook(() => useOpenEventForm());

    await act(async () => {
      result.current(
        new CustomEvent("click", {
          detail: { create: true },
        }) as unknown as React.PointerEvent<HTMLElement>,
      );
      await Promise.resolve();
    });

    expect(getCalendarEventElementFromGrid).toHaveBeenCalled();
    expect(mockSetDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: mockStartTime.format(),
        endDate: mockEndTime.format(),
        isAllDay: false,
        user: "user-123",
        priority: Priorities.UNASSIGNED,
        origin: Origin.COMPASS,
      }),
    );
    expect(openFloatingAtCursor).toHaveBeenCalled();
  });

  it("should open form for new all-day event when over all-day row", async () => {
    isOverAllDayRow.mockReturnValue(true);

    const { result } = renderHook(useOpenEventForm);

    await act(async () => {
      await result.current(
        new CustomEvent("click", {
          bubbles: true,
          detail: { create: true },
        }) as unknown as React.PointerEvent<HTMLElement>,
      );
    });

    expect(mockSetDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: mockDateInView.startOf("day").format("YYYY-MM-DD"),
        endDate: mockDateInView
          .startOf("day")
          .add(1, "day")
          .format("YYYY-MM-DD"),
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

    getElementAtPoint.mockReturnValue(mockEventElement);
    getEventClass.mockReturnValue(CLASS_TIMED_CALENDAR_EVENT);
    (eventsStore.query as jest.Mock).mockReturnValue(mockEvent);

    const { result } = renderHook(useOpenEventForm);

    await act(async () => {
      await result.current(
        new CustomEvent("click", {
          bubbles: true,
          detail: { create: false, id: mockEvent._id },
        }) as unknown as React.PointerEvent<HTMLElement>,
      );
    });

    expect(mockSetDraft).toHaveBeenCalledWith(mockEvent);
  });

  it("should not open event form for editing if event is pending", async () => {
    const { useAppSelector } = jest.requireMock("@web/store/store.hooks");
    const pendingEventId = new ObjectId().toString();
    const pendingEventIds = new Set([pendingEventId]);

    useAppSelector.mockImplementation(
      (selector: (state: unknown) => unknown) => {
        if (typeof selector === "function") {
          return selector({
            events: {
              pendingEvents: {
                eventIds: pendingEventIds,
              },
            },
          });
        }
        return selector;
      },
    );

    const mockEventElement = document.createElement("div");
    mockEventElement.classList.add(CLASS_TIMED_CALENDAR_EVENT);
    mockEventElement.setAttribute(DATA_EVENT_ELEMENT_ID, pendingEventId);

    const mockEvent = {
      _id: pendingEventId,
      title: "Pending Event",
    };

    getElementAtPoint.mockReturnValue(mockEventElement);
    getEventClass.mockReturnValue(CLASS_TIMED_CALENDAR_EVENT);
    (eventsStore.query as jest.Mock).mockReturnValue(mockEvent);

    const { result } = renderHook(useOpenEventForm);

    await act(async () => {
      await result.current(
        new CustomEvent("click", {
          bubbles: true,
          detail: { create: false, id: pendingEventId },
        }) as unknown as React.PointerEvent<HTMLElement>,
      );
    });

    expect(eventsStore.query).toHaveBeenCalled();
    expect(mockSetDraft).not.toHaveBeenCalled();
    expect(openFloatingAtCursor).not.toHaveBeenCalled();
  });
});
