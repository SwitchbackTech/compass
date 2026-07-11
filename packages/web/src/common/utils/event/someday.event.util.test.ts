import { Priorities, RRULE } from "@core/constants/core.constants";
import { SomedayScheduleSchema } from "@core/types/event.contracts";
import {
  createMockBaseEvent,
  createMockStandaloneEvent,
} from "@core/util/test/ccal.event.factory";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { type Schema_WebEvent } from "@web/common/types/web.event.types";
import {
  buildConvertToSomedayEvent,
  categorizeSomedayEvents,
} from "@web/common/utils/event/someday.event.util";
import { type NormalizedEventQueryData } from "@web/events/queries/event.query.types";
import { describe, expect, it } from "bun:test";

const normalized = (
  events: ReturnType<typeof createMockEvent>[],
): NormalizedEventQueryData => ({
  ids: events.map((event) => event.id),
  entities: Object.fromEntries(events.map((event) => [event.id, event])),
});

const someday = (
  overrides: Partial<{ period: "week" | "month"; sortOrder: number }> = {},
) =>
  createMockEvent({
    schedule: SomedayScheduleSchema.parse({
      kind: "someday",
      period: overrides.period ?? "week",
      anchorDate: "2024-03-17",
      sortOrder: overrides.sortOrder ?? 0,
    }),
  });

describe("categorizeSomedayEvents", () => {
  // Each read is already scoped server-side to exactly one (period,
  // anchorDate) bucket (A35), so categorization is just per-bucket
  // sortOrder — no date-range membership test or cross-column recurrence
  // dedup is needed anymore (the two inputs are disjoint by construction).

  it("puts week-bucket events in the week column only", () => {
    const event = someday({ period: "week" });
    const result = categorizeSomedayEvents(normalized([event]), undefined);

    expect(result.columns[COLUMN_WEEK].eventIds).toContain(event.id);
    expect(result.columns[COLUMN_MONTH].eventIds).not.toContain(event.id);
  });

  it("puts month-bucket events in the month column only", () => {
    const event = someday({ period: "month" });
    const result = categorizeSomedayEvents(undefined, normalized([event]));

    expect(result.columns[COLUMN_MONTH].eventIds).toContain(event.id);
    expect(result.columns[COLUMN_WEEK].eventIds).not.toContain(event.id);
  });

  it("sorts each column by schedule.sortOrder", () => {
    const first = someday({ period: "week", sortOrder: 2 });
    const second = someday({ period: "week", sortOrder: 1 });

    const result = categorizeSomedayEvents(
      normalized([first, second]),
      undefined,
    );

    expect(result.columns[COLUMN_WEEK].eventIds).toEqual([second.id, first.id]);
  });

  it("handles undefined/empty buckets", () => {
    const result = categorizeSomedayEvents(undefined, undefined);

    expect(result.columns[COLUMN_WEEK].eventIds).toEqual([]);
    expect(result.columns[COLUMN_MONTH].eventIds).toEqual([]);
    expect(result.columnOrder).toEqual([COLUMN_WEEK, COLUMN_MONTH]);
  });

  it("returns each event as the strict Event contract for the sidebar renderer", () => {
    const event = someday({ period: "week" });
    const result = categorizeSomedayEvents(normalized([event]), undefined);

    expect(result.events[event.id]).toBe(event);
    expect(result.events[event.id]?.schedule).toMatchObject({
      kind: "someday",
      sortOrder: 0,
    });
  });
});

describe("buildConvertToSomedayEvent", () => {
  const dates = { startDate: "2026-05-18", endDate: "2026-05-24" };

  it("converts a timed event into a validated someday event", () => {
    const event = createMockStandaloneEvent({
      priority: Priorities.WORK,
    }) as Schema_WebEvent;

    const result = buildConvertToSomedayEvent(event, dates, 3);

    expect(result).toMatchObject({
      _id: event._id,
      isAllDay: false,
      isSomeday: true,
      startDate: dates.startDate,
      endDate: dates.endDate,
      priority: Priorities.WORK,
      order: 3,
    });
  });

  it("defaults priority to UNASSIGNED when the event has none", () => {
    const event = createMockStandaloneEvent({
      priority: undefined,
    }) as Schema_WebEvent;

    const result = buildConvertToSomedayEvent(event, dates, 0);

    expect(result.priority).toBe(Priorities.UNASSIGNED);
  });

  it("rewrites a recurring event's FREQ to WEEKLY", () => {
    const event = createMockBaseEvent({
      recurrence: { rule: [RRULE.MONTH] },
    }) as Schema_WebEvent;

    const result = buildConvertToSomedayEvent(event, dates, 0);

    expect(result.recurrence?.rule?.[0]).toMatch(/^RRULE:FREQ=WEEKLY;/);
    expect(result.recurrence?.rule?.[0]).toContain("COUNT=3");
    expect(result.recurrence?.rule?.[0]).toContain("WKST=SU");
  });

  it("throws when converting an event without an _id", () => {
    const event = createMockStandaloneEvent({
      _id: undefined,
    }) as Schema_WebEvent;

    expect(() => buildConvertToSomedayEvent(event, dates, 0)).toThrow();
  });
});
