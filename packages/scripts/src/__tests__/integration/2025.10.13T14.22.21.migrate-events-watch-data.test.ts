import { faker } from "@faker-js/faker";
import Migration from "@scripts/migrations/2025.10.13T14.22.21.migrate-events-watch-data";
import { Schema_Sync } from "@core/types/sync.types";
import { Watch } from "@core/types/watch.types";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";

describe("2025.10.13T14.22.21.migrate-events-watch-data", () => {
  const migration = new Migration();

  beforeAll(setupTestDb);
  beforeEach(async () => {
    await cleanupCollections();
    // Ensure watch collection is clean between tests
    try {
      await mongoService.watch.deleteMany({});
    } catch {
      // Collection might not exist yet, which is fine
    }
  });
  afterAll(cleanupTestDb);

  function createSyncDocWithEventsWatch(
    userId: string,
    eventsCount = 2,
  ): Schema_Sync {
    const events = Array.from({ length: eventsCount }, () => ({
      gCalendarId: faker.string.uuid(),
      channelId: faker.string.uuid(),
      resourceId: faker.string.alphanumeric(20),
      expiration: Date.now().toString(), // Google Calendar expiration in ms
      nextSyncToken: faker.string.alphanumeric(32),
      lastRefreshedAt: faker.date.recent(),
      lastSyncedAt: faker.date.recent(),
    }));

    return {
      user: userId,
      google: {
        calendarlist: [
          {
            gCalendarId: faker.string.uuid(),
            nextSyncToken: faker.string.alphanumeric(32),
            lastSyncedAt: faker.date.recent(),
          },
        ],
        events,
      },
    };
  }

  function createSyncDocWithoutEvents(userId: string): Schema_Sync {
    return {
      user: userId,
      google: {
        calendarlist: [
          {
            gCalendarId: faker.string.uuid(),
            nextSyncToken: faker.string.alphanumeric(32),
            lastSyncedAt: faker.date.recent(),
          },
        ],
        events: [],
      },
    };
  }

  it("migrates events watch data from sync to watch collection", async () => {
    const userId = faker.database.mongodbObjectId();
    const syncDoc = createSyncDocWithEventsWatch(userId, 3);

    // Insert sync document
    await mongoService.sync.insertOne(syncDoc);

    // Verify no watch data exists initially
    const watchCountBefore = await mongoService.watch.countDocuments();
    expect(watchCountBefore).toBe(0);

    // Run migration
    await migration.up();

    // Verify watch data was created
    const watchDocs = await mongoService.watch.find({ userId }).toArray();
    expect(watchDocs).toHaveLength(3);

    // Verify each watch document has correct data
    for (let i = 0; i < watchDocs.length; i++) {
      const watchDoc = watchDocs[i];
      const originalEvent = syncDoc.google.events[i];

      expect(watchDoc).toEqual(
        expect.objectContaining({
          _id: originalEvent.channelId,
          userId: syncDoc.user,
          resourceId: originalEvent.resourceId,
          expiration: new Date(parseInt(originalEvent.expiration)),
          createdAt: expect.any(Date),
        }),
      );
    }

    // Verify original sync data is unchanged
    const syncAfter = await mongoService.sync.findOne({ user: userId });
    expect(syncAfter?.google.events).toHaveLength(3);
    expect(syncAfter?.google.events[0].channelId).toBe(
      syncDoc.google.events[0].channelId,
    );
  });

  it("handles multiple users with events watch data", async () => {
    const user1 = faker.database.mongodbObjectId();
    const user2 = faker.database.mongodbObjectId();

    const syncDoc1 = createSyncDocWithEventsWatch(user1, 2);
    const syncDoc2 = createSyncDocWithEventsWatch(user2, 1);

    // Insert sync documents
    await mongoService.sync.insertMany([syncDoc1, syncDoc2]);

    // Run migration
    await migration.up();

    // Verify watch data for both users
    const user1Watches = await mongoService.watch
      .find({ userId: user1 })
      .toArray();
    const user2Watches = await mongoService.watch
      .find({ userId: user2 })
      .toArray();

    expect(user1Watches).toHaveLength(2);
    expect(user2Watches).toHaveLength(1);
  });

  it("skips users without events watch data", async () => {
    const userId = faker.database.mongodbObjectId();
    const syncDoc = createSyncDocWithoutEvents(userId);

    // Insert sync document without events
    await mongoService.sync.insertOne(syncDoc);

    // Run migration
    await migration.up();

    // Verify no watch data was created for this user
    const watchCount = await mongoService.watch.countDocuments({ userId });
    expect(watchCount).toBe(0);
  });

  it("handles duplicate channel IDs gracefully", async () => {
    const userId = faker.database.mongodbObjectId();
    const channelId = faker.string.uuid();

    // Create watch document first
    const existingWatch: Watch = {
      _id: channelId,
      userId,
      resourceId: faker.string.alphanumeric(20),
      expiration: faker.date.future(),
      createdAt: faker.date.recent(),
    };
    await mongoService.watch.insertOne(existingWatch);

    // Create sync document with same channel ID
    const syncDoc = createSyncDocWithEventsWatch(userId, 1);
    syncDoc.google.events[0].channelId = channelId; // Use existing channel ID

    await mongoService.sync.insertOne(syncDoc);

    // Run migration
    await migration.up();

    // Verify only one watch document exists (duplicate was skipped)
    const watchDocs = await mongoService.watch
      .find({ _id: channelId })
      .toArray();
    expect(watchDocs).toHaveLength(1);

    // Original watch document should be unchanged
    expect(watchDocs[0]._id).toBe(existingWatch._id);
    expect(watchDocs[0].resourceId).toBe(existingWatch.resourceId);
  });

  it("handles invalid expiration dates gracefully", async () => {
    const userId = faker.database.mongodbObjectId();
    const syncDoc = createSyncDocWithEventsWatch(userId, 2);

    // Make one expiration invalid
    syncDoc.google.events[0].expiration = "invalid-date";

    await mongoService.sync.insertOne(syncDoc);

    // Run migration
    await migration.up();

    // Verify only valid watch data was migrated
    const watchDocs = await mongoService.watch.find({ userId }).toArray();
    expect(watchDocs).toHaveLength(1); // Only the valid one

    // Verify it's the second event (first had invalid expiration)
    expect(watchDocs[0]._id).toBe(syncDoc.google.events[1].channelId);
  });

  it("handles incomplete watch data gracefully", async () => {
    const userId = faker.database.mongodbObjectId();
    const syncDoc = createSyncDocWithEventsWatch(userId, 2);

    // Make one event incomplete
    delete (syncDoc.google.events[0] as any).channelId;

    await mongoService.sync.insertOne(syncDoc);

    // Run migration
    await migration.up();

    // Verify only complete watch data was migrated
    const watchDocs = await mongoService.watch.find({ userId }).toArray();
    expect(watchDocs).toHaveLength(1); // Only the complete one

    // Verify it's the second event (first was incomplete)
    expect(watchDocs[0]._id).toBe(syncDoc.google.events[1].channelId);
  });

  it("is non-destructive - does not modify watch collection on down", async () => {
    // Setup some watch data
    const watch: Watch = {
      _id: faker.string.uuid(),
      userId: faker.database.mongodbObjectId(),
      resourceId: faker.string.alphanumeric(20),
      expiration: faker.date.future(),
      createdAt: faker.date.recent(),
    };

    await mongoService.watch.insertOne(watch);

    // Run down migration
    await migration.down();

    // Verify watch data is unchanged
    const watchAfter = await mongoService.watch.findOne({ _id: watch._id });
    expect(watchAfter).toEqual(watch);
  });
});
