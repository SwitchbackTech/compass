import {
  DateOnlySchema,
  type EventId,
  TimeZoneSchema,
} from "@core/types/domain-primitives";
import dayjs from "@core/util/date/dayjs";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import {
  projectRecurringDelete,
  projectRecurringEdit,
  projectSeriesMaterialization,
} from "./projectRecurringEdit";
import { describe, expect, test } from "bun:test";

const SERIES_ID = "664e21f9a6b3f0b1c2d3e4f5" as EventId;

const occurrence = (day: number) =>
  createMockEvent({
    content: { kind: "details", title: "Original", description: "" },
    schedule: {
      kind: "timed",
      start: `2026-07-${String(day).padStart(2, "0")}T16:00:00.000Z`,
      end: `2026-07-${String(day).padStart(2, "0")}T17:00:00.000Z`,
      timeZone: "UTC",
    } as never,
    recurrence: { kind: "occurrence", seriesId: SERIES_ID },
  });

const allDayOccurrence = (day: number) =>
  createMockEvent({
    content: { kind: "details", title: "Original", description: "" },
    schedule: {
      kind: "allDay",
      start: `2026-07-${String(day).padStart(2, "0")}`,
      end: `2026-07-${String(day + 1).padStart(2, "0")}`,
    } as never,
    recurrence: { kind: "occurrence", seriesId: SERIES_ID },
  });

const seriesBase = () =>
  createMockEvent({
    id: SERIES_ID,
    content: { kind: "details", title: "Original", description: "" },
    schedule: {
      kind: "timed",
      start: "2026-07-01T16:00:00.000Z",
      end: "2026-07-01T17:00:00.000Z",
      timeZone: "UTC",
    } as never,
    recurrence: { kind: "series", rules: ["RRULE:FREQ=DAILY"] },
  });

