import { faker } from "@faker-js/faker";
import { seedProviderCalendar } from "@sync/__tests__/helpers/fixtures";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import {
  type CalendarRepairDeps,
  repairCalendar,
} from "@sync/domain/calendar-repair.service";
import {
  type ProviderEvent,
  type ProviderEventRead,
} from "@sync/providers/provider-event.port";
import {
  type ProviderEventPage,
  type ProviderEventReader,
  type ProviderEventReadInput,
} from "@sync/providers/provider-event-reader.port";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";
import { type ProviderCalendarRecord } from "@sync/storage/contracts/provider-calendar.contracts";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

const objectId = () => faker.database.mongodbObjectId();
const now = () => new Date("2026-07-10T00:00:00.000Z");

class FakeReader implements ProviderEventReader {
  calls: ProviderEventReadInput[] = [];
  #pages: ProviderEventPage[];

  constructor(pages: ProviderEventPage[]) {
    this.#pages = [...pages];
  }
  async listEventPage(
    input: ProviderEventReadInput,
  ): Promise<ProviderEventPage> {
    this.calls.push(input);
    const page = this.#pages.shift();
    if (!page) throw new Error("FakeReader: no page scripted");
    return page;
  }
}

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
const single = (id: string, title = id): ProviderEvent => ({
  kind: "event",
  providerEventId: id,
  providerVersion: `etag-${id}`,
  providerUpdatedAt: null,
  content: content(title),
  schedule,
  busy: true,
  recurrence: { kind: "single" },
});
const page = (
  events: ProviderEventRead[],
  opts: { nextPageToken?: string | null; nextSyncToken?: string | null } = {},
): ProviderEventPage => ({
  events,
  skipped: 0,
  nextPageToken: opts.nextPageToken ?? null,
  nextSyncToken: opts.nextSyncToken ?? null,
});

const tokenSource = {
  getValidAccessToken: async () => "access-token",
  discardRevoked: async () => {},
  invalidateAccessToken: async () => {},
};

