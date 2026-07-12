import { QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren, useState } from "react";
import {
  type Calendar,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import {
  type CalendarId,
  CalendarIdSchema,
} from "@core/types/domain-primitives";
import { type BusyPeriod, BusyPeriodSchema } from "@core/types/event.contracts";
import { type AvailabilityResponse } from "@core/types/event-command.contracts";
import dayjs from "@core/util/date/dayjs";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@web/__tests__/__mocks__/mock.render";
import { createCompassQueryClient } from "@web/api/query-client";
import {
  availabilityQueryOptions,
  deriveAvailabilityCalendarIds,
} from "@web/calendars/availability.query";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { toUTCOffset } from "@web/common/utils/datetime/web.date.util";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { useDraftStore } from "@web/events/stores/draft.store";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { WEEK_INTERACTION_EVENT_ID_ATTRIBUTE } from "@web/views/Week/interaction/registry/weekEventRegistry";
import { MainGridBusyPeriods } from "./MainGridBusyPeriods";
import { afterEach, describe, expect, it, mock } from "bun:test";

let seededCalendars: Calendar[] = [];
let seededBusyPeriods: BusyPeriod[] = [];

const startOfView = dayjs("2024-01-14T00:00:00.000");
const weekProps = {
  component: {
    category: "current" as const,
    endOfView: startOfView.endOf("week"),
    isCurrentWeek: true,
    startOfView,
    week: startOfView.week(),
    weekDays: Array.from({ length: 7 }, (_, index) =>
      startOfView.add(index, "day"),
    ),
  },
  state: { goToDate: mock() },
  util: {
    decrementWeek: mock(),
    getLastNavigationSource: mock(() => "manual" as const),
    goToToday: mock(),
    incrementWeek: mock(),
    shiftViewByDay: mock(),
  },
};

const measurements = {
  allDayRow: null,
  colWidths: [100, 100, 100, 100, 100, 100, 100],
  hourHeight: 60,
  mainGrid: {
    bottom: 780,
    height: 780,
    left: 0,
    right: 700,
    top: 0,
    width: 700,
    x: 0,
    y: 0,
  },
} satisfies Measurements_Grid;

// useState initializer: exactly one client per mounted tree (matches
// eventReadOnlyInteraction.test.tsx's Provider) - seeding in the render body
// would rebuild an empty client on every re-render and the fresh cache would
// then really try to fetch /api/calendars and /api/calendars/availability
// (no handlers here), a timing-dependent failure on slow CI runners.
function Provider({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => {
    const client = createCompassQueryClient();
    client.setQueryData(calendarQueryKeys.all, seededCalendars);

    const calendarIds = deriveAvailabilityCalendarIds(seededCalendars);
    const start = toUTCOffset(weekProps.component.startOfView);
    const end = toUTCOffset(weekProps.component.endOfView);
    const response: AvailabilityResponse = { busyPeriods: seededBusyPeriods };
    client.setQueryData(
      availabilityQueryOptions({ calendarIds, start, end }).queryKey,
      response,
    );

    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  seededCalendars = [];
  seededBusyPeriods = [];
});

const makeFreeBusyCalendar = (overrides: Partial<Calendar> = {}): Calendar => ({
  id: CalendarIdSchema.parse(createObjectIdString()),
  name: "Team Offsite",
  description: "",
  timeZone: null,
  foregroundColor: "#000000",
  backgroundColor: "#3b82f6",
  provider: "google",
  access: "freeBusyReader",
  capabilities: getCalendarCapabilities("freeBusyReader"),
  isPrimary: false,
  isVisible: true,
  isActive: true,
  ...overrides,
});

const makeBusyPeriod = (
  calendarId: CalendarId,
  overrides: Partial<{ start: string; end: string }> = {},
): BusyPeriod =>
  BusyPeriodSchema.parse({
    calendarId,
    start: "2024-01-15T09:00:00.000Z",
    end: "2024-01-15T10:00:00.000Z",
    ...overrides,
  });

const renderMainGridBusyPeriods = () =>
  render(
    <Provider>
      <MainGridBusyPeriods measurements={measurements} weekProps={weekProps} />
    </Provider>,
  );

describe("MainGridBusyPeriods", () => {
  it("renders a busy block with the calendar name and time range in its aria-label", () => {
    const calendar = makeFreeBusyCalendar();
    seededCalendars = [calendar];
    seededBusyPeriods = [makeBusyPeriod(calendar.id)];

    renderMainGridBusyPeriods();

    expect(
      screen.getByRole("img", {
        name: /busy, team offsite calendar, .*9.*10.*am/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders no interactive affordances and does nothing to the draft store on click", () => {
    const calendar = makeFreeBusyCalendar();
    seededCalendars = [calendar];
    seededBusyPeriods = [makeBusyPeriod(calendar.id)];

    renderMainGridBusyPeriods();

    const block = screen.getByRole("img", { name: /busy/i });
    expect(block).not.toHaveAttribute(WEEK_INTERACTION_EVENT_ID_ATTRIBUTE);
    expect(
      screen.queryByRole("button", { name: /busy/i }),
    ).not.toBeInTheDocument();

    const draftBefore = useDraftStore.getState();
    fireEvent.mouseDown(block, { button: 0, buttons: 1 });
    fireEvent.click(block);
    const draftAfter = useDraftStore.getState();

    expect(draftAfter.status?.activity ?? null).toBe(
      draftBefore.status?.activity ?? null,
    );
    expect(draftAfter.event).toBe(draftBefore.event);
  });

  it("splits a multi-day busy period into one block per day column", () => {
    const calendar = makeFreeBusyCalendar();
    seededCalendars = [calendar];
    seededBusyPeriods = [
      makeBusyPeriod(calendar.id, {
        start: "2024-01-15T20:00:00.000Z",
        end: "2024-01-16T04:00:00.000Z",
      }),
    ];

    renderMainGridBusyPeriods();

    expect(screen.getAllByRole("img", { name: /busy/i })).toHaveLength(2);
  });

  it("renders no busy blocks when there are no qualifying freeBusyReader calendars (query stays disabled)", () => {
    seededCalendars = [];
    seededBusyPeriods = [];

    renderMainGridBusyPeriods();

    expect(
      screen.queryByRole("img", { name: /busy/i }),
    ).not.toBeInTheDocument();
  });
});
