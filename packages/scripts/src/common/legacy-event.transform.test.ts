import {
  type LegacyEventTransformContext,
  transformLegacyEvent,
} from "@scripts/common/legacy-event.transform";
import { ObjectId } from "mongodb";
import { Priorities } from "@core/constants/core.constants";

const localCalendarId = new ObjectId();
const primaryGoogleCalendarId = new ObjectId();
const seriesId = new ObjectId();

const baseContext = (
  overrides: Partial<LegacyEventTransformContext> = {},
): LegacyEventTransformContext => ({
  localCalendarId,
  primaryGoogleCalendar: {
    id: primaryGoogleCalendarId,
    timeZone: "America/New_York",
  },
  legacyBaseEventExists: (id) => id === seriesId.toHexString(),
  ...overrides,
});

const disconnectedContext = (): LegacyEventTransformContext => ({
  localCalendarId,
  primaryGoogleCalendar: null,
  legacyBaseEventExists: () => false,
});

describe("transformLegacyEvent", () => {
  describe("invalid shape", () => {
    it("fails for a non-object doc", () => {
      const result = transformLegacyEvent("not an event", baseContext());
      expect(result).toEqual({
        ok: false,
        legacyId: null,
        reason: "invalidShape",
      });
    });

    it("fails when _id is missing", () => {
      const result = transformLegacyEvent(
        {
          startDate: "2026-01-01T10:00:00-05:00",
          endDate: "2026-01-01T11:00:00-05:00",
        },
        baseContext(),
      );
      expect(result).toEqual(
        expect.objectContaining({ ok: false, reason: "invalidShape" }),
      );
    });

    it("fails when _id is an invalid ObjectId string", () => {
      const result = transformLegacyEvent(
        {
          _id: "not-a-valid-object-id",
          startDate: "2026-01-01T10:00:00-05:00",
          endDate: "2026-01-01T11:00:00-05:00",
        },
        baseContext(),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("invalidShape");
    });

    it("tolerates unknown legacy keys (order, allDayOrder, origin, priorities)", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          startDate: "2026-01-01T10:00:00-05:00",
          endDate: "2026-01-01T11:00:00-05:00",
          allDayOrder: 3,
          origin: "google",
          priorities: "p1,p2",
          user: "someUserId",
        },
        baseContext(),
      );
      expect(result.ok).toBe(true);
    });
  });

  describe("schedule kind derivation and flag/date mismatches", () => {
    it("excludes isSomeday true regardless of date shapes", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          isSomeday: true,
          startDate: "2026-01-01",
          endDate: "2026-01-03",
        },
        baseContext(),
      );
      expect(result).toEqual({
        ok: false,
        excluded: true,
        legacyId: _id.toHexString(),
      });
    });

    it("infers allDay from date-only shapes when isAllDay is unset", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        { _id, startDate: "2026-01-01", endDate: "2026-01-03" },
        baseContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.record.schedule.kind).toBe("allDay");
    });

    it("infers timed from offset-instant shapes when isAllDay is unset", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          startDate: "2026-01-01T10:00:00-05:00",
          endDate: "2026-01-01T11:00:00-05:00",
        },
        baseContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.record.schedule.kind).toBe("timed");
    });

    it("fails when isAllDay is explicitly false but dates are date-only", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          isAllDay: false,
          startDate: "2026-01-01",
          endDate: "2026-01-03",
        },
        baseContext(),
      );
      expect(result).toEqual(
        expect.objectContaining({ ok: false, reason: "flagDateMismatch" }),
      );
    });

    it("fails when isAllDay is explicitly true but dates are offset instants", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          isAllDay: true,
          startDate: "2026-01-01T10:00:00-05:00",
          endDate: "2026-01-01T11:00:00-05:00",
        },
        baseContext(),
      );
      expect(result).toEqual(
        expect.objectContaining({ ok: false, reason: "flagDateMismatch" }),
      );
    });

    it("fails when one date is date-only and the other is an offset instant", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        { _id, startDate: "2026-01-01", endDate: "2026-01-01T11:00:00-05:00" },
        baseContext(),
      );
      expect(result).toEqual(
        expect.objectContaining({ ok: false, reason: "flagDateMismatch" }),
      );
    });

    it("fails with invalidDates for unparseable date strings", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        { _id, startDate: "not-a-date", endDate: "also-not-a-date" },
        baseContext(),
      );
      expect(result).toEqual(
        expect.objectContaining({ ok: false, reason: "invalidDates" }),
      );
    });
  });

  describe("timed events", () => {
    it("fails invalidDates when end <= start", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          startDate: "2026-01-01T11:00:00-05:00",
          endDate: "2026-01-01T11:00:00-05:00",
        },
        baseContext(),
      );
      expect(result).toEqual(
        expect.objectContaining({ ok: false, reason: "invalidDates" }),
      );
    });

    it("derives timeZone from the primary Google calendar when connected", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          gEventId: "g-event-1",
          startDate: "2026-01-01T10:00:00-05:00",
          endDate: "2026-01-01T11:00:00-05:00",
        },
        baseContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok && result.record.schedule.kind === "timed") {
        expect(result.record.schedule.timeZone).toBe("America/New_York");
        expect(result.timeZoneSource).toBe("calendar");
      }
    });

    it("falls back to UTC when the user has no Google connection", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          startDate: "2026-01-01T10:00:00-05:00",
          endDate: "2026-01-01T11:00:00-05:00",
        },
        disconnectedContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok && result.record.schedule.kind === "timed") {
        expect(result.record.schedule.timeZone).toBe("UTC");
        expect(result.timeZoneSource).toBe("utcFallback");
      }
    });

    it("uses the primary Google calendar zone even for a local-landing scheduled event", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          startDate: "2026-01-01T10:00:00-05:00",
          endDate: "2026-01-01T11:00:00-05:00",
        },
        baseContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.record.calendarId.equals(primaryGoogleCalendarId)).toBe(
          true,
        );
        if (result.record.schedule.kind === "timed") {
          expect(result.record.schedule.timeZone).toBe("America/New_York");
        }
      }
    });
  });

  describe("all-day events", () => {
    it("normalizes endDate == startDate to an exclusive end (+1 day)", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        { _id, startDate: "2026-01-01", endDate: "2026-01-01" },
        baseContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok && result.record.schedule.kind === "allDay") {
        expect(result.record.schedule.start).toBe("2026-01-01");
        expect(result.record.schedule.end).toBe("2026-01-02");
      }
    });

    it("handles a DST-adjacent same-date all-day normalization", () => {
      // US DST spring-forward date; UTC-based day math must not skip/repeat a day.
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        { _id, startDate: "2026-03-08", endDate: "2026-03-08" },
        baseContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok && result.record.schedule.kind === "allDay") {
        expect(result.record.schedule.end).toBe("2026-03-09");
      }
    });

    it("preserves an already-exclusive multi-day all-day end", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        { _id, startDate: "2026-01-01", endDate: "2026-01-05" },
        baseContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok && result.record.schedule.kind === "allDay") {
        expect(result.record.schedule.end).toBe("2026-01-05");
      }
    });

    it("fails invalidDates when endDate < startDate", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        { _id, startDate: "2026-01-05", endDate: "2026-01-01" },
        baseContext(),
      );
      expect(result).toEqual(
        expect.objectContaining({ ok: false, reason: "invalidDates" }),
      );
    });
  });

  // The Someday feature was removed: legacy someday events are no longer
  // migrated into a destination schedule. The transform reports them as an
  // explicit `excluded` drop (distinct from a failure) so the backfill can
  // count them while staying fail-closed on genuinely unexpected records.
  describe("someday exclusion", () => {
    it("excludes a week-ish span someday event", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          isSomeday: true,
          startDate: "2026-01-01",
          endDate: "2026-01-06",
          order: 1,
        },
        baseContext(),
      );
      expect(result).toEqual({
        ok: false,
        excluded: true,
        legacyId: _id.toHexString(),
      });
    });

    it("excludes a month-ish span someday event", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          isSomeday: true,
          startDate: "2026-01-01",
          endDate: "2026-01-10",
        },
        baseContext(),
      );
      expect(result).toEqual({
        ok: false,
        excluded: true,
        legacyId: _id.toHexString(),
      });
    });

    it("excludes a someday event even when a gEventId is present", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          isSomeday: true,
          gEventId: "g-event-someday",
          startDate: "2026-01-01",
          endDate: "2026-01-01",
        },
        baseContext(),
      );
      expect(result).toEqual({
        ok: false,
        excluded: true,
        legacyId: _id.toHexString(),
      });
    });

    it("still migrates a normal timed event as ok:true", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          startDate: "2026-01-01T10:00:00-05:00",
          endDate: "2026-01-01T11:00:00-05:00",
        },
        baseContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.record.schedule.kind).toBe("timed");
    });

    it("still migrates a normal all-day event as ok:true", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        { _id, startDate: "2026-01-01", endDate: "2026-01-03" },
        baseContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.record.schedule.kind).toBe("allDay");
    });
  });

  describe("text content", () => {
    it("defaults missing title and null/missing description to empty strings", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          startDate: "2026-01-01",
          endDate: "2026-01-01",
          description: null,
        },
        baseContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.record.content).toEqual({
          kind: "details",
          title: "",
          description: "",
        });
      }
    });
  });

  describe("priority", () => {
    it("defaults an invalid legacy priority to unassigned", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          startDate: "2026-01-01",
          endDate: "2026-01-01",
          priority: "not-a-priority",
        },
        baseContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.record.priority).toBe(Priorities.UNASSIGNED);
    });

    it("keeps a valid legacy priority", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          startDate: "2026-01-01",
          endDate: "2026-01-01",
          priority: "work",
        },
        baseContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.record.priority).toBe(Priorities.WORK);
    });
  });

  describe("recurrence", () => {
    it("defaults to single when recurrence is absent", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        { _id, startDate: "2026-01-01", endDate: "2026-01-01" },
        baseContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok)
        expect(result.record.recurrence).toEqual({ kind: "single" });
    });

    it("builds a series from a non-empty rule array", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          startDate: "2026-01-01",
          endDate: "2026-01-01",
          recurrence: { rule: ["RRULE:FREQ=WEEKLY"] },
        },
        baseContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.record.recurrence).toEqual({
          kind: "series",
          rules: ["RRULE:FREQ=WEEKLY"],
        });
      }
    });

    it("fails emptyRecurrenceRules for an empty rule array", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          startDate: "2026-01-01",
          endDate: "2026-01-01",
          recurrence: { rule: [] },
        },
        baseContext(),
      );
      expect(result).toEqual(
        expect.objectContaining({ ok: false, reason: "emptyRecurrenceRules" }),
      );
    });

    it("builds an occurrence from a known recurrence base eventId", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          startDate: "2026-01-01",
          endDate: "2026-01-01",
          recurrence: { eventId: seriesId.toHexString() },
        },
        baseContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.record.recurrence).toEqual({
          kind: "occurrence",
          seriesId,
        });
      }
    });

    it("fails missingRecurrenceBase for an unknown recurrence base", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          startDate: "2026-01-01",
          endDate: "2026-01-01",
          recurrence: { eventId: new ObjectId().toHexString() },
        },
        baseContext(),
      );
      expect(result).toEqual(
        expect.objectContaining({ ok: false, reason: "missingRecurrenceBase" }),
      );
    });

    it("fails invalidObjectId for a malformed recurrence eventId", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          startDate: "2026-01-01",
          endDate: "2026-01-01",
          recurrence: { eventId: "not-an-object-id" },
        },
        baseContext(),
      );
      expect(result).toEqual(
        expect.objectContaining({ ok: false, reason: "invalidObjectId" }),
      );
    });

    it("fails recurrenceConflict when both rule and eventId are present", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          startDate: "2026-01-01",
          endDate: "2026-01-01",
          recurrence: {
            rule: ["RRULE:FREQ=WEEKLY"],
            eventId: seriesId.toHexString(),
          },
        },
        baseContext(),
      );
      expect(result).toEqual(
        expect.objectContaining({ ok: false, reason: "recurrenceConflict" }),
      );
    });

    it("carries gRecurringEventId into the external reference", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          gEventId: "g-event-instance",
          gRecurringEventId: "g-event-series",
          startDate: "2026-01-01T10:00:00-05:00",
          endDate: "2026-01-01T11:00:00-05:00",
        },
        baseContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.record.externalReference).toEqual({
          provider: "google",
          eventId: "g-event-instance",
          recurringEventId: "g-event-series",
        });
      }
    });
  });

  describe("calendar assignment", () => {
    it("assigns the primary Google calendar when gEventId is present", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          gEventId: "g-event-1",
          startDate: "2026-01-01T10:00:00-05:00",
          endDate: "2026-01-01T11:00:00-05:00",
        },
        baseContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.record.calendarId.equals(primaryGoogleCalendarId)).toBe(
          true,
        );
      }
    });

    it("fails missingPrimaryGoogleCalendar when gEventId is present but user is disconnected", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          gEventId: "g-event-1",
          startDate: "2026-01-01T10:00:00-05:00",
          endDate: "2026-01-01T11:00:00-05:00",
        },
        disconnectedContext(),
      );
      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          reason: "missingPrimaryGoogleCalendar",
        }),
      );
    });

    it("assigns the local calendar for a scheduled event with no Google connection", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        { _id, startDate: "2026-01-01", endDate: "2026-01-01" },
        disconnectedContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.record.calendarId.equals(localCalendarId)).toBe(true);
      }
    });
  });

  describe("timestamps", () => {
    it("derives createdAt from the ObjectId timestamp", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        { _id, startDate: "2026-01-01", endDate: "2026-01-01" },
        baseContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.record.createdAt.getTime()).toBe(
          _id.getTimestamp().getTime(),
        );
      }
    });

    it("passes through a Date updatedAt", () => {
      const _id = new ObjectId();
      const updatedAt = new Date("2026-02-01T00:00:00.000Z");
      const result = transformLegacyEvent(
        { _id, startDate: "2026-01-01", endDate: "2026-01-01", updatedAt },
        baseContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.record.updatedAt).toEqual(updatedAt);
    });

    it("parses a string updatedAt into a Date", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        {
          _id,
          startDate: "2026-01-01",
          endDate: "2026-01-01",
          updatedAt: "2026-02-01T00:00:00.000Z",
        },
        baseContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.record.updatedAt).toEqual(
          new Date("2026-02-01T00:00:00.000Z"),
        );
      }
    });

    it("defaults a missing updatedAt to null", () => {
      const _id = new ObjectId();
      const result = transformLegacyEvent(
        { _id, startDate: "2026-01-01", endDate: "2026-01-01" },
        baseContext(),
      );
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.record.updatedAt).toBeNull();
    });
  });
});

// Duplicate legacy Google ids are not this pure transform's job to detect —
// `transformLegacyEvent` only maps one legacy doc at a time and has no view
// of sibling rows. The migration/backfill layer (phase B) is responsible for
// deduping across the bounded batch scan.