describe("projectRecurringEdit", () => {
  test("patches every cached occurrence for all-events edits", () => {
    const events = [occurrence(1), occurrence(2)];
    const edited = {
      ...events[1],
      content: { kind: "details" as const, title: "Updated", description: "" },
    };

    const result = projectRecurringEdit({
      scope: "all",
      edited,
      original: events[1],
      seriesEvents: events,
    });

    expect(
      result.upserts.map(({ id, content }) => ({
        id,
        title: content.kind === "details" ? content.title : null,
      })),
    ).toEqual([
      { id: events[0].id, title: "Updated" },
      { id: events[1].id, title: "Updated" },
    ]);
    // A title-only edit has no time delta, so every occurrence keeps its time.
    expect(
      result.upserts.map((event) =>
        event.schedule.kind === "timed"
          ? dayjs(event.schedule.start).toISOString()
          : null,
      ),
    ).toEqual(
      events.map((event) =>
        event.schedule.kind === "timed"
          ? dayjs(event.schedule.start).toISOString()
          : null,
      ),
    );
  });

  test("shifts every occurrence when an all-events edit moves the time", () => {
    const events = [occurrence(1), occurrence(2), occurrence(3)];
    // Drag the second instance two hours later (and lengthen it by 30 min).
    const original = events[1];
    const edited = {
      ...original,
      schedule: {
        kind: "timed" as const,
        start: "2026-07-02T18:00:00.000Z",
        end: "2026-07-02T19:30:00.000Z",
        timeZone: "UTC",
      } as never,
    };

    const result = projectRecurringEdit({
      scope: "all",
      edited,
      original,
      seriesEvents: events,
    });

    // Every instance — including ones before the dragged one — moves by the
    // same delta, so the whole series re-renders at the new time immediately.
    expect(
      result.upserts.map((event) => ({
        id: event.id,
        ...(event.schedule.kind === "timed"
          ? {
              start: event.schedule.start as string,
              end: event.schedule.end as string,
            }
          : {}),
      })),
    ).toEqual([
      {
        id: events[0].id,
        start: "2026-07-01T18:00:00+00:00",
        end: "2026-07-01T19:30:00+00:00",
      },
      {
        id: events[1].id,
        start: "2026-07-02T18:00:00+00:00",
        end: "2026-07-02T19:30:00+00:00",
      },
      {
        id: events[2].id,
        start: "2026-07-03T18:00:00+00:00",
        end: "2026-07-03T19:30:00+00:00",
      },
    ]);
  });

  test("patches and shifts only the cutoff and future occurrences", () => {
    const events = [occurrence(1), occurrence(2), occurrence(3)];
    const original = events[1];
    const edited = {
      ...original,
      content: {
        kind: "details" as const,
        title: "Following",
        description: "",
      },
      schedule: {
        kind: "timed" as const,
        start: "2026-07-03T18:00:00.000Z",
        end: "2026-07-03T19:30:00.000Z",
        timeZone: "UTC",
      } as never,
    };

    const result = projectRecurringEdit({
      scope: "thisAndFollowing",
      edited,
      original,
      seriesEvents: events,
    });

    expect(
      result.upserts.map((event) => ({
        id: event.id,
        ...(event.schedule.kind === "timed"
          ? {
              start: event.schedule.start as string,
              end: event.schedule.end as string,
            }
          : {}),
      })),
    ).toEqual([
      {
        id: events[1].id,
        start: "2026-07-03T18:00:00+00:00",
        end: "2026-07-03T19:30:00+00:00",
      },
      {
        id: events[2].id,
        start: "2026-07-04T18:00:00+00:00",
        end: "2026-07-04T19:30:00+00:00",
      },
    ]);
  });

  test("collapses an all-events recurrence removal to the edited event", () => {
    const events = [occurrence(1), occurrence(2)];
    const edited = { ...events[1], recurrence: { kind: "single" as const } };

    const result = projectRecurringEdit({
      scope: "all",
      edited,
      original: events[1],
      seriesEvents: events,
    });

    expect([...result.removeIds]).toEqual([events[0].id]);
    expect(result.upserts).toEqual([edited]);
  });

  test("converts every occurrence to all-day for an all-events kind flip", () => {
    const events = [occurrence(1), occurrence(2), occurrence(3)];
    const original = events[1];
    const edited = {
      ...original,
      schedule: {
        kind: "allDay" as const,
        start: "2026-07-02",
        end: "2026-07-03",
      } as never,
    };

    const result = projectRecurringEdit({
      scope: "all",
      edited,
      original,
      seriesEvents: events,
    });

    expect(
      result.upserts.map((event) => ({
        id: event.id,
        schedule: event.schedule,
      })),
    ).toEqual([
      {
        id: events[0].id,
        schedule: {
          kind: "allDay",
          start: DateOnlySchema.parse("2026-07-01"),
          end: DateOnlySchema.parse("2026-07-02"),
        },
      },
      {
        id: events[1].id,
        schedule: {
          kind: "allDay",
          start: DateOnlySchema.parse("2026-07-02"),
          end: DateOnlySchema.parse("2026-07-03"),
        },
      },
      {
        id: events[2].id,
        schedule: {
          kind: "allDay",
          start: DateOnlySchema.parse("2026-07-03"),
          end: DateOnlySchema.parse("2026-07-04"),
        },
      },
    ]);
  });

  test("converts only the cutoff and future occurrences to all-day", () => {
    const events = [occurrence(1), occurrence(2), occurrence(3)];
    const original = events[1];
    const edited = {
      ...original,
      schedule: {
        kind: "allDay" as const,
        start: "2026-07-02",
        end: "2026-07-03",
      } as never,
    };

    const result = projectRecurringEdit({
      scope: "thisAndFollowing",
      edited,
      original,
      seriesEvents: events,
    });

    expect(
      result.upserts.map((event) => ({
        id: event.id,
        schedule: event.schedule,
      })),
    ).toEqual([
      {
        id: events[1].id,
        schedule: {
          kind: "allDay",
          start: DateOnlySchema.parse("2026-07-02"),
          end: DateOnlySchema.parse("2026-07-03"),
        },
      },
      {
        id: events[2].id,
        schedule: {
          kind: "allDay",
          start: DateOnlySchema.parse("2026-07-03"),
          end: DateOnlySchema.parse("2026-07-04"),
        },
      },
    ]);
  });

  test("converts every occurrence to timed for an all-events all-day to timed flip", () => {
    const events = [
      allDayOccurrence(1),
      allDayOccurrence(2),
      allDayOccurrence(3),
    ];
    const original = events[1];
    const edited = {
      ...original,
      schedule: {
        kind: "timed" as const,
        start: "2026-07-02T16:00:00.000Z",
        end: "2026-07-02T17:00:00.000Z",
        timeZone: "UTC",
      } as never,
    };

    const result = projectRecurringEdit({
      scope: "all",
      edited,
      original,
      seriesEvents: events,
    });

    expect(
      result.upserts.map((event) => ({
        id: event.id,
        ...(event.schedule.kind === "timed"
          ? {
              start: dayjs(event.schedule.start).toISOString(),
              end: dayjs(event.schedule.end).toISOString(),
              timeZone: event.schedule.timeZone,
            }
          : {}),
      })),
    ).toEqual([
      {
        id: events[0].id,
        start: "2026-07-01T16:00:00.000Z",
        end: "2026-07-01T17:00:00.000Z",
        timeZone: TimeZoneSchema.parse("UTC"),
      },
      {
        id: events[1].id,
        start: "2026-07-02T16:00:00.000Z",
        end: "2026-07-02T17:00:00.000Z",
        timeZone: TimeZoneSchema.parse("UTC"),
      },
      {
        id: events[2].id,
        start: "2026-07-03T16:00:00.000Z",
        end: "2026-07-03T17:00:00.000Z",
        timeZone: TimeZoneSchema.parse("UTC"),
      },
    ]);
  });

  test("preserves wall-clock time when all-day to timed crosses a DST spring-forward", () => {
    // 2026-03-08 is the America/Denver spring-forward (02:00 → 03:00).
    const events = [
      createMockEvent({
        content: { kind: "details", title: "Original", description: "" },
        schedule: {
          kind: "allDay",
          start: "2026-03-07",
          end: "2026-03-08",
        } as never,
        recurrence: { kind: "occurrence", seriesId: SERIES_ID },
      }),
      createMockEvent({
        content: { kind: "details", title: "Original", description: "" },
        schedule: {
          kind: "allDay",
          start: "2026-03-08",
          end: "2026-03-09",
        } as never,
        recurrence: { kind: "occurrence", seriesId: SERIES_ID },
      }),
    ];
    const original = events[0];
    const edited = {
      ...original,
      schedule: {
        kind: "timed" as const,
        start: "2026-03-07T15:00:00-07:00",
        end: "2026-03-07T16:00:00-07:00",
        timeZone: "America/Denver",
      } as never,
    };

    const result = projectRecurringEdit({
      scope: "all",
      edited,
      original,
      seriesEvents: events,
    });

    const starts = result.upserts.map((event) =>
      event.schedule.kind === "timed"
        ? dayjs(event.schedule.start)
            .tz("America/Denver")
            .format("YYYY-MM-DD HH:mm")
        : null,
    );
    expect(starts).toEqual(["2026-03-07 15:00", "2026-03-08 15:00"]);
  });
});

