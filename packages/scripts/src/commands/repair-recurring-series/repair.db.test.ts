import { repairRecurringSeries } from "@scripts/commands/repair-recurring-series/repair";
import { ObjectId } from "mongodb";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { describe, expect, it } from "bun:test";

const hexId = () => new ObjectId().toHexString();

const NOW = () => new Date("2026-07-31T12:00:00.000Z");

describe("repair-recurring-series (db)", () => {
  const storage = setupSyncStorage(import.meta.url);

  const events = () => storage.db().collection(SYNC_COLLECTIONS.events);
  const occurrences = () =>
    storage.db().collection(SYNC_COLLECTIONS.eventOccurrences);

  const baseEvent = (overrides: Record<string, unknown>) => ({
    _id: hexId(),
    tenantId: hexId(),
    principalId: hexId(),
    origin: "provider",
    calendarId: hexId(),
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
    lifecycleState: "active",
    generation: 0,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    confirmedAt: new Date("2026-07-01T00:00:00.000Z"),
    ...overrides,
  });

  /**
   * A weekly Denver series (Jul 6..Aug 3 2026, EXDATE on Jul 13) plus:
   * - a legit cancelled tombstone at the real Jul 20 instant,
   * - a junk cancelled tombstone at a now-anchored garbage instant,
   * - a phantom master occurrence row (what the bug projected).
   */
  const seedSeries = async () => {
    const tenantId = hexId();
    const principalId = hexId();
    const calendarId = hexId();
    const scope = { tenantId, principalId, calendarId };
    const master = baseEvent({
      ...scope,
      schedule: {
        kind: "timed",
        start: "2026-07-06T09:00:00-06:00",
        end: "2026-07-06T09:30:00-06:00",
        timeZone: "America/Denver",
      },
      recurrence: {
        kind: "seriesMaster",
        rules: [
          "EXDATE;TZID=America/Denver:20260713T090000",
          "RRULE:FREQ=WEEKLY;COUNT=5",
        ],
      },
    });
    const legitTombstone = baseEvent({
      ...scope,
      recurrence: {
        kind: "exception",
        seriesId: master["_id"],
        recurrenceId: "2026-07-20T15:00:00.000Z",
        cancelled: true,
      },
      schedule: {
        kind: "timed",
        start: "2026-07-20T09:00:00-06:00",
        end: "2026-07-20T09:30:00-06:00",
        timeZone: "America/Denver",
      },
    });
    const junkTombstone = baseEvent({
      ...scope,
      recurrence: {
        kind: "exception",
        seriesId: master["_id"],
        recurrenceId: "2026-07-22T21:12:43.000Z",
        cancelled: true,
      },
      schedule: {
        kind: "timed",
        start: "2026-07-22T15:12:43-06:00",
        end: "2026-07-22T15:42:43-06:00",
        timeZone: "America/Denver",
      },
    });
    await events().insertMany([master, legitTombstone, junkTombstone]);
    await occurrences().insertMany([
      phantomOccurrence(master, "2026-08-05T21:12:43.000Z"),
      phantomOccurrence(junkTombstone, "2026-07-22T21:12:43.000Z"),
    ]);
    return { master, legitTombstone, junkTombstone };
  };

  const phantomOccurrence = (
    event: Record<string, unknown>,
    startAt: string,
  ) => ({
    _id: hexId(),
    tenantId: event["tenantId"],
    principalId: event["principalId"],
    eventId: event["_id"],
    occurrenceKey: `${event["_id"] as string}:${startAt}`,
    calendarId: event["calendarId"],
    schedule: {
      kind: "timed",
      start: startAt,
      end: startAt,
      timeZone: "America/Denver",
    },
    startAt: new Date(startAt),
    endAt: new Date(startAt),
    busy: true,
    title: "Standup",
    cancelled: false,
    generation: 0,
  });

  it("dry run reports junk without writing", async () => {
    const { master, junkTombstone } = await seedSeries();
    const report = await repairRecurringSeries(storage.db(), storage.client(), {
      dryRun: true,
      now: NOW,
    });
    expect(report).toMatchObject({
      dryRun: true,
      mastersScanned: 1,
      wouldRepair: 1,
      wouldDelete: 1,
      mastersRepaired: 0,
      junkExceptionsDeleted: 0,
      junkExceptionIds: [junkTombstone["_id"]],
      suspectOverrideIds: [],
    });
    // Nothing changed: junk doc and phantom rows are still there.
    expect(await events().countDocuments({ _id: junkTombstone["_id"] })).toBe(
      1,
    );
    expect(await occurrences().countDocuments({ eventId: master["_id"] })).toBe(
      1,
    );
  });

  it("apply deletes junk, keeps the legit tombstone, and corrects the master's rows", async () => {
    const { master, legitTombstone, junkTombstone } = await seedSeries();
    const report = await repairRecurringSeries(storage.db(), storage.client(), {
      dryRun: false,
      now: NOW,
    });
    expect(report).toMatchObject({
      mastersRepaired: 1,
      junkExceptionsDeleted: 1,
      junkExceptionIds: [junkTombstone["_id"]],
    });

    expect(await events().countDocuments({ _id: junkTombstone["_id"] })).toBe(
      0,
    );
    expect(await events().countDocuments({ _id: legitTombstone["_id"] })).toBe(
      1,
    );
    expect(
      await occurrences().countDocuments({ eventId: junkTombstone["_id"] }),
    ).toBe(0);

    // Master rows are the fixed expansion: EXDATE'd Jul 13 and the legit
    // tombstone's Jul 20 are excluded; the phantom now-anchored row is gone.
    const rows = await occurrences()
      .find({ eventId: master["_id"] })
      .sort({ startAt: 1 })
      .toArray();
    expect(rows.map((row) => row["startAt"])).toEqual([
      new Date("2026-07-06T15:00:00.000Z"),
      new Date("2026-07-27T15:00:00.000Z"),
      new Date("2026-08-03T15:00:00.000Z"),
    ]);
  });

  it("apply is idempotent", async () => {
    await seedSeries();
    await repairRecurringSeries(storage.db(), storage.client(), {
      dryRun: false,
      now: NOW,
    });
    const second = await repairRecurringSeries(storage.db(), storage.client(), {
      dryRun: false,
      now: NOW,
    });
    expect(second).toMatchObject({
      mastersScanned: 1,
      mastersRepaired: 1,
      junkExceptionsDeleted: 0,
      junkExceptionIds: [],
    });
  });

  it("reports a suspect non-cancelled override but never deletes it", async () => {
    const { master } = await seedSeries();
    const override = baseEvent({
      tenantId: master["tenantId"],
      principalId: master["principalId"],
      calendarId: master["calendarId"],
      recurrence: {
        kind: "exception",
        seriesId: master["_id"],
        recurrenceId: "2026-07-23T10:11:12.000Z",
        cancelled: false,
      },
      schedule: {
        kind: "timed",
        start: "2026-07-23T04:11:12-06:00",
        end: "2026-07-23T04:41:12-06:00",
        timeZone: "America/Denver",
      },
    });
    await events().insertOne(override);
    const report = await repairRecurringSeries(storage.db(), storage.client(), {
      dryRun: false,
      now: NOW,
    });
    expect(report.suspectOverrideIds).toEqual([override["_id"] as string]);
    expect(await events().countDocuments({ _id: override["_id"] })).toBe(1);
  });

  it("leaves RRULE-only masters untouched", async () => {
    const master = baseEvent({
      schedule: {
        kind: "timed",
        start: "2026-07-06T09:00:00-06:00",
        end: "2026-07-06T09:30:00-06:00",
        timeZone: "America/Denver",
      },
      recurrence: {
        kind: "seriesMaster",
        rules: ["RRULE:FREQ=WEEKLY;COUNT=3"],
      },
    });
    await events().insertOne(master);
    const report = await repairRecurringSeries(storage.db(), storage.client(), {
      dryRun: false,
      now: NOW,
    });
    expect(report.mastersScanned).toBe(0);
    expect(await occurrences().countDocuments({})).toBe(0);
  });
});
