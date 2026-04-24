import { faker } from "@faker-js/faker";
import { type Credentials, type TokenPayload } from "google-auth-library";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import GoogleOAuthClient from "@backend/auth/services/google/clients/google.oauth.client";
import type * as GoogleAuthUtilModule from "@backend/auth/services/google/util/google.auth.util";
import { determineGoogleAuthMode } from "@backend/auth/services/google/util/google.auth.util";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import mongoService from "@backend/common/services/mongo.service";
import EmailService from "@backend/email/email.service";
import syncRepairRunner from "@backend/sync/services/repair/sync.repair-runner";
import userService from "@backend/user/services/user.service";
import userMetadataService from "@backend/user/services/user-metadata.service";
import googleAuthService from "./google.auth.service";
import {
  type AuthDecision,
  type GoogleSignInSuccess,
} from "./google.auth.types";

jest.mock("@backend/auth/services/google/util/google.auth.util", () => {
  const actual = jest.requireActual<typeof GoogleAuthUtilModule>(
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
        email: user.email,
        sub: faker.string.uuid(),
        picture: faker.image.url(),
      });
      const oAuthTokens: Pick<Credentials, "access_token" | "refresh_token"> = {
        access_token: faker.internet.jwt(),
        refresh_token: faker.string.uuid(),
      };
      const restartSpy = jest
        .spyOn(syncRepairRunner, "restartGoogleCalendarSync")
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
        .spyOn(syncRepairRunner, "restartGoogleCalendarSync")
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

  describe("connectGoogleToCurrentUser", () => {
    it("connects Google to an email/password user and restarts sync", async () => {
      const user = await UserDriver.createUser({ withGoogle: false });
      const normalizedEmail = user.email.toLowerCase();
      await mongoService.user.updateOne(
        { _id: user._id },
        { $set: { email: normalizedEmail } },
      );
      const compassUserId = user._id.toString();
      const gUser = UserDriver.generateGoogleUser({
        email: normalizedEmail,
        sub: faker.string.uuid(),
        picture: faker.image.url(),
      });
      const refreshToken = faker.string.uuid();
      const restartSpy = jest
        .spyOn(syncRepairRunner, "restartGoogleCalendarSync")
        .mockResolvedValue();
      const exchangeSpy = jest
        .spyOn(GoogleOAuthClient.prototype, "exchangeAuthCode")
        .mockResolvedValue({
          gUser,
          tokens: {
            access_token: faker.internet.jwt(),
            refresh_token: refreshToken,
          },
        } as never);

      const result = await googleAuthService.connectGoogleToCurrentUser(
        compassUserId,
        {
          clientType: "web",
          thirdPartyId: "google",
          redirectURIInfo: {
            redirectURIOnProviderDashboard: "http://localhost:9080",
            redirectURIQueryParams: { code: "auth-code" },
          },
        },
      );

      const updatedUser = await mongoService.user.findOne({ _id: user._id });
      const metadata =
        await userMetadataService.fetchUserMetadata(compassUserId);

      expect(result).toEqual({ cUserId: compassUserId });
      expect(updatedUser?.google?.googleId).toBe(gUser.sub);
      expect(updatedUser?.google?.gRefreshToken).toBe(refreshToken);
      expect(metadata.sync?.importGCal).toBe("RESTART");
      expect(metadata.sync?.incrementalGCalSync).toBe("RESTART");
      expect(restartSpy).toHaveBeenCalledWith(compassUserId);

      exchangeSpy.mockRestore();
      restartSpy.mockRestore();
    });

    it("rejects when the Google account belongs to another Compass user", async () => {
      const connectedUser = await UserDriver.createUser();
      const emailPasswordUser = await UserDriver.createUser({
        withGoogle: false,
      });
      const restartSpy = jest
        .spyOn(syncRepairRunner, "restartGoogleCalendarSync")
        .mockResolvedValue();
      const exchangeSpy = jest
        .spyOn(GoogleOAuthClient.prototype, "exchangeAuthCode")
        .mockResolvedValue({
          gUser: UserDriver.generateGoogleUser({
            sub: connectedUser.google?.googleId,
          }),
          tokens: {
            access_token: faker.internet.jwt(),
            refresh_token: faker.string.uuid(),
          },
        } as never);

      await expect(
        googleAuthService.connectGoogleToCurrentUser(
          emailPasswordUser._id.toString(),
          {
            clientType: "web",
            thirdPartyId: "google",
            redirectURIInfo: {
              redirectURIOnProviderDashboard: "http://localhost:9080",
              redirectURIQueryParams: { code: "auth-code" },
            },
          },
        ),
      ).rejects.toMatchObject({
        description: AuthError.GoogleAccountAlreadyConnected.description,
      });

      expect(restartSpy).not.toHaveBeenCalled();

      exchangeSpy.mockRestore();
      restartSpy.mockRestore();
    });

    it("rejects when the Google account email does not match the current Compass user", async () => {
      const user = await UserDriver.createUser({ withGoogle: false });
      const restartSpy = jest
        .spyOn(syncRepairRunner, "restartGoogleCalendarSync")
        .mockResolvedValue();
      const exchangeSpy = jest
        .spyOn(GoogleOAuthClient.prototype, "exchangeAuthCode")
        .mockResolvedValue({
          gUser: UserDriver.generateGoogleUser({
            email: faker.internet.email(),
            sub: faker.string.uuid(),
          }),
          tokens: {
            access_token: faker.internet.jwt(),
            refresh_token: faker.string.uuid(),
          },
        } as never);

      await expect(
        googleAuthService.connectGoogleToCurrentUser(user._id.toString(), {
          clientType: "web",
          thirdPartyId: "google",
          redirectURIInfo: {
            redirectURIOnProviderDashboard: "http://localhost:9080",
            redirectURIQueryParams: { code: "auth-code" },
          },
        }),
      ).rejects.toMatchObject({
        code: "GOOGLE_CONNECT_EMAIL_MISMATCH",
        description: AuthError.GoogleConnectEmailMismatch.description,
      });

      expect(restartSpy).not.toHaveBeenCalled();

      exchangeSpy.mockRestore();
      restartSpy.mockRestore();
    });
  });

  describe("googleSignup", () => {
    it("starts calendar repair in the background so Compass-only events sync after import completes", async () => {
      const recipeUserId = faker.database.mongodbObjectId();
      const providerUser = {
        sub: faker.string.uuid(),
        email: faker.internet.email(),
        name: faker.person.fullName(),
        picture: faker.image.url(),
      } as TokenPayload;
      const refreshToken = faker.string.uuid();
      const tagNewUserSpy = jest
        .spyOn(EmailService, "tagNewUserIfEnabled")
        .mockResolvedValue();
      const restartSpy = jest
        .spyOn(syncRepairRunner, "restartGoogleCalendarSync")
        .mockResolvedValue();

      const result = await googleAuthService.googleSignup(
        providerUser,
        refreshToken,
        recipeUserId,
      );

      expect(result.cUserId).toBe(recipeUserId);
      expect(tagNewUserSpy).toHaveBeenCalled();
      expect(restartSpy).toHaveBeenCalledWith(recipeUserId);

      tagNewUserSpy.mockRestore();
      restartSpy.mockRestore();
    });

    it("reuses an existing same-email Compass user instead of creating a duplicate", async () => {
      const existingUser = await UserDriver.createUser({ withGoogle: false });
      const normalizedEmail = existingUser.email.toLowerCase();
      await mongoService.user.updateOne(
        { _id: existingUser._id },
        { $set: { email: normalizedEmail } },
      );
      const recipeUserId = faker.database.mongodbObjectId();
      const providerUser = {
        sub: faker.string.uuid(),
        email: normalizedEmail.toUpperCase(),
        name: faker.person.fullName(),
        picture: faker.image.url(),
      } as TokenPayload;
      const refreshToken = faker.string.uuid();
      const restartSpy = jest
        .spyOn(syncRepairRunner, "restartGoogleCalendarSync")
        .mockResolvedValue();
      const tagNewUserSpy = jest
        .spyOn(EmailService, "tagNewUserIfEnabled")
        .mockResolvedValue();

      const result = await googleAuthService.googleSignup(
        providerUser,
        refreshToken,
        recipeUserId,
      );

      const storedUsers = await mongoService.user
        .find({ email: normalizedEmail })
        .toArray();

      expect(result).toEqual({ cUserId: existingUser._id.toString() });
      expect(storedUsers).toHaveLength(1);
      expect(storedUsers[0]?._id).toEqual(existingUser._id);
      expect(storedUsers[0]?.google?.googleId).toBe(providerUser.sub);
      expect(storedUsers[0]?.google?.gRefreshToken).toBe(refreshToken);
      expect(restartSpy).toHaveBeenCalledWith(existingUser._id.toString());

      restartSpy.mockRestore();
      tagNewUserSpy.mockRestore();
    });
  });
});
