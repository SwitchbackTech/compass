import { QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren, useState } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import {
  type Calendar,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import { CalendarIdSchema } from "@core/types/domain-primitives";
import { type BusyPeriod, BusyPeriodSchema } from "@core/types/event.contracts";
import { type AvailabilityResponse } from "@core/types/event-command.contracts";
import dayjs from "@core/util/date/dayjs";
import { cleanup, render, screen } from "@web/__tests__/__mocks__/mock.render";
import { createCompassQueryClient } from "@web/api/query-client";
import {
  availabilityQueryOptions,
  deriveAvailabilityCalendarIds,
} from "@web/calendars/availability.query";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { type CalendarGridMeasurements } from "@web/layout/calendar-grid/types/calendarGrid.types";
import { DayCalendarBusyPeriodsLayer } from "./DayCalendarBusyPeriods";
import { afterEach, describe, expect, it } from "bun:test";

let seededCalendars: Calendar[] = [];
let seededBusyPeriods: BusyPeriod[] = [];

const dateInView = dayjs("2026-05-20T00:00:00.000");
const visibleDates = [
  { date: dateInView, key: dateInView.format(YEAR_MONTH_DAY_FORMAT) },
];
const measurements = {
  allDayRow: null,
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

// useState initializer, matching MainGridBusyPeriods.test.tsx's Provider -
// seeding in the render body would rebuild an empty client on every
// re-render (see that file's comment for why that's a real, CI-only bug).
function Provider({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => {
    const client = createCompassQueryClient();
    client.setQueryData(calendarQueryKeys.all, seededCalendars);

    const calendarIds = deriveAvailabilityCalendarIds(seededCalendars);
    const start = dateInView.startOf("day").utc(true).format();
    const end = dateInView.endOf("day").utc(true).format();
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

const renderLayer = () =>
  render(
    <Provider>
      <DayCalendarBusyPeriodsLayer
        dateInView={dateInView}
        measurements={measurements}
        visibleDates={visibleDates}
      />
    </Provider>,
  );

describe("DayCalendarBusyPeriodsLayer", () => {
  it("renders a busy block with the calendar name and time range in its aria-label", () => {
    const calendar = makeFreeBusyCalendar();
    seededCalendars = [calendar];
    seededBusyPeriods = [
      BusyPeriodSchema.parse({
        calendarId: calendar.id,
        start: "2026-05-20T09:00:00.000Z",
        end: "2026-05-20T10:00:00.000Z",
      }),
    ];

    renderLayer();

    expect(
      screen.getByRole("img", {
        name: /busy, team offsite calendar, .*9.*10.*am/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders no busy blocks when the only seeded calendar is a hidden freeBusyReader calendar", () => {
    // deriveAvailabilityCalendarIds excludes it (own unit tests in
    // availability.query.test.ts cover the filter itself), so
    // useAvailabilityQuery's derived calendarIds is empty here - this pins
    // that the render path correctly shows nothing for that disabled query,
    // not just that the id-derivation function does.
    const hiddenCalendar = makeFreeBusyCalendar({ isVisible: false });
    seededCalendars = [hiddenCalendar];
    seededBusyPeriods = [];

    renderLayer();

    expect(
      screen.queryByRole("img", { name: /busy/i }),
    ).not.toBeInTheDocument();
  });
});
