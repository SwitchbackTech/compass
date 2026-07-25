import { migrateProviderConnections } from "@scripts/commands/migrate-connections/migrate";
import { migratePendingCompassIntent } from "@scripts/commands/migrate-pending-intent/migrate";
import { migrateProviderSyncState } from "@scripts/commands/migrate-provider-state/migrate";
import { ObjectId } from "mongodb";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { CommandRepository } from "@sync/storage/repositories/command.repository";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";

const NOW = new Date("2026-07-25T04:00:00.000Z");

describe("migrate-pending-intent (db)", () => {
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
      commands: new CommandRepository(db),
      resources: new SyncResourceRepository(db),
      credentials: new CredentialRepository(db),
    };
  }

  async function seedPasswordUserWithLocalDraft() {
    const userId = new ObjectId();
    const localCalendarId = new ObjectId();
    const googleCalendarId = new ObjectId();
    const draftId = new ObjectId();

    await mongoService.user.insertOne({
      _id: userId,
      email: "password@example.com",
      firstName: "Pass",
      lastName: "Word",
      name: "Pass Word",
      locale: "en",
      google: {
        googleId: "google-subject-1556",
        picture: "",
        gRefreshToken: "refresh-1556",
      },
    });
    await mongoService.calendar.insertMany([
      {
        _id: localCalendarId,
        userId,
        name: "Compass",
        description: "",
        timeZone: "America/Denver",
        foregroundColor: "#000000",
        backgroundColor: "#ffffff",
        access: "owner",
        isPrimary: true,
        isVisible: true,
        isActive: true,
        source: { provider: "local" },
        createdAt: NOW,
        updatedAt: null,
      },
      {
        _id: googleCalendarId,
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
          etag: "etag-1",
        },
        createdAt: NOW,
        updatedAt: null,
      },
    ]);
    await mongoService.event.insertOne({
      _id: draftId,
      calendarId: localCalendarId,
      content: { kind: "details", title: "pre-google draft", description: "" },
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
    });

    return { userId, draftId, googleCalendarId };
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

  it("#1556: put unlinked draft + pending create; rerun is idempotent", async () => {
    const { userId, draftId } = await seedPasswordUserWithLocalDraft();
    const repositories = deps();
    const source = await loadSource();

    await migrateProviderConnections(
      {
        connections: repositories.connections,
        credentials: repositories.credentials,
      },
      source.users,
      { dryRun: false, now: NOW },
    );
    await migrateProviderSyncState(
      {
        connections: repositories.connections,
        calendars: repositories.calendars,
        events: repositories.events,
        occurrences: repositories.occurrences,
        resources: repositories.resources,
      },
      source,
      { dryRun: false, now: NOW },
    );

    const first = await migratePendingCompassIntent(
      {
        connections: repositories.connections,
        calendars: repositories.calendars,
        events: repositories.events,
        occurrences: repositories.occurrences,
        commands: repositories.commands,
      },
      source,
      { dryRun: false, now: NOW },
    );

    expect(first.counts.eventsCreated).toBe(1);
    expect(first.counts.commandsCreated).toBe(1);
    expect(first.users[0]?.targetCalendarId).toMatch(/^[0-9a-f]{24}$/);

    const stored = await repositories.events.findById(
      userId.toHexString() as never,
      userId.toHexString() as never,
      draftId.toHexString() as never,
    );
    expect(stored?.origin).toBe("compass");
    expect(stored?.providerEventId).toBeNull();
    expect(stored?.content.title).toBe("pre-google draft");

    const commands = await syncStorage
      .db()
      .collection(SYNC_COLLECTIONS.commands)
      .find({})
      .toArray();
    expect(commands).toHaveLength(1);
    expect(commands[0]?.idempotencyKey).toBe(`create:${draftId.toHexString()}`);
    expect(commands[0]?.outcome.state).toBe("pending");
    expect(commands[0]?.input.calendarId).toBe(
      first.users[0]?.targetCalendarId,
    );

    const second = await migratePendingCompassIntent(
      {
        connections: repositories.connections,
        calendars: repositories.calendars,
        events: repositories.events,
        occurrences: repositories.occurrences,
        commands: repositories.commands,
      },
      source,
      { dryRun: false, now: NOW },
    );
    expect(second.counts.eventsUpdated).toBe(1);
    expect(second.counts.eventsCreated).toBe(0);
    expect(second.counts.commandsAlreadyPresent).toBe(1);
    expect(second.counts.commandsCreated).toBe(0);
    expect(
      await syncStorage
        .db()
        .collection(SYNC_COLLECTIONS.commands)
        .countDocuments(),
    ).toBe(1);
    expect(await mongoService.event.countDocuments()).toBe(1);
  });

  it("does not mirror already provider-linked legacy events", async () => {
    const { userId, googleCalendarId } = await seedPasswordUserWithLocalDraft();
    await mongoService.event.insertOne({
      _id: new ObjectId(),
      calendarId: googleCalendarId,
      content: { kind: "details", title: "already linked", description: "" },
      schedule: {
        kind: "timed",
        start: NOW,
        end: new Date(NOW.getTime() + 1800_000),
        timeZone: "America/Denver",
      },
      recurrence: { kind: "single" },
      externalReference: {
        provider: "google",
        eventId: "gcal-linked",
        recurringEventId: null,
      },
      createdAt: NOW,
      updatedAt: null,
    });

    const repositories = deps();
    const source = await loadSource();
    await migrateProviderConnections(
      {
        connections: repositories.connections,
        credentials: repositories.credentials,
      },
      source.users,
      { dryRun: false, now: NOW },
    );
    await migrateProviderSyncState(
      {
        connections: repositories.connections,
        calendars: repositories.calendars,
        events: repositories.events,
        occurrences: repositories.occurrences,
        resources: repositories.resources,
      },
      source,
      { dryRun: false, now: NOW },
    );

    const report = await migratePendingCompassIntent(
      {
        connections: repositories.connections,
        calendars: repositories.calendars,
        events: repositories.events,
        occurrences: repositories.occurrences,
        commands: repositories.commands,
      },
      source,
      { dryRun: false, now: NOW },
    );

    expect(
      report.skips.some((s) => s.category === "already_provider_linked"),
    ).toBe(true);
    expect(
      await syncStorage.db().collection(SYNC_COLLECTIONS.events).findOne({
        tenantId: userId.toHexString(),
        "content.title": "already linked",
        origin: "compass",
        providerEventId: null,
      }),
    ).toBeNull();
  });
});
