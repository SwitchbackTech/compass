import React from "react";
import { Provider } from "react-redux";
import { renderHook } from "@testing-library/react";
import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import {
  CursorItem,
  openFloatingAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { selectEventById } from "@web/ducks/events/selectors/event.selectors";
import { setDraft } from "@web/views/Calendar/components/Draft/context/useDraft";
import { useOpenEventContextMenu } from "@web/views/Day/hooks/events/useOpenEventContextMenu";
import { getEventClass } from "@web/views/Day/util/agenda/focus.util";

jest.mock("@web/common/hooks/useOpenAtCursor", () => ({
  CursorItem: { EventContextMenu: "event-context-menu" },
  openFloatingAtCursor: jest.fn(),
}));

jest.mock("@web/ducks/events/selectors/event.selectors", () => ({
  selectEventById: jest.fn(),
}));

jest.mock("@web/views/Calendar/components/Draft/context/useDraft", () => ({
  setDraft: jest.fn(),
}));

jest.mock("@web/views/Day/util/agenda/focus.util", () => ({
  getEventClass: jest.fn(),
}));

describe("useOpenEventContextMenu", () => {
  const mockState = { events: {} };
  const mockStore = {
    getState: jest.fn(() => mockState),
    subscribe: jest.fn(),
    dispatch: jest.fn(),
  };

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store: mockStore as any, children });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should open event context menu when event id and reference exist", () => {
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
    (selectEventById as jest.Mock).mockReturnValue(mockEvent);

    const { result } = renderHook(() => useOpenEventContextMenu(), { wrapper });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.current(mockEventObj as any);

    expect(mockEventObj.preventDefault).toHaveBeenCalled();
    expect(mockEventObj.stopPropagation).toHaveBeenCalled();
    expect(getEventClass).toHaveBeenCalledWith(mockElement);
    expect(mockElement.closest).toHaveBeenCalledWith(`.${eventClass}`);
    expect(mockReference.getAttribute).toHaveBeenCalledWith(
      DATA_EVENT_ELEMENT_ID,
    );
    expect(selectEventById).toHaveBeenCalledWith(mockState, eventId);
    expect(setDraft).toHaveBeenCalledWith(mockEvent);
    expect(openFloatingAtCursor).toHaveBeenCalledWith({
      nodeId: CursorItem.EventContextMenu,
      placement: "bottom",
      reference: mockReference,
    });
  });

  it("should not open event context menu if event id is missing", () => {
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

    const { result } = renderHook(() => useOpenEventContextMenu(), { wrapper });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.current(mockEventObj as any);

    expect(setDraft).not.toHaveBeenCalled();
    expect(openFloatingAtCursor).not.toHaveBeenCalled();
  });

  it("should not open event context menu if reference is missing", () => {
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

    const { result } = renderHook(() => useOpenEventContextMenu(), { wrapper });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.current(mockEventObj as any);

    expect(setDraft).not.toHaveBeenCalled();
    expect(openFloatingAtCursor).not.toHaveBeenCalled();
  });
});
