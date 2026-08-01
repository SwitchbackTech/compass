import { repairLegacySeriesWeekday } from "@scripts/commands/repair-legacy-series-weekday/repair";
import { ObjectId } from "mongodb";
import dayjs from "@core/util/date/dayjs";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { beforeEach, describe, expect, it } from "bun:test";

const objectId = () => new ObjectId().toHexString();

const baseContent = {
  title: "Review Week",
  description: "",
  location: null,
  organizer: null,
  attendees: [],
  conference: null,
};

const timed = (start: string, end: string, timeZone = "America/Denver") => ({
  kind: "timed" as const,
  start,
  end,
  timeZone,
});

// Master's declared BYDAY=SU expands weekly on Sunday in America/Denver, but
// its exceptions (the ground truth, imported from Google) all fall on
// Saturday — the exact "Review Week" shape from prod.
const masterRecord = (
  seriesId: string,
  tenantId: string,
  principalId: string,
  overrides: Partial<EventRecord> = {},
): EventRecord =>
  ({
    _id: seriesId,
    tenantId,
    principalId,
    origin: "provider",
    calendarId: objectId(),
    clientEventId: null,
    connectionId: objectId(),
    providerEventId: objectId(),
    providerVersion: "etag-1",
    providerUpdatedAt: new Date("2026-07-05T05:25:03.244Z"),
    deliveryState: null,
    providerMetadata: null,
    content: baseContent,
    // Sunday, Aug 9 2026, 7:30pm Denver.
    schedule: timed("2026-08-09T19:30:00-06:00", "2026-08-09T20:00:00-06:00"),
    recurrence: {
      kind: "seriesMaster",
      rules: ["RRULE:FREQ=WEEKLY;UNTIL=20400325T013000Z;INTERVAL=1;BYDAY=SU"],
    },
    lifecycleState: "active",
    generation: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    confirmedAt: new Date(),
    ...overrides,
  }) as EventRecord;

const exceptionRecord = (
  seriesId: string,
  tenantId: string,
  principalId: string,
  // The real (Google-sourced) instant this exception represents.
  start: string,
  end: string,
  // The candidate instant this exception overrides — defaults to `start`,
  // but can differ when the exception overrides a *different* generated slot
  // (e.g. the master's own wrong-weekday anchor date) with this real one.
  recurrenceId: string = start,
): EventRecord =>
  ({
    _id: objectId(),
    tenantId,
    principalId,
    origin: "provider",
    calendarId: objectId(),
    clientEventId: null,
    connectionId: objectId(),
    providerEventId: objectId(),
    providerVersion: "etag-1",
    providerUpdatedAt: new Date(start),
    deliveryState: null,
    providerMetadata: null,
    content: baseContent,
    schedule: timed(start, end),
    recurrence: {
      kind: "exception",
      seriesId,
      recurrenceId: new Date(recurrenceId).toISOString(),
      cancelled: false,
    },
    lifecycleState: "active",
    generation: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    confirmedAt: new Date(),
  }) as EventRecord;

