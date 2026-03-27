import * as supertokensNode from "supertokens-node";
import SupertokensUserMetadata from "supertokens-node/recipe/usermetadata";
import { faker } from "@faker-js/faker";
import { CompassCalendarSchema } from "@core/types/calendar.types";
import { CalendarProvider } from "@core/types/event.types";
import { WatchSchema } from "@core/types/watch.types";
import { EmailDriver } from "@backend/__tests__/drivers/email.driver";
import { SyncDriver } from "@backend/__tests__/drivers/sync.driver";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import compassAuthService from "@backend/auth/services/compass/compass.auth.service";
import supertokensUserCleanupService from "@backend/auth/services/supertokens/supertokens.user-cleanup.service";
import calendarService from "@backend/calendar/services/calendar.service";
import { UserError } from "@backend/common/errors/user/user.errors";
import * as supertokensMiddleware from "@backend/common/middleware/supertokens.middleware";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";
import priorityService from "@backend/priority/services/priority.service";
import syncService from "@backend/sync/services/sync.service";
import { isUsingHttps } from "@backend/sync/util/sync.util";
import userMetadataService from "@backend/user/services/user-metadata.service";
import userService from "@backend/user/services/user.service";
import { type Summary_Delete } from "@backend/user/types/user.types";

jest.mock("@backend/sync/util/sync.util", () => {
  const actual = jest.requireActual<
    typeof import("@backend/sync/util/sync.util")
  >("@backend/sync/util/sync.util");
  return { ...actual, isUsingHttps: jest.fn(actual.isUsingHttps) };
});

const createSupertokensUser = (userId: string, recipeUserIds: string[]) => ({
  id: userId,
  loginMethods: recipeUserIds.map((recipeUserId) => ({
    recipeUserId: {
      getAsString: () => recipeUserId,
    },
  })),
});

