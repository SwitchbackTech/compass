import { toast } from "react-toastify";
import { Origin } from "@core/constants/core.constants";
import { AuthApi } from "@web/common/apis/auth.api";
import { GOOGLE_REVOKED_TOAST_ID } from "@web/common/constants/toast.constants";
import { syncLocalEventsToCloud } from "@web/common/utils/sync/local-event-sync.util";
import { SignInUpInput } from "@web/components/oauth/ouath.types";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import { eventsEntitiesSlice } from "@web/ducks/events/slices/event.slice";
import { triggerFetch } from "@web/ducks/events/slices/sync.slice";
import { store } from "@web/store";
import {
  authenticate,
  handleGoogleRevoked,
  syncLocalEvents,
} from "./google-auth.util";

jest.mock("@web/common/apis/auth.api");
jest.mock("@web/common/utils/sync/local-event-sync.util");
jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn(),
    isActive: jest.fn(() => false),
  },
}));
jest.mock("@web/store", () => ({
  store: {
    dispatch: jest.fn(),
  },
}));

const mockAuthApi = AuthApi as jest.Mocked<typeof AuthApi>;
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

  describe("handleGoogleRevoked", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (toast.isActive as jest.Mock).mockReturnValue(false);
    });

    it("shows toast with GOOGLE_REVOKED_TOAST_ID when not already active", () => {
      handleGoogleRevoked();

      expect(toast.error).toHaveBeenCalledWith(
        "Google access revoked. Your Google data has been removed.",
        expect.objectContaining({
          toastId: GOOGLE_REVOKED_TOAST_ID,
          autoClose: false,
        }),
      );
    });

    it("dispatches removeEventsByOrigin for Google origins", () => {
      handleGoogleRevoked();

      expect(store.dispatch).toHaveBeenCalledWith(
        eventsEntitiesSlice.actions.removeEventsByOrigin({
          origins: [Origin.GOOGLE, Origin.GOOGLE_IMPORT],
        }),
      );
    });

    it("dispatches triggerFetch with GOOGLE_REVOKED reason", () => {
      handleGoogleRevoked();

      expect(store.dispatch).toHaveBeenCalledWith(
        triggerFetch({ reason: Sync_AsyncStateContextReason.GOOGLE_REVOKED }),
      );
    });

    it("does not show toast when one is already active (idempotent)", () => {
      (toast.isActive as jest.Mock).mockReturnValue(true);

      handleGoogleRevoked();

      expect(toast.error).not.toHaveBeenCalled();
      expect(store.dispatch).toHaveBeenCalledTimes(2);
    });
  });
});
