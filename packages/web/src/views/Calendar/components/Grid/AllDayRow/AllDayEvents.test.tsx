import { screen } from "@testing-library/react";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { type Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module(
  "@web/views/Calendar/components/Grid/AllDayRow/AllDayEvent",
  () => ({
    AllDayEventMemo: ({ event }: { event: Schema_GridEvent }) => (
      <div data-testid={`allday-event-${event._id}`} data-event-id={event._id}>
        {event.title}
      </div>
    ),
  }),
);

const { AllDayEvents } = await import("./AllDayEvents");

const createMockGridEvent = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent => {
  const standaloneEvent = createMockStandaloneEvent({}, true);
  return {
    ...standaloneEvent,
    position: gridEventDefaultPosition,
    ...overrides,
  } as Schema_GridEvent;
};

const mockRemeasure = mock();

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
  remeasure: mockRemeasure,
};

const mockWeekProps: WeekProps = {
  component: {
    startOfView: "2024-01-15T00:00:00Z",
    endOfView: "2024-01-21T23:59:59Z",
  },
  hooks: {} as WeekProps["hooks"],
};

describe("AllDayEvents", () => {
  beforeEach(() => {
    mockRemeasure.mockClear();
  });

  it("should render all-day events", () => {
    const event1 = createMockGridEvent({
      _id: "allday-event-1",
      title: "All Day Event 1",
      isAllDay: true,
    });
    const event2 = createMockGridEvent({
      _id: "allday-event-2",
      title: "All Day Event 2",
      isAllDay: true,
    });

    const initialState = createInitialState({
      events: {
        entities: {
          value: {
            "allday-event-1": event1,
            "allday-event-2": event2,
          },
        },
        getWeekEvents: {
          value: {
            data: ["allday-event-1", "allday-event-2"],
            count: 2,
            pageSize: 2,
          },
          isProcessing: false,
          isSuccess: true,
          error: null,
          reason: null,
        },
        pendingEvents: {
          eventIds: [],
        },
      },
    });

    render(
      <AllDayEvents
        measurements={mockMeasurements}
        startOfView={mockWeekProps.component.startOfView}
        endOfView={mockWeekProps.component.endOfView}
      />,
      { state: initialState },
    );

    expect(
      screen.getByTestId("allday-event-allday-event-1"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("allday-event-allday-event-2"),
    ).toBeInTheDocument();
  });

  it("should render pending all-day events", () => {
    const pendingEvent = createMockGridEvent({
      _id: "pending-allday-event-1",
      title: "Pending All Day Event",
      isAllDay: true,
    });

    const initialState = createInitialState({
      events: {
        entities: {
          value: {
            "pending-allday-event-1": pendingEvent,
          },
        },
        getWeekEvents: {
          value: {
            data: ["pending-allday-event-1"],
            count: 1,
            pageSize: 1,
          },
          isProcessing: false,
          isSuccess: true,
          error: null,
          reason: null,
        },
        pendingEvents: {
          eventIds: ["pending-allday-event-1"],
        },
      },
    });

    render(
      <AllDayEvents
        measurements={mockMeasurements}
        startOfView={mockWeekProps.component.startOfView}
        endOfView={mockWeekProps.component.endOfView}
      />,
      { state: initialState },
    );

    expect(
      screen.getByTestId("allday-event-pending-allday-event-1"),
    ).toBeInTheDocument();
  });

  it("should render both pending and non-pending all-day events", () => {
    const pendingEvent = createMockGridEvent({
      _id: "pending-allday-event-1",
      title: "Pending All Day Event",
      isAllDay: true,
    });
    const normalEvent = createMockGridEvent({
      _id: "normal-allday-event-1",
      title: "Normal All Day Event",
      isAllDay: true,
    });

    const initialState = createInitialState({
      events: {
        entities: {
          value: {
            "pending-allday-event-1": pendingEvent,
            "normal-allday-event-1": normalEvent,
          },
        },
        getWeekEvents: {
          value: {
            data: ["pending-allday-event-1", "normal-allday-event-1"],
            count: 2,
            pageSize: 2,
          },
          isProcessing: false,
          isSuccess: true,
          error: null,
          reason: null,
        },
        pendingEvents: {
          eventIds: ["pending-allday-event-1"],
        },
      },
    });

    render(
      <AllDayEvents
        measurements={mockMeasurements}
        startOfView={mockWeekProps.component.startOfView}
        endOfView={mockWeekProps.component.endOfView}
      />,
      { state: initialState },
    );

    expect(
      screen.getByTestId("allday-event-pending-allday-event-1"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("allday-event-normal-allday-event-1"),
    ).toBeInTheDocument();
  });
});
