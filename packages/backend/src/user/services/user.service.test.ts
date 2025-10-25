import { faker } from "@faker-js/faker";
import { CompassCalendarSchema } from "@core/types/calendar.types";
import { SyncDriver } from "@backend/__tests__/drivers/sync.driver";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import calendarService from "@backend/calendar/services/calendar.service";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";
import eventService from "@backend/event/services/event.service";
import priorityService from "@backend/priority/services/priority.service";
import userService from "@backend/user/services/user.service";
import { CalendarProvider } from "../../../../core/src/types/event.types";
import { EmailDriver } from "../../__tests__/drivers/email.driver";

describe("UserService", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  describe("createUser", () => {
    it("persists a new compass user with Google data", async () => {
      const gUser = UserDriver.generateGoogleUser();
      const refreshToken = faker.string.uuid();

      const { userId } = await userService.createUser(gUser, refreshToken);
      const storedUser = await mongoService.user.findOne({
        _id: mongoService.objectId(userId),
      });

      expect(storedUser).toEqual(
        expect.objectContaining({
          email: gUser.email,
          google: expect.objectContaining({
            gRefreshToken: refreshToken,
          }),
        }),
      );
    });
  });

  describe("deleteCompassDataForUser", () => {
    it("removes all compass data and deletes the user", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const storedUser = await mongoService.user.findOne({ _id: user._id });

      expect(storedUser).toBeDefined();
      expect(storedUser).not.toBeNull();

      await priorityService.createDefaultPriorities(userId);
      await eventService.createDefaultSomedays(userId);
      await SyncDriver.createSync(storedUser!, true);
      await userService.startGoogleCalendarSync(userId);

      const summary = await userService.deleteCompassDataForUser(userId, false);

      expect(summary).toEqual(
        expect.objectContaining({
          priorities: expect.any(Number),
          calendars: expect.any(Number),
          events: expect.any(Number),
          syncs: expect.any(Number),
          user: 1,
        }),
      );

      expect(await mongoService.user.findOne({ _id: user._id })).toBeNull();
      expect(
        await mongoService.calendar.countDocuments({ user: user._id }),
      ).toBe(0);
      expect(await mongoService.event.countDocuments({ user: userId })).toBe(0);
      expect(await mongoService.sync.findOne({ user: userId })).toBeNull();
    });
  });

  describe("deleteUser", () => {
    it("removes the user document", async () => {
      const user = await UserDriver.createUser();

      const result = await userService.deleteUser(user._id.toString());

      expect(result.deletedCount).toBe(1);
      expect(await mongoService.user.findOne({ _id: user._id })).toBeNull();
    });
  });

  describe("initUserData", () => {
    it("creates the compass user with default resources", async () => {
      const gUser = UserDriver.generateGoogleUser();

      EmailDriver.mockEmailServiceResponse();

      const { userId } = await userService.initUserData(
        gUser,
        faker.internet.jwt(),
      );

      const storedUser = await mongoService.user.findOne({
        _id: mongoService.objectId(userId),
      });

      expect(storedUser).toBeTruthy();

      const priorities = await mongoService.priority
        .find({ user: userId })
        .toArray();
      expect(priorities.length).toBeGreaterThan(0);

      const somedayEvents = await mongoService.event
        .find({ user: userId, isSomeday: true })
        .toArray();
      expect(somedayEvents.length).toBeGreaterThan(0);
    });
  });

  describe("saveTimeFor", () => {
    it("updates the requested timestamp field", async () => {
      const gUser = UserDriver.generateGoogleUser();
      const { userId } = await userService.createUser(
        gUser,
        faker.string.uuid(),
      );

      await userService.saveTimeFor("lastLoggedInAt", userId);

      const updatedUser = await mongoService.user.findOne({
        _id: mongoService.objectId(userId),
      });

      expect(updatedUser?.lastLoggedInAt).toBeInstanceOf(Date);
    });
  });

  describe("startGoogleCalendarSync", () => {
    it("initializes calendars, events, and sync metadata", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      await userService.startGoogleCalendarSync(userId);

      const calendars = await calendarService.getByUser(userId);
      expect(calendars.length).toBeGreaterThan(0);

      const syncRecord = await mongoService.sync.findOne({ user: userId });
      expect(syncRecord?.google?.events?.length ?? 0).toBeGreaterThan(0);

      const eventCount = await mongoService.event.countDocuments({
        user: userId,
      });
      expect(eventCount).toBeGreaterThan(0);
    });
  });

  describe("stopGoogleCalendarSync", () => {
    it("cleans up google calendars, events, and sync records", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      await userService.startGoogleCalendarSync(userId);

      const calendars = await calendarService.getByUser(userId);

      expect(calendars.length).toBeGreaterThan(0);

      expect(
        calendars.map((calendar) => CompassCalendarSchema.safeParse(calendar)),
      ).toEqual(
        expect.arrayContaining(
          calendars.map(() => expect.objectContaining({ success: true })),
        ),
      );

      await userService.stopGoogleCalendarSync(userId);

      const sync = await mongoService.sync.findOne({ user: userId });

      expect(
        await mongoService.calendar.countDocuments({
          user: mongoService.objectId(userId),
        }),
      ).toBe(calendars.length);

      expect(await mongoService.event.countDocuments({ user: userId })).toBe(0);
      expect(await mongoService.watch.countDocuments({ user: userId })).toBe(0);
      expect(sync?.user).toBe(userId);
      expect(sync).not.toHaveProperty(CalendarProvider.GOOGLE);
    });
  });

  describe("restartGoogleCalendarSync", () => {
    it("restarts the import workflow and completes successfully", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();

      await userService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "restart" } },
      });

      await userService.restartGoogleCalendarSync(userId);

      const metadata = await userService.fetchUserMetadata(userId);
      expect(metadata.sync?.importGCal).toBe("completed");

      const calendars = await calendarService.getByUser(userId);
      expect(calendars.length).toBeGreaterThan(0);
    });
  });

  describe("updateUserMetadata", () => {
    it("merges metadata and returns the latest snapshot", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      const metadata = await userService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "restart" } },
      });

      expect(metadata.sync?.importGCal).toBe("restart");

      const persisted = await userService.fetchUserMetadata(userId);

      expect(persisted.sync?.importGCal).toBe("restart");
    });
  });

  describe("fetchUserMetadata", () => {
    it("retrieves stored metadata for the user", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      await userService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "restart" } },
      });

      const metadata = await userService.fetchUserMetadata(userId);

      expect(metadata.sync?.importGCal).toBe("restart");
    });
  });
});
