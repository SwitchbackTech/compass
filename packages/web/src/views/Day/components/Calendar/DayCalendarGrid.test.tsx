import { cleanup, render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { CALENDAR_DECK_INDENT } from "@web/common/calendar-grid/calendarGrid.constants";
import { type CalendarGridMeasurements } from "@web/common/calendar-grid/types/calendarGrid.types";
import { theme } from "@web/common/styles/theme";
import { type RootState } from "@web/store";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";

const dispatchMock = mock();
const updateEventMock = mock();
let state = createInitialState() as RootState;

const measurements = {
  allDayRow: {
    bottom: 40,
    height: 40,
    left: 0,
    right: 180,
    top: 0,
    width: 180,
    x: 0,
    y: 0,
  },
  colWidths: [180],
  hourHeight: 60,
  mainGrid: {
    bottom: 780,
    height: 780,
    left: 0,
    right: 180,
    top: 0,
    width: 180,
    x: 0,
    y: 0,
  },
} satisfies CalendarGridMeasurements;

mock.module("@web/store/store.hooks", () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: RootState) => unknown) => selector(state),
}));

mock.module("@web/common/hooks/useUpdateEvent", () => ({
  useUpdateEvent: () => updateEventMock,
}));

mock.module("@web/views/Day/hooks/navigation/useDateInView", () => ({
  useDateInView: () => dayjs("2026-05-20T00:00:00.000"),
}));

mock.module("@web/common/calendar-grid/hooks/useCalendarGridLayout", () => ({
  useCalendarGridLayout: () => ({
    gridRefs: {
      allDayColumnsRef: { current: null },
      allDayRef: mock(),
      allDayRowRef: mock(),
      mainGridElementRef: mock(),
      mainGridRef: { current: null },
      timedColumnsElementRef: mock(),
      timedColumnsRef: { current: null },
    },
    measurements,
  }),
}));

mock.module("@web/components/FloatingEventForm/FloatingEventForm", () => ({
  FloatingEventForm: () => null,
}));

const { DayCalendarGrid } =
  require("./DayCalendarGrid") as typeof import("./DayCalendarGrid");

const renderDayCalendarGrid = () =>
  render(
    <ThemeProvider theme={theme}>
      <DayCalendarGrid />
    </ThemeProvider>,
  );

const createTimedEvent = (
  overrides: Partial<Schema_Event> & {
    _id: string;
    startDate: string;
    endDate: string;
  },
): Schema_Event =>
  ({
    isAllDay: false,
    isSomeday: false,
    recurrence: undefined,
    title: overrides._id,
    user: "user",
    ...overrides,
  }) as Schema_Event;

const setDayEvents = (events: Schema_Event[]) => {
  const entities: Record<string, Schema_Event> = {};
  const ids: string[] = [];

  for (const event of events) {
    if (!event._id) continue;

    entities[event._id] = event;
    ids.push(event._id);
  }

  state.events.entities.value = entities;
  state.events.getDayEvents.value = {
    count: ids.length,
    data: ids,
    offset: 0,
    page: 1,
    pageSize: ids.length || 1,
  };
};

beforeEach(() => {
  state = createInitialState() as RootState;
  state.events.entities.value = {};
  state.events.getDayEvents.value = {
    count: 0,
    data: [],
    offset: 0,
    page: 1,
    pageSize: 1,
  };
  state.events.pendingEvents.eventIds = [];
  dispatchMock.mockClear();
  updateEventMock.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("DayCalendarGrid", () => {
  it("renders one timed column", () => {
    renderDayCalendarGrid();

    const timedGrid = screen.getByRole("region", {
      name: "Timed events grid",
    });
    expect(within(timedGrid).getAllByRole("columnheader")).toHaveLength(1);
  });

  it("renders all-day and timed regions without rendering tasks", () => {
    renderDayCalendarGrid();

    expect(
      screen.getByRole("region", { name: "All-day events" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Task list" }),
    ).not.toBeInTheDocument();
  });

  it("lays overlapping timed events out as a left-anchored deck", () => {
    setDayEvents([
      createTimedEvent({
        _id: "early-overlap",
        endDate: "2026-05-20T10:30:00.000",
        startDate: "2026-05-20T09:00:00.000",
        title: "Early overlap",
      }),
      createTimedEvent({
        _id: "late-overlap",
        endDate: "2026-05-20T10:45:00.000",
        startDate: "2026-05-20T09:30:00.000",
        title: "Late overlap",
      }),
      createTimedEvent({
        _id: "solo",
        endDate: "2026-05-20T15:00:00.000",
        startDate: "2026-05-20T14:00:00.000",
        title: "Solo",
      }),
    ]);

    renderDayCalendarGrid();

    const early = screen.getByRole("button", { name: /early overlap/i });
    const late = screen.getByRole("button", { name: /late overlap/i });
    const solo = screen.getByRole("button", { name: /timed event: solo/i });

    expect(parseFloat(early.style.width)).toBe(parseFloat(late.style.width));
    expect(parseFloat(late.style.left) - parseFloat(early.style.left)).toBe(
      CALENDAR_DECK_INDENT,
    );
    expect(Number(early.style.zIndex)).toBeLessThan(Number(late.style.zIndex));
    expect(parseFloat(solo.style.width)).toBeGreaterThan(
      parseFloat(early.style.width),
    );
  });
});