describe("repairLegacySeriesWeekday", () => {
  const storage = setupSyncStorage(import.meta.url);
  let events: EventRepository;

  beforeEach(() => {
    events = new EventRepository(storage.db());
  });

  it("dry-run reports the fix without writing it", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const seriesId = objectId();
    const master = await events.put(
      masterRecord(seriesId, tenantId, principalId),
    );
    await events.put(
      exceptionRecord(
        seriesId,
        tenantId,
        principalId,
        "2026-08-15T19:30:00-06:00",
        "2026-08-15T20:00:00-06:00",
      ),
    );
    await events.put(
      exceptionRecord(
        seriesId,
        tenantId,
        principalId,
        "2026-08-22T19:30:00-06:00",
        "2026-08-22T20:00:00-06:00",
      ),
    );

    const report = await repairLegacySeriesWeekday(
      storage.db(),
      storage.client(),
      { dryRun: true },
    );

    expect(report.fixed).toBe(1);
    expect(report.entries[0]).toMatchObject({
      seriesId,
      currentByDay: "SU",
      targetByDay: "SA",
      outcome: "fixed",
    });

    const stillStored = await events.findById(
      tenantId,
      principalId,
      master._id,
    );
    expect(stillStored?.recurrence).toEqual(master.recurrence);
  });

  it("apply rewrites BYDAY, shifts the master's own anchor date, and reprojects", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const seriesId = objectId();
    await events.put(masterRecord(seriesId, tenantId, principalId));
    await events.put(
      exceptionRecord(
        seriesId,
        tenantId,
        principalId,
        "2026-08-15T19:30:00-06:00",
        "2026-08-15T20:00:00-06:00",
      ),
    );
    await events.put(
      exceptionRecord(
        seriesId,
        tenantId,
        principalId,
        "2026-08-22T19:30:00-06:00",
        "2026-08-22T20:00:00-06:00",
      ),
    );

    const report = await repairLegacySeriesWeekday(
      storage.db(),
      storage.client(),
      { dryRun: false },
    );

    expect(report.fixed).toBe(1);
    expect(report.entries[0]).toMatchObject({
      scheduleStartShifted: true,
      outcome: "fixed",
    });

    const updated = await events.findById(tenantId, principalId, seriesId);
    expect(updated?.recurrence.kind).toBe("seriesMaster");
    if (updated?.recurrence.kind === "seriesMaster") {
      expect(updated.recurrence.rules[0]).toContain("BYDAY=SA");
      expect(updated.recurrence.rules[0]).toContain("UNTIL=20400325T013000Z");
      expect(updated.recurrence.rules[0]).toContain("INTERVAL=1");
    }
    // Anchor date moved from Sunday Aug 9 to Saturday Aug 8, same time-of-day.
    expect(updated?.schedule.kind).toBe("timed");
    if (updated?.schedule.kind === "timed") {
      expect(updated.schedule.start).toContain("2026-08-08T19:30:00");
    }

    const occurrences = await storage
      .db()
      .collection("event_occurrences")
      .find({ eventId: seriesId })
      .toArray();
    // No two occurrences should land on the same calendar week anymore.
    const weekdays = new Set(
      occurrences.map((o) => new Date(o["startAt"] as Date).getUTCDay()),
    );
    expect(weekdays.size).toBe(1);
  });

  it("does not touch the master's own anchor date when an exception already covers it", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const seriesId = objectId();
    await events.put(masterRecord(seriesId, tenantId, principalId));
    // This exception overrides the master's OWN wrong-weekday dtstart
    // candidate (recurrenceId = Sunday Aug 9) with the real Saturday instant
    // Google actually has (Aug 8) — already suppressed at that slot
    // regardless of weekday, so the anchor date itself needs no shift.
    await events.put(
      exceptionRecord(
        seriesId,
        tenantId,
        principalId,
        "2026-08-08T19:30:00-06:00",
        "2026-08-08T20:00:00-06:00",
        "2026-08-09T19:30:00-06:00",
      ),
    );
    await events.put(
      exceptionRecord(
        seriesId,
        tenantId,
        principalId,
        "2026-08-15T19:30:00-06:00",
        "2026-08-15T20:00:00-06:00",
      ),
    );

    const report = await repairLegacySeriesWeekday(
      storage.db(),
      storage.client(),
      { dryRun: false },
    );

    expect(report.entries[0]).toMatchObject({
      scheduleStartShifted: false,
      outcome: "fixed",
    });
    const updated = await events.findById(tenantId, principalId, seriesId);
    expect(updated?.schedule.kind).toBe("timed");
    if (updated?.schedule.kind === "timed") {
      // Anchor date itself is untouched — only BYDAY moved.
      expect(updated.schedule.start).toContain("2026-08-09T19:30:00");
    }
  });

  it("fixes a series with a strong-majority weekday despite a rare outlier exception", async () => {
    // Tyler's prod "Review Week" shape: 711 of 712 exceptions on Saturday, 1
    // on Sunday (a legitimate one-off reschedule). Requiring unanimity would
    // wrongly skip exactly this case.
    const tenantId = objectId();
    const principalId = objectId();
    const seriesId = objectId();
    await events.put(masterRecord(seriesId, tenantId, principalId));
    // Nine consecutive Saturdays, starting Aug 15 2026.
    for (let week = 0; week < 9; week++) {
      const start = dayjs
        .tz("2026-08-15 19:30", "America/Denver")
        .add(week, "week");
      await events.put(
        exceptionRecord(
          seriesId,
          tenantId,
          principalId,
          start.format(),
          start.add(30, "minute").format(),
        ),
      );
    }
    // The one outlier, on a Wednesday instead of Saturday.
    await events.put(
      exceptionRecord(
        seriesId,
        tenantId,
        principalId,
        "2026-10-14T19:30:00-06:00",
        "2026-10-14T20:00:00-06:00",
      ),
    );

    const report = await repairLegacySeriesWeekday(
      storage.db(),
      storage.client(),
      { dryRun: false },
    );

    expect(report.entries[0]).toMatchObject({
      currentByDay: "SU",
      targetByDay: "SA",
      outcome: "fixed",
    });
    expect(report.entries[0]?.consensusShare).toBeGreaterThan(0.8);
  });

  it("skips a series whose exceptions disagree on a weekday", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const seriesId = objectId();
    await events.put(masterRecord(seriesId, tenantId, principalId));
    await events.put(
      exceptionRecord(
        seriesId,
        tenantId,
        principalId,
        "2026-08-15T19:30:00-06:00",
        "2026-08-15T20:00:00-06:00",
      ),
    );
    // A different weekday than the other exception — ambiguous history.
    await events.put(
      exceptionRecord(
        seriesId,
        tenantId,
        principalId,
        "2026-08-25T19:30:00-06:00",
        "2026-08-25T20:00:00-06:00",
      ),
    );

    const report = await repairLegacySeriesWeekday(
      storage.db(),
      storage.client(),
      { dryRun: false },
    );

    expect(report.fixed).toBe(0);
    expect(report.entries[0]?.outcome).toBe("skipped-ambiguous");
    const untouched = await events.findById(tenantId, principalId, seriesId);
    expect(untouched?.recurrence.kind).toBe("seriesMaster");
    if (untouched?.recurrence.kind === "seriesMaster") {
      expect(untouched.recurrence.rules[0]).toContain("BYDAY=SU");
    }
  });

  it("skips a series with no exceptions to learn the correct weekday from", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const seriesId = objectId();
    await events.put(masterRecord(seriesId, tenantId, principalId));

    const report = await repairLegacySeriesWeekday(
      storage.db(),
      storage.client(),
      { dryRun: false },
    );

    expect(report.fixed).toBe(0);
    expect(report.entries[0]?.outcome).toBe("skipped-no-exceptions");
  });

  it("leaves an already-correct series untouched", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const seriesId = objectId();
    await events.put(
      masterRecord(seriesId, tenantId, principalId, {
        recurrence: {
          kind: "seriesMaster",
          rules: ["RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=SA"],
        },
      }),
    );
    await events.put(
      exceptionRecord(
        seriesId,
        tenantId,
        principalId,
        "2026-08-15T19:30:00-06:00",
        "2026-08-15T20:00:00-06:00",
      ),
    );

    const report = await repairLegacySeriesWeekday(
      storage.db(),
      storage.client(),
      { dryRun: false },
    );

    expect(report.fixed).toBe(0);
    expect(report.entries[0]?.outcome).toBe("already-correct");
  });

  it("is idempotent: rerunning after a fix finds nothing left to change", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const seriesId = objectId();
    await events.put(masterRecord(seriesId, tenantId, principalId));
    await events.put(
      exceptionRecord(
        seriesId,
        tenantId,
        principalId,
        "2026-08-15T19:30:00-06:00",
        "2026-08-15T20:00:00-06:00",
      ),
    );
    await events.put(
      exceptionRecord(
        seriesId,
        tenantId,
        principalId,
        "2026-08-22T19:30:00-06:00",
        "2026-08-22T20:00:00-06:00",
      ),
    );

    const first = await repairLegacySeriesWeekday(
      storage.db(),
      storage.client(),
      {
        dryRun: false,
      },
    );
    expect(first.fixed).toBe(1);

    const second = await repairLegacySeriesWeekday(
      storage.db(),
      storage.client(),
      {
        dryRun: false,
      },
    );
    expect(second.fixed).toBe(0);
    expect(second.entries[0]?.outcome).toBe("already-correct");
  });
});