describe("repairCalendar", () => {
  const storage = setupSyncStorage(import.meta.url);
  let events: EventRepository;
  let occurrences: EventOccurrenceRepository;
  let resources: SyncResourceRepository;
  let calendars: ProviderCalendarRepository;

  beforeEach(() => {
    events = new EventRepository(storage.db());
    occurrences = new EventOccurrenceRepository(storage.db(), storage.client());
    resources = new SyncResourceRepository(storage.db());
    calendars = new ProviderCalendarRepository(storage.db());
  });

  const deps = (reader: FakeReader): CalendarRepairDeps => ({
    events,
    occurrences,
    resources,
    reader,
    custody: tokenSource,
  });

  const seedCalendar = (
    eventLabels: ProviderCalendarRecord["eventLabels"] = [],
  ): Promise<ProviderCalendarRecord> =>
    seedProviderCalendar(calendars, { eventLabels });

  const seedImported = async (calendar: ProviderCalendarRecord) => {
    const resource = await resources.ensure({
      tenantId: calendar.tenantId,
      principalId: calendar.principalId,
      connectionId: calendar.connectionId,
      resourceKind: "events",
      calendarId: calendar._id,
    });
    await resources.advanceCursor(
      calendar.tenantId,
      calendar.principalId,
      resource._id,
      "cursor-0",
      now(),
    );
    return resource;
  };

  // Seed an event and one occurrence at the given generation, as a prior
  // import/pull would have left them.
  const seedEvent = async (
    calendar: ProviderCalendarRecord,
    providerEventId: string | null,
    generation: number,
  ): Promise<EventRecord> => {
    const record = providerEventId
      ? await events.upsertByProviderIdentity({
          tenantId: calendar.tenantId,
          principalId: calendar.principalId,
          origin: "provider",
          calendarId: calendar._id,
          clientEventId: null,
          connectionId: calendar.connectionId,
          providerEventId: providerEventId as never,
          providerVersion: `etag-${providerEventId}` as never,
          providerUpdatedAt: null,
          deliveryState: null,
          providerMetadata: null,
          content: content(providerEventId),
          schedule,
          recurrence: { kind: "single" },
          lifecycleState: "active",
          generation,
          confirmedAt: now(),
        })
      : await events.put({
          _id: objectId() as EventRecord["_id"],
          tenantId: calendar.tenantId,
          principalId: calendar.principalId,
          origin: "compass",
          calendarId: calendar._id,
          clientEventId: null,
          connectionId: calendar.connectionId,
          providerEventId: null,
          providerVersion: null,
          providerUpdatedAt: null,
          deliveryState: null,
          providerMetadata: null,
          content: content("local"),
          schedule,
          recurrence: { kind: "single" },
          lifecycleState: "active",
          generation,
          createdAt: now(),
          updatedAt: now(),
          confirmedAt: now(),
        } as EventRecord);
    await occurrences.replaceForEvent(record._id, generation, [
      {
        tenantId: calendar.tenantId,
        principalId: calendar.principalId,
        eventId: record._id,
        occurrenceKey: `${record._id}:0`,
        calendarId: calendar._id,
        schedule,
        startAt: new Date("2026-07-14T15:00:00.000Z"),
        endAt: new Date("2026-07-14T16:00:00.000Z"),
        busy: true,
        title: providerEventId ?? "local",
        cancelled: false,
        generation,
      } as never,
    ]);
    return record;
  };

  const occAtGeneration = (calendarId: string, generation: number) =>
    storage
      .db()
      .collection(SYNC_COLLECTIONS.eventOccurrences)
      .countDocuments({ calendarId, generation });

  const eventCountAt = (calendarId: string, generation: number) =>
    storage
      .db()
      .collection(SYNC_COLLECTIONS.events)
      .countDocuments({ calendarId, generation });

  it("rebuilds into a new generation, activates it, and clears the old one", async () => {
    const calendar = await seedCalendar();
    await seedImported(calendar);
    await seedEvent(calendar, "keep", 0);
    await seedEvent(calendar, "stale", 0);
    expect(await occAtGeneration(calendar._id, 0)).toBe(2);

    // The provider still has "keep" but not "stale".
    const reader = new FakeReader([
      page([single("keep")], { nextSyncToken: "cursor-1" }),
    ]);
    const result = await repairCalendar(deps(reader), calendar, now);

    expect(result.status).toBe("repaired");
    if (result.status !== "repaired") throw new Error("unreachable");
    expect(result.generation).toBe(1);
    expect(result.resource.activeGeneration).toBe(1);
    expect(result.resource.syncCursor).toBe("cursor-1");
    // The old generation's occurrences are gone; the new one holds "keep".
    expect(await occAtGeneration(calendar._id, 0)).toBe(0);
    expect(await occAtGeneration(calendar._id, 1)).toBe(1);
    // "stale" (absent at the provider) is removed; "keep" moved to generation 1.
    expect(await eventCountAt(calendar._id, 0)).toBe(0);
    expect(await eventCountAt(calendar._id, 1)).toBe(1);
  });

  it("leaves the old generation active and intact when the pass yields no cursor", async () => {
    const calendar = await seedCalendar();
    await seedImported(calendar);
    await seedEvent(calendar, "keep", 0);

    const reader = new FakeReader([page([single("keep")])]); // no nextSyncToken
    const result = await repairCalendar(deps(reader), calendar, now);

    expect(result.status).toBe("incomplete");
    // Reads stay on the old generation; the old data is untouched.
    const resource = await resources.findById(
      calendar.tenantId,
      calendar.principalId,
      result.resource._id,
    );
    expect(resource?.activeGeneration).toBe(0);
    expect(await occAtGeneration(calendar._id, 0)).toBe(1);
  });

  it("preserves a Compass-owned event across a repair", async () => {
    const calendar = await seedCalendar();
    await seedImported(calendar);
    // A local (unlinked) event has no providerEventId, so the provider result
    // can't speak to it; it must survive the stale-event cleanup.
    const local = await seedEvent(calendar, null, 0);

    const reader = new FakeReader([
      page([single("keep")], { nextSyncToken: "cursor-1" }),
    ]);
    await repairCalendar(deps(reader), calendar, now);

    const survived = await events.findById(
      calendar.tenantId,
      calendar.principalId,
      local._id,
    );
    expect(survived).not.toBeNull();
  });

  it("resumes an in-flight repair generation instead of bumping again", async () => {
    const calendar = await seedCalendar();
    const resource = await seedImported(calendar);
    // Simulate a prior repair that bumped the import generation but crashed
    // before activating (importGeneration 1 ahead of activeGeneration 0).
    await resources.startNewGeneration(
      calendar.tenantId,
      calendar.principalId,
      resource._id,
    );

    const reader = new FakeReader([
      page([single("keep")], { nextSyncToken: "cursor-1" }),
    ]);
    const result = await repairCalendar(deps(reader), calendar, now);

    if (result.status !== "repaired") throw new Error("expected repaired");
    // Reused generation 1, did not bump to 2.
    expect(result.generation).toBe(1);
    expect(result.resource.importGeneration).toBe(1);
  });

  it("converges when run twice (idempotent)", async () => {
    const calendar = await seedCalendar();
    await seedImported(calendar);
    await seedEvent(calendar, "keep", 0);

    const first = new FakeReader([
      page([single("keep")], { nextSyncToken: "cursor-1" }),
    ]);
    await repairCalendar(deps(first), calendar, now);
    // A second repair rebuilds again into a further generation and cleans up.
    const second = new FakeReader([
      page([single("keep")], { nextSyncToken: "cursor-2" }),
    ]);
    const result = await repairCalendar(deps(second), calendar, now);

    if (result.status !== "repaired") throw new Error("expected repaired");
    // Exactly one live event and occurrence remain, at the active generation.
    expect(await eventCountAt(calendar._id, result.generation)).toBe(1);
    expect(await occAtGeneration(calendar._id, result.generation)).toBe(1);
    expect(
      await storage
        .db()
        .collection(SYNC_COLLECTIONS.eventOccurrences)
        .countDocuments({ calendarId: calendar._id }),
    ).toBe(1);
  });

  it("passes the calendar's event-color labels to the reader", async () => {
    // Repair rebuilds the whole calendar via the same reader port import/pull
    // use, so a repaired calendar must resolve custom label colors the same
    // way — this was missing until now, silently dropping colorHex for any
    // calendar that went through a repair rather than a plain pull.
    const calendar = await seedCalendar([{ id: "label-1", hex: "#009688" }]);
    await seedImported(calendar);
    const reader = new FakeReader([
      page([single("keep")], { nextSyncToken: "cursor-1" }),
    ]);

    await repairCalendar(deps(reader), calendar, now);

    expect(reader.calls[0]?.colorLabels).toEqual(
      new Map([["label-1", "#009688"]]),
    );
  });

  it("stamps the attempt even when the token fetch throws", async () => {
    // The reconcile sweep selects least-recently-attempted resources. A
    // doomed connection's repair must rotate to the back of the sweep after
    // failing, not tie at lastAttemptAt: null forever and keep winning slots
    // (2026-07-29 sweep-starvation regression; see the sibling test in
    // calendar-import.service.db.test.ts).
    const calendar = await seedCalendar();
    await seedImported(calendar);
    const reader = new FakeReader([page([])]);
    const deadCustody = {
      getValidAccessToken: async () => {
        throw new Error("token fetch failed");
      },
      discardRevoked: async () => {},
      invalidateAccessToken: async () => {},
    };

    await expect(
      repairCalendar(
        { events, occurrences, resources, reader, custody: deadCustody },
        calendar,
        now,
      ),
    ).rejects.toThrow("token fetch failed");

    const resource = await resources.ensure({
      tenantId: calendar.tenantId,
      principalId: calendar.principalId,
      connectionId: calendar.connectionId,
      resourceKind: "events",
      calendarId: calendar._id,
    });
    expect(resource.lastAttemptAt).toEqual(now());
  });
});
