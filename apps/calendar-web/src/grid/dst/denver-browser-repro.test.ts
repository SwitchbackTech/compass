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
import { inEffectiveTimeZone } from "@web/timezone/in-time-zone";
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

function legacyMinutesFromStartOfDay(iso: string): number {
  const start = inEffectiveTimeZone(iso);
  return start.diff(start.startOf("day"), "minute");
}

afterEach(() => {
  act(() => resetEffectiveTimeZoneStoreForTests());
});

describe("Denver browser zone (Tyler scenario)", () => {
  it("documents legacy startOf(day) vs civil grid minutes for wake time", () => {
    act(() => {
      setBrowserTimeZoneForTests(denver);
      setPinnedTimeZone(null);
    });

    const monWake = "2026-11-05T04:00:00-07:00";
    const sunWake = "2026-11-01T04:00:00-07:00";

    expect(legacyMinutesFromStartOfDay(monWake)).toBe(240);
    expect(legacyMinutesFromStartOfDay(sunWake)).toBe(300);
    expect(gridMinutesFromCivilMidnight(monWake, denver)).toBe(240);
    expect(gridMinutesFromCivilMidnight(sunWake, denver)).toBe(240);
  });

  it("maps 4 AM on fall-back Sunday to the 4 AM row, not elapsed 5 AM", () => {
    act(() => {
      setBrowserTimeZoneForTests(denver);
      setPinnedTimeZone(null);
    });

    const top = getTimedEventPosition(
      {
        endDate: "2026-11-01T05:00:00-07:00",
        isAllDay: false,
        position: { widthMultiplier: 1 },
        startDate: "2026-11-01T04:00:00-07:00",
      } as never,
      { measurements, visibleDates: visible("2026-11-01"), isDraft: false },
    ).top;
    expect(top).toBe(3 * hourHeight);
  });

  it("places 4 AM wake on the 4 AM row with Auto Denver", () => {
    act(() => {
      setBrowserTimeZoneForTests(denver);
      setPinnedTimeZone(null);
    });

    for (const dayKey of ["2026-11-01", "2026-11-05"]) {
      const top = getTimedEventPosition(
        {
          endDate: `${dayKey}T05:00:00-07:00`,
          isAllDay: false,
          position: { widthMultiplier: 1 },
          startDate: `${dayKey}T04:00:00-07:00`,
        } as never,
        { measurements, visibleDates: visible(dayKey), isDraft: false },
      ).top;
      expect(top).toBe(3 * hourHeight);
    }
  });

  it("matches gutter hour lines for each day in the Nov 1-7 2026 week", () => {
    act(() => {
      setBrowserTimeZoneForTests(denver);
      setPinnedTimeZone(null);
    });

    for (let day = 1; day <= 7; day += 1) {
      const dayKey = `2026-11-${String(day).padStart(2, "0")}`;
      const fourAm = civilHourLineInstants(dayKey, denver, true).find(
        (line) => line.format("h A") === "4 AM",
      );
      expect(fourAm).toBeDefined();
      if (dayKey === "2026-11-01") {
        // Fall-back labels walk calendar hours from MDT midnight; 4 AM MST
        // events use wall-clock minutes (see wake test above).
        expect(gridMinutesFromCivilMidnight(fourAm!, denver)).toBe(3 * 60);
      } else {
        expect(gridMinutesFromCivilMidnight(fourAm!, denver)).toBe(4 * 60);
      }
    }
  });

  it("places fall-back Sunday wake when browser is UTC and calendar is pinned Denver", () => {
    act(() => {
      setBrowserTimeZoneForTests("UTC");
      setPinnedTimeZone(denver);
    });

    const top = getTimedEventPosition(
      {
        endDate: "2026-11-01T05:00:00-07:00",
        isAllDay: false,
        position: { widthMultiplier: 1 },
        startDate: "2026-11-01T04:00:00-07:00",
      } as never,
      { measurements, visibleDates: visible("2026-11-01"), isDraft: false },
    ).top;
    expect(top).toBe(3 * hourHeight);
  });

  it("re-anchors UTC instants before grid minutes (Tyler 2h offset)", () => {
    act(() => {
      setBrowserTimeZoneForTests(denver);
      setPinnedTimeZone(null);
    });

    const top = getTimedEventPosition(
      {
        endDate: "2026-11-05T17:00:00.000Z",
        isAllDay: false,
        position: { widthMultiplier: 1 },
        startDate: "2026-11-05T16:00:00.000Z",
      } as never,
      {
        measurements,
        visibleDates: visible("2026-11-05"),
        isDraft: false,
      },
    ).top;

    expect(top).toBe(8 * hourHeight);
  });

  it("places 4 AM wake on the 4 AM row with pinned Denver", () => {
    act(() => {
      setBrowserTimeZoneForTests(denver);
      setPinnedTimeZone(denver);
    });

    const top = getTimedEventPosition(
      {
        endDate: "2026-11-05T05:00:00-07:00",
        isAllDay: false,
        position: { widthMultiplier: 1 },
        startDate: "2026-11-05T04:00:00-07:00",
      } as never,
      { measurements, visibleDates: visible("2026-11-05"), isDraft: false },
    ).top;
    expect(top).toBe(3 * hourHeight);
  });
});