describe("projectRecurringDelete", () => {
  test("removes every occurrence and the series base for an all-events delete", () => {
    const events = [occurrence(1), occurrence(2), occurrence(3)];
    const target = events[1];

    const result = projectRecurringDelete({
      scope: "all",
      target,
      seriesId: SERIES_ID,
      seriesEvents: events,
    });

    expect([...result.removeIds].sort()).toEqual(
      [...events.map((event) => event.id), SERIES_ID].sort(),
    );
    expect(result.upserts).toEqual([]);
  });

  test("keeps earlier occurrences and the series base for a this-and-following delete", () => {
    const events = [occurrence(1), occurrence(2), occurrence(3)];
    const target = events[1];

    const result = projectRecurringDelete({
      scope: "thisAndFollowing",
      target,
      seriesId: SERIES_ID,
      seriesEvents: events,
    });

    expect([...result.removeIds].sort()).toEqual(
      [events[1].id, events[2].id].sort(),
    );
    expect(result.removeIds.has(events[0].id)).toBe(false);
    expect(result.removeIds.has(SERIES_ID)).toBe(false);
  });

  test("removes every occurrence when an all-events delete is clicked on the series base", () => {
    const base = seriesBase();
    const events = [occurrence(1), occurrence(2)];

    const result = projectRecurringDelete({
      scope: "all",
      target: base,
      seriesId: SERIES_ID,
      seriesEvents: events,
    });

    expect([...result.removeIds].sort()).toEqual(
      [...events.map((event) => event.id), SERIES_ID].sort(),
    );
  });
});

