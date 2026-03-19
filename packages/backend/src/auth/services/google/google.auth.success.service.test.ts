import type { Credentials, TokenPayload } from "google-auth-library";
import { ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";
import googleAuthService from "@backend/auth/services/google/google.auth.service";
import { type GoogleSignInSuccess } from "@backend/auth/services/google/google.auth.types";
import * as syncQueries from "@backend/sync/util/sync.queries";
import * as syncUtil from "@backend/sync/util/sync.util";
import * as userQueries from "@backend/user/queries/user.queries";

// Mock the dependencies
jest.mock("@backend/user/queries/user.queries");
jest.mock("@backend/sync/util/sync.queries");
jest.mock("@backend/sync/util/sync.util");

const mockFindCompassUserBy = userQueries.findCompassUserBy as jest.Mock;
const mockGetSync = syncQueries.getSync as jest.Mock;
const mockCanDoIncrementalSync = syncUtil.canDoIncrementalSync as jest.Mock;

function makeProviderUser(overrides?: Partial<TokenPayload>): TokenPayload {
  return {
    sub: faker.string.uuid(),
    email: faker.internet.email(),
    email_verified: true,
    ...overrides,
  } as TokenPayload;
}

function makeOAuthTokens(): Pick<
  Credentials,
  "refresh_token" | "access_token"
> {
  return {
    refresh_token: faker.string.uuid(),
    access_token: faker.internet.jwt(),
  };
}

function makeCompassUser(overrides?: {
  hasRefreshToken?: boolean;
  googleId?: string;
}) {
  const _id = new ObjectId();
  return {
    _id,
    google: {
      googleId: overrides?.googleId ?? faker.string.uuid(),
      gRefreshToken:
        overrides?.hasRefreshToken !== false ? faker.string.uuid() : null,
    },
  };
}

describe("handleGoogleAuth", () => {
  let mockRepairGoogleConnection: jest.SpyInstance;
  let mockGoogleSignup: jest.SpyInstance;
  let mockGoogleSignin: jest.SpyInstance;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();

    mockRepairGoogleConnection = jest
      .spyOn(googleAuthService, "repairGoogleConnection")
      .mockResolvedValue({ cUserId: "repair-id" });
    mockGoogleSignup = jest
      .spyOn(googleAuthService, "googleSignup")
      .mockResolvedValue({ cUserId: "signup-id" });
    mockGoogleSignin = jest
      .spyOn(googleAuthService, "googleSignin")
      .mockResolvedValue({ cUserId: "signin-id" });
  });

  describe("signup path", () => {
    it("calls googleSignup when no existing Compass user found", async () => {
      mockFindCompassUserBy.mockResolvedValue(null);

      const providerUser = makeProviderUser();
      const oAuthTokens = makeOAuthTokens();
      const recipeUserId = faker.database.mongodbObjectId();

      const success: GoogleSignInSuccess = {
        providerUser,
        oAuthTokens,
        createdNewRecipeUser: true,
        recipeUserId,
        loginMethodsLength: 1,
      };

      await googleAuthService.handleGoogleAuth(success);

      expect(mockGoogleSignup).toHaveBeenCalledTimes(1);
      expect(mockGoogleSignup).toHaveBeenCalledWith(
        providerUser,
        oAuthTokens.refresh_token,
        recipeUserId,
      );
      expect(mockRepairGoogleConnection).not.toHaveBeenCalled();
      expect(mockGoogleSignin).not.toHaveBeenCalled();
    });

    it("throws when refresh_token is missing for new user", async () => {
      mockFindCompassUserBy.mockResolvedValue(null);

      const success: GoogleSignInSuccess = {
        providerUser: makeProviderUser(),
        oAuthTokens: { access_token: faker.internet.jwt() },
        createdNewRecipeUser: true,
        recipeUserId: faker.database.mongodbObjectId(),
        loginMethodsLength: 1,
      };

      await expect(googleAuthService.handleGoogleAuth(success)).rejects.toThrow(
        "Refresh token expected for new user sign-up",
      );

      expect(mockGoogleSignup).not.toHaveBeenCalled();
    });
  });

  describe("RECONNECT_REPAIR path", () => {
    it("calls repairGoogleConnection when user exists but refresh token is missing", async () => {
      const compassUser = makeCompassUser({ hasRefreshToken: false });
      const compassUserId = compassUser._id.toString();
      mockFindCompassUserBy.mockResolvedValue(compassUser);
      mockGetSync.mockResolvedValue({ google: { events: [] } });
      mockCanDoIncrementalSync.mockReturnValue(true);

      const providerUser = makeProviderUser({
        sub: compassUser.google.googleId,
      });
      const oAuthTokens = makeOAuthTokens();

      const success: GoogleSignInSuccess = {
        providerUser,
        oAuthTokens,
        createdNewRecipeUser: false,
        recipeUserId: compassUserId,
        loginMethodsLength: 1,
      };

      await googleAuthService.handleGoogleAuth(success);

      expect(mockRepairGoogleConnection).toHaveBeenCalledTimes(1);
      expect(mockRepairGoogleConnection).toHaveBeenCalledWith(
        compassUserId,
        providerUser,
        oAuthTokens,
      );
      expect(mockGoogleSignup).not.toHaveBeenCalled();
      expect(mockGoogleSignin).not.toHaveBeenCalled();
    });

    it("calls repairGoogleConnection when user exists but sync is unhealthy", async () => {
      const compassUser = makeCompassUser({ hasRefreshToken: true });
      const compassUserId = compassUser._id.toString();
      mockFindCompassUserBy.mockResolvedValue(compassUser);
      mockGetSync.mockResolvedValue({ google: { events: [] } });
      mockCanDoIncrementalSync.mockReturnValue(false); // Unhealthy sync

      const providerUser = makeProviderUser({
        sub: compassUser.google.googleId,
      });
      const oAuthTokens = makeOAuthTokens();

      const success: GoogleSignInSuccess = {
        providerUser,
        oAuthTokens,
        createdNewRecipeUser: false,
        recipeUserId: compassUserId,
        loginMethodsLength: 1,
      };

      await googleAuthService.handleGoogleAuth(success);

      expect(mockRepairGoogleConnection).toHaveBeenCalledTimes(1);
      expect(mockRepairGoogleConnection).toHaveBeenCalledWith(
        compassUserId,
        providerUser,
        oAuthTokens,
      );
      expect(mockGoogleSignup).not.toHaveBeenCalled();
      expect(mockGoogleSignin).not.toHaveBeenCalled();
    });

    it("calls repairGoogleConnection when both refresh token is missing and sync is unhealthy", async () => {
      const compassUser = makeCompassUser({ hasRefreshToken: false });
      const compassUserId = compassUser._id.toString();
      mockFindCompassUserBy.mockResolvedValue(compassUser);
      mockGetSync.mockResolvedValue({ google: { events: [] } });
      mockCanDoIncrementalSync.mockReturnValue(false);

      const providerUser = makeProviderUser({
        sub: compassUser.google.googleId,
      });
      const oAuthTokens = makeOAuthTokens();

      const success: GoogleSignInSuccess = {
        providerUser,
        oAuthTokens,
        createdNewRecipeUser: false,
        recipeUserId: compassUserId,
        loginMethodsLength: 1,
      };

      await googleAuthService.handleGoogleAuth(success);

      expect(mockRepairGoogleConnection).toHaveBeenCalledTimes(1);
      expect(mockGoogleSignup).not.toHaveBeenCalled();
      expect(mockGoogleSignin).not.toHaveBeenCalled();
    });

    it("calls repairGoogleConnection when no sync record exists", async () => {
      const compassUser = makeCompassUser({ hasRefreshToken: true });
      const compassUserId = compassUser._id.toString();
      mockFindCompassUserBy.mockResolvedValue(compassUser);
      mockGetSync.mockResolvedValue(null); // No sync record
      const providerUser = makeProviderUser({
        sub: compassUser.google.googleId,
      });
      const oAuthTokens = makeOAuthTokens();

      const success: GoogleSignInSuccess = {
        providerUser,
        oAuthTokens,
        createdNewRecipeUser: false,
        recipeUserId: compassUserId,
        loginMethodsLength: 1,
      };

      await googleAuthService.handleGoogleAuth(success);

      expect(mockRepairGoogleConnection).toHaveBeenCalledTimes(1);
      expect(mockGoogleSignup).not.toHaveBeenCalled();
      expect(mockGoogleSignin).not.toHaveBeenCalled();
    });
  });

  describe("SIGNIN_INCREMENTAL path", () => {
    it("calls googleSignin when user exists with valid refresh token and healthy sync", async () => {
      const compassUser = makeCompassUser({ hasRefreshToken: true });
      mockFindCompassUserBy.mockResolvedValue(compassUser);
      mockGetSync.mockResolvedValue({
        google: { events: [{ nextSyncToken: "token" }] },
      });
      mockCanDoIncrementalSync.mockReturnValue(true);

      const providerUser = makeProviderUser({
        sub: compassUser.google.googleId,
      });
      const oAuthTokens = makeOAuthTokens();

      const success: GoogleSignInSuccess = {
        providerUser,
        oAuthTokens,
        createdNewRecipeUser: false,
        recipeUserId: faker.database.mongodbObjectId(),
        loginMethodsLength: 1,
      };

      await googleAuthService.handleGoogleAuth(success);

      expect(mockGoogleSignin).toHaveBeenCalledTimes(1);
      expect(mockGoogleSignin).toHaveBeenCalledWith(providerUser, oAuthTokens);
      expect(mockRepairGoogleConnection).not.toHaveBeenCalled();
      expect(mockGoogleSignup).not.toHaveBeenCalled();
    });
  });

  describe("auth decision logging", () => {
    it("determines correct auth mode for each scenario", async () => {
      // This test verifies that determineAuthMode returns the expected values
      // by checking which handler gets called

      // Scenario 1: No user → SIGNUP
      mockFindCompassUserBy.mockResolvedValue(null);
      await googleAuthService.handleGoogleAuth({
        providerUser: makeProviderUser(),
        oAuthTokens: makeOAuthTokens(),
        createdNewRecipeUser: true,
        recipeUserId: faker.database.mongodbObjectId(),
        loginMethodsLength: 1,
      });
      expect(mockGoogleSignup).toHaveBeenCalled();

      jest.clearAllMocks();

      // Scenario 2: User exists but no refresh token → RECONNECT_REPAIR
      const userNoToken = makeCompassUser({ hasRefreshToken: false });
      mockFindCompassUserBy.mockResolvedValue(userNoToken);
      mockGetSync.mockResolvedValue({ google: { events: [] } });
      mockCanDoIncrementalSync.mockReturnValue(true);
      await googleAuthService.handleGoogleAuth({
        providerUser: makeProviderUser({ sub: userNoToken.google.googleId }),
        oAuthTokens: makeOAuthTokens(),
        createdNewRecipeUser: false,
        recipeUserId: userNoToken._id.toString(),
        loginMethodsLength: 1,
      });
      expect(mockRepairGoogleConnection).toHaveBeenCalled();

      jest.clearAllMocks();

      // Scenario 3: User exists with token and healthy sync → SIGNIN_INCREMENTAL
      const healthyUser = makeCompassUser({ hasRefreshToken: true });
      mockFindCompassUserBy.mockResolvedValue(healthyUser);
      mockGetSync.mockResolvedValue({
        google: { events: [{ nextSyncToken: "token" }] },
      });
      mockCanDoIncrementalSync.mockReturnValue(true);
      await googleAuthService.handleGoogleAuth({
        providerUser: makeProviderUser({ sub: healthyUser.google.googleId }),
        oAuthTokens: makeOAuthTokens(),
        createdNewRecipeUser: false,
        recipeUserId: healthyUser._id.toString(),
        loginMethodsLength: 1,
      });
      expect(mockGoogleSignin).toHaveBeenCalled();
    });
  });
});
