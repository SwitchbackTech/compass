import { faker } from "@faker-js/faker";
import { type EventSchedule } from "@core/types/event.contracts";
import { type SyncEventRecurrence } from "@core/types/sync/event.contracts";
import {
  type ProjectionHorizon,
  projectOccurrences,
  truncateRulesBefore,
} from "@sync/domain/occurrence-projection";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";

const objectId = () => faker.database.mongodbObjectId();

// A wide horizon so most cases aren't clipped; individual tests narrow it.
const HORIZON: ProjectionHorizon = {
  start: new Date("2026-01-01T00:00:00.000Z"),
  end: new Date("2027-07-01T00:00:00.000Z"),
};

const timed = (start: string, end: string, timeZone = "America/Denver") =>
  ({ kind: "timed", start, end, timeZone }) as EventSchedule;

const allDay = (start: string, end: string) =>
  ({ kind: "allDay", start, end }) as EventSchedule;

const event = (
  schedule: EventSchedule,
  recurrence: SyncEventRecurrence,
  overrides: Partial<EventRecord> = {},
): EventRecord =>
  ({
    _id: objectId(),
    tenantId: objectId(),
    principalId: objectId(),
    origin: "compass",
    calendarId: objectId(),
    clientEventId: null,
    connectionId: null,
    providerEventId: null,
    providerVersion: null,
    providerUpdatedAt: null,
    deliveryState: null,
    providerMetadata: null,
    content: {
      title: "Standup",
      description: "",
      location: null,
      organizer: null,
      attendees: [],
      conference: null,
    },
    schedule,
    recurrence,
    lifecycleState: "active",
    generation: 0,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    confirmedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  }) as EventRecord;

