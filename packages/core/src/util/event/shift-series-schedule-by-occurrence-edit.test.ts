import {
  DateOnlySchema,
  DateTimeSchema,
  TimeZoneSchema,
} from "@core/types/domain-primitives";
import { type EventSchedule } from "@core/types/event.contracts";
import { shiftSeriesScheduleByOccurrenceEdit } from "@core/util/event/shift-series-schedule-by-occurrence-edit";
import { describe, expect, it } from "bun:test";

const timed = (start: string, end: string): EventSchedule => ({
  kind: "timed",
  start: DateTimeSchema.parse(start),
  end: DateTimeSchema.parse(end),
  timeZone: TimeZoneSchema.parse("UTC"),
});

const allDay = (start: string, end: string): EventSchedule => ({
  kind: "allDay",
  start: DateOnlySchema.parse(start),
  end: DateOnlySchema.parse(end),
});

describe("shiftSeriesScheduleByOccurrenceEdit", () => {
  it("shifts a timed series master by a middle occurrence's day delta", () => {
    const base = timed("2026-05-04T09:00:00.000Z", "2026-05-04T10:00:00.000Z");
    const edited = timed(
      "2026-05-07T09:00:00.000Z",
      "2026-05-07T10:00:00.000Z",
    );

    expect(
      shiftSeriesScheduleByOccurrenceEdit(
        base,
        "2026-05-06T09:00:00.000Z",
        edited,
      ),
    ).toEqual(timed("2026-05-05T09:00:00+00:00", "2026-05-05T10:00:00+00:00"));
  });

  it("propagates a timed duration change onto the master", () => {
    const base = timed("2026-05-04T09:00:00.000Z", "2026-05-04T10:00:00.000Z");
    const edited = timed(
      "2026-05-06T09:00:00.000Z",
      "2026-05-06T11:00:00.000Z",
    );

    expect(
      shiftSeriesScheduleByOccurrenceEdit(
        base,
        "2026-05-06T09:00:00.000Z",
        edited,
      ),
    ).toEqual(timed("2026-05-04T09:00:00+00:00", "2026-05-04T11:00:00+00:00"));
  });

  it("returns the timed base unchanged for a zero delta", () => {
    const base = timed("2026-05-04T09:00:00.000Z", "2026-05-04T10:00:00.000Z");
    const edited = timed(
      "2026-05-06T09:00:00.000Z",
      "2026-05-06T10:00:00.000Z",
    );

    expect(
      shiftSeriesScheduleByOccurrenceEdit(
        base,
        "2026-05-06T09:00:00.000Z",
        edited,
      ),
    ).toBe(base);
  });

  it("shifts an all-day series master by a middle occurrence's day delta", () => {
    const base = allDay("2026-05-04", "2026-05-05");
    const edited = allDay("2026-05-07", "2026-05-08");

    expect(
      shiftSeriesScheduleByOccurrenceEdit(
        base,
        "2026-05-06T00:00:00.000Z",
        edited,
      ),
    ).toEqual(allDay("2026-05-05", "2026-05-06"));
  });

  it("returns the all-day base unchanged for a zero delta", () => {
    const base = allDay("2026-05-04", "2026-05-05");
    const edited = allDay("2026-05-06", "2026-05-07");

    expect(
      shiftSeriesScheduleByOccurrenceEdit(
        base,
        "2026-05-06T00:00:00.000Z",
        edited,
      ),
    ).toBe(base);
  });

  it("returns edited unchanged on a timed ↔ allDay kind flip", () => {
    const base = timed("2026-05-04T09:00:00.000Z", "2026-05-04T10:00:00.000Z");
    const edited = allDay("2026-05-07", "2026-05-08");

    expect(
      shiftSeriesScheduleByOccurrenceEdit(
        base,
        "2026-05-06T09:00:00.000Z",
        edited,
      ),
    ).toBe(edited);
  });
});
