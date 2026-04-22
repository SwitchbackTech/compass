import { renderHook } from "@testing-library/react";
import { ObjectId } from "bson";
import { BehaviorSubject } from "rxjs";
import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const CursorItem = { EventPreview: "event-preview" };
const eventsStore = {
  query: mock(),
};
const getEventClass = mock();
const openFloatingAtCursor = mock();
const setActiveEvent = mock();
const useAppSelector = mock((selector) => {
  if (typeof selector === "function") {
    return selector({
      events: {
        pendingEvents: {
          eventIds: [],
        },
      },
    });
  }
  return selector;
});
const closeFloatingAtCursor = mock();
const open$ = new BehaviorSubject(false);
const nodeId$ = new BehaviorSubject(null);
const placement$ = new BehaviorSubject("right-start");
const strategy$ = new BehaviorSubject("absolute");
const reference$ = new BehaviorSubject(null);

mock.module("@web/store/events", () => ({
  eventsStore,
  setActiveEvent,
}));

mock.module("@web/common/hooks/useOpenAtCursor", () => {
  return {
    CursorItem,
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
  };
});

mock.module("@web/views/Day/util/agenda/focus.util", () => ({
  getEventClass,
}));

mock.module("@web/store/store.hooks", () => ({
  useAppSelector,
}));

const { useOpenAgendaEventPreview } =
  require("@web/views/Day/hooks/events/useOpenAgendaEventPreview") as typeof import("@web/views/Day/hooks/events/useOpenAgendaEventPreview");

describe("useOpenAgendaEventPreview", () => {
  beforeEach(() => {
    eventsStore.query.mockClear();
    getEventClass.mockClear();
    openFloatingAtCursor.mockClear();
    setActiveEvent.mockClear();
    useAppSelector.mockClear();
    useAppSelector.mockImplementation((selector) => {
      if (typeof selector === "function") {
        return selector({
          events: {
            pendingEvents: {
              eventIds: [],
            },
          },
        });
      }
      return selector;
    });
  });

  it("should open event preview when event id and reference exist", () => {
    const eventId = "123";
    const eventClass = "event-class";
    const mockEvent = { _id: eventId, title: "Test Event" };
    const mockReference = {
      getAttribute: mock().mockReturnValue(eventId),
    };
    const mockElement = {
      closest: mock().mockReturnValue(mockReference),
    };
    const mockEventObj = {
      preventDefault: mock(),
      stopPropagation: mock(),
      currentTarget: mockElement,
    };

    getEventClass.mockReturnValue(eventClass);
    eventsStore.query.mockReturnValue(mockEvent);

    const { result } = renderHook(() => useOpenAgendaEventPreview());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.current(mockEventObj as any);

    expect(mockEventObj.preventDefault).toHaveBeenCalled();
    expect(mockEventObj.stopPropagation).toHaveBeenCalled();
    expect(getEventClass).toHaveBeenCalledWith(mockElement);
    expect(mockElement.closest).toHaveBeenCalledWith(`.${eventClass}`);
    expect(mockReference.getAttribute).toHaveBeenCalledWith(
      DATA_EVENT_ELEMENT_ID,
    );
    expect(eventsStore.query).toHaveBeenCalled();
    expect(setActiveEvent).toHaveBeenCalledWith(mockEvent._id);
    expect(openFloatingAtCursor).toHaveBeenCalledWith({
      nodeId: CursorItem.EventPreview,
      placement: "right",
      reference: mockReference,
    });
  });

  it("should not open event preview if event id is missing", () => {
    const eventClass = "event-class";
    const mockReference = {
      getAttribute: mock().mockReturnValue(null),
    };
    const mockElement = {
      closest: mock().mockReturnValue(mockReference),
    };
    const mockEventObj = {
      preventDefault: mock(),
      stopPropagation: mock(),
      currentTarget: mockElement,
    };

    getEventClass.mockReturnValue(eventClass);

    const { result } = renderHook(() => useOpenAgendaEventPreview());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.current(mockEventObj as any);

    expect(setActiveEvent).not.toHaveBeenCalled();
    expect(openFloatingAtCursor).not.toHaveBeenCalled();
  });

  it("should not open event preview if reference is missing", () => {
    const eventClass = "event-class";
    const mockElement = {
      closest: mock().mockReturnValue(null),
    };
    const mockEventObj = {
      preventDefault: mock(),
      stopPropagation: mock(),
      currentTarget: mockElement,
    };

    getEventClass.mockReturnValue(eventClass);

    const { result } = renderHook(() => useOpenAgendaEventPreview());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.current(mockEventObj as any);

    expect(setActiveEvent).not.toHaveBeenCalled();
    expect(openFloatingAtCursor).not.toHaveBeenCalled();
  });

  it("should not open event preview if event is pending", () => {
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

    const eventClass = "event-class";
    const mockEvent = { _id: pendingEventId, title: "Pending Event" };
    const mockReference = {
      getAttribute: mock().mockReturnValue(pendingEventId),
    };
    const mockElement = {
      closest: mock().mockReturnValue(mockReference),
    };
    const mockEventObj = {
      preventDefault: mock(),
      stopPropagation: mock(),
      currentTarget: mockElement,
    };

    getEventClass.mockReturnValue(eventClass);
    eventsStore.query.mockReturnValue(mockEvent);

    const { result } = renderHook(() => useOpenAgendaEventPreview());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.current(mockEventObj as any);

    expect(mockEventObj.preventDefault).toHaveBeenCalled();
    expect(mockEventObj.stopPropagation).toHaveBeenCalled();
    expect(eventsStore.query).toHaveBeenCalled();
    expect(setActiveEvent).not.toHaveBeenCalled();
    expect(openFloatingAtCursor).not.toHaveBeenCalled();
  });
});

afterAll(() => {
  mock.restore();
});
