import type { Credentials } from "google-auth-library";
import type { TokenPayload } from "google-auth-library";
import { faker } from "@faker-js/faker";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { determineGoogleAuthMode } from "@backend/auth/services/google/util/google.auth.util";
import mongoService from "@backend/common/services/mongo.service";
import userMetadataService from "@backend/user/services/user-metadata.service";
import userService from "@backend/user/services/user.service";
import googleAuthService from "./google.auth.service";
import type { AuthDecision, GoogleSignInSuccess } from "./google.auth.types";

jest.mock("@backend/auth/services/google/util/google.auth.util", () => {
  const actual = jest.requireActual(
    "@backend/auth/services/google/util/google.auth.util",
  );

  return {
    ...actual,
    determineGoogleAuthMode: jest.fn(),
  };
});

describe("GoogleAuthService", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  describe("handleGoogleAuth", () => {
    const mockDetermineGoogleAuthMode =
      determineGoogleAuthMode as unknown as jest.MockedFunction<
        typeof determineGoogleAuthMode
      >;

    const makeProviderUser = (overrides?: Partial<TokenPayload>) =>
      ({
        sub: faker.string.uuid(),
        email: faker.internet.email(),
        email_verified: true,
        ...overrides,
      }) as TokenPayload;

    const makeOAuthTokens = () =>
      ({
        refresh_token: faker.string.uuid(),
        access_token: faker.internet.jwt(),
      }) as Pick<Credentials, "refresh_token" | "access_token">;

    const makeOAuthTokensNoRefresh = () =>
      ({
        access_token: faker.internet.jwt(),
      }) as Pick<Credentials, "refresh_token" | "access_token">;

    beforeEach(() => {
      mockDetermineGoogleAuthMode.mockReset();
      jest
        .spyOn(googleAuthService, "googleSignup")
        .mockResolvedValue({ cUserId: "signup-id" });
      jest
        .spyOn(googleAuthService, "repairGoogleConnection")
        .mockResolvedValue({ cUserId: "repair-id" });
      jest
        .spyOn(googleAuthService, "googleSignin")
        .mockResolvedValue({ cUserId: "signin-id" });
    });

    afterEach(() => {
      // These spies are only needed for the `handleGoogleAuth` routing tests.
      // Without restoring, they can leak into the `repairGoogleConnection`
      // describe block below and cause unrelated assertions to fail.
      jest.restoreAllMocks();
    });

    it("routes SIGNUP to googleSignup", async () => {
      const providerUser = makeProviderUser({ sub: faker.string.uuid() });
      const recipeUserId = faker.database.mongodbObjectId();
      const oAuthTokens = makeOAuthTokens();

      const success: GoogleSignInSuccess = {
        providerUser,
        oAuthTokens,
        createdNewRecipeUser: true,
        recipeUserId,
        loginMethodsLength: 1,
      };

      const decision: AuthDecision = {
        authMode: "SIGNUP",
        compassUserId: null,
        hasStoredRefreshToken: false,
        hasHealthySync: false,
        createdNewRecipeUser: true,
      };

      mockDetermineGoogleAuthMode.mockResolvedValue(decision);

      await googleAuthService.handleGoogleAuth(success);

      expect(googleAuthService.googleSignup).toHaveBeenCalledWith(
        providerUser,
        oAuthTokens.refresh_token,
        recipeUserId,
      );
    });

    it("throws when refresh_token is missing on SIGNUP", async () => {
      const providerUser = makeProviderUser();
      const recipeUserId = faker.database.mongodbObjectId();
      const oAuthTokens = makeOAuthTokensNoRefresh();

      const success: GoogleSignInSuccess = {
        providerUser,
        oAuthTokens,
        createdNewRecipeUser: true,
        recipeUserId,
        loginMethodsLength: 1,
      };

      const decision: AuthDecision = {
        authMode: "SIGNUP",
        compassUserId: null,
        hasStoredRefreshToken: false,
        hasHealthySync: false,
        createdNewRecipeUser: true,
      };

      mockDetermineGoogleAuthMode.mockResolvedValue(decision);

      await expect(googleAuthService.handleGoogleAuth(success)).rejects.toThrow(
        "Refresh token expected for new user sign-up",
      );
    });

    it("routes RECONNECT_REPAIR to repairGoogleConnection", async () => {
      const providerUser = makeProviderUser();
      const recipeUserId = faker.database.mongodbObjectId();

      const oAuthTokens = makeOAuthTokens();
      const success: GoogleSignInSuccess = {
        providerUser,
        oAuthTokens,
        createdNewRecipeUser: false,
        recipeUserId,
        loginMethodsLength: 1,
      };

      const decision: AuthDecision = {
        authMode: "RECONNECT_REPAIR",
        compassUserId: faker.string.uuid(),
        hasStoredRefreshToken: false,
        hasHealthySync: true,
        createdNewRecipeUser: false,
      };

      mockDetermineGoogleAuthMode.mockResolvedValue(decision);

      await googleAuthService.handleGoogleAuth(success);

      expect(googleAuthService.repairGoogleConnection).toHaveBeenCalledWith(
        decision.compassUserId!,
        providerUser,
        oAuthTokens,
      );
    });

    it("routes SIGNIN_INCREMENTAL to googleSignin", async () => {
      const providerUser = makeProviderUser();
      const recipeUserId = faker.database.mongodbObjectId();
      const oAuthTokens = makeOAuthTokens();

      const success: GoogleSignInSuccess = {
        providerUser,
        oAuthTokens,
        createdNewRecipeUser: false,
        recipeUserId,
        loginMethodsLength: 1,
      };

      const decision: AuthDecision = {
        authMode: "SIGNIN_INCREMENTAL",
        compassUserId: faker.string.uuid(),
        hasStoredRefreshToken: true,
        hasHealthySync: true,
        createdNewRecipeUser: false,
      };

      mockDetermineGoogleAuthMode.mockResolvedValue(decision);

      await googleAuthService.handleGoogleAuth(success);

      expect(googleAuthService.googleSignin).toHaveBeenCalledWith(
        providerUser,
        oAuthTokens,
      );
    });
  });

  describe("repairGoogleConnection", () => {
    it("relinks Google to the Compass user and schedules a full reimport", async () => {
      const user = await UserDriver.createUser();
      const compassUserId = user._id.toString();
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

      await userService.pruneGoogleData(compassUserId);

      const result: { cUserId: string } =
        await googleAuthService.repairGoogleConnection(
          compassUserId,
          gUser,
          oAuthTokens,
        );

      const updatedUser = await mongoService.user.findOne({ _id: user._id });
      const metadata =
        await userMetadataService.fetchUserMetadata(compassUserId);

      expect(result).toEqual({ cUserId: compassUserId });
      expect(updatedUser?._id.toString()).toBe(compassUserId);
      expect(updatedUser?.google?.googleId).toBe(gUser.sub);
      expect(updatedUser?.google?.picture).toBe(gUser.picture);
      expect(updatedUser?.google?.gRefreshToken).toBe(
        oAuthTokens.refresh_token,
      );
      expect(metadata.sync?.importGCal).toBe("RESTART");
      expect(metadata.sync?.incrementalGCalSync).toBe("RESTART");
      expect(restartSpy).toHaveBeenCalledWith(compassUserId);

      restartSpy.mockRestore();
    });

    it("returns after persisting reconnect state even if the background sync fails", async () => {
      const user = await UserDriver.createUser();
      const compassUserId = user._id.toString();
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

      await userService.pruneGoogleData(compassUserId);

      await expect(
        googleAuthService.repairGoogleConnection(
          compassUserId,
          gUser,
          oAuthTokens,
        ),
      ).resolves.toEqual({ cUserId: compassUserId });

      await Promise.resolve();

      expect(restartSpy).toHaveBeenCalledWith(compassUserId);

      restartSpy.mockRestore();
    });
  });
});
