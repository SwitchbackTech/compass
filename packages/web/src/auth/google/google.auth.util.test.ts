import { toast } from "react-toastify";
import { Origin } from "@core/constants/core.constants";
import {
  clearGoogleRevokedState,
  isGoogleRevoked,
} from "@web/auth/google/google.auth.state";
import { AuthApi } from "@web/common/apis/auth.api";
import { GOOGLE_REVOKED_TOAST_ID } from "@web/common/constants/toast.constants";
import { syncLocalEventsToCloud } from "@web/common/utils/sync/local-event-sync.util";
import { authSlice } from "@web/ducks/auth/slices/auth.slice";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import { eventsEntitiesSlice } from "@web/ducks/events/slices/event.slice";
import {
  importGCalSlice,
  triggerFetch,
} from "@web/ducks/events/slices/sync.slice";
import { closeStream, openStream } from "@web/sse/client/sse.client";
import { store } from "@web/store";
import {
  LOCAL_EVENTS_SYNC_ERROR_MESSAGE,
  authenticate,
  handleGoogleRevoked,
  syncLocalEvents,
  syncPendingLocalEvents,
} from "./google.auth.util";
import { type GoogleAuthConfig } from "./hooks/googe.auth.types";

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
jest.mock("@web/sse/client/sse.client", () => ({
  closeStream: jest.fn(),
  openStream: jest.fn(),
  getStream: jest.fn().mockReturnValue(null),
}));

const mockAuthApi = AuthApi as jest.Mocked<typeof AuthApi>;
const mockSyncLocalEventsToCloud =
  syncLocalEventsToCloud as jest.MockedFunction<typeof syncLocalEventsToCloud>;

describe("google-auth.util", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear in-memory revoked state between tests
    clearGoogleRevokedState();
  });

  afterEach(() => {
    clearGoogleRevokedState();
  });

  describe("authenticate", () => {
    const mockGoogleAuthConfig: GoogleAuthConfig = {
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

      const result = await authenticate(mockGoogleAuthConfig);

      expect(result).toMatchObject({
        success: true,
        data: {
          status: "OK",
          user: { emails: ["test@example.com"] },
        },
      });
      expect(mockAuthApi.loginOrSignup).toHaveBeenCalledWith(
        mockGoogleAuthConfig,
      );
    });

    it("returns error when authentication fails", async () => {
      const error = new Error("Authentication failed");
      mockAuthApi.loginOrSignup.mockRejectedValue(error);

      const result = await authenticate(mockGoogleAuthConfig);

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

  describe("syncPendingLocalEvents", () => {
    beforeEach(() => {
      jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("dispatches setLocalEventsSynced when sync succeeds with events", async () => {
      mockSyncLocalEventsToCloud.mockResolvedValue(3);
      const dispatch = jest.fn();

      const ok = await syncPendingLocalEvents(dispatch);

      expect(ok).toBe(true);
      expect(dispatch).toHaveBeenCalledWith(
        importGCalSlice.actions.setLocalEventsSynced(3),
      );
    });

    it("does not dispatch when syncedCount is zero", async () => {
      mockSyncLocalEventsToCloud.mockResolvedValue(0);
      const dispatch = jest.fn();

      const ok = await syncPendingLocalEvents(dispatch);

      expect(ok).toBe(true);
      expect(dispatch).not.toHaveBeenCalled();
    });

    it("shows toast and returns false on sync failure", async () => {
      const error = new Error("fail");
      mockSyncLocalEventsToCloud.mockRejectedValue(error);
      const dispatch = jest.fn();

      const ok = await syncPendingLocalEvents(dispatch);

      expect(ok).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(
        LOCAL_EVENTS_SYNC_ERROR_MESSAGE,
        expect.anything(),
      );
      expect(dispatch).not.toHaveBeenCalled();
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

    it("clears auth and user metadata state", () => {
      handleGoogleRevoked();

      expect(store.dispatch).toHaveBeenCalledWith(
        authSlice.actions.resetAuth(),
      );
      expect(store.dispatch).toHaveBeenCalledWith(
        userMetadataSlice.actions.clear(undefined),
      );
    });

    it("dispatches triggerFetch with GOOGLE_REVOKED reason", () => {
      handleGoogleRevoked();

      expect(store.dispatch).toHaveBeenCalledWith(
        triggerFetch({ reason: Sync_AsyncStateContextReason.GOOGLE_REVOKED }),
      );
    });

    it("reconnects SSE stream so the client gets a fresh session after revocation", () => {
      handleGoogleRevoked();

      expect(closeStream).toHaveBeenCalled();
      expect(openStream).toHaveBeenCalled();
    });

    it("marks Google as revoked in session state", () => {
      expect(isGoogleRevoked()).toBe(false);

      handleGoogleRevoked();

      expect(isGoogleRevoked()).toBe(true);
    });

    it("does not show toast when one is already active (idempotent)", () => {
      (toast.isActive as jest.Mock).mockReturnValue(true);

      handleGoogleRevoked();

      expect(toast.error).not.toHaveBeenCalled();
      // 4 dispatches: resetAuth, clear metadata, removeEventsByOrigin, triggerFetch
      expect(store.dispatch).toHaveBeenCalledTimes(4);
    });
  });
});
