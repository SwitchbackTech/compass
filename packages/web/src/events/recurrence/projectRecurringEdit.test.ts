import { Origin, Priorities } from "@core/constants/core.constants";
import {
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { projectRecurringEdit } from "./projectRecurringEdit";
import { describe, expect, test } from "bun:test";

const occurrence = (id: string, day: number): Schema_Event => ({
  _id: id,
  title: "Original",
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  startDate: `2026-07-${String(day).padStart(2, "0")}T16:00:00.000Z`,
  endDate: `2026-07-${String(day).padStart(2, "0")}T17:00:00.000Z`,
  recurrence: { eventId: "series-1", rule: ["RRULE:FREQ=DAILY"] },
});

describe("projectRecurringEdit", () => {
  test("patches every cached occurrence for all-events edits", () => {
    const events = [occurrence("one", 1), occurrence("two", 2)];
    const edited = { ...events[1], title: "Updated" };

    const result = projectRecurringEdit({
      applyTo: RecurringEventUpdateScope.ALL_EVENTS,
      edited,
      original: events[1],
      seriesEvents: events,
    });

    expect(result.upserts.map(({ _id, title }) => ({ _id, title }))).toEqual([
      { _id: "one", title: "Updated" },
      { _id: "two", title: "Updated" },
    ]);
    // A title-only edit has no time delta, so every occurrence keeps its time.
    expect(
      result.upserts.map(({ startDate }) => dayjs(startDate).toISOString()),
    ).toEqual(events.map(({ startDate }) => dayjs(startDate).toISOString()));
  });

  test("shifts every occurrence when an all-events edit moves the time", () => {
    const events = [
      occurrence("one", 1),
      occurrence("two", 2),
      occurrence("three", 3),
    ];
    // Drag the second instance two hours later (and lengthen it by 30 min).
    const original = events[1];
    const edited = {
      ...original,
      startDate: "2026-07-02T18:00:00.000Z",
      endDate: "2026-07-02T19:30:00.000Z",
    };

    const result = projectRecurringEdit({
      applyTo: RecurringEventUpdateScope.ALL_EVENTS,
      edited,
      original,
      seriesEvents: events,
    });

    // Every instance — including ones before the dragged one — moves by the
    // same delta, so the whole series re-renders at the new time immediately.
    expect(
      result.upserts.map(({ _id, startDate, endDate }) => ({
        _id,
        startDate,
        endDate,
      })),
    ).toEqual([
      {
        _id: "one",
        startDate: "2026-07-01T18:00:00+00:00",
        endDate: "2026-07-01T19:30:00+00:00",
      },
      {
        _id: "two",
        startDate: "2026-07-02T18:00:00+00:00",
        endDate: "2026-07-02T19:30:00+00:00",
      },
      {
        _id: "three",
        startDate: "2026-07-03T18:00:00+00:00",
        endDate: "2026-07-03T19:30:00+00:00",
      },
    ]);
  });

  test("patches and shifts only the cutoff and future occurrences", () => {
    const events = [
      occurrence("one", 1),
      occurrence("two", 2),
      occurrence("three", 3),
    ];
    const original = events[1];
    const edited = {
      ...original,
      title: "Following",
      startDate: "2026-07-03T18:00:00.000Z",
      endDate: "2026-07-03T19:30:00.000Z",
    };

    const result = projectRecurringEdit({
      applyTo: RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS,
      edited,
      original,
      seriesEvents: events,
    });

    expect(
      result.upserts.map(({ _id, startDate, endDate }) => ({
        _id,
        startDate,
        endDate,
      })),
    ).toEqual([
      {
        _id: "two",
        startDate: "2026-07-03T18:00:00+00:00",
        endDate: "2026-07-03T19:30:00+00:00",
      },
      {
        _id: "three",
        startDate: "2026-07-04T18:00:00+00:00",
        endDate: "2026-07-04T19:30:00+00:00",
      },
    ]);
  });

  test("collapses an all-events recurrence removal to the edited event", () => {
    const events = [occurrence("one", 1), occurrence("two", 2)];
    const edited = { ...events[1], recurrence: { rule: null } };

    const result = projectRecurringEdit({
      applyTo: RecurringEventUpdateScope.ALL_EVENTS,
      edited,
      original: events[1],
      seriesEvents: events,
    });

    expect([...result.removeIds]).toEqual(["one", "two"]);
    expect(result.upserts).toEqual([{ ...edited, recurrence: undefined }]);
  });
});
