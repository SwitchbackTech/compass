import { migrateProviderConnections } from "@scripts/commands/migrate-connections/migrate";
import { migrateProviderSyncState } from "@scripts/commands/migrate-provider-state/migrate";
import { ObjectId } from "mongodb";
import { Resource_Sync } from "@core/types/sync.types";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";

const NOW = new Date("2026-07-25T04:00:00.000Z");

describe("migrate-provider-state (db)", () => {
  const syncStorage = setupSyncStorage(import.meta.url);

  beforeAll(() => setupTestDb(import.meta.url));
  afterEach(async () => {
    await cleanupCollections();
    await mongoService.user.deleteMany({});
    await mongoService.calendar.deleteMany({});
    await mongoService.event.deleteMany({});
    await mongoService.sync.deleteMany({});
    await mongoService.watch.deleteMany({});
  });
  afterAll(cleanupTestDb);

  function deps() {
    const db = syncStorage.db();
    return {
      connections: new ProviderConnectionRepository(db),
      calendars: new ProviderCalendarRepository(db),
      events: new EventRepository(db),
      occurrences: new EventOccurrenceRepository(db, syncStorage.client()),
      resources: new SyncResourceRepository(db),
    };
  }

  async function seedLegacyFixture() {
    const userId = new ObjectId();
    const calendarId = new ObjectId();
    const masterId = new ObjectId();
    const exceptionId = new ObjectId();
    const unlinkedId = new ObjectId();
    const watchId = new ObjectId();

    await mongoService.user.insertOne({
      _id: userId,
      email: "state@example.com",
      firstName: "State",
      lastName: "Migrate",
      name: "State Migrate",
      locale: "en",
      google: {
        googleId: "google-subject-state",
        picture: "",
        gRefreshToken: "legacy-refresh-token",
      },
    });
    await mongoService.calendar.insertOne({
      _id: calendarId,
      userId,
      name: "Primary",
      description: "",
      timeZone: "America/Denver",
      foregroundColor: "#000000",
      backgroundColor: "#4285f4",
      access: "owner",
      isPrimary: true,
      isVisible: true,
      isActive: true,
      source: {
        provider: "google",
        calendarId: "primary",
        etag: "etag-cal",
      },
      createdAt: NOW,
      updatedAt: null,
    });
    await mongoService.event.insertMany([
      {
        _id: masterId,
        calendarId,
        content: { kind: "details", title: "weekly", description: "" },
        schedule: {
          kind: "timed",
          start: NOW,
          end: new Date(NOW.getTime() + 3600_000),
          timeZone: "America/Denver",
        },
        recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY"] },
        externalReference: {
          provider: "google",
          eventId: "gcal-master-1",
          recurringEventId: null,
        },
        createdAt: NOW,
        updatedAt: null,
      },
      {
        _id: exceptionId,
        calendarId,
        content: { kind: "details", title: "weekly (moved)", description: "" },
        schedule: {
          kind: "timed",
          start: new Date(NOW.getTime() + 86_400_000),
          end: new Date(NOW.getTime() + 86_400_000 + 3600_000),
          timeZone: "America/Denver",
        },
        recurrence: { kind: "occurrence", seriesId: masterId },
        externalReference: {
          provider: "google",
          eventId: "gcal-exception-1",
          recurringEventId: "gcal-master-1",
        },
        createdAt: NOW,
        updatedAt: null,
      },
      {
        _id: new ObjectId(),
        calendarId,
        content: { kind: "details", title: "standup", description: "" },
        schedule: {
          kind: "timed",
          start: NOW,
          end: new Date(NOW.getTime() + 1800_000),
          timeZone: "America/Denver",
        },
        recurrence: { kind: "single" },
        externalReference: {
          provider: "google",
          eventId: "gcal-single-1",
          recurringEventId: null,
        },
        createdAt: NOW,
        updatedAt: null,
      },
      {
        _id: unlinkedId,
        calendarId,
        content: { kind: "details", title: "draft", description: "" },
        schedule: {
          kind: "timed",
          start: NOW,
          end: new Date(NOW.getTime() + 1800_000),
          timeZone: "America/Denver",
        },
        recurrence: { kind: "single" },
        externalReference: null,
        createdAt: NOW,
        updatedAt: null,
      },
    ]);
    await mongoService.sync.insertOne({
      user: userId.toHexString(),
      google: {
        calendarlist: [
          {
            gCalendarId: Resource_Sync.CALENDAR,
            nextSyncToken: "cal-sync-token",
          },
        ],
        events: [{ gCalendarId: "primary", nextSyncToken: "evt-sync-token" }],
      },
    });
    await mongoService.watch.insertOne({
      _id: watchId,
      user: userId.toHexString(),
      resourceId: "resource-1",
      expiration: String(NOW.getTime() + 86_400_000),
      gCalendarId: "primary",
      createdAt: NOW,
    });

    return { userId, calendarId, masterId, exceptionId, unlinkedId, watchId };
  }

  async function loadSource() {
    const [users, calendars, events, syncDocs, watches] = await Promise.all([
      mongoService.user.find({}).toArray(),
      mongoService.calendar.find({}).toArray(),
      mongoService.event.find({}).toArray(),
      mongoService.sync.find({}).toArray(),
      mongoService.watch.find({}).toArray(),
    ]);
    return { users, calendars, events, syncDocs, watches };
  }

  it("dry-run does not write; apply then rerun is idempotent", async () => {
    const { userId, unlinkedId } = await seedLegacyFixture();
    const repositories = deps();

    await migrateProviderConnections(
      {
        connections: repositories.connections,
        credentials: new CredentialRepository(syncStorage.db()),
      },
      await mongoService.user.find({}).toArray(),
      { dryRun: false, now: NOW },
    );

    const source = await loadSource();
    const dry = await migrateProviderSyncState(repositories, source, {
      dryRun: true,
      now: NOW,
    });
    expect(dry.counts.usersWouldMigrate).toBe(1);
    expect(dry.counts.calendarsWouldCreate).toBe(1);
    expect(dry.counts.eventsWouldCreate).toBe(3);
    expect(dry.counts.unlinkedDeferred).toBe(1);
    expect(dry.counts.watchesSkippedRewatch).toBe(1);
    expect(
      await syncStorage
        .db()
        .collection(SYNC_COLLECTIONS.providerCalendars)
        .countDocuments(),
    ).toBe(0);
    expect(
      await syncStorage
        .db()
        .collection(SYNC_COLLECTIONS.events)
        .countDocuments(),
    ).toBe(0);

    const first = await migrateProviderSyncState(repositories, source, {
      dryRun: false,
      now: NOW,
    });
    expect(first.counts.usersMigrated).toBe(1);
    expect(first.counts.calendarsCreated).toBe(1);
    expect(first.counts.eventsCreated).toBe(3);
    expect(first.counts.unlinkedDeferred).toBe(1);
    expect(
      first.skips.some(
        (s) =>
          s.category === "unlinked_deferred" &&
          s.id === unlinkedId.toHexString(),
      ),
    ).toBe(true);
    expect(
      first.skips.every((s) => s.category !== "missing_series_master"),
    ).toBe(true);

    const calendars = await repositories.calendars.listByPrincipal(
      userId.toHexString() as never,
      userId.toHexString() as never,
    );
    expect(calendars).toHaveLength(1);
    expect(calendars[0]?.providerCalendarId).toBe("primary");
    expect(calendars[0]?.accessRole).toBe("owner");
    expect(calendars[0]?.color).toBe("#4285f4");

    const syncEvents = await syncStorage
      .db()
      .collection(SYNC_COLLECTIONS.events)
      .find({})
      .toArray();
    expect(syncEvents).toHaveLength(3);
    expect(
      syncEvents.filter((e) => e.providerEventId === "gcal-master-1"),
    ).toHaveLength(1);
    expect(
      syncEvents.filter((e) => e.providerEventId === "gcal-exception-1"),
    ).toHaveLength(1);
    expect(
      syncEvents.filter((e) => e.recurrence?.kind === "exception"),
    ).toHaveLength(1);

    const resources = await repositories.resources.listByConnection(
      userId.toHexString() as never,
      userId.toHexString() as never,
      calendars[0]!.connectionId,
    );
    const calendarList = resources.find(
      (r) => r.resourceKind === "calendarList",
    );
    const eventsResource = resources.find((r) => r.resourceKind === "events");
    expect(calendarList?.syncCursor).toBe("cal-sync-token");
    expect(eventsResource?.syncCursor).toBe("evt-sync-token");
    expect(eventsResource?.subscriptionId).toBeNull();

    const occurrences = await syncStorage
      .db()
      .collection(SYNC_COLLECTIONS.eventOccurrences)
      .countDocuments();
    expect(occurrences).toBeGreaterThan(0);

    // Source rows remain.
    expect(await mongoService.event.countDocuments()).toBe(4);
    expect(await mongoService.watch.countDocuments()).toBe(1);

    const second = await migrateProviderSyncState(repositories, source, {
      dryRun: false,
      now: NOW,
    });
    expect(second.counts.calendarsUpdated).toBe(1);
    expect(second.counts.eventsUpdated).toBe(3);
    expect(second.counts.calendarsCreated).toBe(0);
    expect(second.counts.eventsCreated).toBe(0);
    expect(
      await syncStorage
        .db()
        .collection(SYNC_COLLECTIONS.providerCalendars)
        .countDocuments(),
    ).toBe(1);
    expect(
      await syncStorage
        .db()
        .collection(SYNC_COLLECTIONS.events)
        .countDocuments(),
    ).toBe(3);
  });

  it("keeps one calendar when duplicates exist and still migrates dup events", async () => {
    const { userId } = await seedLegacyFixture();
    const dupCalendarId = new ObjectId();
    await mongoService.calendar.insertOne({
      _id: dupCalendarId,
      userId,
      name: "Primary Dup",
      description: "",
      timeZone: "America/Denver",
      foregroundColor: "#000000",
      backgroundColor: "#ffffff",
      access: "owner",
      isPrimary: true,
      isVisible: true,
      isActive: true,
      source: {
        provider: "google",
        calendarId: "primary",
        etag: "etag-dup",
      },
      createdAt: NOW,
      updatedAt: null,
    });
    await mongoService.event.insertOne({
      _id: new ObjectId(),
      calendarId: dupCalendarId,
      content: { kind: "details", title: "on-dup", description: "" },
      schedule: {
        kind: "timed",
        start: NOW,
        end: new Date(NOW.getTime() + 1800_000),
        timeZone: "America/Denver",
      },
      recurrence: { kind: "single" },
      externalReference: {
        provider: "google",
        eventId: "gcal-on-dup",
        recurringEventId: null,
      },
      createdAt: NOW,
      updatedAt: null,
    });

    const repositories = deps();
    await migrateProviderConnections(
      {
        connections: repositories.connections,
        credentials: new CredentialRepository(syncStorage.db()),
      },
      await mongoService.user.find({}).toArray(),
      { dryRun: false, now: NOW },
    );

    const report = await migrateProviderSyncState(
      repositories,
      await loadSource(),
      { dryRun: false, now: NOW },
    );

    expect(report.counts.calendarsCreated).toBe(1);
    expect(report.counts.calendarsSkipped).toBe(1);
    expect(
      report.skips.some((s) => s.category === "duplicate_google_calendar"),
    ).toBe(true);
    expect(
      await syncStorage
        .db()
        .collection(SYNC_COLLECTIONS.providerCalendars)
        .countDocuments(),
    ).toBe(1);
    expect(
      await syncStorage
        .db()
        .collection(SYNC_COLLECTIONS.events)
        .findOne({ providerEventId: "gcal-on-dup" }),
    ).not.toBeNull();
  });

  it("preserves existing event generation on re-apply", async () => {
    const { userId } = await seedLegacyFixture();
    const repositories = deps();
    await migrateProviderConnections(
      {
        connections: repositories.connections,
        credentials: new CredentialRepository(syncStorage.db()),
      },
      await mongoService.user.find({}).toArray(),
      { dryRun: false, now: NOW },
    );

    await migrateProviderSyncState(repositories, await loadSource(), {
      dryRun: false,
      now: NOW,
    });

    await syncStorage
      .db()
      .collection(SYNC_COLLECTIONS.events)
      .updateMany({}, { $set: { generation: 3 } });
    await syncStorage
      .db()
      .collection(SYNC_COLLECTIONS.syncResources)
      .updateMany(
        { resourceKind: "events" },
        { $set: { activeGeneration: 3, importGeneration: 3 } },
      );

    await migrateProviderSyncState(repositories, await loadSource(), {
      dryRun: false,
      now: NOW,
    });

    const generations = await syncStorage
      .db()
      .collection(SYNC_COLLECTIONS.events)
      .find({ tenantId: userId.toHexString() })
      .project({ generation: 1 })
      .toArray();
    expect(generations.length).toBeGreaterThan(0);
    expect(generations.every((row) => row.generation === 3)).toBe(true);
  });

  it("deletes a corrupt Sync event and continues migrate", async () => {
    await seedLegacyFixture();
    const repositories = deps();
    await migrateProviderConnections(
      {
        connections: repositories.connections,
        credentials: new CredentialRepository(syncStorage.db()),
      },
      await mongoService.user.find({}).toArray(),
      { dryRun: false, now: NOW },
    );

    // First apply creates valid Sync calendars/events.
    await migrateProviderSyncState(repositories, await loadSource(), {
      dryRun: false,
      now: NOW,
      reproject: "off",
    });

    const poison = await syncStorage
      .db()
      .collection(SYNC_COLLECTIONS.events)
      .findOne({ providerEventId: "gcal-single-1" });
    expect(poison).not.toBeNull();

    // Invert schedule in place (poison), leaving provider identity intact.
    await syncStorage
      .db()
      .collection(SYNC_COLLECTIONS.events)
      .updateOne(
        { _id: poison!._id },
        {
          $set: {
            schedule: {
              kind: "timed",
              start: "2026-07-25T05:00:00.000Z",
              end: "2026-07-25T04:00:00.000Z",
              timeZone: "UTC",
            },
          },
        },
      );

    const report = await migrateProviderSyncState(
      repositories,
      await loadSource(),
      { dryRun: false, now: NOW, reproject: "after", concurrency: 2 },
    );

    expect(report.skips.some((s) => s.category === "corrupt_sync_event")).toBe(
      true,
    );
    expect(report.counts.usersMigrated).toBe(1);
    // Recreated with a valid schedule from legacy.
    const restored = await syncStorage
      .db()
      .collection(SYNC_COLLECTIONS.events)
      .findOne({ providerEventId: "gcal-single-1" });
    expect(restored).not.toBeNull();
    expect(restored?.schedule?.end > restored?.schedule?.start).toBe(true);
  });

  it("links each calendar's exception to its own calendar's series master when the same Google event id recurs on two calendars", async () => {
    // A recurring Google event can carry the same opaque event id on two of a
    // user's calendars (e.g. one they organize and a shared copy). The master
    // cache used to key on providerEventId alone, so calendar B's exception
    // would silently borrow calendar A's master and collide on the
    // series_exception_identity unique index.
    const userId = new ObjectId();
    const calendarAId = new ObjectId();
    const calendarBId = new ObjectId();

    await mongoService.user.insertOne({
      _id: userId,
      email: "dual-calendar@example.com",
      firstName: "Dual",
      lastName: "Calendar",
      name: "Dual Calendar",
      locale: "en",
      google: {
        googleId: "google-subject-dual",
        picture: "",
        gRefreshToken: "legacy-refresh-token",
      },
    });

    const makeCalendar = (id: ObjectId, gCalendarId: string, name: string) => ({
      _id: id,
      userId,
      name,
      description: "",
      timeZone: "America/Denver",
      foregroundColor: "#000000",
      backgroundColor: "#4285f4",
      access: "owner" as const,
      isPrimary: false,
      isVisible: true,
      isActive: true,
      source: {
        provider: "google" as const,
        calendarId: gCalendarId,
        etag: "e",
      },
      createdAt: NOW,
      updatedAt: null,
    });
    await mongoService.calendar.insertMany([
      makeCalendar(calendarAId, "calendar-a@gmail.com", "Calendar A"),
      makeCalendar(calendarBId, "calendar-b@gmail.com", "Calendar B"),
    ]);

    const makeSeries = (calendarId: ObjectId, label: string) => {
      const masterId = new ObjectId();
      return [
        {
          _id: masterId,
          calendarId,
          content: {
            kind: "details",
            title: `${label} master`,
            description: "",
          },
          schedule: {
            kind: "timed",
            start: NOW,
            end: new Date(NOW.getTime() + 3600_000),
            timeZone: "America/Denver",
          },
          recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY"] },
          externalReference: {
            provider: "google",
            eventId: "shared-event-id",
            recurringEventId: null,
          },
          createdAt: NOW,
          updatedAt: null,
        },
        {
          _id: new ObjectId(),
          calendarId,
          content: {
            kind: "details",
            title: `${label} exception`,
            description: "",
          },
          schedule: {
            kind: "timed",
            start: new Date(NOW.getTime() + 86_400_000),
            end: new Date(NOW.getTime() + 86_400_000 + 3600_000),
            timeZone: "America/Denver",
          },
          recurrence: { kind: "occurrence", seriesId: masterId },
          externalReference: {
            provider: "google",
            eventId: `shared-event-id_${label}-exception`,
            recurringEventId: "shared-event-id",
          },
          createdAt: NOW,
          updatedAt: null,
        },
      ];
    };
    await mongoService.event.insertMany([
      ...makeSeries(calendarAId, "a"),
      ...makeSeries(calendarBId, "b"),
    ]);
    await mongoService.sync.insertOne({
      user: userId.toHexString(),
      google: {
        calendarlist: [
          {
            gCalendarId: Resource_Sync.CALENDAR,
            nextSyncToken: "cal-sync-token",
          },
        ],
        events: [],
      },
    });

    const repositories = deps();
    await migrateProviderConnections(
      {
        connections: repositories.connections,
        credentials: new CredentialRepository(syncStorage.db()),
      },
      await mongoService.user.find({}).toArray(),
      { dryRun: false, now: NOW },
    );

    const report = await migrateProviderSyncState(
      repositories,
      await loadSource(),
      { dryRun: false, now: NOW },
    );

    expect(
      report.skips.filter((s) => s.category === "unmappable_event"),
    ).toEqual([]);
    expect(
      report.skips.filter((s) => s.category === "missing_series_master"),
    ).toEqual([]);

    const syncEvents = await syncStorage
      .db()
      .collection(SYNC_COLLECTIONS.events)
      .find({})
      .toArray();
    const masters = syncEvents.filter(
      (e) => e.recurrence?.kind === "seriesMaster",
    );
    const exceptions = syncEvents.filter(
      (e) => e.recurrence?.kind === "exception",
    );
    expect(masters).toHaveLength(2);
    expect(exceptions).toHaveLength(2);

    const masterByCalendar = new Map(masters.map((m) => [m.calendarId, m]));
    for (const exception of exceptions) {
      const ownCalendarMaster = masterByCalendar.get(exception.calendarId);
      expect(ownCalendarMaster).toBeDefined();
      expect(exception.recurrence.seriesId).toBe(ownCalendarMaster!._id);
    }
    // The two calendars' masters must be distinct Sync records, not one
    // shared master borrowed across calendars.
    expect(masters[0]!._id).not.toBe(masters[1]!._id);
  });

  it("classifies an exception whose legacy series master is gone as orphan_series_instance, not missing_series_master", async () => {
    const userId = new ObjectId();
    const calendarId = new ObjectId();
    const exceptionId = new ObjectId();
    const goneSeriesId = new ObjectId(); // never inserted into mongoService.event

    await mongoService.user.insertOne({
      _id: userId,
      email: "ghost-series@example.com",
      firstName: "Ghost",
      lastName: "Series",
      name: "Ghost Series",
      locale: "en",
      google: {
        googleId: "google-subject-ghost",
        picture: "",
        gRefreshToken: "legacy-refresh-token",
      },
    });
    await mongoService.calendar.insertOne({
      _id: calendarId,
      userId,
      name: "Primary",
      description: "",
      timeZone: "America/Denver",
      foregroundColor: "#000000",
      backgroundColor: "#4285f4",
      access: "owner",
      isPrimary: true,
      isVisible: true,
      isActive: true,
      source: { provider: "google", calendarId: "primary", etag: "e" },
      createdAt: NOW,
      updatedAt: null,
    });
    await mongoService.event.insertOne({
      _id: exceptionId,
      calendarId,
      content: { kind: "details", title: "orphaned instance", description: "" },
      schedule: {
        kind: "timed",
        start: NOW,
        end: new Date(NOW.getTime() + 3600_000),
        timeZone: "America/Denver",
      },
      recurrence: { kind: "occurrence", seriesId: goneSeriesId },
      externalReference: {
        provider: "google",
        eventId: "gcal-gone-master_20260101",
        recurringEventId: "gcal-gone-master",
      },
      createdAt: NOW,
      updatedAt: null,
    });

    const repositories = deps();
    await migrateProviderConnections(
      {
        connections: repositories.connections,
        credentials: new CredentialRepository(syncStorage.db()),
      },
      await mongoService.user.find({}).toArray(),
      { dryRun: false, now: NOW },
    );

    const report = await migrateProviderSyncState(
      repositories,
      await loadSource(),
      { dryRun: false, now: NOW },
    );

    expect(
      report.skips.filter((s) => s.category === "missing_series_master"),
    ).toEqual([]);
    const orphanSkip = report.skips.find(
      (s) => s.category === "orphan_series_instance",
    );
    expect(orphanSkip?.id).toBe(exceptionId.toHexString());
    expect(orphanSkip?.detail).toContain(goneSeriesId.toHexString());
  });
});
