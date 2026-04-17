import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";
import { afterAll } from "bun:test";
import { Origin } from "@core/constants/core.constants";
import {
  clearGoogleRevokedState,
  isGoogleRevoked,
} from "@web/auth/google/state/google.auth.state";
import { GOOGLE_REVOKED_TOAST_ID } from "@web/common/constants/toast.constants";
import { authSlice } from "@web/ducks/auth/slices/auth.slice";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import { eventsEntitiesSlice } from "@web/ducks/events/slices/event.slice";
import { triggerFetch } from "@web/ducks/events/slices/sync.slice";
import { type GoogleAuthConfig } from "../hooks/googe.auth.types";

// Mock definitions
const mockAuthApi = {
  loginOrSignup: mock(),
  connectGoogle: mock(),
};

const mockSyncLocalEventsToCloud = mock();

const mockToast = {
  error: mock(),
  isActive: mock(() => false),
};

const mockStore = {
  dispatch: mock(),
};

const mockSse = {
  closeStream: mock(),
  openStream: mock(),
  getStream: mock(() => null),
};

// Apply mocks
mock.module("@web/common/apis/auth.api", () => ({
  AuthApi: mockAuthApi,
}));
mock.module("@web/common/utils/sync/local-event-sync.util", () => ({
  syncLocalEventsToCloud: mockSyncLocalEventsToCloud,
}));
mock.module("react-toastify", () => ({
  ToastContainer: () => null,
  toast: mockToast,
}));
mock.module("@web/store", () => ({
  store: mockStore,
}));
mock.module("@web/sse/client/sse.client", () => mockSse);

// Import the module under test after mocking
const {
  authenticate,
  handleGoogleRevoked,
  LOCAL_EVENTS_SYNC_ERROR_MESSAGE,
  syncLocalEvents,
  syncPendingLocalEvents,
} = require("./google.auth.util") as typeof import("./google.auth.util");

describe("google-auth.util", () => {
  beforeEach(() => {
    mockAuthApi.loginOrSignup.mockClear();
    mockSyncLocalEventsToCloud.mockClear();
    mockToast.error.mockClear();
    mockToast.isActive.mockClear();
    mockStore.dispatch.mockClear();
    mockSse.closeStream.mockClear();
    mockSse.openStream.mockClear();
    mockSse.getStream.mockClear();

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
          toJson: mock(),
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
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("returns true when sync succeeds with events", async () => {
      mockSyncLocalEventsToCloud.mockResolvedValue(3);

      const ok = await syncPendingLocalEvents();

      expect(ok).toBe(true);
    });

    it("returns true when syncedCount is zero", async () => {
      mockSyncLocalEventsToCloud.mockResolvedValue(0);

      const ok = await syncPendingLocalEvents();

      expect(ok).toBe(true);
    });

    it("shows toast and returns false on sync failure", async () => {
      const error = new Error("fail");
      mockSyncLocalEventsToCloud.mockRejectedValue(error);

      const ok = await syncPendingLocalEvents();

      expect(ok).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith(
        LOCAL_EVENTS_SYNC_ERROR_MESSAGE,
        expect.anything(),
      );
    });
  });

  describe("handleGoogleRevoked", () => {
    beforeEach(() => {
      mockToast.isActive.mockReturnValue(false);
    });

    it("shows toast with GOOGLE_REVOKED_TOAST_ID when not already active", () => {
      handleGoogleRevoked();

      expect(mockToast.error).toHaveBeenCalledWith(
        "Google access revoked. Your Google data has been removed.",
        expect.objectContaining({
          toastId: GOOGLE_REVOKED_TOAST_ID,
          autoClose: false,
        }),
      );
    });

    it("dispatches removeEventsByOrigin for Google origins", () => {
      handleGoogleRevoked();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        eventsEntitiesSlice.actions.removeEventsByOrigin({
          origins: [Origin.GOOGLE, Origin.GOOGLE_IMPORT],
        }),
      );
    });

    it("clears auth and user metadata state", () => {
      handleGoogleRevoked();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        authSlice.actions.resetAuth(),
      );
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        userMetadataSlice.actions.clear(undefined),
      );
    });

    it("dispatches triggerFetch with GOOGLE_REVOKED reason", () => {
      handleGoogleRevoked();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        triggerFetch({ reason: Sync_AsyncStateContextReason.GOOGLE_REVOKED }),
      );
    });

    it("reconnects SSE stream so the client gets a fresh session after revocation", () => {
      handleGoogleRevoked();

      expect(mockSse.closeStream).toHaveBeenCalled();
      expect(mockSse.openStream).toHaveBeenCalled();
    });

    it("marks Google as revoked in session state", () => {
      expect(isGoogleRevoked()).toBe(false);

      handleGoogleRevoked();

      expect(isGoogleRevoked()).toBe(true);
    });

    it("does not show toast when one is already active (idempotent)", () => {
      mockToast.isActive.mockReturnValue(true);

      handleGoogleRevoked();

      expect(mockToast.error).not.toHaveBeenCalled();
      // 4 dispatches: resetAuth, clear metadata, removeEventsByOrigin, triggerFetch
      expect(mockStore.dispatch).toHaveBeenCalledTimes(4);
    });
  });
});

afterAll(() => {
  mock.restore();
});
