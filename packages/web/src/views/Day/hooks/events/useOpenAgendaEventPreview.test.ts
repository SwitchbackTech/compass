import { ObjectId } from "bson";
import { renderHook } from "@testing-library/react";
import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import {
  CursorItem,
  openFloatingAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { eventsStore, setActiveEvent } from "@web/store/events";
import { useOpenAgendaEventPreview } from "@web/views/Day/hooks/events/useOpenAgendaEventPreview";
import { getEventClass } from "@web/views/Day/util/agenda/focus.util";

jest.mock("@web/store/events", () => ({
  eventsStore: {
    query: jest.fn(),
  },
  setActiveEvent: jest.fn(),
}));

jest.mock("@web/common/hooks/useOpenAtCursor", () => ({
  CursorItem: { EventPreview: "event-preview" },
  openFloatingAtCursor: jest.fn(),
}));

jest.mock("@web/views/Day/util/agenda/focus.util", () => ({
  getEventClass: jest.fn(),
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

describe("useOpenAgendaEventPreview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should open event preview when event id and reference exist", () => {
    const eventId = "123";
    const eventClass = "event-class";
    const mockEvent = { _id: eventId, title: "Test Event" };
    const mockReference = {
      getAttribute: jest.fn().mockReturnValue(eventId),
    };
    const mockElement = {
      closest: jest.fn().mockReturnValue(mockReference),
    };
    const mockEventObj = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      currentTarget: mockElement,
    };

    (getEventClass as jest.Mock).mockReturnValue(eventClass);
    (eventsStore.query as jest.Mock).mockReturnValue(mockEvent);

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
      getAttribute: jest.fn().mockReturnValue(null),
    };
    const mockElement = {
      closest: jest.fn().mockReturnValue(mockReference),
    };
    const mockEventObj = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      currentTarget: mockElement,
    };

    (getEventClass as jest.Mock).mockReturnValue(eventClass);

    const { result } = renderHook(() => useOpenAgendaEventPreview());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.current(mockEventObj as any);

    expect(setActiveEvent).not.toHaveBeenCalled();
    expect(openFloatingAtCursor).not.toHaveBeenCalled();
  });

  it("should not open event preview if reference is missing", () => {
    const eventClass = "event-class";
    const mockElement = {
      closest: jest.fn().mockReturnValue(null),
    };
    const mockEventObj = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      currentTarget: mockElement,
    };

    (getEventClass as jest.Mock).mockReturnValue(eventClass);

    const { result } = renderHook(() => useOpenAgendaEventPreview());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.current(mockEventObj as any);

    expect(setActiveEvent).not.toHaveBeenCalled();
    expect(openFloatingAtCursor).not.toHaveBeenCalled();
  });

  it("should not open event preview if event is pending", () => {
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

    const eventClass = "event-class";
    const mockEvent = { _id: pendingEventId, title: "Pending Event" };
    const mockReference = {
      getAttribute: jest.fn().mockReturnValue(pendingEventId),
    };
    const mockElement = {
      closest: jest.fn().mockReturnValue(mockReference),
    };
    const mockEventObj = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      currentTarget: mockElement,
    };

    (getEventClass as jest.Mock).mockReturnValue(eventClass);
    (eventsStore.query as jest.Mock).mockReturnValue(mockEvent);

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
