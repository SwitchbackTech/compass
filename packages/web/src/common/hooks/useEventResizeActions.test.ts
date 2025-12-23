import type { MouseEvent as ReactMouseEvent } from "react";
import { act } from "react";
import { renderHook } from "@testing-library/react";
import { Schema_Event, WithCompassId } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { useEventResizeActions } from "@web/common/hooks/useEventResizeActions";
import { CursorItem, nodeId$, open$ } from "@web/common/hooks/useOpenAtCursor";
import { useUpdateEvent } from "@web/common/hooks/useUpdateEvent";
import { setDraft } from "@web/store/events";
import {
  MINUTES_PER_SLOT,
  SLOT_HEIGHT,
} from "@web/views/Day/constants/day.constants";

// Mocks
jest.mock("@web/common/hooks/useUpdateEvent");
jest.mock("@web/store/events", () => ({
  setDraft: jest.fn(),
}));
jest.mock("@web/common/hooks/useOpenAtCursor", () => ({
  nodeId$: { getValue: jest.fn() },
  open$: { getValue: jest.fn() },
  CursorItem: { EventForm: "EventForm" },
}));

describe("useEventResizeActions", () => {
  const mockUpdateEvent = jest.fn();
  const mockEvent: WithCompassId<Schema_Event> = {
    _id: "event-1",
    title: "Test Event",
    startDate: "2023-01-01T10:00:00Z",
    endDate: "2023-01-01T11:00:00Z",
    isAllDay: false,
  };

  // Mock bounds element
  const mockBounds = document.createElement("div");
  // Mock getBoundingClientRect
  jest.spyOn(mockBounds, "getBoundingClientRect").mockReturnValue({
    top: 0,
    bottom: 1000,
    height: 1000,
    left: 0,
    right: 500,
    width: 500,
    x: 0,
    y: 0,
    toJSON: () => {},
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (useUpdateEvent as jest.Mock).mockReturnValue(mockUpdateEvent);
    (nodeId$.getValue as jest.Mock).mockReturnValue(null);
    (open$.getValue as jest.Mock).mockReturnValue(false);
  });

  it("should initialize with resizing false", () => {
    const { result } = renderHook(() =>
      useEventResizeActions(mockEvent, mockBounds),
    );
    expect(result.current.resizing).toBe(false);
  });

  describe("onResizeStart", () => {
    it("should set resizing to true and set draft", () => {
      const { result } = renderHook(() =>
        useEventResizeActions(mockEvent, mockBounds),
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

      expect(result.current.resizing).toBe(true);
      expect(setDraft).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe("onResize", () => {
    it("should update draft start date when resizing from top", () => {
      const { result } = renderHook(() =>
        useEventResizeActions(mockEvent, mockBounds),
      );

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

      expect(setDraft).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ...mockEvent,
          startDate: expectedStartDate,
        }),
      );
    });

    it("should update draft end date when resizing from bottom", () => {
      const { result } = renderHook(() =>
        useEventResizeActions(mockEvent, mockBounds),
      );

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

      expect(setDraft).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ...mockEvent,
          endDate: expectedEndDate,
        }),
      );
    });

    it("should clamp start date to start of day when resizing top beyond bounds", () => {
      const { result } = renderHook(() =>
        useEventResizeActions(mockEvent, mockBounds),
      );

      act(() => {
        result.current.onResizeStart(
          new MouseEvent(
            "mousedown",
          ) as unknown as ReactMouseEvent<HTMLElement>,
          "top",
          document.createElement("div"),
        );
      });

      // Try to resize way past the start of the day
      // Event starts at 10:00 AM. That is 10 * 60 = 600 minutes from start of day.
      // 600 minutes / 15 min/slot = 40 slots.
      // 40 slots * 20 px/slot = 800 px.
      // If we resize up by 1000px, it should be clamped to 800px.

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

      expect(setDraft).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ...mockEvent,
          startDate: expectedStartDate,
        }),
      );
    });

    it("should clamp end date to end of bounds when resizing bottom beyond bounds", () => {
      const { result } = renderHook(() =>
        useEventResizeActions(mockEvent, mockBounds),
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

      // Event ends at 11:00 AM.
      // Bounds height is 1000px.
      // 1000px / 20px/slot = 50 slots = 750 minutes = 12.5 hours.
      // So bounds end at 12.5 hours from start of day (if start of day is 0).
      // Wait, the logic uses `boundsRect.height`.
      // `originalBottomPx` is calculated from `endDiffMinutes`.
      // 11:00 AM is 11 * 60 = 660 minutes.
      // 660 / 15 * 20 = 880 px.
      // Max growth = 1000 - 880 = 120 px.
      // 120 px / 20 px/slot = 6 slots = 90 minutes.
      // So max end time should be 11:00 + 1:30 = 12:30.

      const deltaHeight = 500; // Try to grow by 500px, but only 120px allowed

      act(() => {
        result.current.onResize(
          new MouseEvent("mousemove"),
          "bottom",
          document.createElement("div"),
          { height: deltaHeight, width: 0 },
        );
      });

      const expectedEndDate = dayjs(mockEvent.endDate)
        .add(90, "minutes")
        .format();

      expect(setDraft).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ...mockEvent,
          endDate: expectedEndDate,
        }),
      );
    });
  });

  describe("onResizeStop", () => {
    it("should set resizing to false and update event if changed", () => {
      const { result } = renderHook(() =>
        useEventResizeActions(mockEvent, mockBounds),
      );

      // Simulate start
      act(() => {
        result.current.onResizeStart(
          new MouseEvent(
            "mousedown",
          ) as unknown as ReactMouseEvent<HTMLElement>,
          "bottom",
          document.createElement("div"),
        );
      });

      // Simulate change in props (as if parent updated event from draft)
      const updatedEvent = {
        ...mockEvent,
        endDate: dayjs(mockEvent.endDate).add(15, "minutes").format(),
      };

      // We need to make sure the hook instance shares state or we simulate the flow correctly.
      // Since `originalEvent` is a ref inside the hook, we need to use the SAME hook instance.
      // But `event` prop changes. `renderHook` allows rerender with new props.

      const { result: resultRerender, rerender } = renderHook(
        (props) => useEventResizeActions(props, mockBounds),
        { initialProps: mockEvent },
      );

      // Start
      act(() => {
        resultRerender.current.onResizeStart(
          new MouseEvent(
            "mousedown",
          ) as unknown as ReactMouseEvent<HTMLElement>,
          "bottom",
          document.createElement("div"),
        );
      });

      // Rerender with updated event (simulating draft update propagation)
      rerender(updatedEvent);

      // Stop
      act(() => {
        resultRerender.current.onResizeStop(
          new MouseEvent("mouseup"),
          "bottom",
          document.createElement("div"),
          { height: 0, width: 0 },
        );
      });

      expect(resultRerender.current.resizing).toBe(false);
      expect(mockUpdateEvent).toHaveBeenCalledWith({
        event: expect.objectContaining({
          _id: mockEvent._id,
          endDate: updatedEvent.endDate, // Should be snapped/formatted
        }),
      });
    });

    it("should snap times to nearest 15 minutes", () => {
      const { result, rerender } = renderHook(
        (props) => useEventResizeActions(props, mockBounds),
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

      // Should snap 08 to 15? roundToNearestFifteenWithinHour(8) -> 15
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
      (nodeId$.getValue as jest.Mock).mockReturnValue(CursorItem.EventForm);
      (open$.getValue as jest.Mock).mockReturnValue(true);

      const { result, rerender } = renderHook(
        (props) => useEventResizeActions(props, mockBounds),
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

      expect(setDraft).toHaveBeenCalled(); // Should still update draft
      expect(mockUpdateEvent).not.toHaveBeenCalled();
    });

    it("should not update if start and end have not changed", () => {
      const { result } = renderHook(
        (props) => useEventResizeActions(props, mockBounds),
        {
          initialProps: mockEvent,
        },
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
