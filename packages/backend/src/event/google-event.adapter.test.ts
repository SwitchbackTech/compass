import { type calendar_v3 } from "@googleapis/calendar";
import { ObjectId } from "mongodb";
import {
  type EventRecord,
  EventRecordSchema,
} from "@backend/event/event.record";
import {
  mapEventRecordToGoogle,
  mapGoogleEvent,
} from "@backend/event/google-event.adapter";

const calendarId = new ObjectId();

const baseContext = (
  overrides: Partial<{
    calendarTimeZone: string | null;
    resolveSeriesObjectId: (id: string) => ObjectId | undefined;
    now: Date;
  }> = {},
) => ({
  calendarId,
  calendarTimeZone: null,
  resolveSeriesObjectId: () => undefined,
  now: new Date("2026-07-10T18:00:00.000Z"),
  ...overrides,
});

const timedEvent = (
  overrides: Partial<calendar_v3.Schema$Event> = {},
): calendar_v3.Schema$Event => ({
  id: "gevent-1",
  summary: "Design review",
  description: "",
  creator: { email: "owner@example.com" },
  start: { dateTime: "2026-07-14T09:00:00-06:00", timeZone: "America/Denver" },
  end: { dateTime: "2026-07-14T10:00:00-06:00", timeZone: "America/Denver" },
  ...overrides,
});

