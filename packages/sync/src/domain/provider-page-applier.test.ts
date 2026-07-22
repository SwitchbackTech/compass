import { faker } from "@faker-js/faker";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { ProviderPageApplier } from "@sync/domain/provider-page-applier";
import {
  type ProviderEvent,
  type ProviderEventCancellation,
} from "@sync/providers/provider-event.port";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { type ProviderCalendarRecord } from "@sync/storage/contracts/provider-calendar.contracts";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";

// The applier's happy-path content behavior (upsert, link, project, series
// ordering, dedup) is exercised end to end by calendar-import.service.test.ts,
// which drives it. These tests pin the one thing the import path does NOT
// exercise: the standalone-cancellation seam applyPage exposes for the pull
// path's deletion policy.

const objectId = () => faker.database.mongodbObjectId();
const now = () => new Date("2026-07-10T00:00:00.000Z");

const schedule = {
  kind: "timed" as const,
  start: "2026-07-14T09:00:00-06:00",
  end: "2026-07-14T10:00:00-06:00",
  timeZone: "America/Denver",
};
const content = (title: string) => ({
  title,
  description: "",
  location: null,
  organizer: null,
  attendees: [],
  conference: null,
});
const single = (id: string): ProviderEvent => ({
  kind: "event",
  providerEventId: id,
  providerVersion: `etag-${id}`,
  providerUpdatedAt: null,
  content: content(id),
  schedule,
  busy: true,
  recurrence: { kind: "single" },
});
const master = (id: string): ProviderEvent => ({
  ...single(id),
  recurrence: { kind: "seriesMaster", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
});
const standaloneCancellation = (id: string): ProviderEventCancellation => ({
  kind: "cancellation",
  providerEventId: id,
  providerVersion: `etag-${id}`,
  series: null,
});
const seriesCancellation = (
  id: string,
  seriesProviderId: string,
  recurrenceId: string,
): ProviderEventCancellation => ({
  kind: "cancellation",
  providerEventId: id,
  providerVersion: `etag-${id}`,
  series: { seriesProviderId, recurrenceId },
});

describe("ProviderPageApplier", () => {
  const storage = setupSyncStorage();
  let events: EventRepository;
  let occurrences: EventOccurrenceRepository;
  let calendars: ProviderCalendarRepository;

  beforeEach(() => {
    events = new EventRepository(storage.db());
    occurrences = new EventOccurrenceRepository(storage.db(), storage.client());
    calendars = new ProviderCalendarRepository(storage.db());
  });

  const seedCalendar = (): Promise<ProviderCalendarRecord> =>
    calendars.upsertByProviderCalendar({
      tenantId: objectId() as ProviderCalendarRecord["tenantId"],
      principalId: objectId() as ProviderCalendarRecord["principalId"],
      connectionId: objectId() as ProviderCalendarRecord["connectionId"],
      providerCalendarId: "primary@google.com",
      displayName: "Google",
      color: null,
      active: true,
      primary: true,
      accessRole: "owner",
      capabilities: {
        canReadEvents: true,
        canWriteEvents: true,
        canReadBusy: true,
        canInviteAttendees: true,
      },
    });

  const applier = (calendar: ProviderCalendarRecord) =>
    new ProviderPageApplier(events, occurrences, calendar, 0, now);

  it("returns standalone cancellations unconsumed and writes nothing for them", async () => {
    const calendar = await seedCalendar();
    const run = applier(calendar);

    const returned = await run.applyPage([
      single("a"),
      standaloneCancellation("gone"),
    ]);

    expect(returned.map((c) => c.providerEventId)).toEqual(["gone"]);
    // The live event was written; the cancellation left no record.
    expect(run.importedCount).toBe(1);
    expect(
      await events.findByProviderIdentity(
        calendar.tenantId,
        calendar.principalId,
        {
          connectionId: calendar.connectionId,
          calendarId: calendar._id,
          providerEventId: "gone",
        },
      ),
    ).toBeNull();
  });

  it("consumes a series cancellation as a tombstone rather than returning it", async () => {
    const calendar = await seedCalendar();
    const run = applier(calendar);

    const returned = await run.applyPage([
      master("m"),
      seriesCancellation("m_c", "m", "2026-07-21T09:00:00-06:00"),
    ]);

    // Not returned — it was consumed as a cancelled exception.
    expect(returned).toHaveLength(0);
    // master + cancelled exception written.
    expect(run.importedCount).toBe(2);
    const occ = await storage
      .db()
      .collection(SYNC_COLLECTIONS.eventOccurrences)
      .countDocuments({ calendarId: calendar._id });
    // 3 series occurrences minus the excepted instant, plus the cancelled row.
    expect(occ).toBe(3);
  });

  it("reports members that never found a master as orphans on finish", async () => {
    const calendar = await seedCalendar();
    const run = applier(calendar);

    await run.applyPage([
      seriesCancellation("orphan_c", "ghost", "2026-07-21T09:00:00-06:00"),
    ]);
    const orphans = await run.finish();

    expect(orphans).toBe(1);
    expect(run.importedCount).toBe(0);
  });
});