describe("UserService", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  beforeEach(() => {
    jest
      .spyOn(compassAuthService, "revokeSessionsByUser")
      .mockResolvedValue({ sessionsRevoked: 0 });
    jest
      .spyOn(supertokensUserCleanupService, "resolveByExternalUserId")
      .mockResolvedValue({
        externalUserIds: [],
        superTokensUserIds: [],
      });
    jest
      .spyOn(supertokensUserCleanupService, "cleanupResolvedTarget")
      .mockResolvedValue({
        superTokensUsers: 0,
        superTokensMappings: 0,
        superTokensMetadata: 0,
      });
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
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
          email: gUser.email as string,
          google: expect.objectContaining({
            gRefreshToken: refreshToken,
          }),
        }),
      );
    });
  });

  describe("getProfile", () => {
    it("returns the user profile for a valid user ID", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id;

      expect(user.google).toBeDefined();
      const profile = await userService.getProfile(userId);

      expect(profile).toEqual(
        expect.objectContaining({
          userId: userId.toString(),
          picture: user.google!.picture,
          firstName: user.firstName,
          lastName: user.lastName,
          name: user.name,
          email: user.email,
          locale: user.locale,
        }),
      );
    });

    it("throws UserNotFound error when user does not exist", async () => {
      const nonExistentId = mongoService.objectId();

      await expect(userService.getProfile(nonExistentId)).rejects.toThrow(
        UserError.UserNotFound.description,
      );
    });
  });

  describe("upsertUserFromAuth", () => {
    it("creates a password user with normalized fields and default priorities", async () => {
      const userId = mongoService.objectId().toString();

      const result = await userService.upsertUserFromAuth({
        userId,
        email: "  Foo@Bar.com ",
        name: "  Tyler Durden ",
      });

      expect(result.isNewUser).toBe(true);
      expect(result.user).toEqual(
        expect.objectContaining({
          userId,
          email: "foo@bar.com",
          name: "Tyler Durden",
          firstName: "Tyler",
          lastName: "Durden",
        }),
      );

      const storedUser = await mongoService.user.findOne({
        _id: mongoService.objectId(userId),
      });
      expect(storedUser?.google).toBeUndefined();

      const priorities = await mongoService.priority
        .find({ user: userId })
        .toArray();
      expect(priorities.length).toBeGreaterThan(0);
    });

    it("updates an existing user without removing stored Google data", async () => {
      const user = await UserDriver.createUser();

      const result = await userService.upsertUserFromAuth({
        userId: user._id.toString(),
        email: "updated@example.com",
      });

      expect(result.isNewUser).toBe(false);

      const storedUser = await mongoService.user.findOne({ _id: user._id });
      expect(storedUser).toEqual(
        expect.objectContaining({
          email: "updated@example.com",
          name: user.name,
          google: expect.objectContaining({
            googleId: user.google?.googleId,
            gRefreshToken: user.google?.gRefreshToken,
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
      await SyncDriver.createSync(storedUser!, true);
      await userService.startGoogleCalendarSync(userId);

      const summary: Summary_Delete =
        await userService.deleteCompassDataForUser(userId, false);

      expect(summary).toEqual(
        expect.objectContaining({
          priorities: expect.any(Number) as number,
          calendars: expect.any(Number) as number,
          events: expect.any(Number) as number,
          syncs: expect.any(Number) as number,
          eventWatches: expect.any(Number) as number,
          sessions: expect.any(Number) as number,
          superTokensUsers: 0,
          superTokensMappings: 0,
          superTokensMetadata: 0,
          user: 1,
        }),
      );

      expect(await mongoService.user.findOne({ _id: user._id })).toBeNull();
      expect(
        await mongoService.calendar.countDocuments({ user: user._id }),
      ).toBe(0);
      expect(await mongoService.event.countDocuments({ user: userId })).toBe(0);
      expect(await mongoService.sync.findOne({ user: userId })).toBeNull();
      expect(await mongoService.watch.findOne({ user: userId })).toBeNull();
      expect(
        await mongoService.sync.findOne({
          $or: [
            { "google.calendarlist.gCalendarId": user.email },
            { "google.events.gCalendarId": user.email },
          ],
        }),
      ).toBeNull();
    });

    it("includes SuperTokens cleanup results after deleting the Compass user", async () => {
      const userId = mongoService.objectId().toString();
      await userService.upsertUserFromAuth({
        userId,
        email: faker.internet.email().toLowerCase(),
        name: "Tyler Durden",
      });

      const resolveSpy = jest
        .spyOn(supertokensUserCleanupService, "resolveByExternalUserId")
        .mockResolvedValue({
          externalUserIds: [userId],
          superTokensUserIds: ["st-user-id"],
        });
      const revokeSpy = jest
        .spyOn(compassAuthService, "revokeSessionsByUser")
        .mockResolvedValue({ sessionsRevoked: 2 });
      const cleanupSpy = jest
        .spyOn(supertokensUserCleanupService, "cleanupResolvedTarget")
        .mockResolvedValue({
          superTokensUsers: 1,
          superTokensMappings: 1,
          superTokensMetadata: 1,
        });

      const summary = await userService.deleteCompassDataForUser(userId, false);

      expect(resolveSpy).toHaveBeenCalledWith(userId);
      expect(revokeSpy).toHaveBeenCalledWith(userId);
      expect(cleanupSpy).toHaveBeenCalledWith({
        externalUserIds: [userId],
        superTokensUserIds: ["st-user-id"],
      });
      expect(summary).toEqual(
        expect.objectContaining({
          priorities: expect.any(Number) as number,
          sessions: 2,
          superTokensUsers: 1,
          superTokensMappings: 1,
          superTokensMetadata: 1,
          user: 1,
        }),
      );
      expect(
        await mongoService.user.findOne({ _id: mongoService.objectId(userId) }),
      ).toBeNull();
    });
  });

  describe("supertokens auth cleanup", () => {
    it("removes orphaned SuperTokens users by email", async () => {
      jest.restoreAllMocks();

      const initSpy = jest
        .spyOn(supertokensMiddleware, "initSupertokens")
        .mockImplementation(() => undefined);
      const listUsersSpy = jest
        .spyOn(supertokensNode, "listUsersByAccountInfo")
        .mockResolvedValue([
          createSupertokensUser("st-primary-user", ["recipe-user-1"]) as never,
        ]);
      const getUserIdMappingSpy = jest
        .spyOn(supertokensNode, "getUserIdMapping")
        .mockImplementation(
          async ({
            userId,
            userIdType,
          }: {
            userId: string;
            userIdType?: "EXTERNAL" | "SUPERTOKENS" | "ANY";
          }) => {
            if (userIdType === "SUPERTOKENS") {
              return {
                externalUserId: "external-user-1",
                externalUserIdInfo: undefined,
                status: "OK" as const,
                superTokensUserId: userId,
              };
            }

            return {
              externalUserId: userId,
              externalUserIdInfo: undefined,
              status: "OK" as const,
              superTokensUserId: "recipe-user-1",
            };
          },
        );
      const getUserMetadataSpy = jest
        .spyOn(SupertokensUserMetadata, "getUserMetadata")
        .mockResolvedValue({
          metadata: { skipOnboarding: true },
          status: "OK",
        });
      const clearUserMetadataSpy = jest
        .spyOn(SupertokensUserMetadata, "clearUserMetadata")
        .mockResolvedValue({ status: "OK" });
      const deleteUserSpy = jest
        .spyOn(supertokensNode, "deleteUser")
        .mockResolvedValue({ status: "OK" });
      const deleteUserIdMappingSpy = jest
        .spyOn(supertokensNode, "deleteUserIdMapping")
        .mockResolvedValue({
          didMappingExist: true,
          status: "OK",
        });

      const summary =
        await supertokensUserCleanupService.cleanupByEmail("User@example.com");

      expect(initSpy).toHaveBeenCalled();
      expect(listUsersSpy).toHaveBeenCalledWith("public", {
        email: "user@example.com",
      });
      expect(getUserIdMappingSpy).toHaveBeenCalled();
      expect(getUserMetadataSpy).toHaveBeenCalledWith("external-user-1");
      expect(clearUserMetadataSpy).toHaveBeenCalledWith("external-user-1");
      expect(deleteUserSpy).toHaveBeenCalledWith("st-primary-user");
      expect(deleteUserIdMappingSpy).toHaveBeenCalledWith({
        force: true,
        userId: "external-user-1",
        userIdType: "EXTERNAL",
      });
      expect(summary).toEqual({
        superTokensMappings: 1,
        superTokensMetadata: 1,
        superTokensUsers: 1,
      });
    });

    it("removes mapped SuperTokens users by external user id", async () => {
      jest.restoreAllMocks();

      const initSpy = jest
        .spyOn(supertokensMiddleware, "initSupertokens")
        .mockImplementation(() => undefined);
      const getUserIdMappingSpy = jest
        .spyOn(supertokensNode, "getUserIdMapping")
        .mockImplementation(
          async ({
            userId,
            userIdType,
          }: {
            userId: string;
            userIdType?: "EXTERNAL" | "SUPERTOKENS" | "ANY";
          }) => {
            if (userIdType === "SUPERTOKENS") {
              return {
                externalUserId: "external-user-1",
                externalUserIdInfo: undefined,
                status: "OK" as const,
                superTokensUserId: userId,
              };
            }

            return {
              externalUserId: userId,
              externalUserIdInfo: undefined,
              status: "OK" as const,
              superTokensUserId: "recipe-user-1",
            };
          },
        );
      const getUserSpy = jest
        .spyOn(supertokensNode, "getUser")
        .mockResolvedValue(
          createSupertokensUser("st-primary-user", ["recipe-user-1"]) as never,
        );
      const getUserMetadataSpy = jest
        .spyOn(SupertokensUserMetadata, "getUserMetadata")
        .mockResolvedValue({
          metadata: { skipOnboarding: true },
          status: "OK",
        });
      const clearUserMetadataSpy = jest
        .spyOn(SupertokensUserMetadata, "clearUserMetadata")
        .mockResolvedValue({ status: "OK" });
      const deleteUserSpy = jest
        .spyOn(supertokensNode, "deleteUser")
        .mockResolvedValue({ status: "OK" });
      const deleteUserIdMappingSpy = jest
        .spyOn(supertokensNode, "deleteUserIdMapping")
        .mockResolvedValue({
          didMappingExist: true,
          status: "OK",
        });

      const summary =
        await supertokensUserCleanupService.cleanupByExternalUserId(
          "external-user-1",
        );

      expect(initSpy).toHaveBeenCalled();
      expect(getUserIdMappingSpy).toHaveBeenCalled();
      expect(getUserSpy).toHaveBeenCalledWith("recipe-user-1");
      expect(getUserMetadataSpy).toHaveBeenCalledWith("external-user-1");
      expect(clearUserMetadataSpy).toHaveBeenCalledWith("external-user-1");
      expect(deleteUserSpy).toHaveBeenCalledWith("st-primary-user");
      expect(deleteUserIdMappingSpy).toHaveBeenCalledWith({
        force: true,
        userId: "external-user-1",
        userIdType: "EXTERNAL",
      });
      expect(summary).toEqual({
        superTokensMappings: 1,
        superTokensMetadata: 1,
        superTokensUsers: 1,
      });
    });
  });

  describe("initUserData", () => {
    it("creates the compass user with default priorities", async () => {
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

    it("starts Google watches only after full import succeeds", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const callOrder: string[] = [];
      const importFull = syncService.importFull.bind(syncService);
      const startWatching =
        syncService.startWatchingGcalResources.bind(syncService);

      const importFullSpy = jest
        .spyOn(syncService, "importFull")
        .mockImplementation(async (...args) => {
          callOrder.push("importFull");
          return importFull(...args);
        });
      const startWatchingSpy = jest
        .spyOn(syncService, "startWatchingGcalResources")
        .mockImplementation(async (...args) => {
          callOrder.push("startWatching");
          return startWatching(...args);
        });

      await userService.startGoogleCalendarSync(userId);

      expect(callOrder).toEqual(["importFull", "startWatching"]);

      importFullSpy.mockRestore();
      startWatchingSpy.mockRestore();
    });

    it("does not create watches when full import fails before token persistence", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const importError = new Error("import failed before sync token");
      const importFullSpy = jest
        .spyOn(syncService, "importFull")
        .mockRejectedValue(importError);
      const startWatchingSpy = jest.spyOn(
        syncService,
        "startWatchingGcalResources",
      );

      await expect(userService.startGoogleCalendarSync(userId)).rejects.toThrow(
        importError,
      );

      expect(startWatchingSpy).not.toHaveBeenCalled();
      expect(await mongoService.watch.countDocuments({ user: userId })).toBe(0);

      importFullSpy.mockRestore();
      startWatchingSpy.mockRestore();
    });

    it("persists event sync tokens without https so local sync can settle healthy", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      (isUsingHttps as jest.Mock).mockReturnValue(false);

      await userService.startGoogleCalendarSync(userId);

      const syncRecord = await mongoService.sync.findOne({ user: userId });
      const metadata = await userMetadataService.fetchUserMetadata(userId);

      expect(syncRecord?.google?.events?.length ?? 0).toBeGreaterThan(0);
      expect(
        syncRecord?.google?.events?.every(({ nextSyncToken }) =>
          Boolean(nextSyncToken),
        ),
      ).toBe(true);
      expect(metadata.google?.connectionState).toBe("HEALTHY");

      (isUsingHttps as jest.Mock).mockRestore();
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
          calendars.map((): unknown =>
            expect.objectContaining({ success: true }),
          ),
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

  describe("handleLogoutCleanup", () => {
    it("skips Google metadata updates for email/password-only users", async () => {
      const user = await UserDriver.createUser({ withGoogle: false });
      const stopWatchesSpy = jest
        .spyOn(syncService, "stopWatches")
        .mockResolvedValue([]);
      const updateMetadataSpy = jest.spyOn(
        userMetadataService,
        "updateUserMetadata",
      );

      await userService.handleLogoutCleanup(user._id.toString(), {
        isLastActiveSession: true,
      });

      expect(updateMetadataSpy).not.toHaveBeenCalled();
      expect(stopWatchesSpy).toHaveBeenCalledWith(user._id.toString());
    });

    it("updates Google metadata and stops watches for last active Google sessions", async () => {
      const user = await UserDriver.createUser();
      const stopWatchesSpy = jest
        .spyOn(syncService, "stopWatches")
        .mockResolvedValue([]);
      const updateMetadataSpy = jest
        .spyOn(userMetadataService, "updateUserMetadata")
        .mockResolvedValue({} as never);

      await userService.handleLogoutCleanup(user._id.toString(), {
        isLastActiveSession: true,
      });

      expect(updateMetadataSpy).toHaveBeenCalledWith({
        userId: user._id.toString(),
        data: { sync: { incrementalGCalSync: "RESTART" } },
      });
      expect(stopWatchesSpy).toHaveBeenCalledWith(user._id.toString());
    });
  });

  describe("reconnectGoogleCredentials", () => {
    it("updates the user's Google credentials and lastLoggedInAt", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      const newGUser = UserDriver.generateGoogleUser({
        sub: faker.string.uuid(),
        picture: faker.image.urlPicsumPhotos(),
      });
      const newRefreshToken = faker.internet.jwt();

      const updatedUser = await userService.reconnectGoogleCredentials(
        userId,
        newGUser,
        newRefreshToken,
      );

      expect(updatedUser._id.toString()).toBe(userId);

      const storedUser = await mongoService.user.findOne({ _id: user._id });

      expect(storedUser?.google?.googleId).toBe(newGUser.sub);
      expect(storedUser?.google?.picture).toBe(newGUser.picture ?? "");
      expect(storedUser?.google?.gRefreshToken).toBe(newRefreshToken);
      expect(storedUser?.lastLoggedInAt).toBeDefined();
    });
  });

  describe("pruneGoogleData", () => {
    it("stops sync, clears the Google refresh token, and resets sync metadata", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const stopWatchesSpy = jest.spyOn(syncService, "stopWatches");
      const deleteWatchesSpy = jest.spyOn(syncService, "deleteWatchesByUser");

      expect(user.google).toBeDefined();

      await userService.startGoogleCalendarSync(userId);

      const eventCountBefore = await mongoService.event.countDocuments({
        user: userId,
      });
      expect(eventCountBefore).toBeGreaterThan(0);

      await userMetadataService.updateUserMetadata({
        userId,
        data: {
          sync: { importGCal: "COMPLETED", incrementalGCalSync: "COMPLETED" },
        },
      });

      await userService.pruneGoogleData(userId);

      expect(stopWatchesSpy).not.toHaveBeenCalled();
      expect(deleteWatchesSpy).toHaveBeenCalledWith(userId);

      const storedUser = await mongoService.user.findOne({ _id: user._id });
      expect(storedUser?.google?.googleId).toBe(user.google?.googleId);
      expect(storedUser?.google?.picture).toBe(user.google?.picture);
      expect(storedUser?.google?.gRefreshToken).toBe("");

      expect(await mongoService.event.countDocuments({ user: userId })).toBe(0);
      expect(await mongoService.watch.countDocuments({ user: userId })).toBe(0);
      const sync = await mongoService.sync.findOne({ user: userId });
      expect(sync).not.toHaveProperty(CalendarProvider.GOOGLE);

      const metadata = await userMetadataService.fetchUserMetadata(userId);
      expect(metadata.sync?.importGCal).toBe("RESTART");
      expect(metadata.sync?.incrementalGCalSync).toBe("RESTART");
    });
  });

  describe("restartGoogleCalendarSync", () => {
    it("restarts the import workflow and completes successfully", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "RESTART" } },
      });

      await userService.restartGoogleCalendarSync(userId);

      const metadata = await userMetadataService.fetchUserMetadata(userId);
      expect(metadata.sync?.importGCal).toBe("COMPLETED");

      const calendars = await calendarService.getByUser(userId);
      expect(calendars.length).toBeGreaterThan(0);
    });

    it("skips restart when import is completed and not forced", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "COMPLETED" } },
      });

      const stopSpy = jest.spyOn(userService, "stopGoogleCalendarSync");
      const startSpy = jest.spyOn(userService, "startGoogleCalendarSync");

      await userService.restartGoogleCalendarSync(userId);

      expect(stopSpy).not.toHaveBeenCalled();
      expect(startSpy).not.toHaveBeenCalled();

      const metadata = await userMetadataService.fetchUserMetadata(userId);
      expect(metadata.sync?.importGCal).toBe("COMPLETED");

      stopSpy.mockRestore();
      startSpy.mockRestore();
    });

    it("forces restart when import is completed", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "COMPLETED" } },
      });

      const stopSpy = jest
        .spyOn(userService, "stopGoogleCalendarSync")
        .mockResolvedValue();
      const startSpy = jest
        .spyOn(userService, "startGoogleCalendarSync")
        .mockResolvedValue({ eventsCount: 0, calendarsCount: 0 });

      await userService.restartGoogleCalendarSync(userId, { force: true });

      expect(stopSpy).toHaveBeenCalledWith(userId);
      expect(startSpy).toHaveBeenCalledWith(userId);

      const metadata = await userMetadataService.fetchUserMetadata(userId);
      expect(metadata.sync?.importGCal).toBe("COMPLETED");

      stopSpy.mockRestore();
      startSpy.mockRestore();
    });

    it("cleans up partial watch state when restart fails", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const stopWatchesSpy = jest
        .spyOn(syncService, "stopWatches")
        .mockImplementation(async (targetUserId) => {
          await syncService.deleteWatchesByUser(targetUserId);
          return [];
        });
      const startSpy = jest
        .spyOn(userService, "startGoogleCalendarSync")
        .mockImplementation(async () => {
          await mongoService.watch.insertOne(
            WatchSchema.parse({
              _id: mongoService.objectId(),
              user: userId,
              resourceId: faker.string.uuid(),
              expiration: faker.date.future(),
              gCalendarId: faker.string.uuid(),
              createdAt: new Date(),
            }),
          );

          throw new Error("sync failed");
        });

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "RESTART" } },
      });

      await userService.restartGoogleCalendarSync(userId, { force: true });

      const metadata = await userMetadataService.fetchUserMetadata(userId);
      expect(metadata.sync?.importGCal).toBe("ERRORED");
      expect(await mongoService.watch.countDocuments({ user: userId })).toBe(0);

      stopWatchesSpy.mockRestore();
      startSpy.mockRestore();
    });
  });

  describe("updateUserMetadata", () => {
    it("merges metadata and returns the latest snapshot", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      const metadata = await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "RESTART" } },
      });

      expect(metadata.sync?.importGCal).toBe("RESTART");

      const persisted = await userMetadataService.fetchUserMetadata(userId);

      expect(persisted.sync?.importGCal).toBe("RESTART");
    });
  });

  describe("fetchUserMetadata", () => {
    it("retrieves stored metadata for the user", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "RESTART" } },
      });

      const metadata = await userMetadataService.fetchUserMetadata(userId);

      expect(metadata.sync?.importGCal).toBe("RESTART");
    });
  });
});
