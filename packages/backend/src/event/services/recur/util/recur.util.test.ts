import { ObjectId } from "mongodb";
import { type EventRecord } from "@backend/event/event.record";
import {
  materializeSeriesInstances,
  withUntil,
} from "@backend/event/services/recur/util/recur.util";

const buildBase = (overrides: Partial<EventRecord> = {}): EventRecord => ({
  _id: new ObjectId(),
  calendarId: new ObjectId(),
  content: { kind: "details", title: "Standup", description: "" },
  schedule: {
    kind: "timed",
    start: new Date("2026-07-14T15:00:00.000Z"),
    end: new Date("2026-07-14T16:00:00.000Z"),
    timeZone: "America/Denver",
  },
  recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=4"] },
  priority: "unassigned",
  externalReference: null,
  createdAt: new Date("2026-07-10T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

describe("materializeSeriesInstances", () => {
  it("materializes every occurrence, including the one at the base's own start", () => {
    const base = buildBase();
    const instances = materializeSeriesInstances(base);

    expect(instances).toHaveLength(4);
    instances.forEach((instance) => {
      expect(instance.recurrence).toEqual({
        kind: "occurrence",
        seriesId: base._id,
      });
      expect(instance.calendarId).toEqual(base.calendarId);
      expect(instance.content).toEqual(base.content);
    });

    const starts = instances
      .map((i) => (i.schedule.kind === "timed" ? i.schedule.start.getTime() : 0))
      .sort((a, b) => a - b);
    expect(base.schedule.kind).toBe("timed");
    expect(starts[0]).toBe(
      base.schedule.kind === "timed" ? base.schedule.start.getTime() : 0,
    );
  });

  it("preserves the duration between start and end for timed instances", () => {
    const base = buildBase();
    const instances = materializeSeriesInstances(base);

    instances.forEach((instance) => {
      if (instance.schedule.kind !== "timed") throw new Error("expected timed");
      const durationMs =
        instance.schedule.end.getTime() - instance.schedule.start.getTime();
      expect(durationMs).toBe(60 * 60 * 1000);
    });
  });

  it("shifts all-day instances by whole days", () => {
    const base = buildBase({
      schedule: { kind: "allDay", start: "2026-08-03", end: "2026-08-06" },
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=2"] },
    });
    const instances = materializeSeriesInstances(base);

    expect(instances).toHaveLength(2);
    const starts = instances
      .map((i) => (i.schedule.kind === "allDay" ? i.schedule.start : ""))
      .sort();
    expect(starts).toEqual(["2026-08-03", "2026-08-10"]);

    const second = instances.find(
      (i) => i.schedule.kind === "allDay" && i.schedule.start === "2026-08-10",
    );
    if (second?.schedule.kind !== "allDay") throw new Error("expected allDay");
    expect(second.schedule.end).toBe("2026-08-13");
  });

  it("returns no instances for a non-series recurrence", () => {
    const base = buildBase({ recurrence: { kind: "single" } });
    expect(materializeSeriesInstances(base)).toEqual([]);
  });

  it("caps materialization at the given maxInstances", () => {
    const base = buildBase({
      recurrence: { kind: "series", rules: ["RRULE:FREQ=DAILY;COUNT=100"] },
    });
    const instances = materializeSeriesInstances(base, 5);
    expect(instances.length).toBeLessThanOrEqual(5);
  });

  it("does not materialize instances for a someday recurring series (recurrence surfaces only on the base)", () => {
    const base = buildBase({
      schedule: {
        kind: "someday",
        period: "week",
        anchorDate: "2026-07-13",
        sortOrder: 0,
      },
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=4"] },
    });

    expect(materializeSeriesInstances(base)).toEqual([]);
  });

  it("does not carry a base's externalReference onto materialized instances", () => {
    const base = buildBase({
      externalReference: {
        provider: "google",
        eventId: "g-1",
        recurringEventId: null,
      },
    });
    const instances = materializeSeriesInstances(base);

    expect(instances.length).toBeGreaterThan(0);
    instances.forEach((instance) => {
      expect(instance.externalReference).toBeNull();
    });
  });

  it("produces weekly instances exactly 7 days apart", () => {
    const base = buildBase({
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
    });
    const instances = materializeSeriesInstances(base);
    const starts = instances
      .map((i) =>
        i.schedule.kind === "timed" ? i.schedule.start.getTime() : 0,
      )
      .sort((a, b) => a - b);

    expect(starts).toEqual([
      base.schedule.kind === "timed" ? base.schedule.start.getTime() : 0,
      base.schedule.kind === "timed"
        ? base.schedule.start.getTime() + 7 * 24 * 60 * 60 * 1000
        : 0,
      base.schedule.kind === "timed"
        ? base.schedule.start.getTime() + 14 * 24 * 60 * 60 * 1000
        : 0,
    ]);
  });

  it("rolls monthly all-day instances over a year boundary", () => {
    const base = buildBase({
      schedule: { kind: "allDay", start: "2026-11-01", end: "2026-11-02" },
      recurrence: { kind: "series", rules: ["RRULE:FREQ=MONTHLY;COUNT=3"] },
    });
    const instances = materializeSeriesInstances(base);
    const starts = instances
      .map((i) => (i.schedule.kind === "allDay" ? i.schedule.start : ""))
      .sort();

    expect(starts).toEqual(["2026-11-01", "2026-12-01", "2027-01-01"]);
  });
});

describe("withUntil", () => {
  it("appends an UNTIL clause to a rule with none", () => {
    const [rule] = withUntil(
      ["RRULE:FREQ=WEEKLY"],
      new Date("2026-08-01T00:00:00.000Z"),
    );
    expect(rule).toContain("UNTIL=20260801T000000Z");
  });

  it("replaces an existing UNTIL clause", () => {
    const [rule] = withUntil(
      ["RRULE:FREQ=WEEKLY;UNTIL=20261231T000000Z"],
      new Date("2026-08-01T00:00:00.000Z"),
    );
    expect(rule).toContain("UNTIL=20260801T000000Z");
    expect(rule).not.toContain("20261231");
  });
});
