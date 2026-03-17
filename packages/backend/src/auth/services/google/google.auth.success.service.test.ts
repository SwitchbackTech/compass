import type { Credentials, TokenPayload } from "google-auth-library";
import { ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";
import {
  type GoogleSignInSuccess,
  type GoogleSignInSuccessAuthService,
  handleGoogleAuth,
} from "@backend/auth/services/google/google.auth.success.service";
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

function createMockAuthService(): GoogleSignInSuccessAuthService & {
  repairGoogleConnection: jest.Mock;
  googleSignup: jest.Mock;
  googleSignin: jest.Mock;
} {
  return {
    repairGoogleConnection: jest
      .fn()
      .mockResolvedValue({ cUserId: "repair-id" }),
    googleSignup: jest.fn().mockResolvedValue({ cUserId: "signup-id" }),
    googleSignin: jest.fn().mockResolvedValue({ cUserId: "signin-id" }),
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("signup path", () => {
    it("calls googleSignup when no existing Compass user found", async () => {
      mockFindCompassUserBy.mockResolvedValue(null);

      const authService = createMockAuthService();
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

      await handleGoogleAuth(success, authService);

      expect(authService.googleSignup).toHaveBeenCalledTimes(1);
      expect(authService.googleSignup).toHaveBeenCalledWith(
        providerUser,
        oAuthTokens.refresh_token,
        recipeUserId,
      );
      expect(authService.repairGoogleConnection).not.toHaveBeenCalled();
      expect(authService.googleSignin).not.toHaveBeenCalled();
    });

    it("throws when refresh_token is missing for new user", async () => {
      mockFindCompassUserBy.mockResolvedValue(null);

      const authService = createMockAuthService();
      const success: GoogleSignInSuccess = {
        providerUser: makeProviderUser(),
        oAuthTokens: { access_token: faker.internet.jwt() },
        createdNewRecipeUser: true,
        recipeUserId: faker.database.mongodbObjectId(),
        loginMethodsLength: 1,
      };

      await expect(handleGoogleAuth(success, authService)).rejects.toThrow(
        "Refresh token expected for new user sign-up",
      );

      expect(authService.googleSignup).not.toHaveBeenCalled();
    });
  });

  describe("RECONNECT_REPAIR path", () => {
    it("calls repairGoogleConnection when user exists but refresh token is missing", async () => {
      const compassUser = makeCompassUser({ hasRefreshToken: false });
      const compassUserId = compassUser._id.toString();
      mockFindCompassUserBy.mockResolvedValue(compassUser);
      mockGetSync.mockResolvedValue({ google: { events: [] } });
      mockCanDoIncrementalSync.mockReturnValue(true);

      const authService = createMockAuthService();
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

      await handleGoogleAuth(success, authService);

      expect(authService.repairGoogleConnection).toHaveBeenCalledTimes(1);
      expect(authService.repairGoogleConnection).toHaveBeenCalledWith(
        compassUserId,
        providerUser,
        oAuthTokens,
      );
      expect(authService.googleSignup).not.toHaveBeenCalled();
      expect(authService.googleSignin).not.toHaveBeenCalled();
    });

    it("calls repairGoogleConnection when user exists but sync is unhealthy", async () => {
      const compassUser = makeCompassUser({ hasRefreshToken: true });
      const compassUserId = compassUser._id.toString();
      mockFindCompassUserBy.mockResolvedValue(compassUser);
      mockGetSync.mockResolvedValue({ google: { events: [] } });
      mockCanDoIncrementalSync.mockReturnValue(false); // Unhealthy sync

      const authService = createMockAuthService();
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

      await handleGoogleAuth(success, authService);

      expect(authService.repairGoogleConnection).toHaveBeenCalledTimes(1);
      expect(authService.repairGoogleConnection).toHaveBeenCalledWith(
        compassUserId,
        providerUser,
        oAuthTokens,
      );
      expect(authService.googleSignup).not.toHaveBeenCalled();
      expect(authService.googleSignin).not.toHaveBeenCalled();
    });

    it("calls repairGoogleConnection when both refresh token is missing and sync is unhealthy", async () => {
      const compassUser = makeCompassUser({ hasRefreshToken: false });
      const compassUserId = compassUser._id.toString();
      mockFindCompassUserBy.mockResolvedValue(compassUser);
      mockGetSync.mockResolvedValue({ google: { events: [] } });
      mockCanDoIncrementalSync.mockReturnValue(false);

      const authService = createMockAuthService();
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

      await handleGoogleAuth(success, authService);

      expect(authService.repairGoogleConnection).toHaveBeenCalledTimes(1);
      expect(authService.googleSignup).not.toHaveBeenCalled();
      expect(authService.googleSignin).not.toHaveBeenCalled();
    });

    it("calls repairGoogleConnection when no sync record exists", async () => {
      const compassUser = makeCompassUser({ hasRefreshToken: true });
      const compassUserId = compassUser._id.toString();
      mockFindCompassUserBy.mockResolvedValue(compassUser);
      mockGetSync.mockResolvedValue(null); // No sync record

      const authService = createMockAuthService();
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

      await handleGoogleAuth(success, authService);

      expect(authService.repairGoogleConnection).toHaveBeenCalledTimes(1);
      expect(authService.googleSignup).not.toHaveBeenCalled();
      expect(authService.googleSignin).not.toHaveBeenCalled();
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

      const authService = createMockAuthService();
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

      await handleGoogleAuth(success, authService);

      expect(authService.googleSignin).toHaveBeenCalledTimes(1);
      expect(authService.googleSignin).toHaveBeenCalledWith(
        providerUser,
        oAuthTokens,
      );
      expect(authService.repairGoogleConnection).not.toHaveBeenCalled();
      expect(authService.googleSignup).not.toHaveBeenCalled();
    });
  });

  describe("auth decision logging", () => {
    it("determines correct auth mode for each scenario", async () => {
      // This test verifies that determineAuthMode returns the expected values
      // by checking which handler gets called

      const authService = createMockAuthService();

      // Scenario 1: No user → SIGNUP
      mockFindCompassUserBy.mockResolvedValue(null);
      await handleGoogleAuth(
        {
          providerUser: makeProviderUser(),
          oAuthTokens: makeOAuthTokens(),
          createdNewRecipeUser: true,
          recipeUserId: faker.database.mongodbObjectId(),
          loginMethodsLength: 1,
        },
        authService,
      );
      expect(authService.googleSignup).toHaveBeenCalled();

      jest.clearAllMocks();

      // Scenario 2: User exists but no refresh token → RECONNECT_REPAIR
      const userNoToken = makeCompassUser({ hasRefreshToken: false });
      mockFindCompassUserBy.mockResolvedValue(userNoToken);
      mockGetSync.mockResolvedValue({ google: { events: [] } });
      mockCanDoIncrementalSync.mockReturnValue(true);
      await handleGoogleAuth(
        {
          providerUser: makeProviderUser({ sub: userNoToken.google.googleId }),
          oAuthTokens: makeOAuthTokens(),
          createdNewRecipeUser: false,
          recipeUserId: userNoToken._id.toString(),
          loginMethodsLength: 1,
        },
        authService,
      );
      expect(authService.repairGoogleConnection).toHaveBeenCalled();

      jest.clearAllMocks();

      // Scenario 3: User exists with token and healthy sync → SIGNIN_INCREMENTAL
      const healthyUser = makeCompassUser({ hasRefreshToken: true });
      mockFindCompassUserBy.mockResolvedValue(healthyUser);
      mockGetSync.mockResolvedValue({
        google: { events: [{ nextSyncToken: "token" }] },
      });
      mockCanDoIncrementalSync.mockReturnValue(true);
      await handleGoogleAuth(
        {
          providerUser: makeProviderUser({ sub: healthyUser.google.googleId }),
          oAuthTokens: makeOAuthTokens(),
          createdNewRecipeUser: false,
          recipeUserId: healthyUser._id.toString(),
          loginMethodsLength: 1,
        },
        authService,
      );
      expect(authService.googleSignin).toHaveBeenCalled();
    });
  });
});
