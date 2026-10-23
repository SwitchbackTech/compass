import { act } from "react";
import dayjs from "@core/util/date/dayjs";
import { getHourLabels } from "@web/common/utils/datetime/web.date.util";
import { getTimedEventPosition } from "@web/grid/layout/event.position";
import {
  resetEffectiveTimeZoneStoreForTests,
  setBrowserTimeZoneForTests,
  setPinnedTimeZone,
} from "@web/timezone/effective-timezone.store";
import { afterEach, describe, expect, it } from "bun:test";

const hourHeight = 60;
const measurements = {
  allDayRow: null,
  colWidths: [320],
  hourHeight,
  mainGrid: { height: hourHeight * 13 } as never,
};

const visible = (dayKey: string, zone: string) => [
  { date: dayjs.tz(`${dayKey}T12:00`, zone), key: dayKey },
];

const topRowOf = (
  zone: string,
  dayKey: string,
  startAt: string,
  endAt: string,
): number =>
  getTimedEventPosition(
    {
      endDate: endAt,
      isAllDay: false,
      position: { widthMultiplier: 1 },
      startDate: startAt,
      timeZone: zone,
    } as never,
    { measurements, visibleDates: visible(dayKey, zone), isDraft: false },
  ).top / hourHeight;

const gutterRowOf = (zone: string, dayKey: string, label: string): number => {
  const labels = getHourLabels(true, dayjs.tz(`${dayKey}T12:00`, zone), zone);
  const index = labels.indexOf(label);
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
};

afterEach(() => {
  act(() => resetEffectiveTimeZoneStoreForTests());
});

describe("timed grid alignment across zones", () => {
  it("matches gutter rows for America/Denver on a normal MDT day", () => {
    act(() => {
      setBrowserTimeZoneForTests("America/Denver");
      setPinnedTimeZone(null);
    });
    const zone = "America/Denver";
    const dayKey = "2026-10-21";
    const start = `${dayKey}T09:00:00-06:00`;
    const end = `${dayKey}T09:45:00-06:00`;
    expect(topRowOf(zone, dayKey, start, end)).toBe(
      gutterRowOf(zone, dayKey, "9 AM"),
    );
  });

  it("matches gutter rows for UTC", () => {
    act(() => {
      setBrowserTimeZoneForTests("UTC");
      setPinnedTimeZone(null);
    });
    const zone = "UTC";
    const dayKey = "2026-10-21";
    const start = `${dayKey}T09:00:00.000Z`;
    const end = `${dayKey}T09:45:00.000Z`;
    expect(topRowOf(zone, dayKey, start, end)).toBe(
      gutterRowOf(zone, dayKey, "9 AM"),
    );
  });

  it("matches gutter rows for Asia/Kolkata (+5:30)", () => {
    act(() => {
      setBrowserTimeZoneForTests("Asia/Kolkata");
      setPinnedTimeZone(null);
    });
    const zone = "Asia/Kolkata";
    const dayKey = "2026-10-21";
    const start = `${dayKey}T09:00:00+05:30`;
    const end = `${dayKey}T09:45:00+05:30`;
    expect(topRowOf(zone, dayKey, start, end)).toBe(
      gutterRowOf(zone, dayKey, "9 AM"),
    );
  });

  it("matches gutter rows for Australia/Lord_Howe (+10:30 base, +11 during DST)", () => {
    act(() => {
      setBrowserTimeZoneForTests("Australia/Lord_Howe");
      setPinnedTimeZone(null);
    });
    const zone = "Australia/Lord_Howe";
    const dayKey = "2026-10-21";
    const start = `${dayKey}T09:00:00+11:00`;
    const end = `${dayKey}T09:45:00+11:00`;
    expect(topRowOf(zone, dayKey, start, end)).toBe(
      gutterRowOf(zone, dayKey, "9 AM"),
    );
  });

  it("keeps a Denver fall-back Sunday 4 AM event on the 4 AM gutter row", () => {
    act(() => {
      setBrowserTimeZoneForTests("America/Denver");
      setPinnedTimeZone(null);
    });
    const zone = "America/Denver";
    const dayKey = "2026-11-01";
    const start = `${dayKey}T04:00:00-07:00`;
    const end = `${dayKey}T05:00:00-07:00`;
    expect(topRowOf(zone, dayKey, start, end)).toBe(
      gutterRowOf(zone, dayKey, "4 AM"),
    );
  });
});
