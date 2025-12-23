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

  beforeEach(() => {
    jest.clearAllMocks();
    (useUpdateEvent as jest.Mock).mockReturnValue(mockUpdateEvent);
    (nodeId$.getValue as jest.Mock).mockReturnValue(null);
    (open$.getValue as jest.Mock).mockReturnValue(false);
  });

  it("should initialize with resizing false", () => {
    const { result } = renderHook(() => useEventResizeActions(mockEvent));
    expect(result.current.resizing).toBe(false);
  });

  describe("onResizeStart", () => {
    it("should set resizing to true and set draft", () => {
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

      expect(result.current.resizing).toBe(true);
      expect(setDraft).toHaveBeenCalledWith(mockEvent);
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

      expect(setDraft).toHaveBeenLastCalledWith(
        expect.objectContaining({
          _id: mockEvent._id,
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

      expect(setDraft).toHaveBeenLastCalledWith(
        expect.objectContaining({
          _id: mockEvent._id,
          endDate: expectedEndDate,
        }),
      );
    });
  });

  describe("onResizeStop", () => {
    it("should set resizing to false and update event if changed", () => {
      const { result } = renderHook(() => useEventResizeActions(mockEvent));

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
      renderHook(() => useEventResizeActions(updatedEvent));

      // We need to make sure the hook instance shares state or we simulate the flow correctly.
      // Since `originalEvent` is a ref inside the hook, we need to use the SAME hook instance.
      // But `event` prop changes. `renderHook` allows rerender with new props.

      const { result: resultRerender, rerender } = renderHook(
        (props) => useEventResizeActions(props),
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

      expect(setDraft).toHaveBeenCalled(); // Should still update draft
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

      // No change in event prop

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
