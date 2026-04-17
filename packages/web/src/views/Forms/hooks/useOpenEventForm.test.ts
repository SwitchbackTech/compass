import { renderHook } from "@testing-library/react";
import { ObjectId } from "bson";
import { type PointerEvent } from "react";
import { Origin, Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import {
  CLASS_TIMED_CALENDAR_EVENT,
  DATA_EVENT_ELEMENT_ID,
} from "@web/common/constants/web.constants";
import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { BehaviorSubject } from "rxjs";

const getUserId = mock();
mock.module("@web/auth/compass/session/session.util", () => ({ getUserId }));

const getPointerPosition = mock();
const getPointerRef = mock();
const isElementInViewport = mock();
const isOverAllDayRow = mock();
const isOverMainGrid = mock();
const isOverSidebar = mock();
const isOverSomedayWeek = mock();
const isOverSomedayMonth = mock();
mock.module("@web/common/context/pointer-position", () => ({
  getPointerPosition,
  getPointerRef,
  isElementInViewport,
  isOverAllDayRow,
  isOverMainGrid,
  isOverSidebar,
  isOverSomedayWeek,
  isOverSomedayMonth,
}));

const getElementAtPoint = mock();
mock.module("@web/common/utils/dom/event-emitter.util", () => ({
  getElementAtPoint,
}));

const useDateInView = mock();
mock.module("@web/views/Day/hooks/navigation/useDateInView", () => ({
  useDateInView,
}));

const getEventTimeFromPosition = mock();
const roundToNearestFifteenWithinHour = mock();
mock.module("@web/views/Day/util/agenda/agenda.util", () => ({
  getEventTimeFromPosition,
  roundToNearestFifteenWithinHour,
}));

const getEventClass = mock();
mock.module("@web/views/Day/util/agenda/focus.util", () => ({
  focusElement: mock(),
  getEventClass,
}));

const openFloatingAtCursor = mock();
const closeFloatingAtCursor = mock();
const open$ = new BehaviorSubject(false);
const nodeId$ = new BehaviorSubject(null);
const placement$ = new BehaviorSubject("right-start");
const strategy$ = new BehaviorSubject("absolute");
const reference$ = new BehaviorSubject(null);
mock.module("@web/common/hooks/useOpenAtCursor", () => ({
  openFloatingAtCursor,
  closeFloatingAtCursor,
  open$,
  nodeId$,
  placement$,
  strategy$,
  reference$,
  setFloatingOpenAtCursor: mock(),
  setFloatingNodeIdAtCursor: mock(),
  setFloatingPlacementAtCursor: mock(),
  setFloatingReferenceAtCursor: mock(),
  setFloatingStrategyAtCursor: mock(),
  isOpenAtCursor: mock(),
  CursorItem: { EventForm: "EventForm" },
  useFloatingOpenAtCursor: mock(),
  useFloatingNodeIdAtCursor: mock(),
  useFloatingPlacementAtCursor: mock(),
  useFloatingStrategyAtCursor: mock(),
  useFloatingReferenceAtCursor: mock(),
}));

const mockEventsStoreQuery = mock();
const getDraft = mock();
const setDraft = mock();
mock.module("@web/store/events", () => ({
  eventsStore: {
    query: mockEventsStoreQuery,
  },
  getDraft,
  setDraft,
}));

const getCalendarEventElementFromGrid = mock();
mock.module("@web/common/utils/event/event.util", () => ({
  getCalendarEventElementFromGrid,
}));

const useAppSelector = mock();
mock.module("@web/store/store.hooks", () => ({
  useAppSelector,
}));

const { useOpenEventForm } =
  require("@web/views/Forms/hooks/useOpenEventForm") as typeof import("@web/views/Forms/hooks/useOpenEventForm");

describe("useOpenEventForm", () => {
  beforeAll(() => {
    getCalendarEventElementFromGrid.mockImplementation(() => {
      return document.createElement("div");
    });
    isElementInViewport.mockReturnValue(true);
  });

  const mockDateInView = dayjs("2023-01-01T12:00:00Z");

  beforeEach(() => {
    getCalendarEventElementFromGrid.mockClear();
    getElementAtPoint.mockReset();
    getEventClass.mockReset();
    getEventTimeFromPosition.mockReset();
    getPointerPosition.mockReset();
    getPointerRef.mockReset();
    getUserId.mockReset();
    isElementInViewport.mockClear();
    isOverAllDayRow.mockReset();
    isOverMainGrid.mockReset();
    isOverSidebar.mockReset();
    isOverSomedayWeek.mockReset();
    isOverSomedayMonth.mockReset();
    mockEventsStoreQuery.mockReset();
    openFloatingAtCursor.mockClear();
    roundToNearestFifteenWithinHour.mockReset();
    setDraft.mockClear();
    useAppSelector.mockReset();
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
    useAppSelector.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        events: {
          pendingEvents: {
            eventIds: [],
          },
        },
      }),
    );
  });

  it("should open form for new timed event when over main grid", async () => {
    const mockStartTime = dayjs("2023-01-01T10:00:00Z");
    const mockEndTime = dayjs("2023-01-01T10:15:00Z");

    isOverMainGrid.mockReturnValue(true);
    getEventTimeFromPosition.mockReturnValue(mockStartTime);

    const { result } = renderHook(() => useOpenEventForm());

    await result.current(
      new CustomEvent("click", {
        detail: { create: true },
      }) as unknown as PointerEvent<HTMLElement>,
    );
    await Promise.resolve();

    expect(getCalendarEventElementFromGrid).toHaveBeenCalled();
    expect(setDraft).toHaveBeenCalledWith(
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

    await result.current(
      new CustomEvent("click", {
        bubbles: true,
        detail: { create: true },
      }) as unknown as PointerEvent<HTMLElement>,
    );

    expect(setDraft).toHaveBeenCalledWith(
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
    mockEventsStoreQuery.mockReturnValue(mockEvent);

    const { result } = renderHook(useOpenEventForm);

    await result.current(
      new CustomEvent("click", {
        bubbles: true,
        detail: { create: false, id: mockEvent._id },
      }) as unknown as PointerEvent<HTMLElement>,
    );

    expect(setDraft).toHaveBeenCalledWith(mockEvent);
  });

  it("should not open event form for editing if event is pending", async () => {
    const pendingEventId = new ObjectId().toString();
    const pendingEventIds = [pendingEventId];

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
    mockEventsStoreQuery.mockReturnValue(mockEvent);

    const { result } = renderHook(useOpenEventForm);

    await result.current(
      new CustomEvent("click", {
        bubbles: true,
        detail: { create: false, id: pendingEventId },
      }) as unknown as PointerEvent<HTMLElement>,
    );

    expect(mockEventsStoreQuery).toHaveBeenCalled();
    expect(setDraft).not.toHaveBeenCalled();
    expect(openFloatingAtCursor).not.toHaveBeenCalled();
  });
});
