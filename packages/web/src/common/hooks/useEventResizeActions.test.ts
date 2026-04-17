import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";
import { renderHook } from "@testing-library/react";
import { act, type MouseEvent as ReactMouseEvent } from "react";
import { type Schema_Event, type WithCompassId } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import {
  MINUTES_PER_SLOT,
  SLOT_HEIGHT,
} from "@web/views/Day/constants/day.constants";
import { BehaviorSubject } from "rxjs";

// Mock definitions
const mockUpdateEvent = mock();
const mockSetDraft = mock();
const mockUpdateDraft = mock();
const mockNodeIdGetValue = mock();
const mockOpenGetValue = mock();
const openFloatingAtCursor = mock();
const closeFloatingAtCursor = mock();
const nodeId$ = { getValue: mockNodeIdGetValue, next: mock() };
const open$ = { getValue: mockOpenGetValue, next: mock() };
const placement$ = new BehaviorSubject("right-start");
const strategy$ = new BehaviorSubject("absolute");
const reference$ = new BehaviorSubject(null);

mock.module("@web/common/hooks/useUpdateEvent", () => ({
  useUpdateEvent: mock(() => mockUpdateEvent),
}));

mock.module("@web/store/events", () => ({
  setDraft: mockSetDraft,
  updateDraft: mockUpdateDraft,
}));

