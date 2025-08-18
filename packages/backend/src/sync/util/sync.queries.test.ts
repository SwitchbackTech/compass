import { faker } from "@faker-js/faker";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import {
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

      await updateSync("calendarlist", userId, calendarId);

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

      await updateSync("events", userId, calendarId);

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

      await updateSync("events", userId, calendarId);

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

      await updateSync("events", userId, calendarId, {
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
});
