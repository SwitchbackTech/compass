import { act } from "react";
import {
  civilHourLineInstants,
  gridMinutesFromCivilMidnight,
} from "@core/util/date/civil-day";
import dayjs from "@core/util/date/dayjs";
import { getTimedEventPosition } from "@web/grid/layout/event.position";
import {
  resetEffectiveTimeZoneStoreForTests,
  setBrowserTimeZoneForTests,
  setPinnedTimeZone,
} from "@web/timezone/effective-timezone.store";
import { afterEach, describe, expect, it } from "bun:test";

const denver = "America/Denver";
const hourHeight = 60;
const measurements = {
  allDayRow: null,
  colWidths: [320],
  hourHeight,
  mainGrid: { height: hourHeight * 13 } as never,
};

const visible = (dayKey: string) => [
  { date: dayjs.tz(`${dayKey}T12:00`, denver), key: dayKey },
];

const useZones = (browserZone: string, pinnedZone: string | null) => {
  act(() => {
    setBrowserTimeZoneForTests(browserZone);
    setPinnedTimeZone(pinnedZone);
  });
};

/** Grid offset of a one-hour timed event, in hour rows from the grid origin. */
const topRowOf = (dayKey: string, startAt: string, endAt: string): number =>
  getTimedEventPosition(
    {
      endDate: endAt,
      isAllDay: false,
      position: { widthMultiplier: 1 },
      startDate: startAt,
    } as never,
    { measurements, visibleDates: visible(dayKey), isDraft: false },
  ).top / hourHeight;

afterEach(() => {
  act(() => resetEffectiveTimeZoneStoreForTests());
});

// Nov 1 2026 is Denver's fall-back Sunday: a 25-hour civil day whose grid
// starts an hour early, so a 4 AM MST wall-clock event sits on the 3rd row.
// Every zone configuration below has to agree on that, because the row an
// event lands on and the row its gutter label prints on come from different
// code paths (event.position vs civilHourLineInstants).
describe("Denver fall-back week grid alignment", () => {
  it("places a 4 AM wall-clock event on the same row before and after fall-back", () => {
    useZones(denver, null);

    for (const dayKey of ["2026-11-01", "2026-11-05"]) {
      expect(
        topRowOf(
          dayKey,
          `${dayKey}T04:00:00-07:00`,
          `${dayKey}T05:00:00-07:00`,
        ),
      ).toBe(3);
    }
  });

  it("matches gutter hour lines for each day in the Nov 1-7 2026 week", () => {
    useZones(denver, null);

    for (let day = 1; day <= 7; day += 1) {
      const dayKey = `2026-11-${String(day).padStart(2, "0")}`;
      const fourAm = civilHourLineInstants(dayKey, denver, true).find(
        (line) => line.format("h A") === "4 AM",
      );
      expect(fourAm).toBeDefined();
      if (dayKey === "2026-11-01") {
        // Fall-back labels walk calendar hours from MDT midnight; 4 AM MST
        // events use wall-clock minutes (see the wall-clock test above).
        expect(gridMinutesFromCivilMidnight(fourAm!, denver)).toBe(3 * 60);
      } else {
        expect(gridMinutesFromCivilMidnight(fourAm!, denver)).toBe(4 * 60);
      }
    }
  });

  it("places fall-back Sunday events when the browser is UTC and Denver is pinned", () => {
    useZones("UTC", denver);

    expect(
      topRowOf(
        "2026-11-01",
        "2026-11-01T04:00:00-07:00",
        "2026-11-01T05:00:00-07:00",
      ),
    ).toBe(3);
  });

  it("places 4 AM wall-clock events on the 4 AM row with Denver pinned", () => {
    useZones(denver, denver);

    expect(
      topRowOf(
        "2026-11-05",
        "2026-11-05T04:00:00-07:00",
        "2026-11-05T05:00:00-07:00",
      ),
    ).toBe(3);
  });

  it("re-anchors UTC instants to the zone offset before taking grid minutes", () => {
    useZones(denver, null);

    // 16:00Z on Nov 5 is 09:00 MST; reading the instant without re-anchoring
    // would land it two rows off.
    expect(
      topRowOf(
        "2026-11-05",
        "2026-11-05T16:00:00.000Z",
        "2026-11-05T17:00:00.000Z",
      ),
    ).toBe(8);
  });
});
