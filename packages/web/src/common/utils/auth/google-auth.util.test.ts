import { AuthApi } from "@web/common/apis/auth.api";
import { UserApi } from "@web/common/apis/user.api";
import { syncLocalEventsToCloud } from "@web/common/utils/sync/local-event-sync.util";
import { SignInUpInput } from "@web/components/oauth/ouath.types";
import {
  authenticate,
  fetchOnboardingStatus,
  syncLocalEvents,
} from "./google-auth.util";

jest.mock("@web/common/apis/auth.api");
jest.mock("@web/common/apis/user.api");
jest.mock("@web/common/utils/sync/local-event-sync.util");

const mockAuthApi = AuthApi as jest.Mocked<typeof AuthApi>;
const mockUserApi = UserApi as jest.Mocked<typeof UserApi>;
const mockSyncLocalEventsToCloud =
  syncLocalEventsToCloud as jest.MockedFunction<typeof syncLocalEventsToCloud>;

describe("google-auth.util", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("authenticate", () => {
    const mockSignInUpInput: SignInUpInput = {
      clientType: "web",
      thirdPartyId: "google",
      redirectURIInfo: {
        redirectURIOnProviderDashboard: "http://localhost",
        redirectURIQueryParams: {
          code: "test-code",
          scope: "email profile",
          state: "test-state",
        },
      },
    };

    it("returns success when authentication succeeds", async () => {
      mockAuthApi.loginOrSignup.mockResolvedValue({
        createdNewRecipeUser: false,
        status: "OK",
        user: {
          id: "user-id",
          isPrimaryUser: false,
          emails: ["test@example.com"],
          tenantIds: ["public"],
          phoneNumbers: [],
          thirdParty: [{ id: "google", userId: "google-user-id" }],
          webauthn: { credentialIds: [] },
          loginMethods: [],
          timeJoined: Date.now(),
          toJson: jest.fn(),
        },
      });

      const result = await authenticate(mockSignInUpInput);

      expect(result).toEqual({ success: true });
      expect(mockAuthApi.loginOrSignup).toHaveBeenCalledWith(mockSignInUpInput);
    });

    it("returns error when authentication fails", async () => {
      const error = new Error("Authentication failed");
      mockAuthApi.loginOrSignup.mockRejectedValue(error);

      const result = await authenticate(mockSignInUpInput);

      expect(result).toEqual({ success: false, error });
    });
  });

  describe("fetchOnboardingStatus", () => {
    it("returns skipOnboarding from metadata", async () => {
      mockUserApi.getMetadata.mockResolvedValue({ skipOnboarding: false });

      const result = await fetchOnboardingStatus();

      expect(result).toEqual({ skipOnboarding: false });
    });

    it("returns skipOnboarding: true when metadata has undefined skipOnboarding", async () => {
      mockUserApi.getMetadata.mockResolvedValue({});

      const result = await fetchOnboardingStatus();

      expect(result).toEqual({ skipOnboarding: true });
    });

    it("returns skipOnboarding: true when metadata request fails", async () => {
      mockUserApi.getMetadata.mockRejectedValue(new Error("Network error"));

      const result = await fetchOnboardingStatus();

      expect(result).toEqual({ skipOnboarding: true });
    });
  });

  describe("syncLocalEvents", () => {
    it("returns syncedCount and success when sync succeeds", async () => {
      mockSyncLocalEventsToCloud.mockResolvedValue(5);

      const result = await syncLocalEvents();

      expect(result).toEqual({ syncedCount: 5, success: true });
    });

    it("returns 0 count when no events to sync", async () => {
      mockSyncLocalEventsToCloud.mockResolvedValue(0);

      const result = await syncLocalEvents();

      expect(result).toEqual({ syncedCount: 0, success: true });
    });

    it("returns error when sync fails", async () => {
      const error = new Error("Sync failed");
      mockSyncLocalEventsToCloud.mockRejectedValue(error);

      const result = await syncLocalEvents();

      expect(result).toEqual({ syncedCount: 0, success: false, error });
    });
  });
});
