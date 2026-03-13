import { type Credentials } from "google-auth-library";
import { ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";
import { Resource_Sync } from "@core/types/sync.types";
import { WatchSchema } from "@core/types/watch.types";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";
import syncService from "@backend/sync/services/sync.service";
import { updateSync } from "@backend/sync/util/sync.queries";
import userMetadataService from "@backend/user/services/user-metadata.service";
import userService from "@backend/user/services/user.service";
import compassAuthService from "./compass.auth.service";

const buildGoogleSignInSuccess = (userId: string, googleId: string) => ({
  providerUser: UserDriver.generateGoogleUser({ sub: googleId }),
  oAuthTokens: {
    access_token: faker.internet.jwt(),
    refresh_token: faker.string.uuid(),
  } as Pick<Credentials, "access_token" | "refresh_token">,
  createdNewRecipeUser: false,
  recipeUserId: userId,
  loginMethodsLength: 1,
  sessionUserId: null,
});

const createActiveWatch = async (userId: string, gCalendarId: string) => {
  await mongoService.watch.insertOne(
    WatchSchema.parse({
      _id: new ObjectId(),
      user: userId,
      resourceId: faker.string.uuid(),
      expiration: new Date(Date.now() + 60_000),
      gCalendarId,
      createdAt: new Date(),
    }),
  );
};

describe("CompassAuthService", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  describe("determineGoogleAuthMode", () => {
    it("returns reconnect_repair when the stored refresh token is missing", async () => {
      const user = await UserDriver.createUser({
        withGoogleRefreshToken: false,
      });
      const success = buildGoogleSignInSuccess(
        user._id.toString(),
        user.google?.googleId ?? faker.string.uuid(),
      );

      const result = await compassAuthService.determineGoogleAuthMode(success);

      expect(result).toMatchObject({
        authMode: "reconnect_repair",
        cUserId: user._id.toString(),
        hasStoredRefreshTokenBefore: false,
        isReconnectRepair: true,
      });
    });

    it("returns signin_incremental when the user has a healthy incremental sync", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      await updateSync(Resource_Sync.CALENDAR, userId, user.email, {
        nextSyncToken: faker.string.uuid(),
      });
      await updateSync(Resource_Sync.EVENTS, userId, user.email, {
        nextSyncToken: faker.string.uuid(),
      });
      await createActiveWatch(userId, Resource_Sync.CALENDAR);
      await createActiveWatch(userId, user.email);
      await userMetadataService.updateUserMetadata({
        userId,
        data: {
          sync: { importGCal: "completed", incrementalGCalSync: "completed" },
        },
      });

      const result = await compassAuthService.determineGoogleAuthMode(
        buildGoogleSignInSuccess(
          userId,
          user.google?.googleId ?? faker.string.uuid(),
        ),
      );

      expect(result).toMatchObject({
        authMode: "signin_incremental",
        cUserId: userId,
        hasStoredRefreshTokenBefore: true,
        isReconnectRepair: false,
      });
    });

    it("returns signup for a brand-new Google user", async () => {
      const newUserId = faker.database.mongodbObjectId();
      const result = await compassAuthService.determineGoogleAuthMode({
        providerUser: UserDriver.generateGoogleUser(),
        oAuthTokens: {
          access_token: faker.internet.jwt(),
          refresh_token: faker.string.uuid(),
        },
        createdNewRecipeUser: true,
        recipeUserId: newUserId,
        loginMethodsLength: 1,
        sessionUserId: null,
      });

      expect(result).toMatchObject({
        authMode: "signup",
        cUserId: newUserId,
        hasStoredRefreshTokenBefore: false,
        isReconnectRepair: false,
      });
    });

    it("returns reconnect_repair when sync state is not incremental-ready", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      await userMetadataService.updateUserMetadata({
        userId,
        data: {
          sync: { importGCal: "completed", incrementalGCalSync: "completed" },
        },
      });

      const result = await compassAuthService.determineGoogleAuthMode(
        buildGoogleSignInSuccess(
          userId,
          user.google?.googleId ?? faker.string.uuid(),
        ),
      );

      expect(result).toMatchObject({
        authMode: "reconnect_repair",
        cUserId: userId,
        hasStoredRefreshTokenBefore: true,
        isReconnectRepair: true,
      });
    });
  });

  describe("repairGoogleConnection", () => {
    it("relinks Google to the current Compass user and schedules a full reimport", async () => {
      const user = await UserDriver.createUser();
      const sessionUserId = user._id.toString();
      const gUser = UserDriver.generateGoogleUser({
        sub: faker.string.uuid(),
        picture: faker.image.url(),
      });
      const oAuthTokens: Pick<Credentials, "access_token" | "refresh_token"> = {
        access_token: faker.internet.jwt(),
        refresh_token: faker.string.uuid(),
      };
      const restartSpy = jest
        .spyOn(userService, "restartGoogleCalendarSync")
        .mockResolvedValue();

      await userService.pruneGoogleData(sessionUserId);

      const result = await compassAuthService.repairGoogleConnection(
        sessionUserId,
        gUser,
        oAuthTokens,
      );

      const updatedUser = await mongoService.user.findOne({ _id: user._id });
      const metadata =
        await userMetadataService.fetchUserMetadata(sessionUserId);

      expect(result).toEqual({ cUserId: sessionUserId });
      expect(updatedUser?._id.toString()).toBe(sessionUserId);
      expect(updatedUser?.google?.googleId).toBe(gUser.sub);
      expect(updatedUser?.google?.picture).toBe(gUser.picture);
      expect(updatedUser?.google?.gRefreshToken).toBe(
        oAuthTokens.refresh_token,
      );
      expect(metadata.sync?.importGCal).toBe("restart");
      expect(metadata.sync?.incrementalGCalSync).toBe("restart");
      expect(restartSpy).toHaveBeenCalledWith(sessionUserId);

      restartSpy.mockRestore();
    });

    it("returns after persisting reconnect state even if the background sync fails", async () => {
      const user = await UserDriver.createUser();
      const sessionUserId = user._id.toString();
      const gUser = UserDriver.generateGoogleUser({
        sub: faker.string.uuid(),
        picture: faker.image.url(),
      });
      const oAuthTokens: Pick<Credentials, "access_token" | "refresh_token"> = {
        access_token: faker.internet.jwt(),
        refresh_token: faker.string.uuid(),
      };
      const restartError = new Error("sync failed");
      const restartSpy = jest
        .spyOn(userService, "restartGoogleCalendarSync")
        .mockRejectedValue(restartError);

      await userService.pruneGoogleData(sessionUserId);

      await expect(
        compassAuthService.repairGoogleConnection(
          sessionUserId,
          gUser,
          oAuthTokens,
        ),
      ).resolves.toEqual({ cUserId: sessionUserId });

      await Promise.resolve();

      expect(restartSpy).toHaveBeenCalledWith(sessionUserId);

      restartSpy.mockRestore();
    });
  });

  describe("googleSignin", () => {
    it("queues a full repair instead of incremental sync when the user was revoked", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const restartSpy = jest
        .spyOn(userService, "restartGoogleCalendarSync")
        .mockResolvedValue();
      const incrementalSpy = jest
        .spyOn(syncService, "importIncremental")
        .mockResolvedValue(undefined as never);
      const oAuthTokens: Pick<Credentials, "access_token" | "refresh_token"> = {
        access_token: faker.internet.jwt(),
        refresh_token: faker.string.uuid(),
      };

      await userService.pruneGoogleData(userId);

      const result = await compassAuthService.googleSignin(
        UserDriver.generateGoogleUser({
          sub: user.google?.googleId,
          picture: faker.image.url(),
        }),
        oAuthTokens,
      );

      const metadata = await userMetadataService.fetchUserMetadata(userId);

      expect(result).toEqual({ cUserId: userId });
      expect(restartSpy).toHaveBeenCalledWith(userId);
      expect(incrementalSpy).not.toHaveBeenCalled();
      expect(metadata.sync?.importGCal).toBe("restart");
      expect(metadata.sync?.incrementalGCalSync).toBe("restart");

      restartSpy.mockRestore();
      incrementalSpy.mockRestore();
    });
  });
});
