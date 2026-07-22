import { type EventId } from "@core/types/domain-primitives";
import dayjs from "@core/util/date/dayjs";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import {
  projectRecurringDelete,
  projectRecurringEdit,
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