describe("mapGoogleEvent", () => {
  it("maps a normal timed event with an offset dateTime and explicit timeZone", () => {
    const result = mapGoogleEvent(timedEvent(), baseContext());
    expect(result.kind).toBe("mapped");
    if (result.kind !== "mapped") throw new Error("expected mapped");
    expect(result.event.schedule).toMatchObject({
      kind: "timed",
      timeZone: "America/Denver",
    });
    expect(() => EventRecordSchema.parse(result.event)).not.toThrow();
  });

  it("falls back through the timeZone ladder: event tz, then calendar tz, then UTC", () => {
    const noEventTz = mapGoogleEvent(
      {
        ...timedEvent(),
        start: { dateTime: "2026-07-14T09:00:00-06:00" },
        end: { dateTime: "2026-07-14T10:00:00-06:00" },
      },
      baseContext({ calendarTimeZone: "America/New_York" }),
    );
    if (noEventTz.kind !== "mapped") throw new Error("expected mapped");
    expect(noEventTz.event.schedule).toMatchObject({
      timeZone: "America/New_York",
    });

    const noTzAtAll = mapGoogleEvent(
      {
        ...timedEvent(),
        start: { dateTime: "2026-07-14T09:00:00-06:00" },
        end: { dateTime: "2026-07-14T10:00:00-06:00" },
      },
      baseContext({ calendarTimeZone: null }),
    );
    if (noTzAtAll.kind !== "mapped") throw new Error("expected mapped");
    expect(noTzAtAll.event.schedule).toMatchObject({ timeZone: "UTC" });
  });

  it("maps a single-day all-day event with an exclusive end", () => {
    const result = mapGoogleEvent(
      {
        ...timedEvent(),
        start: { date: "2026-08-03" },
        end: { date: "2026-08-04" },
      },
      baseContext(),
    );
    if (result.kind !== "mapped") throw new Error("expected mapped");
    expect(result.event.schedule).toEqual({
      kind: "allDay",
      start: "2026-08-03",
      end: "2026-08-04",
    });
  });

  it("normalizes a multi-day all-day event and preserves the exclusive end", () => {
    const result = mapGoogleEvent(
      {
        ...timedEvent(),
        start: { date: "2026-08-03" },
        end: { date: "2026-08-06" },
      },
      baseContext(),
    );
    if (result.kind !== "mapped") throw new Error("expected mapped");
    expect(result.event.schedule).toEqual({
      kind: "allDay",
      start: "2026-08-03",
      end: "2026-08-06",
    });
  });

  it("normalizes an all-day event whose end equals start to a one-day span", () => {
    const result = mapGoogleEvent(
      {
        ...timedEvent(),
        start: { date: "2026-08-03" },
        end: { date: "2026-08-03" },
      },
      baseContext(),
    );
    if (result.kind !== "mapped") throw new Error("expected mapped");
    expect(result.event.schedule).toEqual({
      kind: "allDay",
      start: "2026-08-03",
      end: "2026-08-04",
    });
  });

  it("normalizes a missing all-day end to a one-day span", () => {
    const result = mapGoogleEvent(
      { ...timedEvent(), start: { date: "2026-08-03" }, end: undefined },
      baseContext(),
    );
    if (result.kind !== "mapped") throw new Error("expected mapped");
    expect(result.event.schedule).toEqual({
      kind: "allDay",
      start: "2026-08-03",
      end: "2026-08-04",
    });
  });

  it("maps to busy content when both summary and creator are absent", () => {
    const event = timedEvent();
    delete event.summary;
    delete event.creator;
    const result = mapGoogleEvent(event, baseContext());
    if (result.kind !== "mapped") throw new Error("expected mapped");
    expect(result.event.content).toEqual({ kind: "busy" });
  });

  it("maps to empty-title details when summary is empty but creator is present", () => {
    const result = mapGoogleEvent(
      { ...timedEvent(), summary: "" },
      baseContext(),
    );
    if (result.kind !== "mapped") throw new Error("expected mapped");
    expect(result.event.content).toEqual({
      kind: "details",
      title: "",
      description: "",
    });
  });

  it("maps a cancelled event to a tombstone with its recurringEventId", () => {
    const result = mapGoogleEvent(
      {
        ...timedEvent(),
        status: "cancelled",
        recurringEventId: "gevent-series-1",
      },
      baseContext(),
    );
    expect(result).toEqual({
      kind: "cancelled",
      providerEventId: "gevent-1",
      providerRecurringEventId: "gevent-series-1",
    });
  });

  it("maps a cancelled event with no recurringEventId to a null pointer", () => {
    const result = mapGoogleEvent(
      { ...timedEvent(), status: "cancelled" },
      baseContext(),
    );
    expect(result).toEqual({
      kind: "cancelled",
      providerEventId: "gevent-1",
      providerRecurringEventId: null,
    });
  });

  it("ignores an unsupported eventType", () => {
    const result = mapGoogleEvent(
      { ...timedEvent(), eventType: "outOfOffice" },
      baseContext(),
    );
    expect(result).toEqual({ kind: "ignored", reason: "unsupportedType" });
  });

  it("maps default eventType normally", () => {
    const result = mapGoogleEvent(
      { ...timedEvent(), eventType: "default" },
      baseContext(),
    );
    expect(result.kind).toBe("mapped");
  });

  it("is invalid with missingId when id is absent", () => {
    const event = timedEvent();
    delete event.id;
    const result = mapGoogleEvent(event, baseContext());
    expect(result).toEqual({ kind: "invalid", reason: "missingId" });
  });

  it("is invalid with missingDates when neither date nor dateTime is present", () => {
    const result = mapGoogleEvent(
      { ...timedEvent(), start: {}, end: {} },
      baseContext(),
    );
    expect(result).toEqual({ kind: "invalid", reason: "missingDates" });
  });

  it("is invalid with missingDates when the timed end is missing", () => {
    const result = mapGoogleEvent(
      {
        ...timedEvent(),
        start: { dateTime: "2026-07-14T09:00:00-06:00" },
        end: {},
      },
      baseContext(),
    );
    expect(result).toEqual({ kind: "invalid", reason: "missingDates" });
  });

  it("maps a series recurrence, copying the rules", () => {
    const rules = ["RRULE:FREQ=WEEKLY;COUNT=12;BYDAY=MO"];
    const result = mapGoogleEvent(
      { ...timedEvent(), recurrence: rules },
      baseContext(),
    );
    if (result.kind !== "mapped") throw new Error("expected mapped");
    expect(result.event.recurrence).toEqual({ kind: "series", rules });
  });

  it("resolves an occurrence via the resolver", () => {
    const seriesId = new ObjectId();
    const result = mapGoogleEvent(
      { ...timedEvent(), recurringEventId: "gevent-series-1" },
      baseContext({ resolveSeriesObjectId: () => seriesId }),
    );
    if (result.kind !== "mapped") throw new Error("expected mapped");
    expect(result.event.recurrence).toEqual({ kind: "occurrence", seriesId });
  });

  it("is invalid with invalidRecurrence when the occurrence cannot be resolved", () => {
    const result = mapGoogleEvent(
      { ...timedEvent(), recurringEventId: "gevent-series-1" },
      baseContext({ resolveSeriesObjectId: () => undefined }),
    );
    expect(result).toEqual({ kind: "invalid", reason: "invalidRecurrence" });
  });

  it("is invalid with invalidRecurrence when both rules and recurringEventId are present", () => {
    const result = mapGoogleEvent(
      {
        ...timedEvent(),
        recurrence: ["RRULE:FREQ=WEEKLY"],
        recurringEventId: "gevent-series-1",
      },
      baseContext({ resolveSeriesObjectId: () => new ObjectId() }),
    );
    expect(result).toEqual({ kind: "invalid", reason: "invalidRecurrence" });
  });

  it("maps single recurrence when neither rules nor recurringEventId are present", () => {
    const result = mapGoogleEvent(timedEvent(), baseContext());
    if (result.kind !== "mapped") throw new Error("expected mapped");
    expect(result.event.recurrence).toEqual({ kind: "single" });
  });

  it("sets priority to unassigned and derives createdAt/updatedAt from the payload", () => {
    const result = mapGoogleEvent(
      {
        ...timedEvent(),
        created: "2026-07-01T00:00:00.000Z",
        updated: "2026-07-02T00:00:00.000Z",
      },
      baseContext(),
    );
    if (result.kind !== "mapped") throw new Error("expected mapped");
    expect(result.event.priority).toBe("unassigned");
    expect(result.event.createdAt).toEqual(
      new Date("2026-07-01T00:00:00.000Z"),
    );
    expect(result.event.updatedAt).toEqual(
      new Date("2026-07-02T00:00:00.000Z"),
    );
  });

  it("falls back to context.now for createdAt and null for updatedAt when absent", () => {
    const now = new Date("2026-07-10T18:00:00.000Z");
    const result = mapGoogleEvent(timedEvent(), baseContext({ now }));
    if (result.kind !== "mapped") throw new Error("expected mapped");
    expect(result.event.createdAt).toEqual(now);
    expect(result.event.updatedAt).toBeNull();
  });
});

