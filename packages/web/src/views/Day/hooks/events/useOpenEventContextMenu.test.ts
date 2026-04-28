import { renderHook } from "@testing-library/react";
import { type FocusEvent, type MouseEvent } from "react";
import { BehaviorSubject } from "rxjs";
import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const CursorItem = { EventContextMenu: "event-context-menu" };
const openFloatingAtCursor = mock();
const closeFloatingAtCursor = mock();
const open$ = new BehaviorSubject(false);
const nodeId$ = new BehaviorSubject(null);
const placement$ = new BehaviorSubject("right-start");
const strategy$ = new BehaviorSubject("absolute");
const reference$ = new BehaviorSubject(null);
const eventsStore = {
  query: mock(),
};
const setActiveEvent = mock();
const getEventClass = mock();

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

mock.module("@web/store/events", () => ({
  eventsStore,
  setActiveEvent,
}));

mock.module("@web/views/Day/util/agenda/focus.util", () => ({
  getEventClass,
}));

const { useOpenEventContextMenu } =
  require("@web/views/Day/hooks/events/useOpenEventContextMenu") as typeof import("@web/views/Day/hooks/events/useOpenEventContextMenu");

type AgendaPointerEvent = MouseEvent<Element> | FocusEvent<Element>;

const createAgendaEvent = (currentTarget: Element): AgendaPointerEvent =>
  ({
    preventDefault: mock(),
    stopPropagation: mock(),
    currentTarget,
  }) as unknown as AgendaPointerEvent;

describe("useOpenEventContextMenu", () => {
  beforeEach(() => {
    eventsStore.query.mockClear();
    getEventClass.mockClear();
    openFloatingAtCursor.mockClear();
    setActiveEvent.mockClear();
  });

  it("should open event context menu when event id and reference exist", () => {
    const eventId = "123";
    const eventClass = "event-class";
    const mockEvent = { _id: eventId, title: "Test Event" };
    const mockReference = document.createElement("div");
    mockReference.className = eventClass;
    mockReference.setAttribute(DATA_EVENT_ELEMENT_ID, eventId);

    const mockElement = document.createElement("button");
    mockReference.appendChild(mockElement);

    const mockEventObj = createAgendaEvent(mockElement);

    getEventClass.mockReturnValue(eventClass);
    eventsStore.query.mockReturnValue(mockEvent);

    const { result } = renderHook(() => useOpenEventContextMenu());

    result.current(mockEventObj);

    expect(mockEventObj.preventDefault).toHaveBeenCalled();
    expect(mockEventObj.stopPropagation).toHaveBeenCalled();
    expect(getEventClass).toHaveBeenCalledWith(mockElement);
    expect(eventsStore.query).toHaveBeenCalled();
    expect(setActiveEvent).toHaveBeenCalledWith(mockEvent._id);
    expect(openFloatingAtCursor).toHaveBeenCalledWith({
      nodeId: CursorItem.EventContextMenu,
      placement: "bottom",
      reference: mockReference,
    });
  });

  it("should not open event context menu if event id is missing", () => {
    const eventClass = "event-class";
    const mockReference = document.createElement("div");
    mockReference.className = eventClass;

    const mockElement = document.createElement("button");
    mockReference.appendChild(mockElement);

    const mockEventObj = createAgendaEvent(mockElement);

    getEventClass.mockReturnValue(eventClass);

    const { result } = renderHook(() => useOpenEventContextMenu());

    result.current(mockEventObj);

    expect(setActiveEvent).not.toHaveBeenCalled();
    expect(openFloatingAtCursor).not.toHaveBeenCalled();
  });

  it("should not open event context menu if reference is missing", () => {
    const eventClass = "event-class";
    const mockElement = document.createElement("button");
    const mockEventObj = createAgendaEvent(mockElement);

    getEventClass.mockReturnValue(eventClass);

    const { result } = renderHook(() => useOpenEventContextMenu());

    result.current(mockEventObj);

    expect(setActiveEvent).not.toHaveBeenCalled();
    expect(openFloatingAtCursor).not.toHaveBeenCalled();
  });
});

afterAll(() => {
  mock.restore();
});
