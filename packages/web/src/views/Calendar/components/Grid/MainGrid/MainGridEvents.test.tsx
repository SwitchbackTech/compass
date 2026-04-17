import { screen } from "@testing-library/react";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { type Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { afterAll } from "bun:test";

mock.module(
  "@web/views/Calendar/components/Event/Grid/GridEvent/GridEvent",
  () => ({
    GridEventMemo: ({ event }: { event: Schema_GridEvent }) => (
      <div data-testid={`grid-event-${event._id}`} data-event-id={event._id}>
        {event.title}
      </div>
    ),
  }),
);

const { MainGridEvents } = await import("./MainGridEvents");

const createMockGridEvent = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent => {
  const standaloneEvent = createMockStandaloneEvent();
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

describe("MainGridEvents", () => {
  beforeEach(() => {
    mockRemeasure.mockClear();
  });

  it("should render timed events", () => {
    const event1 = createMockGridEvent({
      _id: "event-1",
      title: "Event 1",
    });
    const event2 = createMockGridEvent({
      _id: "event-2",
      title: "Event 2",
    });

    const initialState = createInitialState({
      events: {
        entities: {
          value: {
            "event-1": event1,
            "event-2": event2,
          },
        },
        getWeekEvents: {
          value: {
            data: ["event-1", "event-2"],
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
      <MainGridEvents
        measurements={mockMeasurements}
        weekProps={mockWeekProps}
      />,
      { state: initialState },
    );

    expect(screen.getByTestId("grid-event-event-1")).toBeInTheDocument();
    expect(screen.getByTestId("grid-event-event-2")).toBeInTheDocument();
  });

  it("should render pending events", () => {
    const pendingEvent = createMockGridEvent({
      _id: "pending-event-1",
      title: "Pending Event",
    });

    const initialState = createInitialState({
      events: {
        entities: {
          value: {
            "pending-event-1": pendingEvent,
          },
        },
        getWeekEvents: {
          value: {
            data: ["pending-event-1"],
            count: 1,
            pageSize: 1,
          },
          isProcessing: false,
          isSuccess: true,
          error: null,
          reason: null,
        },
        pendingEvents: {
          eventIds: ["pending-event-1"],
        },
      },
    });

    render(
      <MainGridEvents
        measurements={mockMeasurements}
        weekProps={mockWeekProps}
      />,
      { state: initialState },
    );

    expect(
      screen.getByTestId("grid-event-pending-event-1"),
    ).toBeInTheDocument();
  });

  it("should render both pending and non-pending events", () => {
    const pendingEvent = createMockGridEvent({
      _id: "pending-event-1",
      title: "Pending Event",
    });
    const normalEvent = createMockGridEvent({
      _id: "normal-event-1",
      title: "Normal Event",
    });

    const initialState = createInitialState({
      events: {
        entities: {
          value: {
            "pending-event-1": pendingEvent,
            "normal-event-1": normalEvent,
          },
        },
        getWeekEvents: {
          value: {
            data: ["pending-event-1", "normal-event-1"],
            count: 2,
            pageSize: 2,
          },
          isProcessing: false,
          isSuccess: true,
          error: null,
          reason: null,
        },
        pendingEvents: {
          eventIds: ["pending-event-1"],
        },
      },
    });

    render(
      <MainGridEvents
        measurements={mockMeasurements}
        weekProps={mockWeekProps}
      />,
      { state: initialState },
    );

    expect(
      screen.getByTestId("grid-event-pending-event-1"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("grid-event-normal-event-1")).toBeInTheDocument();
  });
});

afterAll(() => {
  mock.restore();
});
