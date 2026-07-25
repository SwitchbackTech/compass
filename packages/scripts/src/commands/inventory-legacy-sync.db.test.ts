import {
  inventoryLegacySyncData,
  loadInventoryCollections,
} from "@scripts/commands/inventory-legacy-sync/inventory";
import { ObjectId } from "mongodb";
import { Resource_Sync } from "@core/types/sync.types";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";

const NOW = new Date("2026-07-25T03:00:00.000Z");

describe("inventory-legacy-sync (db)", () => {
  beforeAll(() => setupTestDb(import.meta.url));
  afterEach(async () => {
    await cleanupCollections();
    await mongoService.user.deleteMany({});
    await mongoService.sync.deleteMany({});
  });
  afterAll(cleanupTestDb);

  it("loads a production-shaped fixture and does not write", async () => {
    const userId = new ObjectId();
    const calendarId = new ObjectId();
    const watchId = new ObjectId();

    await mongoService.user.insertOne({
      _id: userId,
      email: "fixture@example.com",
      firstName: "Fix",
      lastName: "Ture",
      name: "Fix Ture",
      locale: "en",
      google: {
        googleId: "subject-fixture",
        picture: "",
        gRefreshToken: "token-fixture",
      },
    });
    await mongoService.calendar.insertOne({
      _id: calendarId,
      userId,
      name: "Primary",
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
        etag: "etag-fixture",
      },
      createdAt: NOW,
      updatedAt: null,
    });
    await mongoService.event.insertOne({
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
        eventId: "gcal-evt-1",
        recurringEventId: null,
      },
      createdAt: NOW,
      updatedAt: null,
    });
    await mongoService.sync.insertOne({
      user: userId.toHexString(),
      google: {
        calendarlist: [
          {
            gCalendarId: Resource_Sync.CALENDAR,
            nextSyncToken: "cal-sync",
          },
        ],
        events: [{ gCalendarId: "primary", nextSyncToken: "evt-sync" }],
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

    const beforeUsers = await mongoService.user.countDocuments();
    const beforeEvents = await mongoService.event.countDocuments();
    const beforeWatches = await mongoService.watch.countDocuments();

    const collections = await loadInventoryCollections(mongoService);
    const report = inventoryLegacySyncData(collections, { now: NOW });
    const again = inventoryLegacySyncData(collections, { now: NOW });

    expect(report).toEqual(again);
    expect(report.dryRun).toBe(true);
    expect(report.source.users.total).toBe(1);
    expect(report.source.calendars.google).toBe(1);
    expect(report.source.events.linkedGoogle).toBe(1);
    expect(report.source.watches.eventWatches).toBe(1);
    expect(report.targets[0]?.tenantId).toBe(userId.toHexString());
    expect(report.targets[0]?.principalId).toBe(userId.toHexString());
    expect(report.targets[0]?.providerAccountId).toBe("subject-fixture");

    expect(await mongoService.user.countDocuments()).toBe(beforeUsers);
    expect(await mongoService.event.countDocuments()).toBe(beforeEvents);
    expect(await mongoService.watch.countDocuments()).toBe(beforeWatches);
  });

  it("flags residual nested watch fields on sync documents", async () => {
    const userId = new ObjectId();
    await mongoService.user.insertOne({
      _id: userId,
      email: "legacy@example.com",
      firstName: "L",
      lastName: "G",
      name: "L G",
      locale: "en",
      google: {
        googleId: "subject-legacy",
        picture: "",
        gRefreshToken: "token",
      },
    });
    await mongoService.sync.insertOne({
      user: userId.toHexString(),
      google: {
        calendarlist: [],
        events: [
          {
            gCalendarId: "primary",
            nextSyncToken: "tok",
            channelId: "507f1f77bcf86cd799439099",
            resourceId: "legacy-resource",
            expiration: String(NOW.getTime() + 1000),
          } as never,
        ],
      },
    });

    const report = inventoryLegacySyncData(
      await loadInventoryCollections(mongoService),
      { now: NOW },
    );

    expect(report.skips.some((s) => s.category === "legacy_nested_watch")).toBe(
      true,
    );
  });
});
