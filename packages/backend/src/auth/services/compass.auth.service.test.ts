import { type Credentials } from "google-auth-library";
import { faker } from "@faker-js/faker";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";
import userMetadataService from "@backend/user/services/user-metadata.service";
import userService from "@backend/user/services/user.service";
import compassAuthService from "./compass.auth.service";

describe("CompassAuthService", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  describe("reconnectGoogleForSession", () => {
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

      const result = await compassAuthService.reconnectGoogleForSession(
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
        compassAuthService.reconnectGoogleForSession(
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
});
