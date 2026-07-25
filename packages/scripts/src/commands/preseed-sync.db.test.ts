import { runPreseedSyncComposition } from "@scripts/commands/preseed-sync/preseed";
import { ObjectId } from "mongodb";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";

const NOW = new Date("2026-07-25T04:00:00.000Z");

describe("preseed-sync (db)", () => {
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

  async function seedGoogleUser() {
    const userId = new ObjectId();
    const calendarId = new ObjectId();
    const eventId = new ObjectId();

    await mongoService.user.insertOne({
      _id: userId,
      email: "preseed@example.com",
      firstName: "Pre",
      lastName: "Seed",
      name: "Pre Seed",
      locale: "en",
      google: {
        googleId: "google-subject-preseed",
        picture: "",
        gRefreshToken: "preseed-refresh",
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
        etag: "etag-preseed",
      },
      createdAt: NOW,
      updatedAt: null,
    });
    await mongoService.event.insertOne({
      _id: eventId,
      calendarId,
      content: { kind: "details", title: "linked", description: "" },
      schedule: {
        kind: "timed",
        start: NOW,
        end: new Date(NOW.getTime() + 3600_000),
        timeZone: "America/Denver",
      },
      recurrence: { kind: "single" },
      externalReference: {
        provider: "google",
        eventId: "gcal-event-1",
        recurringEventId: null,
      },
      createdAt: NOW,
      updatedAt: null,
    });

    return { userId };
  }

  async function loadCollections() {
    const [users, calendars, events, syncDocs, watches] = await Promise.all([
      mongoService.user.find({}).toArray(),
      mongoService.calendar.find({}).toArray(),
      mongoService.event.find({}).toArray(),
      mongoService.sync.find({}).toArray(),
      mongoService.watch.find({}).toArray(),
    ]);
    return { users, calendars, events, syncDocs, watches };
  }

  it("dry-run writes nothing; apply then frozen rerun converges", async () => {
    const { userId } = await seedGoogleUser();

    const dry = await runPreseedSyncComposition(
      {
        loadCollections,
        syncDb: syncStorage.db(),
        syncClient: syncStorage.client(),
      },
      {
        dryRun: true,
        mode: "live",
        phase: "all",
        now: NOW,
      },
    );

    expect(dry.report.phases.connections?.counts.wouldCreate).toBe(1);
    expect(
      await syncStorage
        .db()
        .collection(SYNC_COLLECTIONS.providerConnections)
        .countDocuments(),
    ).toBe(0);

    const sourceBefore = await mongoService.user.findOne({ _id: userId });
    expect(sourceBefore?.google?.gRefreshToken).toBe("preseed-refresh");

    const applied = await runPreseedSyncComposition(
      {
        loadCollections,
        syncDb: syncStorage.db(),
        syncClient: syncStorage.client(),
      },
      {
        dryRun: false,
        mode: "live",
        phase: "all",
        now: NOW,
      },
    );
    expect(applied.exitCode).toBe(0);
    expect(applied.report.phases.connections?.counts.created).toBe(1);
    expect(
      await syncStorage
        .db()
        .collection(SYNC_COLLECTIONS.providerConnections)
        .countDocuments(),
    ).toBe(1);

    const sourceAfter = await mongoService.user.findOne({ _id: userId });
    expect(sourceAfter?.google?.gRefreshToken).toBe("preseed-refresh");

    const frozen = await runPreseedSyncComposition(
      {
        loadCollections,
        syncDb: syncStorage.db(),
        syncClient: syncStorage.client(),
      },
      {
        dryRun: false,
        mode: "frozen",
        phase: "all",
        now: NOW,
      },
    );
    expect(frozen.exitCode).toBe(0);
    expect(frozen.report.parity.ok).toBe(true);
    expect(
      await syncStorage
        .db()
        .collection(SYNC_COLLECTIONS.providerConnections)
        .countDocuments(),
    ).toBe(1);
  });

  it("blocks when inventory finds duplicate google calendars", async () => {
    const userId = new ObjectId();
    await mongoService.user.insertOne({
      _id: userId,
      email: "dup@example.com",
      firstName: "Dup",
      lastName: "User",
      name: "Dup User",
      locale: "en",
      google: {
        googleId: "google-subject-dup",
        picture: "",
        gRefreshToken: "dup-refresh",
      },
    });
    await mongoService.calendar.insertMany([
      {
        _id: new ObjectId(),
        userId,
        name: "Primary A",
        description: "",
        timeZone: "UTC",
        foregroundColor: "#000",
        backgroundColor: "#fff",
        access: "owner",
        isPrimary: true,
        isVisible: true,
        isActive: true,
        source: { provider: "google", calendarId: "primary", etag: "a" },
        createdAt: NOW,
        updatedAt: null,
      },
      {
        _id: new ObjectId(),
        userId,
        name: "Primary B",
        description: "",
        timeZone: "UTC",
        foregroundColor: "#000",
        backgroundColor: "#fff",
        access: "owner",
        isPrimary: false,
        isVisible: true,
        isActive: true,
        source: { provider: "google", calendarId: "primary", etag: "b" },
        createdAt: NOW,
        updatedAt: null,
      },
    ]);

    const result = await runPreseedSyncComposition(
      {
        loadCollections,
        syncDb: syncStorage.db(),
        syncClient: syncStorage.client(),
      },
      {
        dryRun: true,
        mode: "live",
        phase: "inventory",
        now: NOW,
      },
    );

    expect(result.exitCode).toBe(1);
    expect(result.report.parity.ok).toBe(false);
    expect(
      result.report.parity.blockers.some(
        (b) => b.code === "inventory_duplicate",
      ),
    ).toBe(true);
  });
});
