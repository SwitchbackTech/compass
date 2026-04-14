import { faker } from "@faker-js/faker";
import * as supertokensNode from "supertokens-node";
import SupertokensUserMetadata from "supertokens-node/recipe/usermetadata";
import { CompassCalendarSchema } from "@core/types/calendar.types";
import { CalendarProvider } from "@core/types/event.types";
import { EmailDriver } from "@backend/__tests__/drivers/email.driver";
import { SyncDriver } from "@backend/__tests__/drivers/sync.driver";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
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
import userService from "@backend/user/services/user.service";
import userMetadataService from "@backend/user/services/user-metadata.service";
import { type Summary_Delete } from "@backend/user/types/user.types";

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

      expect(storedUser?.email).toBe(gUser.email as string);
      expect(storedUser?.google?.gRefreshToken).toBe(refreshToken);
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

  describe("getCanonicalCompassUserId", () => {
    it("returns the connected Compass user id for a matching Google user id", async () => {
      const user = await UserDriver.createUser();

      await expect(
        userService.getCanonicalCompassUserId({
          googleUserId: user.google?.googleId,
          email: faker.internet.email(),
        }),
      ).resolves.toBe(user._id.toString());
    });

    it("falls back to a normalized email lookup when Google is not linked", async () => {
      const user = await UserDriver.createUser();
      const normalizedEmail = user.email.toLowerCase();
      await mongoService.user.updateOne(
        { _id: user._id },
        { $set: { email: normalizedEmail }, $unset: { google: "" } },
      );

      await expect(
        userService.getCanonicalCompassUserId({
          googleUserId: faker.string.uuid(),
          email: ` ${normalizedEmail.toUpperCase()} `,
        }),
      ).resolves.toBe(user._id.toString());
    });

    it("returns null when neither lookup finds a Compass user", async () => {
      await expect(
        userService.getCanonicalCompassUserId({
          googleUserId: faker.string.uuid(),
          email: faker.internet.email(),
        }),
      ).resolves.toBeNull();
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
      expect(storedUser?.email).toBe("updated@example.com");
      expect(storedUser?.name).toBe(user.name);
      expect(storedUser?.google?.googleId).toBe(user.google?.googleId);
      expect(storedUser?.google?.gRefreshToken).toBe(
        user.google?.gRefreshToken,
      );
    });

    it("reuses an existing Compass user with the same normalized email", async () => {
      const user = await UserDriver.createUser();
      const normalizedEmail = user.email.toLowerCase();
      await mongoService.user.updateOne(
        { _id: user._id },
        { $set: { email: normalizedEmail } },
      );
      const otherUserId = mongoService.objectId().toString();

      const result = await userService.upsertUserFromAuth({
        userId: otherUserId,
        email: ` ${normalizedEmail.toUpperCase()} `,
        name: "Replacement Name",
      });

      expect(result.isNewUser).toBe(false);
      expect(result.user.userId).toBe(user._id.toString());

      const storedUsers = await mongoService.user
        .find({ email: normalizedEmail })
        .toArray();

      expect(storedUsers).toHaveLength(1);
      expect(storedUsers[0]?._id).toEqual(user._id);
      expect(storedUsers[0]?.name).toBe("Replacement Name");
      expect(storedUsers[0]?.google?.googleId).toBe(user.google?.googleId);
      expect(storedUsers[0]?.google?.gRefreshToken).toBe(
        user.google?.gRefreshToken,
      );
    });

    it("does not query by id when a different user already exists for the email", async () => {
      const user = await UserDriver.createUser();
      const normalizedEmail = user.email.toLowerCase();
      await mongoService.user.updateOne(
        { _id: user._id },
        { $set: { email: normalizedEmail } },
      );
      const otherUserId = mongoService.objectId().toString();
      const findOneSpy = jest.spyOn(mongoService.user, "findOne");

      await userService.upsertUserFromAuth({
        userId: otherUserId,
        email: ` ${normalizedEmail.toUpperCase()} `,
        name: "Replacement Name",
      });

      expect(findOneSpy.mock.calls).toEqual([
        [{ email: normalizedEmail }, { session: undefined }],
      ]);
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
      await syncService.startGoogleCalendarSync(userId);

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
          ({
            userId,
            userIdType,
          }: {
            userId: string;
            userIdType?: "EXTERNAL" | "SUPERTOKENS" | "ANY";
          }) => {
            if (userIdType === "SUPERTOKENS") {
              return Promise.resolve({
                externalUserId: "external-user-1",
                externalUserIdInfo: undefined,
                status: "OK" as const,
                superTokensUserId: userId,
              });
            }

            return Promise.resolve({
              externalUserId: userId,
              externalUserIdInfo: undefined,
              status: "OK" as const,
              superTokensUserId: "recipe-user-1",
            });
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
          ({
            userId,
            userIdType,
          }: {
            userId: string;
            userIdType?: "EXTERNAL" | "SUPERTOKENS" | "ANY";
          }) => {
            if (userIdType === "SUPERTOKENS") {
              return Promise.resolve({
                externalUserId: "external-user-1",
                externalUserIdInfo: undefined,
                status: "OK" as const,
                superTokensUserId: userId,
              });
            }

            return Promise.resolve({
              externalUserId: userId,
              externalUserIdInfo: undefined,
              status: "OK" as const,
              superTokensUserId: "recipe-user-1",
            });
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

  describe("stopGoogleCalendarSync", () => {
    it("cleans up google calendars, events, and sync records", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      await syncService.startGoogleCalendarSync(userId);

      const listCalendarsForUser =
        calendarService.getByUser.bind(calendarService);
      const calendars = await listCalendarsForUser(userId);

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

      await syncService.startGoogleCalendarSync(userId);

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
