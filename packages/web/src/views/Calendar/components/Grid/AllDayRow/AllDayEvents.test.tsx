import { screen } from "@testing-library/react";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { AllDayEvents } from "./AllDayEvents";

jest.mock("@web/views/Calendar/components/Grid/AllDayRow/AllDayEvent", () => ({
  AllDayEventMemo: ({ event }: any) => (
    <div data-testid={`allday-event-${event._id}`} data-event-id={event._id}>
      {event.title}
    </div>
  ),
}));

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

const mockWeekProps: WeekProps = {
  component: {
    startOfView: "2024-01-15T00:00:00Z",
    endOfView: "2024-01-21T23:59:59Z",
  },
  hooks: {} as any,
};

describe("AllDayEvents", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
            [event1._id!]: event1,
            [event2._id!]: event2,
          },
        },
        getWeekEvents: {
          value: {
            data: [event1._id!, event2._id!],
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
            [pendingEvent._id!]: pendingEvent,
          },
        },
        getWeekEvents: {
          value: {
            data: [pendingEvent._id!],
            count: 1,
            pageSize: 1,
          },
          isProcessing: false,
          isSuccess: true,
          error: null,
          reason: null,
        },
        pendingEvents: {
          eventIds: [pendingEvent._id!],
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
            [pendingEvent._id!]: pendingEvent,
            [normalEvent._id!]: normalEvent,
          },
        },
        getWeekEvents: {
          value: {
            data: [pendingEvent._id!, normalEvent._id!],
            count: 2,
            pageSize: 2,
          },
          isProcessing: false,
          isSuccess: true,
          error: null,
          reason: null,
        },
        pendingEvents: {
          eventIds: [pendingEvent._id!],
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
