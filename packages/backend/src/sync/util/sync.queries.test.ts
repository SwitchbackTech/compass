import { faker } from "@faker-js/faker";
import { Resource_Sync } from "@core/types/sync.types";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import calendarService from "@backend/calendar/services/calendar.service";
import {
  getGCalEventsSyncPageToken,
  getSync,
  updateSync,
} from "@backend/sync/util/sync.queries";
import userService from "@backend/user/services/user.service";
import mongoService from "../../common/services/mongo.service";

describe("sync.queries: ", () => {
  describe("nextPageToken", () => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    it("returns undefined when token not found", async () => {
      const user = await AuthDriver.googleSignup();

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
      const user = await AuthDriver.googleSignup();
      const userId = user._id.toString();
      const calendars = await calendarService.getAllByUser(user._id);

      await userService.restartGoogleCalendarSync(user._id);

      const sync = await getSync({ user: userId });

      expect(sync).toEqual(
        expect.objectContaining({
          user: userId,
          google: {
            calendarlist: expect.arrayContaining([
              expect.objectContaining({
                gCalendarId: Resource_Sync.CALENDAR,
                lastSyncedAt: expect.any(Date),
                nextPageToken: null,
                nextSyncToken: expect.any(String),
              }),
            ]),
            events: expect.arrayContaining(
              calendars.map((cal) =>
                expect.objectContaining({
                  gCalendarId: cal.metadata.id,
                  lastSyncedAt: expect.any(Date),
                  nextPageToken: null,
                  nextSyncToken: expect.any(String),
                }),
              ),
            ),
          },
        }),
      );
    });

    it("should get sync data by userId and gCalendarId and watch resource - calendarlist", async () => {
      const user = await AuthDriver.googleSignup();
      const userId = user._id.toString();
      const calendars = await calendarService.getAllByUser(user._id);

      await userService.restartGoogleCalendarSync(user._id);

      const sync = await getSync({
        user: userId,
        gCalendarId: Resource_Sync.CALENDAR,
        resource: Resource_Sync.CALENDAR,
      });

      expect(sync).toEqual(
        expect.objectContaining({
          user: userId,
          google: {
            calendarlist: expect.arrayContaining([
              expect.objectContaining({
                gCalendarId: Resource_Sync.CALENDAR,
                lastSyncedAt: expect.any(Date),
                nextPageToken: null,
                nextSyncToken: expect.any(String),
              }),
            ]),
            events: expect.arrayContaining(
              calendars.map((cal) =>
                expect.objectContaining({
                  gCalendarId: cal.metadata.id,
                  lastSyncedAt: expect.any(Date),
                  nextPageToken: null,
                  nextSyncToken: expect.any(String),
                }),
              ),
            ),
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
      const user = await AuthDriver.googleSignup();
      const userId = user._id.toString();

      await mongoService.sync.deleteOne({ user: userId });

      const existingSync = await getSync({ user: userId });

      expect(existingSync).toBeNull();

      await updateSync(Resource_Sync.CALENDAR, userId, Resource_Sync.CALENDAR);

      const sync = await getSync({ user: userId });

      expect(sync).toEqual(
        expect.objectContaining({
          user: userId,
          google: {
            calendarlist: [
              {
                gCalendarId: Resource_Sync.CALENDAR,
                lastSyncedAt: expect.any(Date),
              },
            ],
          },
        }),
      );
    });

    it("should upsert sync data if not populated - events", async () => {
      const user = await AuthDriver.googleSignup();
      const calendars = await calendarService.getAllByUser(user._id);
      const userId = user._id.toString();
      const calendar = faker.helpers.arrayElement(calendars);

      await mongoService.sync.deleteOne({ user: userId });

      const existingSync = await getSync({ user: userId });

      expect(existingSync).toBeNull();

      await updateSync(Resource_Sync.EVENTS, userId, calendar.metadata.id);

      const sync = await getSync({ user: userId });

      expect(sync).toEqual(
        expect.objectContaining({
          user: userId,
          google: {
            events: [
              {
                gCalendarId: calendar.metadata.id,
                lastSyncedAt: expect.any(Date),
              },
            ],
          },
        }),
      );
    });

    it("should update sync data - events", async () => {
      const user = await AuthDriver.googleSignup();
      const calendars = await calendarService.getAllByUser(user._id);
      const userId = user._id.toString();
      const calendar = faker.helpers.arrayElement(calendars);
      const nextSyncToken = faker.string.uuid();
      const nextPageToken = faker.string.uuid();

      await mongoService.sync.deleteOne({ user: userId });

      await updateSync(Resource_Sync.EVENTS, userId, calendar.metadata.id);

      const existingSync = await getSync({ user: userId });

      expect(existingSync).toEqual(
        expect.objectContaining({
          user: userId,
          google: {
            events: [
              {
                gCalendarId: calendar.metadata.id,
                lastSyncedAt: expect.any(Date),
              },
            ],
          },
        }),
      );

      expect(existingSync?.google?.events[0]?.nextSyncToken).toBeUndefined();
      expect(existingSync?.google?.events[0]?.nextPageToken).toBeUndefined();

      await updateSync(Resource_Sync.EVENTS, userId, calendar.metadata.id, {
        nextSyncToken,
        nextPageToken,
      });

      const sync = await getSync({ user: userId });

      expect(sync).toEqual(
        expect.objectContaining({
          user: userId,
          google: {
            events: [
              {
                gCalendarId: calendar.metadata.id,
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
