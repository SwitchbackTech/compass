import { faker } from "@faker-js/faker";
import { Resource_Sync } from "@core/types/sync.types";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import {
  deleteWatchData,
  getGCalEventsSyncPageToken,
  getSync,
  updateSync,
} from "@backend/sync/util/sync.queries";

describe("sync.queries: ", () => {
  describe("nextPageToken", () => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    it("returns undefined when token not found", async () => {
      const { user } = await UtilDriver.setupTestUser();

      await expect(
        getGCalEventsSyncPageToken(user._id.toString(), "missing-cal"),
      ).resolves.toBeUndefined();
    });
  });

  describe("getSync", () => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    it("should get sync data by userId", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const calendarId = faker.string.uuid();
      const channelId = faker.string.uuid();
      const resourceId = faker.string.uuid();

      await Promise.all([
        updateSync(Resource_Sync.CALENDAR, userId, calendarId),
        updateSync(Resource_Sync.EVENTS, userId, calendarId, {
          channelId,
          resourceId,
        }),
      ]);

      const sync = await getSync({ userId });

      expect(sync).toEqual(
        expect.objectContaining({
          user: userId,
          google: {
            calendarlist: [
              {
                gCalendarId: calendarId,
                lastSyncedAt: expect.any(Date),
              },
            ],
            events: [
              {
                gCalendarId: calendarId,
                channelId,
                resourceId,
                lastSyncedAt: expect.any(Date),
              },
            ],
          },
        }),
      );
    });

    it("should get sync data by userId and gCalendarId - calendarlist", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const calendarId = faker.string.uuid();
      const channelId = faker.string.uuid();
      const resourceId = faker.string.uuid();

      await Promise.all([
        updateSync(Resource_Sync.CALENDAR, userId, calendarId),
        updateSync(Resource_Sync.EVENTS, userId, calendarId, {
          channelId,
          resourceId,
        }),
      ]);

      const sync = await getSync({
        userId,
        gCalendarId: calendarId,
        resource: Resource_Sync.CALENDAR,
      });

      expect(sync).toEqual(
        expect.objectContaining({
          user: userId,
          google: {
            calendarlist: [
              {
                gCalendarId: calendarId,
                lastSyncedAt: expect.any(Date),
              },
            ],
            events: [
              {
                gCalendarId: calendarId,
                channelId,
                resourceId,
                lastSyncedAt: expect.any(Date),
              },
            ],
          },
        }),
      );
    });

    it("should get sync data by channelId - events", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const calendarId = faker.string.uuid();
      const channelId = faker.string.uuid();
      const resourceId = faker.string.uuid();

      await Promise.all([
        updateSync(Resource_Sync.CALENDAR, userId, calendarId),
        updateSync(Resource_Sync.EVENTS, userId, calendarId, {
          channelId,
          resourceId,
        }),
      ]);

      const sync = await getSync({ channelId });

      expect(sync).toEqual(
        expect.objectContaining({
          user: userId,
          google: {
            calendarlist: [
              {
                gCalendarId: calendarId,
                lastSyncedAt: expect.any(Date),
              },
            ],
            events: [
              {
                gCalendarId: calendarId,
                channelId,
                resourceId,
                lastSyncedAt: expect.any(Date),
              },
            ],
          },
        }),
      );
    });

    it("should get sync data by channelId and resourceId - events", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const calendarId = faker.string.uuid();
      const channelId = faker.string.uuid();
      const resourceId = faker.string.uuid();

      await Promise.all([
        updateSync(Resource_Sync.CALENDAR, userId, calendarId),
        updateSync(Resource_Sync.EVENTS, userId, calendarId, {
          channelId,
          resourceId,
        }),
      ]);

      const sync = await getSync({ channelId, resourceId });

      expect(sync).toEqual(
        expect.objectContaining({
          user: userId,
          google: {
            calendarlist: [
              {
                gCalendarId: calendarId,
                lastSyncedAt: expect.any(Date),
              },
            ],
            events: [
              {
                gCalendarId: calendarId,
                channelId,
                resourceId,
                lastSyncedAt: expect.any(Date),
              },
            ],
          },
        }),
      );
    });

    it("should get sync data by channelId, resourceId and gCalendarId - events", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const calendarId = faker.string.uuid();
      const channelId = faker.string.uuid();
      const resourceId = faker.string.uuid();

      await Promise.all([
        updateSync(Resource_Sync.CALENDAR, userId, calendarId),
        updateSync(Resource_Sync.EVENTS, userId, calendarId, {
          channelId,
          resourceId,
        }),
      ]);

      const sync = await getSync({
        channelId,
        resourceId,
        gCalendarId: calendarId,
      });

      expect(sync).toEqual(
        expect.objectContaining({
          user: userId,
          google: {
            calendarlist: [
              {
                gCalendarId: calendarId,
                lastSyncedAt: expect.any(Date),
              },
            ],
            events: [
              {
                gCalendarId: calendarId,
                channelId,
                resourceId,
                lastSyncedAt: expect.any(Date),
              },
            ],
          },
        }),
      );
    });
  });

  describe("updateSync", () => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    it("should upsert sync data if not populated - calendarlist", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const calendarId = faker.string.uuid();
      const existingSync = await getSync({ userId });

      expect(existingSync).toBeNull();

      await updateSync(Resource_Sync.CALENDAR, userId, calendarId);

      const sync = await getSync({ userId });

      expect(sync).toEqual(
        expect.objectContaining({
          user: userId,
          google: {
            calendarlist: [
              {
                gCalendarId: calendarId,
                lastSyncedAt: expect.any(Date),
              },
            ],
          },
        }),
      );
    });

    it("should upsert sync data if not populated - events", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const calendarId = faker.string.uuid();
      const existingSync = await getSync({ userId });

      expect(existingSync).toBeNull();

      await updateSync(Resource_Sync.EVENTS, userId, calendarId);

      const sync = await getSync({ userId });

      expect(sync).toEqual(
        expect.objectContaining({
          user: userId,
          google: {
            events: [
              {
                gCalendarId: calendarId,
                lastSyncedAt: expect.any(Date),
              },
            ],
          },
        }),
      );
    });

    it("should update sync data - events", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const calendarId = faker.string.uuid();
      const nextSyncToken = faker.string.uuid();
      const nextPageToken = faker.string.uuid();

      await updateSync(Resource_Sync.EVENTS, userId, calendarId);

      const existingSync = await getSync({ userId });

      expect(existingSync).toEqual(
        expect.objectContaining({
          user: userId,
          google: {
            events: [
              {
                gCalendarId: calendarId,
                lastSyncedAt: expect.any(Date),
              },
            ],
          },
        }),
      );

      expect(existingSync?.google.events[0]?.nextSyncToken).toBeUndefined();
      expect(existingSync?.google.events[0]?.nextPageToken).toBeUndefined();

      await updateSync(Resource_Sync.EVENTS, userId, calendarId, {
        nextSyncToken,
        nextPageToken,
      });

      const sync = await getSync({ userId });

      expect(sync).toEqual(
        expect.objectContaining({
          user: userId,
          google: {
            events: [
              {
                gCalendarId: calendarId,
                lastSyncedAt: expect.any(Date),
                nextSyncToken,
                nextPageToken,
              },
            ],
          },
        }),
      );
    });
  });

  describe("deleteWatchData", () => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    it("should delete watch data - calendarlist", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const calendarId = faker.string.uuid();

      await updateSync(Resource_Sync.CALENDAR, userId, calendarId);

      const sync = await getSync({ userId });

      expect(sync?.google.events).toBeUndefined();

      expect(sync).toEqual(
        expect.objectContaining({
          user: userId,
          google: {
            calendarlist: [
              {
                gCalendarId: calendarId,
                lastSyncedAt: expect.any(Date),
              },
            ],
          },
        }),
      );

      await deleteWatchData({
        [Resource_Sync.CALENDAR]: { userId, gCalendarId: calendarId },
      });

      const updatedSync = await getSync({ userId });

      expect(updatedSync?.google.events).toBeUndefined();

      expect(updatedSync).toEqual(
        expect.objectContaining({
          user: userId,
          google: {
            calendarlist: [
              expect.objectContaining({
                gCalendarId: calendarId,
                lastSyncedAt: expect.any(Date),
              }),
            ],
          },
        }),
      );
    });

    it("should delete watch data - events", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const calendarId = faker.string.uuid();
      const channelId = faker.string.uuid();
      const resourceId = faker.string.uuid();

      await updateSync(Resource_Sync.EVENTS, userId, calendarId, {
        channelId,
        resourceId,
      });

      const sync = await getSync({ userId });

      expect(sync?.google.calendarlist).toBeUndefined();

      expect(sync).toEqual(
        expect.objectContaining({
          user: userId,
          google: {
            events: [
              {
                gCalendarId: calendarId,
                channelId,
                resourceId,
                lastSyncedAt: expect.any(Date),
              },
            ],
          },
        }),
      );

      await deleteWatchData({
        [Resource_Sync.EVENTS]: { channelId, resourceId },
      });

      const updatedSync = await getSync({ userId });

      expect(updatedSync?.google.calendarlist).toBeUndefined();

      expect(updatedSync).toEqual(
        expect.objectContaining({
          user: userId,
          google: {
            events: [
              expect.objectContaining({
                gCalendarId: calendarId,
                resourceId,
                lastSyncedAt: expect.any(Date),
              }),
            ],
          },
        }),
      );
    });
  });
});