describe("projectSeriesMaterialization", () => {
  const dailyBase = (rules = ["RRULE:FREQ=DAILY;COUNT=10"]) =>
    createMockEvent({
      id: SERIES_ID,
      content: { kind: "details", title: "Standup", description: "" },
      schedule: {
        kind: "timed",
        start: "2026-07-06T16:00:00.000Z",
        end: "2026-07-06T17:00:00.000Z",
        timeZone: "UTC",
      } as never,
      recurrence: { kind: "series", rules },
    });

  const weekRange = {
    start: "2026-07-05T00:00:00.000Z",
    end: "2026-07-12T00:00:00.000Z",
  };

  test("expands a daily rule into occurrence instances including the first day", () => {
    const base = dailyBase();

    const result = projectSeriesMaterialization({ base, ranges: [weekRange] });

    expect(result.upserts[0]).toBe(base);
    const instances = result.upserts.slice(1);
    expect(instances.length).toBeGreaterThanOrEqual(6);
    for (const instance of instances) {
      expect(instance.recurrence).toEqual({
        kind: "occurrence",
        seriesId: SERIES_ID,
      });
      expect(instance.id).toContain(`${SERIES_ID}::`);
    }
    const starts = instances.map((instance) =>
      dayjs(instance.schedule.start).toISOString(),
    );
    expect(starts[0]).toBe("2026-07-06T16:00:00.000Z");
    expect(starts[1]).toBe("2026-07-07T16:00:00.000Z");
  });

  test("is deterministic: same input yields the same instance ids", () => {
    const base = dailyBase();

    const first = projectSeriesMaterialization({ base, ranges: [weekRange] });
    const second = projectSeriesMaterialization({ base, ranges: [weekRange] });

    expect(first.upserts.map(({ id }) => id)).toEqual(
      second.upserts.map(({ id }) => id),
    );
  });

  test("marks stale cached instances for removal", () => {
    const base = dailyBase(["RRULE:FREQ=WEEKLY;COUNT=4"]);
    const stale = [occurrence(1), occurrence(2)];

    const result = projectSeriesMaterialization({
      base,
      cachedSeriesEvents: stale,
      ranges: [weekRange],
    });

    expect([...result.removeIds].sort()).toEqual(
      stale.map(({ id }) => id).sort(),
    );
  });

  test("returns only the base when there are no ranges", () => {
    const base = dailyBase();

    const result = projectSeriesMaterialization({ base, ranges: [] });

    expect(result.upserts).toEqual([base]);
  });

  test("skips excluded occurrence starts", () => {
    const base = dailyBase();

    const withoutExdates = projectSeriesMaterialization({
      base,
      ranges: [weekRange],
    });
    const excludedStart = withoutExdates.upserts[2]!.schedule.start;

    const result = projectSeriesMaterialization({
      base,
      ranges: [weekRange],
      exdates: [excludedStart],
    });

    expect(result.upserts).toHaveLength(withoutExdates.upserts.length - 1);
    expect(
      result.upserts.some((event) => event.schedule.start === excludedStart),
    ).toBe(false);
  });

  test("keeps allDay schedules date-only", () => {
    const base = createMockEvent({
      id: SERIES_ID,
      schedule: {
        kind: "allDay",
        start: "2026-07-06",
        end: "2026-07-07",
      } as never,
      recurrence: { kind: "series", rules: ["RRULE:FREQ=DAILY;COUNT=5"] },
    });

    const result = projectSeriesMaterialization({
      base,
      ranges: [
        { start: "2026-07-05T00:00:00.000Z", end: "2026-07-12T00:00:00.000Z" },
      ],
    });

    const instances = result.upserts.slice(1);
    expect(instances.length).toBeGreaterThan(1);
    for (const instance of instances) {
      expect(instance.schedule.kind).toBe("allDay");
      expect(instance.schedule.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(instance.schedule.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
