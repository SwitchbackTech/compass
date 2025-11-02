import { faker } from "@faker-js/faker";
import { CalendarProvider } from "@core/types/calendar.types";
import { zObjectId } from "@core/types/type.utils";
import { Schema_User } from "@core/types/user.types";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import calendarService from "@backend/calendar/services/calendar.service";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";
import eventService from "@backend/event/services/event.service";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";
import syncService from "@backend/sync/services/sync.service";
import userService from "@backend/user/services/user.service";

describe("UserService", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  async function validateCreateGoogleUser(
    user?: Schema_User,
  ): Promise<Schema_User> {
    const gUser = user ?? (await AuthDriver.googleSignup());
    const storedUser = await mongoService.user.findOne({ _id: gUser._id });

    expect(storedUser).toBeDefined();
    expect(storedUser).not.toBeNull();
    expect(gUser).toEqual(expect.objectContaining(storedUser));

    return gUser;
  }

  async function validateInitUserData(): Promise<Schema_User> {
    const cUser = await AuthDriver.googleSignup();
    const { _id } = await validateCreateGoogleUser(cUser);
    const user = _id.toString();

    const priorities = await mongoService.priority.find({ user }).toArray();

    expect(priorities.length).toBeGreaterThan(0);

    const calendars = await calendarService.getAllByUser(_id);

    expect(calendars.length).toBeGreaterThan(0);

    const primaryCalendar = calendars.find((c) => c.primary);

    expect(primaryCalendar).toBeDefined();

    const somedayEvents = await mongoService.event
      .find({ calendar: primaryCalendar?._id, isSomeday: true })
      .toArray();

    //someday events in primary calendar
    expect(somedayEvents.length).toBeGreaterThan(0);

    // no someday events in primary calendar
    const gcalEvents = await mongoService.event
      .find({
        $or: [
          { calendar: primaryCalendar?._id, isSomeday: false },
          {
            calendar: {
              $in: calendars
                .filter((c) => !c._id.equals(primaryCalendar?._id))
                .map((c) => c._id),
            },
          },
        ],
      })
      .toArray();

    expect(gcalEvents).toHaveLength(0); // no events imported yet

    return cUser;
  }

  async function validateDeleteCompassDataForUser(
    gcalAccess = true,
  ): Promise<Schema_User> {
    const user = await validateInitUserData();
    const { _id } = user;
    const userId = _id.toString();

    const calendars = await calendarService.getAllByUser(_id);
    const summary = await userService.deleteCompassDataForUser(_id, gcalAccess);

    expect(summary).toEqual(
      expect.objectContaining({
        priorities: expect.any(Number),
        calendars: expect.any(Number),
        events: expect.any(Number),
        syncs: expect.any(Number),
        user: 1,
      }),
    );

    expect(await mongoService.user.findOne({ _id })).toBeNull();
    expect(await mongoService.calendar.countDocuments({ user: _id })).toBe(0);
    expect(await mongoService.watch.countDocuments({ user: userId })).toBe(0);
    expect(
      await mongoService.sync.findOne({ user: _id.toString() }),
    ).toBeNull();
    expect(
      await mongoService.event.countDocuments({
        calendar: { $in: calendars.map((c) => c._id) },
      }),
    ).toBe(0);

    return user;
  }

  async function validateStartGoogleCalendarSyncCompleted(user: Schema_User) {
    const userId = user._id.toString();

    const calendars = await calendarService.getAllByUser(user._id);

    expect(calendars.length).toBeGreaterThan(0);

    const syncRecord = await mongoService.sync.findOne({ user: userId });

    expect(syncRecord?.google?.events?.length ?? 0).toBeGreaterThan(0);
    expect(syncRecord?.google?.calendarlist?.length ?? 0).toBeGreaterThan(0);

    const eventCount = await mongoService.event.countDocuments({
      calendar: { $in: calendars.map((c) => c._id) },
      isSomeday: false,
    });

    // at least one event per calendar
    expect(eventCount).toBeGreaterThan(calendars.length);
  }

  async function validateStartGoogleCalendarSync(
    _user?: Schema_User,
  ): Promise<Schema_User> {
    const user = _user ?? (await validateInitUserData());

    await syncService.stopWatches(user._id);
    await syncService.deleteAllByUser(user._id);

    await userService.startGoogleCalendarSync(user._id);

    await validateStartGoogleCalendarSyncCompleted(user);

    return user;
  }

  async function validateRestartGoogleCalendarSync(): Promise<Schema_User> {
    const user = await validateStartGoogleCalendarSync();
    const userId = user._id.toString();

    const handleImportGCalStartSpy = jest
      .spyOn(webSocketServer, "handleImportGCalStart")
      .mockImplementation(() => ["NOTIFIED_CLIENT"]);

    const handleImportGCalEndSpy = jest
      .spyOn(webSocketServer, "handleImportGCalEnd")
      .mockImplementation(() => ["NOTIFIED_CLIENT"]);

    const handleBackgroundCalendarChangeSpy = jest
      .spyOn(webSocketServer, "handleBackgroundCalendarChange")
      .mockImplementation(() => ["NOTIFIED_CLIENT"]);

    const updateUserMetadataSpy = jest.spyOn(userService, "updateUserMetadata");

    await userService.restartGoogleCalendarSync(user._id);

    expect(handleImportGCalStartSpy).toHaveBeenCalledWith(userId);
    expect(handleImportGCalEndSpy).toHaveBeenCalledWith(userId);
    expect(handleBackgroundCalendarChangeSpy).toHaveBeenCalledWith(userId);

    expect(updateUserMetadataSpy).toHaveBeenNthCalledWith(1, {
      userId,
      data: { sync: { importGCal: "importing" } },
    });

    expect(updateUserMetadataSpy).toHaveBeenLastCalledWith({
      userId,
      data: { sync: { importGCal: "completed" } },
    });

    const metadata = await userService.fetchUserMetadata(userId);

    expect(metadata.sync?.importGCal).toBe("completed");

    await validateStartGoogleCalendarSyncCompleted(user);

    updateUserMetadataSpy.mockRestore();

    return user;
  }

  describe("createGoogleUser", () => {
    it("persists a new compass user with Google data", async () =>
      validateCreateGoogleUser());
  });

  describe("initUserData", () => {
    it("creates the compass user with default resources", validateInitUserData);
  });

  describe("deleteCompassDataForUser", () => {
    it("removes all compass data and deletes the user", async () =>
      validateDeleteCompassDataForUser(false));

    it("removes all compass data and deletes the user with gcal access", async () =>
      validateDeleteCompassDataForUser());
  });

  describe("deleteUser", () => {
    it("removes the user document", async () => {
      const user = await validateCreateGoogleUser();

      const result = await userService.deleteUser(user._id);

      expect(result.deletedCount).toBe(1);

      expect(await mongoService.user.findOne({ _id: user._id })).toBeNull();
    });
  });

  describe("updateLastLoggedInTime", () => {
    it("updates the lastLoggedInAt field for a user", async () => {
      const user = await validateCreateGoogleUser();
      const date = new Date();
      const dateSpy = jest.spyOn(global, "Date").mockImplementation(() => date);

      await userService.updateLastLoggedInTime(user._id);

      const updatedUser = await mongoService.user.findOne({ _id: user._id });

      expect(updatedUser?.lastLoggedInAt).toEqual(date);

      dateSpy.mockRestore();
    });
  });

  describe("startGoogleCalendarSync", () => {
    it("initializes calendars and events sync metadata, and imports events", async () =>
      validateStartGoogleCalendarSync());

    it("starts only selected Google calendar syncs", async () => {
      const user = await validateStartGoogleCalendarSync();
      const calendars = await calendarService.getAllByUser(
        user._id,
        CalendarProvider.GOOGLE,
      );

      expect(calendars.length).toBeGreaterThan(1);

      expect(calendars.every((c) => c.selected)).toBe(true);

      const index = faker.number.int({ min: 0, max: calendars.length - 1 });
      const calendarToDeSelect = calendars[index];

      expect(calendarToDeSelect).toBeDefined();

      const deselectedCalendarId = zObjectId.parse(calendarToDeSelect!._id);

      const eventsInDeSelectedCalendarBeforeSync = await eventService.readAll(
        deselectedCalendarId,
        { isSomeday: false },
      );

      expect(eventsInDeSelectedCalendarBeforeSync.length).toBeGreaterThan(0);

      await eventService.deleteAllByUser(user._id, deselectedCalendarId);

      await calendarService.toggleSelection(user._id, [
        { id: deselectedCalendarId, selected: false },
      ]);

      await validateStartGoogleCalendarSync(user);

      const eventsInDeSelectedCalendarAfterSync = await eventService.readAll(
        deselectedCalendarId,
        { isSomeday: false },
      );

      const deselectedCalendar = await calendarService.getByUser(
        user._id,
        deselectedCalendarId,
      );

      expect(deselectedCalendar).toBeDefined();
      expect(deselectedCalendar).not.toBeNull();
      expect(deselectedCalendar?.selected).toBe(false);
      expect(eventsInDeSelectedCalendarAfterSync).toHaveLength(0);
    });
  });

  describe("stopGoogleCalendarSync", () => {
    it("cleans up google calendars, events, and sync records", async () => {
      const user = await validateStartGoogleCalendarSync();
      const { _id } = user;
      const userId = user._id.toString();
      const calendars = await calendarService.getAllByUser(
        _id,
        CalendarProvider.GOOGLE,
      );

      await userService.stopGoogleCalendarSync(_id);

      const sync = await mongoService.sync.findOne({ user: userId });
      const calendarAfterStop = await calendarService.getAllByUser(
        _id,
        CalendarProvider.GOOGLE,
      );

      expect(calendarAfterStop).toEqual(expect.arrayContaining(calendars));

      const calendarIds = calendarAfterStop.map((c) => c._id);

      expect(calendars).toEqual(expect.arrayContaining(calendarAfterStop));

      expect(
        await mongoService.event.countDocuments({
          calendar: { $in: calendarIds },
          isSomeday: false,
        }),
      ).toBe(0);

      expect(
        await mongoService.watch.countDocuments({
          user: userId,
          gCalendarId: { $in: calendars.map((c) => c.metadata.id) },
        }),
      ).toBe(0);

      expect(sync?.user).toBe(userId);

      expect(sync).not.toHaveProperty(CalendarProvider.GOOGLE);
    });
  });

  describe("restartGoogleCalendarSync", () => {
    it("restarts the sync if no import is in progress", async () =>
      validateRestartGoogleCalendarSync());

    it("does not restart the import workflow if another import is in progress", (done) => {
      validateInitUserData().then(async (user) => {
        const userId = user._id.toString();
        const updateMetadata = userService.updateUserMetadata.bind(userService);

        const handleImportGCalStartSpy = jest
          .spyOn(webSocketServer, "handleImportGCalStart")
          .mockImplementation(() => ["NOTIFIED_CLIENT"]);

        const handleImportGCalEndSpy = jest
          .spyOn(webSocketServer, "handleImportGCalEnd")
          .mockImplementation(() => ["NOTIFIED_CLIENT"]);

        jest
          .spyOn(userService, "updateUserMetadata")
          .mockImplementationOnce(async (params) => {
            if (params.data.sync?.importGCal === "importing") {
              const metadata = await updateMetadata({
                userId: params.userId,
                data: { sync: { importGCal: "importing" } },
              });

              userService.restartGoogleCalendarSync(user._id);

              return metadata;
            } else {
              return await updateMetadata(params);
            }
          });

        userService
          .restartGoogleCalendarSync(user._id)
          .then(() => validateStartGoogleCalendarSyncCompleted(user))
          .then(() => {
            expect(handleImportGCalStartSpy).toHaveBeenCalledWith(userId);
            expect(handleImportGCalStartSpy).toHaveBeenCalledTimes(2);

            expect(handleImportGCalEndSpy).toHaveBeenCalledWith(
              userId,
              `User ${userId} gcal import is in progress or completed, ignoring this request`,
            );

            expect(handleImportGCalEndSpy).toHaveBeenCalledTimes(2);

            expect(handleImportGCalEndSpy).toHaveBeenLastCalledWith(userId);
          })
          .then(done);
      });
    });
  });

  describe("updateUserMetadata", () => {
    it("merges metadata and returns the latest snapshot", async () => {
      const user = await validateCreateGoogleUser();
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
      const user = await validateCreateGoogleUser();
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
