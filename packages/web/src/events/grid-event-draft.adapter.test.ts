import { Priorities } from "@core/constants/core.constants";
import {
  type Calendar,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import { type Event } from "@core/types/event.contracts";
import {
  createGridEventDraft,
  duplicateGridEventDraft,
  editGridEventDraft,
  gridEventDraftToSchemaEvent,
  parseGridEventDraft,
  replaceGridDraftSchedule,
} from "./grid-event-draft.adapter";
import { expect, test } from "bun:test";

const timedEvent = {
  id: "0123456789abcdef01234567",
  calendarId: "0123456789abcdef76543210",
  content: { kind: "details" as const, title: "Focus", description: "" },
  schedule: {
    kind: "timed" as const,
    start: "2026-07-11T09:00:00-06:00",
    end: "2026-07-11T10:00:00-06:00",
    timeZone: "America/Denver",
  },
  recurrence: { kind: "single" as const },
  priority: Priorities.WORK,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: null,
} as unknown as Event;

test("creates an incomplete grid draft without manufacturing an Event", () => {
  const draft = createGridEventDraft({
    kind: "allDay",
    start: new Date("2026-07-11"),
    end: new Date("2026-07-12"),
  });

  expect(draft).toMatchObject({
    kind: "create",
    source: null,
    values: { calendarId: null, recurrence: { kind: "single" } },
  });
});

test("builds an edit draft from a persisted scheduled event", () => {
  const draft = editGridEventDraft(timedEvent);

  expect(draft).toMatchObject({
    kind: "edit",
    source: timedEvent,
    values: { title: "Focus", recurrence: { kind: "preserve" } },
  });
});

test("does not create a grid draft for someday events", () => {
  expect(
    editGridEventDraft({
      ...timedEvent,
      schedule: {
        kind: "someday",
        period: "week",
        anchorDate: "2026-07-11",
        sortOrder: 0,
      } as never,
    }),
  ).toBeNull();
});

test("replaces only the draft schedule during a drag or resize", () => {
  const draft = createGridEventDraft({
    kind: "allDay",
    start: new Date("2026-07-11"),
    end: new Date("2026-07-12"),
  });
  const updated = replaceGridDraftSchedule(draft, {
    kind: "allDay",
    start: new Date("2026-07-12"),
    end: new Date("2026-07-13"),
  });

  expect(updated.values.schedule.start).toEqual(new Date("2026-07-12"));
  expect(updated.values.calendarId).toBeNull();
});

test("keeps the schedule's own UTC offset instead of forcing Z", () => {
  // _getTimeLabel (web.date.util.ts) reads the offset embedded in
  // Schema_Event.startDate/endDate to decide what time to display - it does
  // not localize to the browser's timezone. Date#toISOString() always
  // produces a "Z" (UTC) suffix, which made every grid-created/dragged event
  // display in UTC instead of local time for any non-UTC browser. dayjs's
  // default format() preserves the local offset instead, matching every
  // other Schema_Event producer (draft.util.ts, someday.draft.util.ts, etc).
  const draft = editGridEventDraft(timedEvent);
  if (!draft) throw new Error("Expected scheduled event draft");

  const schemaEvent = gridEventDraftToSchemaEvent(draft);

  expect(schemaEvent.startDate).not.toMatch(/Z$/);
  expect(schemaEvent.endDate).not.toMatch(/Z$/);
});

test("parses an edit draft into a replace command", () => {
  const draft = editGridEventDraft(timedEvent);
  if (!draft) throw new Error("Expected scheduled event draft");

  const result = parseGridEventDraft(draft);

  expect(result).toMatchObject({
    ok: true,
    mode: "edit",
    eventId: timedEvent.id,
    input: {
      scope: "this",
      schedule: { kind: "timed" },
      recurrence: { kind: "preserve" },
    },
  });
});

test("duplicate defaults to the source event's calendar when it's still writable", () => {
  const writableSourceCalendar = {
    id: timedEvent.calendarId,
    capabilities: getCalendarCapabilities("owner"),
  } as unknown as Calendar;

  const duplicate = duplicateGridEventDraft(timedEvent, [
    writableSourceCalendar,
  ]);

  expect(duplicate).toMatchObject({
    kind: "create",
    source: null,
    values: { calendarId: timedEvent.calendarId, title: "Focus" },
  });
});

test("duplicate falls back to no calendar (later defaulted) when the source calendar is read-only", () => {
  const readOnlySourceCalendar = {
    id: timedEvent.calendarId,
    capabilities: getCalendarCapabilities("reader"),
  } as unknown as Calendar;

  const duplicate = duplicateGridEventDraft(timedEvent, [
    readOnlySourceCalendar,
  ]);

  expect(duplicate?.values.calendarId).toBeNull();
});

test("duplicate falls back to no calendar when the source calendar isn't in the given list", () => {
  const duplicate = duplicateGridEventDraft(timedEvent, []);

  expect(duplicate?.values.calendarId).toBeNull();
});