describe("mapEventRecordToGoogle", () => {
  const buildRecord = (overrides: Partial<EventRecord> = {}): EventRecord => ({
    _id: new ObjectId(),
    calendarId: new ObjectId(),
    content: { kind: "details", title: "Design review", description: "notes" },
    schedule: {
      kind: "timed",
      start: new Date("2026-07-14T15:00:00.000Z"),
      end: new Date("2026-07-14T16:00:00.000Z"),
      timeZone: "America/Denver",
    },
    recurrence: { kind: "single" },
    priority: "work",
    externalReference: null,
    createdAt: new Date(),
    updatedAt: null,
    ...overrides,
  });

  it("produces a timed patch body", () => {
    const record = buildRecord();
    const patch = mapEventRecordToGoogle(record);
    expect(patch).toEqual({
      summary: "Design review",
      description: "notes",
      start: {
        dateTime: "2026-07-14T15:00:00.000Z",
        timeZone: "America/Denver",
      },
      end: { dateTime: "2026-07-14T16:00:00.000Z", timeZone: "America/Denver" },
      recurrence: null,
    });
  });

  it("produces an all-day patch body", () => {
    const record = buildRecord({
      schedule: { kind: "allDay", start: "2026-08-03", end: "2026-08-06" },
    });
    const patch = mapEventRecordToGoogle(record);
    expect(patch.start).toEqual({ date: "2026-08-03" });
    expect(patch.end).toEqual({ date: "2026-08-06" });
    expect(patch.recurrence).toBeNull();
  });

  it("includes recurrence rules for a series event", () => {
    const rules = ["RRULE:FREQ=WEEKLY;COUNT=12;BYDAY=MO"];
    const record = buildRecord({ recurrence: { kind: "series", rules } });
    const patch = mapEventRecordToGoogle(record);
    expect(patch.recurrence).toEqual(rules);
  });

  it("sends recurrence: null for a single event so a series edit clears Google's rules", () => {
    const record = buildRecord({ recurrence: { kind: "single" } });
    const patch = mapEventRecordToGoogle(record);
    expect(patch.recurrence).toBeNull();
  });

  it("throws for busy content", () => {
    const record = buildRecord({ content: { kind: "busy" } });
    expect(() => mapEventRecordToGoogle(record)).toThrow();
  });

  it("throws for a someday schedule", () => {
    const record = buildRecord({
      schedule: {
        kind: "someday",
        period: "week",
        anchorDate: "2026-07-13",
        sortOrder: 0,
      },
    });
    expect(() => mapEventRecordToGoogle(record)).toThrow();
  });

  // Packet 05 tests list: "An events.patch update of a Google event with
  // attendees, location, and reminders preserves all three." GcalService
  // uses events.patch (merge-by-key) rather than events.update (whole-
  // resource replace), so any key omitted from the write body is left
  // untouched on Google. GoogleEventWriteInput's `Pick` already excludes
  // attendees/location/reminders at the type level -- EventRecord has no
  // such fields to begin with -- so mapEventRecordToGoogle structurally
  // cannot include them. This test guards that invariant at runtime so a
  // future loosening of the `Pick` (e.g. to plumb through a new field) would
  // fail a test instead of silently regressing into an events.update-style
  // wipe of attendees, location, and reminders.
  it("never includes attendees, location, or reminders in the write body", () => {
    const record = buildRecord();
    const patch = mapEventRecordToGoogle(record);
    expect(patch).not.toHaveProperty("attendees");
    expect(patch).not.toHaveProperty("location");
    expect(patch).not.toHaveProperty("reminders");
    expect(Object.keys(patch).sort()).toEqual([
      "description",
      "end",
      "recurrence",
      "start",
      "summary",
    ]);
  });
});
