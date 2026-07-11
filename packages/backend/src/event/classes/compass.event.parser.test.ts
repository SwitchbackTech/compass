import { ObjectId } from "mongodb";
import {
  analyzeDelete,
  analyzeReplace,
  analyzeTransition,
} from "@backend/event/classes/compass.event.parser";
import { type EventRecord } from "@backend/event/event.record";

const now = new Date("2026-07-10T00:00:00.000Z");
const calendarId = new ObjectId();

const buildEvent = (overrides: Partial<EventRecord> = {}): EventRecord => ({
  _id: new ObjectId(),
  calendarId,
  content: { kind: "details", title: "Standup", description: "" },
  schedule: {
    kind: "timed",
    start: new Date("2026-07-14T15:00:00.000Z"),
    end: new Date("2026-07-14T16:00:00.000Z"),
    timeZone: "America/Denver",
  },
  recurrence: { kind: "single" },
  priority: "unassigned",
  externalReference: null,
  createdAt: now,
  updatedAt: null,
  ...overrides,
});

const replaceInput = (
  overrides: Partial<Parameters<typeof analyzeReplace>[2]> = {},
) => ({
  content: { kind: "details" as const, title: "Updated", description: "" },
  schedule: {
    kind: "timed" as const,
    start: "2026-07-14T15:00:00-06:00",
    end: "2026-07-14T16:00:00-06:00",
    timeZone: "America/Denver",
  },
  recurrence: { kind: "preserve" as const },
  priority: "unassigned" as const,
  scope: "this" as const,
  ...overrides,
});

describe("analyzeReplace", () => {
  it("scope this: updates a standalone event in place", () => {
    const target = buildEvent();
    const plan = analyzeReplace(target, null, replaceInput(), now);

    expect(plan.kind).toBe("replaceThis");
    if (plan.kind !== "replaceThis") throw new Error("expected replaceThis");
    expect(plan.updated.content.kind).toBe("details");
    expect(plan.updated._id).toEqual(target._id);
  });

  it("scope this: rejects editing a series base directly", () => {
    const base = buildEvent({
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY"] },
    });

    expect(() =>
      analyzeReplace(base, { base, instances: [] }, replaceInput(), now),
    ).toThrow();
  });

  it("scope all: replaces the base and marks every instance for deletion", () => {
    const base = buildEvent({
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
    });
    const instances = [
      buildEvent({ recurrence: { kind: "occurrence", seriesId: base._id } }),
      buildEvent({ recurrence: { kind: "occurrence", seriesId: base._id } }),
    ];

    const plan = analyzeReplace(
      base,
      { base, instances },
      replaceInput({ scope: "all" }),
      now,
    );

    expect(plan.kind).toBe("replaceSeries");
    if (plan.kind !== "replaceSeries")
      throw new Error("expected replaceSeries");
    expect(plan.deleteInstanceIds).toHaveLength(2);
  });

  it("scope thisAndFollowing: splits the series at the target occurrence", () => {
    const base = buildEvent({
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
    });
    const target = buildEvent({
      schedule: {
        kind: "timed",
        start: new Date("2026-07-21T15:00:00.000Z"),
        end: new Date("2026-07-21T16:00:00.000Z"),
        timeZone: "America/Denver",
      },
      recurrence: { kind: "occurrence", seriesId: base._id },
    });
    const laterInstance = buildEvent({
      schedule: {
        kind: "timed",
        start: new Date("2026-07-28T15:00:00.000Z"),
        end: new Date("2026-07-28T16:00:00.000Z"),
        timeZone: "America/Denver",
      },
      recurrence: { kind: "occurrence", seriesId: base._id },
    });

    const plan = analyzeReplace(
      target,
      { base, instances: [laterInstance] },
      replaceInput({ scope: "thisAndFollowing" }),
      now,
    );

    expect(plan.kind).toBe("replaceSplit");
    if (plan.kind !== "replaceSplit") throw new Error("expected replaceSplit");
    expect(plan.newBase._id).toEqual(target._id);
    expect(plan.deleteInstanceIds).toEqual([laterInstance._id]);
  });

  it("scope all: converts a series to standalone when recurrence.kind is 'single'", () => {
    const base = buildEvent({
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
    });
    const instances = [
      buildEvent({ recurrence: { kind: "occurrence", seriesId: base._id } }),
      buildEvent({ recurrence: { kind: "occurrence", seriesId: base._id } }),
    ];

    const plan = analyzeReplace(
      base,
      { base, instances },
      replaceInput({ scope: "all", recurrence: { kind: "single" } }),
      now,
    );

    expect(plan.kind).toBe("replaceSeries");
    if (plan.kind !== "replaceSeries")
      throw new Error("expected replaceSeries");
    expect(plan.updatedBase.recurrence).toEqual({ kind: "single" });
    expect(plan.deleteInstanceIds).toHaveLength(2);
  });
});

