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
import { applyClientVisibility } from "@web/calendars/apply-client-visibility";
import {
  availabilityQueryOptions,
  deriveAvailabilityCalendarIds,
} from "@web/calendars/availability.query";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { readHiddenCalendarIds } from "@web/calendars/calendar-visibility.storage";
import { setCalendarVisibility } from "@web/calendars/calendar-visibility.store";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { type GridMeasurements } from "@web/grid/types/grid.types";
import { dayEventQueryRange } from "@web/views/Day/hooks/events/useDayEvents";
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
} satisfies GridMeasurements;

// useState initializer, matching MainGridBusyPeriods.test.tsx's Provider -
// seeding in the render body would rebuild an empty client on every
// re-render (see that file's comment for why that's a real, CI-only bug).
function Provider({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => {
    const client = createCompassQueryClient();
    client.setQueryData(calendarQueryKeys.all, seededCalendars);

    // Mirrors useCalendarsQuery's `select` (calendar.query.ts) so the key
    // this seeds under matches the key the real hook computes - isVisible on
    // a raw fixture is no longer authoritative, the hidden-ids store is.
    const visibleCalendars = applyClientVisibility(
      seededCalendars,
      readHiddenCalendarIds(),
    );
    const calendarIds = deriveAvailabilityCalendarIds(visibleCalendars);
    // Same range the layer queries, so the seeded entry lands under the key
    // it reads.
    const { startDate, endDate } = dayEventQueryRange(dateInView);
    const response: AvailabilityResponse = { busyPeriods: seededBusyPeriods };
    client.setQueryData(
      availabilityQueryOptions({
        calendarIds,
        start: startDate,
        end: endDate,
      }).queryKey,
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
  // Storage clearing + the hidden-ids store resync are both handled by the
  // global test-lifecycle afterEach (resetBrowserState + resetAllStores).
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
    const hiddenCalendar = makeFreeBusyCalendar();
    // isVisible is client-derived from the hidden-ids store now, not a field
    // to seed directly on the fixture - see calendar-visibility.store.ts.
    setCalendarVisibility(hiddenCalendar.id, false);
    seededCalendars = [hiddenCalendar];
    seededBusyPeriods = [];

    renderLayer();

    expect(
      screen.queryByRole("img", { name: /busy/i }),
    ).not.toBeInTheDocument();
  });
});
