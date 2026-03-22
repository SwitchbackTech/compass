import { screen } from "@testing-library/react";
import {
  createMockBaseEvent,
  createMockInstance,
  createMockStandaloneEvent,
} from "@core/util/test/ccal.event.factory";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { type Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { AllDayEventMemo } from "./AllDayEvent";

const createMockGridEvent = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent => {
  const standaloneEvent = createMockStandaloneEvent();
  return {
    ...standaloneEvent,
    position: gridEventDefaultPosition,
    isAllDay: true,
    ...overrides,
  } as Schema_GridEvent;
};

const mockMeasurements: Measurements_Grid = {
  mainGrid: {
    top: 0,
    left: 0,
    height: 1000,
    width: 1000,
    x: 0,
    y: 0,
    bottom: 1000,
    right: 1000,
    toJSON: () => ({}),
  },
  hourHeight: 60,
  colWidths: Array(7).fill(100),
  allDayRow: null,
  remeasure: jest.fn(),
};

const mockOnMouseDown = jest.fn();
const mockOnScalerMouseDown = jest.fn();

describe("AllDayEvent - Repeat Icon", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("recurring event rendering", () => {
    it("should render repeat icon for base recurring event with rule", () => {
      const baseEvent = createMockBaseEvent({
        _id: "base-123",
        title: "Weekly Team Standup",
      });

      const event = createMockGridEvent(baseEvent);

      const initialState = createInitialState({
        events: {
          pendingEvents: {
            eventIds: [],
          },
        },
      });

      render(
        <AllDayEventMemo
          endOfView="2024-01-21T23:59:59Z"
          event={event}
          isPlaceholder={false}
          measurements={mockMeasurements}
          onMouseDown={mockOnMouseDown}
          onScalerMouseDown={mockOnScalerMouseDown}
          startOfView="2024-01-15T00:00:00Z"
        />,
        { state: initialState },
      );

      const icon = screen.getByLabelText("Recurring event");
      expect(icon).toBeInTheDocument();
      expect(screen.getByText("Weekly Team Standup")).toBeInTheDocument();
    });

    it("should render repeat icon for recurring instance with eventId", () => {
      const baseEventId = "base-456";
      const gBaseId = "gbase-456";
      const instance = createMockInstance(baseEventId, gBaseId, {
        _id: "instance-1",
        title: "Weekly Team Standup Instance",
        isAllDay: true,
      });

      const event = createMockGridEvent(instance);

      const initialState = createInitialState({
        events: {
          pendingEvents: {
            eventIds: [],
          },
        },
      });

      render(
        <AllDayEventMemo
          endOfView="2024-01-21T23:59:59Z"
          event={event}
          isPlaceholder={false}
          measurements={mockMeasurements}
          onMouseDown={mockOnMouseDown}
          onScalerMouseDown={mockOnScalerMouseDown}
          startOfView="2024-01-15T00:00:00Z"
        />,
        { state: initialState },
      );

      const icon = screen.getByLabelText("Recurring event");
      expect(icon).toBeInTheDocument();
    });

    it("should not render repeat icon for non-recurring all-day event", () => {
      const event = createMockGridEvent({
        _id: "standalone-1",
        title: "Company Holiday",
        recurrence: undefined,
      });

      const initialState = createInitialState({
        events: {
          pendingEvents: {
            eventIds: [],
          },
        },
      });

      render(
        <AllDayEventMemo
          endOfView="2024-01-21T23:59:59Z"
          event={event}
          isPlaceholder={false}
          measurements={mockMeasurements}
          onMouseDown={mockOnMouseDown}
          onScalerMouseDown={mockOnScalerMouseDown}
          startOfView="2024-01-15T00:00:00Z"
        />,
        { state: initialState },
      );

      expect(
        screen.queryByLabelText("Recurring event"),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Company Holiday")).toBeInTheDocument();
    });

    it("should not render repeat icon when recurrence is explicitly disabled", () => {
      const event = createMockGridEvent({
        _id: "standalone-2",
        title: "One-time Event",
        recurrence: {
          rule: null,
          eventId: undefined,
        },
      });

      const initialState = createInitialState({
        events: {
          pendingEvents: {
            eventIds: [],
          },
        },
      });

      render(
        <AllDayEventMemo
          endOfView="2024-01-21T23:59:59Z"
          event={event}
          isPlaceholder={false}
          measurements={mockMeasurements}
          onMouseDown={mockOnMouseDown}
          onScalerMouseDown={mockOnScalerMouseDown}
          startOfView="2024-01-15T00:00:00Z"
        />,
        { state: initialState },
      );

      expect(
        screen.queryByLabelText("Recurring event"),
      ).not.toBeInTheDocument();
    });

    it("should not render repeat icon when recurrence rule is an empty array", () => {
      const event = createMockGridEvent({
        _id: "empty-rule-2",
        title: "Cleared All-Day Event",
        recurrence: { rule: [] },
      });

      const initialState = createInitialState({
        events: {
          pendingEvents: {
            eventIds: [],
          },
        },
      });

      render(
        <AllDayEventMemo
          endOfView="2024-01-21T23:59:59Z"
          event={event}
          isPlaceholder={false}
          measurements={mockMeasurements}
          onMouseDown={mockOnMouseDown}
          onScalerMouseDown={mockOnScalerMouseDown}
          startOfView="2024-01-15T00:00:00Z"
        />,
        { state: initialState },
      );

      expect(
        screen.queryByLabelText("Recurring event"),
      ).not.toBeInTheDocument();
    });
  });
});