mock.module("@web/common/hooks/useOpenAtCursor", () => ({
  openFloatingAtCursor,
  closeFloatingAtCursor,
  nodeId$,
  open$,
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

// Import the hook after mocks
const { useEventResizeActions } = require("./useEventResizeActions") as typeof import("./useEventResizeActions");
const { CursorItem } = require("@web/common/hooks/useOpenAtCursor");

describe("useEventResizeActions", () => {
  const mockEvent: WithCompassId<Schema_Event> = {
    _id: "event-1",
    title: "Test Event",
    startDate: "2023-01-01T10:00:00Z",
    endDate: "2023-01-01T11:00:00Z",
    isAllDay: false,
  };

  // Mock bounds element
  const mockBounds = document.createElement("div");
  let getBoundingClientRectSpy: any;

  beforeEach(() => {
    mockUpdateEvent.mockClear();
    mockSetDraft.mockClear();
    mockUpdateDraft.mockClear();
    mockNodeIdGetValue.mockClear();
    mockOpenGetValue.mockClear();

    mockNodeIdGetValue.mockReturnValue(null);
    mockOpenGetValue.mockReturnValue(false);
    mockUpdateDraft.mockImplementation((update: any) => {
      mockSetDraft({ ...mockEvent, ...update });
    });

    getBoundingClientRectSpy = spyOn(mockBounds, "getBoundingClientRect").mockReturnValue({
      top: 0,
      bottom: 1000,
      height: 1000,
      left: 0,
      right: 500,
      width: 500,
      x: 0,
      y: 0,
      toJSON: () => {},
    } as DOMRect);
  });

  afterEach(() => {
    getBoundingClientRectSpy.mockRestore();
  });

  describe("onResizeStart", () => {
    it("should set draft", () => {
      const { result } = renderHook(() => useEventResizeActions(mockEvent));

      act(() => {
        result.current.onResizeStart(
          new MouseEvent(
            "mousedown",
          ) as unknown as ReactMouseEvent<HTMLElement>,
          "bottom",
          document.createElement("div"),
        );
      });

      expect(mockSetDraft).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe("onResize", () => {
    it("should update draft start date when resizing from top", () => {
      const { result } = renderHook(() => useEventResizeActions(mockEvent));

      // Initialize originalEvent ref
      act(() => {
        result.current.onResizeStart(
          new MouseEvent(
            "mousedown",
          ) as unknown as ReactMouseEvent<HTMLElement>,
          "top",
          document.createElement("div"),
        );
      });

      const deltaHeight = SLOT_HEIGHT; // Should correspond to MINUTES_PER_SLOT (15 mins)
      const expectedMinutes = MINUTES_PER_SLOT;

      act(() => {
        result.current.onResize(
          new MouseEvent("mousemove"),
          "top",
          document.createElement("div"),
          { height: deltaHeight, width: 0 },
        );
      });

      const expectedStartDate = dayjs(mockEvent.startDate)
        .subtract(expectedMinutes, "minutes")
        .format();

      expect(mockSetDraft).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ...mockEvent,
          startDate: expectedStartDate,
        }),
      );
    });

    it("should update draft end date when resizing from bottom", () => {
      const { result } = renderHook(() => useEventResizeActions(mockEvent));

      // Initialize originalEvent ref
      act(() => {
        result.current.onResizeStart(
          new MouseEvent(
            "mousedown",
          ) as unknown as ReactMouseEvent<HTMLElement>,
          "bottom",
          document.createElement("div"),
        );
      });

      const deltaHeight = SLOT_HEIGHT * 2; // 30 mins
      const expectedMinutes = MINUTES_PER_SLOT * 2;

      act(() => {
        result.current.onResize(
          new MouseEvent("mousemove"),
          "bottom",
          document.createElement("div"),
          { height: deltaHeight, width: 0 },
        );
      });

      const expectedEndDate = dayjs(mockEvent.endDate)
        .add(expectedMinutes, "minutes")
        .format();

      expect(mockSetDraft).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ...mockEvent,
          endDate: expectedEndDate,
        }),
      );
    });

    it("should clamp start date to start of day when resizing top beyond bounds", () => {
      const { result } = renderHook(() => useEventResizeActions(mockEvent));

      act(() => {
        result.current.onResizeStart(
          new MouseEvent(
            "mousedown",
          ) as unknown as ReactMouseEvent<HTMLElement>,
          "top",
          document.createElement("div"),
        );
      });

      const deltaHeight = 1000;

      act(() => {
        result.current.onResize(
          new MouseEvent("mousemove"),
          "top",
          document.createElement("div"),
          { height: deltaHeight, width: 0 },
        );
      });

      const expectedStartDate = dayjs(mockEvent.startDate)
        .startOf("day")
        .format();

      expect(mockSetDraft).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ...mockEvent,
          startDate: expectedStartDate,
        }),
      );
    });

    it("should clamp end date to end of bounds when resizing bottom beyond bounds", () => {
      const { result } = renderHook(() => useEventResizeActions(mockEvent));

      act(() => {
        result.current.onResizeStart(
          new MouseEvent(
            "mousedown",
          ) as unknown as ReactMouseEvent<HTMLElement>,
          "bottom",
          document.createElement("div"),
        );
      });

      const deltaHeight = 500; // Try to grow by 500px

      act(() => {
        result.current.onResize(
          new MouseEvent("mousemove"),
          "bottom",
          mockBounds,
          { height: deltaHeight, width: 0 },
        );
      });

      const expectedEndDate = dayjs(mockEvent.endDate)
        .add(375, "minutes")
        .format();

      expect(mockSetDraft).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ...mockEvent,
          endDate: expectedEndDate,
        }),
      );
    });
  });

  describe("onResizeStop", () => {
    it("should update event if changed", () => {
      const { result, rerender } = renderHook(
        (props) => useEventResizeActions(props),
        { initialProps: mockEvent },
      );

      // Start
      act(() => {
        result.current.onResizeStart(
          new MouseEvent(
            "mousedown",
          ) as unknown as ReactMouseEvent<HTMLElement>,
          "bottom",
          document.createElement("div"),
        );
      });

      // Rerender with updated event (simulating draft update propagation)
      const updatedEvent = {
        ...mockEvent,
        endDate: dayjs(mockEvent.endDate).add(15, "minutes").format(),
      };
      rerender(updatedEvent);

      // Stop
      act(() => {
        result.current.onResizeStop(
          new MouseEvent("mouseup"),
          "bottom",
          document.createElement("div"),
          { height: 0, width: 0 },
        );
      });

      expect(mockUpdateEvent).toHaveBeenCalledWith({
        event: expect.objectContaining({
          _id: mockEvent._id,
          endDate: updatedEvent.endDate,
        }),
      });
    });

    it("should snap times to nearest 15 minutes", () => {
      const { result, rerender } = renderHook(
        (props) => useEventResizeActions(props),
        { initialProps: mockEvent },
      );

      act(() => {
        result.current.onResizeStart(
          new MouseEvent(
            "mousedown",
          ) as unknown as ReactMouseEvent<HTMLElement>,
          "bottom",
          document.createElement("div"),
        );
      });

      // Update with a non-snapped time (e.g. 11:08)
      const unsnappedEndDate = dayjs(mockEvent.endDate).minute(8).format();
      const unsnappedEvent = { ...mockEvent, endDate: unsnappedEndDate };

      rerender(unsnappedEvent);

      act(() => {
        result.current.onResizeStop(
          new MouseEvent("mouseup"),
          "bottom",
          document.createElement("div"),
          { height: 0, width: 0 },
        );
      });

      // Should snap 08 to 15
      const expectedEndDate = dayjs(mockEvent.endDate)
        .minute(15)
        .second(0)
        .format();

      expect(mockUpdateEvent).toHaveBeenCalledWith({
        event: expect.objectContaining({
          endDate: expectedEndDate,
        }),
      });
    });

    it("should NOT update redux event if event form is open (saveDraftOnly)", () => {
      mockNodeIdGetValue.mockReturnValue(CursorItem.EventForm);
      mockOpenGetValue.mockReturnValue(true);

      const { result, rerender } = renderHook(
        (props) => useEventResizeActions(props),
        { initialProps: mockEvent },
      );

      act(() => {
        result.current.onResizeStart(
          new MouseEvent(
            "mousedown",
          ) as unknown as ReactMouseEvent<HTMLElement>,
          "bottom",
          document.createElement("div"),
        );
      });

      const updatedEvent = {
        ...mockEvent,
        endDate: dayjs(mockEvent.endDate).add(15, "minutes").format(),
      };
      rerender(updatedEvent);

      act(() => {
        result.current.onResizeStop(
          new MouseEvent("mouseup"),
          "bottom",
          document.createElement("div"),
          { height: 0, width: 0 },
        );
      });

      expect(mockSetDraft).toHaveBeenCalled(); // Should still update draft
      expect(mockUpdateEvent).not.toHaveBeenCalled();
    });

    it("should not update if start and end have not changed", () => {
      const { result } = renderHook((props) => useEventResizeActions(props), {
        initialProps: mockEvent,
      });

      act(() => {
        result.current.onResizeStart(
          new MouseEvent(
            "mousedown",
          ) as unknown as ReactMouseEvent<HTMLElement>,
          "bottom",
          document.createElement("div"),
        );
      });

      act(() => {
        result.current.onResizeStop(
          new MouseEvent("mouseup"),
          "bottom",
          document.createElement("div"),
          { height: 0, width: 0 },
        );
      });

      expect(mockUpdateEvent).not.toHaveBeenCalled();
    });
  });
});