describe("projectOccurrences", () => {
  describe("single events", () => {
    it("projects one occurrence for a timed single event in range", () => {
      const e = event(
        timed("2026-07-14T09:00:00-06:00", "2026-07-14T10:00:00-06:00"),
        { kind: "single" },
      );
      const [occ, ...rest] = projectOccurrences(e, HORIZON);
      expect(rest).toHaveLength(0);
      expect(occ).toMatchObject({
        eventId: e._id,
        calendarId: e.calendarId,
        title: "Standup",
        busy: true,
        cancelled: false,
        generation: 0,
      });
      expect(occ?.startAt.toISOString()).toBe("2026-07-14T15:00:00.000Z");
      // Half-open end: the timed end instant.
      expect(occ?.endAt?.toISOString()).toBe("2026-07-14T16:00:00.000Z");
      expect(occ?.occurrenceKey).toBe(`${e._id}:2026-07-14T15:00:00.000Z`);
    });

    it("projects one occurrence for an all-day single event", () => {
      const e = event(allDay("2026-07-14", "2026-07-15"), { kind: "single" });
      const [occ] = projectOccurrences(e, HORIZON);
      expect(occ?.schedule).toEqual(allDay("2026-07-14", "2026-07-15"));
      expect(occ?.startAt.toISOString()).toBe("2026-07-14T00:00:00.000Z");
      // The all-day end date is exclusive, so endAt is midnight UTC of it.
      expect(occ?.endAt?.toISOString()).toBe("2026-07-15T00:00:00.000Z");
    });

    it("omits a single event whose start is before the horizon", () => {
      const e = event(
        timed("2025-06-01T09:00:00-06:00", "2025-06-01T10:00:00-06:00"),
        { kind: "single" },
      );
      expect(projectOccurrences(e, HORIZON)).toHaveLength(0);
    });

    it("omits a single event whose start is at or after the horizon end", () => {
      const e = event(
        timed("2027-07-01T00:00:00+00:00", "2027-07-01T01:00:00+00:00"),
        { kind: "single" },
      );
      expect(projectOccurrences(e, HORIZON)).toHaveLength(0);
    });
  });

  describe("exceptions", () => {
    it("projects an active exception as one occurrence", () => {
      const e = event(
        timed("2026-07-14T11:00:00-06:00", "2026-07-14T12:00:00-06:00"),
        {
          kind: "exception",
          seriesId: objectId() as EventRecord["_id"],
          recurrenceId: "2026-07-14T09:00:00-06:00" as never,
          cancelled: false,
        },
      );
      const [occ] = projectOccurrences(e, HORIZON);
      expect(occ?.cancelled).toBe(false);
      expect(occ?.startAt.toISOString()).toBe("2026-07-14T17:00:00.000Z");
    });

    it("projects a cancelled exception as a cancelled occurrence", () => {
      const e = event(
        timed("2026-07-14T09:00:00-06:00", "2026-07-14T10:00:00-06:00"),
        {
          kind: "exception",
          seriesId: objectId() as EventRecord["_id"],
          recurrenceId: "2026-07-14T09:00:00-06:00" as never,
          cancelled: true,
        },
      );
      const [occ, ...rest] = projectOccurrences(e, HORIZON);
      expect(rest).toHaveLength(0);
      expect(occ?.cancelled).toBe(true);
    });
  });

  describe("series masters", () => {
    it("expands a weekly series and preserves duration", () => {
      const e = event(
        timed("2026-07-06T09:00:00-06:00", "2026-07-06T09:30:00-06:00"),
        { kind: "seriesMaster", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
      );
      const occ = projectOccurrences(e, HORIZON);
      expect(occ.map((o) => o.startAt.toISOString())).toEqual([
        "2026-07-06T15:00:00.000Z",
        "2026-07-13T15:00:00.000Z",
        "2026-07-20T15:00:00.000Z",
      ]);
      for (const o of occ) {
        if (o.schedule.kind !== "timed") throw new Error("expected timed");
        const durationMs =
          new Date(o.schedule.end).getTime() -
          new Date(o.schedule.start).getTime();
        expect(durationMs).toBe(30 * 60 * 1000);
        // endAt tracks the shifted duration on the normalized axis too.
        expect(o.endAt?.getTime()).toBe(o.startAt.getTime() + 30 * 60 * 1000);
      }
    });

    it("keeps DTSTART when BYDAY would otherwise skip the series start day", () => {
      // Staging repro: Friday start + weekly BYDAY=SU (default week-start
      // constant). Pure RRULE expansion jumps to Sunday; the create week's
      // range read must still see Friday so the SPA grid is not empty.
      const e = event(
        timed("2026-07-24T12:00:00-06:00", "2026-07-24T13:00:00-06:00"),
        {
          kind: "seriesMaster",
          rules: ["RRULE:FREQ=WEEKLY;COUNT=12;INTERVAL=1;BYDAY=SU"],
        },
      );
      const occ = projectOccurrences(e, HORIZON);
      expect(occ[0]?.startAt.toISOString()).toBe("2026-07-24T18:00:00.000Z");
      expect(occ.map((o) => o.startAt.toISOString()).slice(0, 3)).toEqual([
        "2026-07-24T18:00:00.000Z",
        "2026-07-26T18:00:00.000Z",
        "2026-08-02T18:00:00.000Z",
      ]);
    });

    it("clamps expansion to the horizon window", () => {
      const e = event(
        timed("2026-01-01T09:00:00-07:00", "2026-01-01T10:00:00-07:00"),
        { kind: "seriesMaster", rules: ["RRULE:FREQ=WEEKLY"] },
      );
      const narrow: ProjectionHorizon = {
        start: new Date("2026-06-01T00:00:00.000Z"),
        end: new Date("2026-07-01T00:00:00.000Z"),
      };
      const occ = projectOccurrences(e, narrow);
      expect(occ.length).toBeGreaterThan(0);
      for (const o of occ) {
        expect(o.startAt.getTime()).toBeGreaterThanOrEqual(
          narrow.start.getTime(),
        );
        expect(o.startAt.getTime()).toBeLessThan(narrow.end.getTime());
      }
    });

    it("skips instants owned by an exception", () => {
      const e = event(
        timed("2026-07-06T09:00:00-06:00", "2026-07-06T10:00:00-06:00"),
        { kind: "seriesMaster", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
      );
      // The second occurrence (2026-07-13T09:00-06:00) is excepted.
      const occ = projectOccurrences(e, HORIZON, [
        "2026-07-13T09:00:00-06:00" as never,
      ]);
      expect(occ.map((o) => o.startAt.toISOString())).toEqual([
        "2026-07-06T15:00:00.000Z",
        "2026-07-20T15:00:00.000Z",
      ]);
    });

    it("expands an all-day weekly series preserving the multi-day span", () => {
      const e = event(allDay("2026-07-06", "2026-07-08"), {
        kind: "seriesMaster",
        rules: ["RRULE:FREQ=WEEKLY;COUNT=2"],
      });
      const occ = projectOccurrences(e, HORIZON);
      expect(occ.map((o) => o.schedule)).toEqual([
        allDay("2026-07-06", "2026-07-08"),
        allDay("2026-07-13", "2026-07-15"),
      ]);
    });

    it("keeps wall-clock time across a DST spring-forward transition", () => {
      // US DST 2026 begins 2026-03-08. A weekly 09:00 Denver series should read
      // 09:00 local on both sides, with the civil offset changing -07 -> -06.
      const e = event(
        timed("2026-03-01T09:00:00-07:00", "2026-03-01T10:00:00-07:00"),
        { kind: "seriesMaster", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
      );
      const occ = projectOccurrences(e, HORIZON);
      const starts = occ.map((o) =>
        o.schedule.kind === "timed" ? o.schedule.start : "",
      );
      expect(starts).toEqual([
        "2026-03-01T09:00:00-07:00",
        "2026-03-08T09:00:00-06:00",
        "2026-03-15T09:00:00-06:00",
      ]);
    });

    it("bounds a non-ending daily rule to the horizon rather than expanding forever", () => {
      const e = event(
        timed("2026-06-01T09:00:00-06:00", "2026-06-01T09:15:00-06:00"),
        { kind: "seriesMaster", rules: ["RRULE:FREQ=DAILY"] },
      );
      const narrow: ProjectionHorizon = {
        start: new Date("2026-06-01T00:00:00.000Z"),
        end: new Date("2026-06-11T00:00:00.000Z"),
      };
      const occ = projectOccurrences(e, narrow);
      expect(occ).toHaveLength(10);
    });

    it("honors a UTC UNTIL west of UTC without a phantom trailing occurrence", () => {
      // Google encodes "ends June 9 (America/Denver)" as UNTIL=20260610T055959Z.
      // A real-UTC UNTIL compared against floating candidates would leak one
      // extra occurrence on June 10; the boundary must land on June 9.
      const e = event(
        timed("2026-06-01T03:00:00-06:00", "2026-06-01T03:15:00-06:00"),
        {
          kind: "seriesMaster",
          rules: ["RRULE:FREQ=DAILY;UNTIL=20260610T055959Z"],
        },
      );
      const starts = projectOccurrences(e, HORIZON).map((o) =>
        o.startAt.toISOString(),
      );
      expect(starts).toHaveLength(9);
      expect(starts.at(-1)).toBe("2026-06-09T09:00:00.000Z");
    });

    it("honors a UTC UNTIL east of UTC without dropping the final occurrence", () => {
      // "ends June 5 (Asia/Kolkata, +05:30)" is UNTIL=20260605T182959Z. A
      // real-UTC UNTIL would drop the true June 5 occurrence (20:00 IST is
      // 14:30Z, past the naive 18:29:59 boundary in the floating frame).
      const e = event(
        timed(
          "2026-06-01T20:00:00+05:30",
          "2026-06-01T20:30:00+05:30",
          "Asia/Kolkata",
        ),
        {
          kind: "seriesMaster",
          rules: ["RRULE:FREQ=DAILY;UNTIL=20260605T182959Z"],
        },
      );
      const starts = projectOccurrences(e, HORIZON).map((o) =>
        o.startAt.toISOString(),
      );
      expect(starts).toHaveLength(5);
      expect(starts.at(-1)).toBe("2026-06-05T14:30:00.000Z");
    });
  });

  describe("truncateRulesBefore", () => {
    it("appends a strictly-before UNTIL (one second earlier, inclusive bound)", () => {
      const [rule] = truncateRulesBefore(
        ["RRULE:FREQ=WEEKLY"],
        new Date("2026-07-21T15:00:00.000Z"),
      );
      expect(rule).toBe("RRULE:FREQ=WEEKLY;UNTIL=20260721T145959Z");
    });

    it("drops a COUNT (mutually exclusive with UNTIL) and replaces a stale UNTIL", () => {
      const [rule] = truncateRulesBefore(
        ["RRULE:FREQ=WEEKLY;COUNT=10;UNTIL=20270101T000000Z"],
        new Date("2026-07-21T15:00:00.000Z"),
      );
      expect(rule).toBe("RRULE:FREQ=WEEKLY;UNTIL=20260721T145959Z");
    });

    it("truncates the projection to occurrences before the split point", () => {
      const e = event(
        timed("2026-07-06T09:00:00-06:00", "2026-07-06T09:30:00-06:00"),
        {
          kind: "seriesMaster",
          rules: truncateRulesBefore(
            ["RRULE:FREQ=WEEKLY;COUNT=5"],
            // Split at the third occurrence (2026-07-20 09:00 -06:00 = 15:00Z).
            new Date("2026-07-20T15:00:00.000Z"),
          ),
        },
      );
      const starts = projectOccurrences(e, HORIZON).map((o) =>
        o.startAt.toISOString(),
      );
      expect(starts).toEqual([
        "2026-07-06T15:00:00.000Z",
        "2026-07-13T15:00:00.000Z",
      ]);
    });
  });
});