describe("analyzeDelete", () => {
  it("scope this: deletes only the target", () => {
    const target = buildEvent();
    const plan = analyzeDelete(target, null, { scope: "this" });
    expect(plan).toEqual({ kind: "deleteThis", target });
  });

  it("scope this: rejects deleting a series base directly", () => {
    const base = buildEvent({
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY"] },
    });
    expect(() =>
      analyzeDelete(base, { base, instances: [] }, { scope: "this" }),
    ).toThrow();
  });

  it("scope all: deletes the whole series", () => {
    const base = buildEvent({
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY"] },
    });
    const occurrence = buildEvent({
      recurrence: { kind: "occurrence", seriesId: base._id },
    });
    const plan = analyzeDelete(
      occurrence,
      { base, instances: [occurrence] },
      { scope: "all" },
    );
    expect(plan).toEqual({ kind: "deleteSeries", seriesId: base._id });
  });
});

describe("analyzeTransition", () => {
  it("schedule: moves an event onto the target calendar", () => {
    const target = buildEvent({
      schedule: {
        kind: "someday",
        period: "week",
        anchorDate: "2026-07-13",
        sortOrder: 0,
      },
    });
    const targetCalendarId = new ObjectId();

    const plan = analyzeTransition(
      target,
      {
        kind: "schedule",
        targetCalendarId: targetCalendarId.toHexString() as never,
        schedule: {
          kind: "timed",
          start: "2026-07-14T15:00:00-06:00",
          end: "2026-07-14T16:00:00-06:00",
          timeZone: "America/Denver",
        },
      },
      targetCalendarId,
      now,
    );

    expect(plan.kind).toBe("schedule");
    expect(plan.updated.calendarId).toEqual(targetCalendarId);
    expect(plan.updated.externalReference).toBeNull();
  });

  it("unschedule: moves an event to the local calendar as a someday event", () => {
    const target = buildEvent();
    const localCalendarId = new ObjectId();

    const plan = analyzeTransition(
      target,
      {
        kind: "unschedule",
        schedule: {
          kind: "someday",
          period: "week",
          anchorDate: "2026-07-13",
          sortOrder: 0,
        },
      },
      localCalendarId,
      now,
    );

    expect(plan.kind).toBe("unschedule");
    expect(plan.updated.calendarId).toEqual(localCalendarId);
    expect(plan.updated.schedule.kind).toBe("someday");
    expect(plan.updated.recurrence).toEqual({ kind: "single" });
  });

  it("rejects transitioning a bare occurrence", () => {
    const seriesId = new ObjectId();
    const occurrence = buildEvent({
      recurrence: { kind: "occurrence", seriesId },
    });

    expect(() =>
      analyzeTransition(
        occurrence,
        {
          kind: "unschedule",
          schedule: {
            kind: "someday",
            period: "week",
            anchorDate: "2026-07-13",
            sortOrder: 0,
          },
        },
        new ObjectId(),
        now,
      ),
    ).toThrow();
  });
});
