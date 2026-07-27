import { ObjectId } from "mongodb";
import {
  generateDelete,
  generateReplace,
} from "@backend/event/classes/compass.event.generator";
import {
  type DeletePlan,
  type ReplacePlan,
} from "@backend/event/classes/compass.event.parser";
import { type EventRecord } from "@backend/event/event.record";
import { describe, expect, it } from "bun:test";

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
  externalReference: null,
  createdAt: new Date("2026-07-10T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

describe("generateReplace", () => {
  it("replaceThis: passes the updated event through unchanged", () => {
    const updated = buildEvent();
    const plan: ReplacePlan = { kind: "replaceThis", updated };

    const result = generateReplace(plan);

    expect(result).toEqual({
      upsert: [updated],
      deleteIds: [],
      primary: updated,
    });
  });

  it("replaceThis: materializes instances when the update converts a single event to a series", () => {
    const updated = buildEvent({
      recurrence: { kind: "series", rules: ["RRULE:FREQ=DAILY;COUNT=5"] },
    });
    const plan: ReplacePlan = { kind: "replaceThis", updated };

    const result = generateReplace(plan);

    expect(result.primary).toBe(updated);
    expect(result.deleteIds).toEqual([]);
    // base + 5 materialized instances, including the first (COUNT=5)
    expect(result.upsert).toHaveLength(6);
    expect(result.upsert[0]).toBe(updated);
    result.upsert.slice(1).forEach((instance) => {
      expect(instance.recurrence).toEqual({
        kind: "occurrence",
        seriesId: updated._id,
      });
    });
    expect(result.upsert[1]?.schedule.start).toEqual(updated.schedule.start);
  });

  it("replaceSeries: materializes instances for the new base and marks old instances for deletion", () => {
    const updatedBase = buildEvent({
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
    });
    const deleteInstanceIds = [new ObjectId(), new ObjectId()];
    const plan: ReplacePlan = {
      kind: "replaceSeries",
      updatedBase,
      deleteInstanceIds,
    };

    const result = generateReplace(plan);

    expect(result.primary).toBe(updatedBase);
    expect(result.deleteIds).toBe(deleteInstanceIds);
    // base + 3 materialized instances, including the first (COUNT=3)
    expect(result.upsert).toHaveLength(4);
    expect(result.upsert[0]).toBe(updatedBase);
    result.upsert.slice(1).forEach((instance) => {
      expect(instance.recurrence).toEqual({
        kind: "occurrence",
        seriesId: updatedBase._id,
      });
    });
  });

  it("replaceSeries: materializes no instances when the new recurrence is single", () => {
    const updatedBase = buildEvent({ recurrence: { kind: "single" } });
    const plan: ReplacePlan = {
      kind: "replaceSeries",
      updatedBase,
      deleteInstanceIds: [new ObjectId()],
    };

    const result = generateReplace(plan);

    expect(result.upsert).toEqual([updatedBase]);
  });

  it("replaceSplit: materializes instances only for the new base and keeps the truncated base as-is", () => {
    const truncatedBase = buildEvent({
      recurrence: {
        kind: "series",
        rules: ["RRULE:FREQ=WEEKLY;UNTIL=20260721T000000Z"],
      },
    });
    const newBase = buildEvent({
      _id: new ObjectId(),
      schedule: {
        kind: "timed",
        start: new Date("2026-07-21T15:00:00.000Z"),
        end: new Date("2026-07-21T16:00:00.000Z"),
        timeZone: "America/Denver",
      },
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=2"] },
    });
    const deleteInstanceIds = [new ObjectId()];
    const plan: ReplacePlan = {
      kind: "replaceSplit",
      truncatedBase,
      deleteInstanceIds,
      newBase,
    };

    const result = generateReplace(plan);

    expect(result.primary).toBe(newBase);
    expect(result.deleteIds).toBe(deleteInstanceIds);
    expect(result.upsert[0]).toBe(truncatedBase);
    expect(result.upsert[1]).toBe(newBase);
    // newBase (COUNT=2) materializes 2 instances, including the first
    expect(result.upsert).toHaveLength(4);
    result.upsert.slice(2).forEach((instance) => {
      expect(instance.recurrence).toEqual({
        kind: "occurrence",
        seriesId: newBase._id,
      });
    });
  });
});

describe("generateDelete", () => {
  it("deleteThis: deletes only the target id and surfaces it as primary", () => {
    const target = buildEvent();
    const plan: DeletePlan = { kind: "deleteThis", target };

    const result = generateDelete(plan);

    expect(result).toEqual({
      deleteIds: [target._id],
      upsert: [],
      deleteSeriesId: null,
      primary: target,
    });
  });

  it("deleteSeries: sets deleteSeriesId without touching deleteIds/upsert", () => {
    const seriesId = new ObjectId();
    const plan: DeletePlan = { kind: "deleteSeries", seriesId };

    const result = generateDelete(plan);

    expect(result).toEqual({
      deleteIds: [],
      upsert: [],
      deleteSeriesId: seriesId,
      primary: null,
    });
  });

  it("deleteSplit: deletes following instances and upserts the truncated base", () => {
    const truncatedBase = buildEvent({
      recurrence: {
        kind: "series",
        rules: ["RRULE:FREQ=WEEKLY;UNTIL=20260721T000000Z"],
      },
    });
    const deleteInstanceIds = [new ObjectId(), new ObjectId()];
    const plan: DeletePlan = {
      kind: "deleteSplit",
      truncatedBase,
      deleteInstanceIds,
    };

    const result = generateDelete(plan);

    expect(result).toEqual({
      deleteIds: deleteInstanceIds,
      upsert: [truncatedBase],
      deleteSeriesId: null,
      primary: null,
    });
  });
});
