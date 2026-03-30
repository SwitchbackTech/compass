import type { Credentials, TokenPayload } from "google-auth-library";
import { faker } from "@faker-js/faker";
import googleAuthService from "@backend/auth/services/google/google.auth.service";
import type {
  AuthDecision,
  GoogleSignInSuccess,
} from "@backend/auth/services/google/google.auth.types";
import type * as GoogleAuthUtilModule from "@backend/auth/services/google/util/google.auth.util";
import { determineGoogleAuthMode } from "@backend/auth/services/google/util/google.auth.util";

jest.mock("@backend/auth/services/google/util/google.auth.util", () => {
  const actual = jest.requireActual<typeof GoogleAuthUtilModule>(
    "@backend/auth/services/google/util/google.auth.util",
  );

  return {
    ...actual,
    determineGoogleAuthMode: jest.fn(),
  };
});

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

function makeDecision(overrides: Partial<AuthDecision>): AuthDecision {
  return {
    authMode: "SIGNUP",
    compassUserId: null,
    hasStoredRefreshToken: false,
    hasHealthySync: false,
    createdNewRecipeUser: true,
    ...overrides,
  };
}

describe("handleGoogleAuth", () => {
  const mockDetermineGoogleAuthMode =
    determineGoogleAuthMode as unknown as jest.MockedFunction<
      typeof determineGoogleAuthMode
    >;

  let mockRepairGoogleConnection: jest.SpyInstance;
  let mockGoogleSignup: jest.SpyInstance;
  let mockGoogleSignin: jest.SpyInstance;

  beforeEach(() => {
    mockDetermineGoogleAuthMode.mockReset();

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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("signup path", () => {
    it("calls googleSignup when no existing Compass user found", async () => {
      const providerUser = makeProviderUser();
      const oAuthTokens = makeOAuthTokens();
      const recipeUserId = faker.database.mongodbObjectId();

      mockDetermineGoogleAuthMode.mockResolvedValue(
        makeDecision({ authMode: "SIGNUP" }),
      );

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
      const success: GoogleSignInSuccess = {
        providerUser: makeProviderUser(),
        oAuthTokens: { access_token: faker.internet.jwt() },
        createdNewRecipeUser: true,
        recipeUserId: faker.database.mongodbObjectId(),
        loginMethodsLength: 1,
      };

      mockDetermineGoogleAuthMode.mockResolvedValue(
        makeDecision({ authMode: "SIGNUP" }),
      );

      await expect(googleAuthService.handleGoogleAuth(success)).rejects.toThrow(
        "Refresh token expected for new user sign-up",
      );

      expect(mockGoogleSignup).not.toHaveBeenCalled();
    });
  });

  describe("RECONNECT_REPAIR path", () => {
    it("calls repairGoogleConnection when user exists but refresh token is missing", async () => {
      const compassUserId = faker.database.mongodbObjectId();
      const providerUser = makeProviderUser();
      const oAuthTokens = makeOAuthTokens();

      mockDetermineGoogleAuthMode.mockResolvedValue(
        makeDecision({
          authMode: "RECONNECT_REPAIR",
          compassUserId,
          hasStoredRefreshToken: false,
          hasHealthySync: true,
          createdNewRecipeUser: false,
        }),
      );

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
      const compassUserId = faker.database.mongodbObjectId();
      const providerUser = makeProviderUser();
      const oAuthTokens = makeOAuthTokens();

      mockDetermineGoogleAuthMode.mockResolvedValue(
        makeDecision({
          authMode: "RECONNECT_REPAIR",
          compassUserId,
          hasStoredRefreshToken: true,
          hasHealthySync: false,
          createdNewRecipeUser: false,
        }),
      );

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
      const compassUserId = faker.database.mongodbObjectId();
      const providerUser = makeProviderUser();
      const oAuthTokens = makeOAuthTokens();

      mockDetermineGoogleAuthMode.mockResolvedValue(
        makeDecision({
          authMode: "RECONNECT_REPAIR",
          compassUserId,
          hasStoredRefreshToken: false,
          hasHealthySync: false,
          createdNewRecipeUser: false,
        }),
      );

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
      const compassUserId = faker.database.mongodbObjectId();
      const providerUser = makeProviderUser();
      const oAuthTokens = makeOAuthTokens();

      mockDetermineGoogleAuthMode.mockResolvedValue(
        makeDecision({
          authMode: "RECONNECT_REPAIR",
          compassUserId,
          hasStoredRefreshToken: true,
          hasHealthySync: false,
          createdNewRecipeUser: false,
        }),
      );

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
      const compassUserId = faker.database.mongodbObjectId();
      const providerUser = makeProviderUser();
      const oAuthTokens = makeOAuthTokens();

      mockDetermineGoogleAuthMode.mockResolvedValue(
        makeDecision({
          authMode: "SIGNIN_INCREMENTAL",
          compassUserId,
          hasStoredRefreshToken: true,
          hasHealthySync: true,
          createdNewRecipeUser: false,
        }),
      );

      const success: GoogleSignInSuccess = {
        providerUser,
        oAuthTokens,
        createdNewRecipeUser: false,
        recipeUserId: compassUserId,
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
      mockDetermineGoogleAuthMode.mockResolvedValueOnce(
        makeDecision({ authMode: "SIGNUP" }),
      );
      await googleAuthService.handleGoogleAuth({
        providerUser: makeProviderUser(),
        oAuthTokens: makeOAuthTokens(),
        createdNewRecipeUser: true,
        recipeUserId: faker.database.mongodbObjectId(),
        loginMethodsLength: 1,
      });
      expect(mockGoogleSignup).toHaveBeenCalled();

      jest.clearAllMocks();

      const reconnectUserId = faker.database.mongodbObjectId();
      mockDetermineGoogleAuthMode.mockResolvedValueOnce(
        makeDecision({
          authMode: "RECONNECT_REPAIR",
          compassUserId: reconnectUserId,
          hasStoredRefreshToken: false,
          hasHealthySync: true,
          createdNewRecipeUser: false,
        }),
      );
      await googleAuthService.handleGoogleAuth({
        providerUser: makeProviderUser(),
        oAuthTokens: makeOAuthTokens(),
        createdNewRecipeUser: false,
        recipeUserId: reconnectUserId,
        loginMethodsLength: 1,
      });
      expect(mockRepairGoogleConnection).toHaveBeenCalled();

      jest.clearAllMocks();

      const signinUserId = faker.database.mongodbObjectId();
      mockDetermineGoogleAuthMode.mockResolvedValueOnce(
        makeDecision({
          authMode: "SIGNIN_INCREMENTAL",
          compassUserId: signinUserId,
          hasStoredRefreshToken: true,
          hasHealthySync: true,
          createdNewRecipeUser: false,
        }),
      );
      await googleAuthService.handleGoogleAuth({
        providerUser: makeProviderUser(),
        oAuthTokens: makeOAuthTokens(),
        createdNewRecipeUser: false,
        recipeUserId: signinUserId,
        loginMethodsLength: 1,
      });
      expect(mockGoogleSignin).toHaveBeenCalled();
    });
  });
});
