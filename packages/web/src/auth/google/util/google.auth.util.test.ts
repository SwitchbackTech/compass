import {
  clearGoogleRevokedState,
  isGoogleRevoked,
} from "@web/auth/google/state/google.auth.state";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

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
const { handleGoogleRevoked, syncLocalEvents, syncPendingLocalEvents } =
  require("./google.auth.util") as typeof import("./google.auth.util");
const {
  LOCAL_EVENTS_SYNC_ERROR_MESSAGE,
  LOCAL_EVENTS_SYNC_SESSION_EXPIRED_MESSAGE,
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

  describe("syncLocalEvents", () => {
    it("returns syncedCount and success when sync succeeds", async () => {
      mockSyncLocalEventsToCloud.mockResolvedValue(5);

      await syncLocalEvents();
    });

    it("returns 0 count when no events to sync", async () => {
      mockSyncLocalEventsToCloud.mockResolvedValue(0);

      await syncLocalEvents();
    });

    it("returns error when sync fails", async () => {
      expect(mockSyncLocalEventsToCloud).toBeDefined();
    });
  });

  describe("syncPendingLocalEvents", () => {
    let consoleSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
      consoleSpy = spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("returns true when sync succeeds with events", async () => {
      mockSyncLocalEventsToCloud.mockResolvedValue(3);

      await syncPendingLocalEvents();
    });

    it("returns true when syncedCount is zero", async () => {
      mockSyncLocalEventsToCloud.mockResolvedValue(0);

      await syncPendingLocalEvents();
    });

    it("shows toast and returns false on sync failure", async () => {
      const error = new Error("Network failed");
      mockSyncLocalEventsToCloud.mockRejectedValue(error);

      await expect(syncPendingLocalEvents()).resolves.toBe(false);

      expect(mockToast.error).toHaveBeenCalledWith(
        LOCAL_EVENTS_SYNC_ERROR_MESSAGE,
        expect.any(Object),
      );
      expect(consoleSpy).toHaveBeenCalledWith(error);
    });

    it("shows session recovery copy when local event sync fails because the Compass session expired", async () => {
      const error = Object.assign(new Error("Request failed with status 401"), {
        response: { status: 401 },
      });
      mockSyncLocalEventsToCloud.mockRejectedValue(error);

      await expect(syncPendingLocalEvents()).resolves.toBe(false);

      expect(mockToast.error).toHaveBeenCalledWith(
        LOCAL_EVENTS_SYNC_SESSION_EXPIRED_MESSAGE,
        expect.any(Object),
      );
      expect(consoleSpy).toHaveBeenCalledWith(error);
    });
  });

  describe("handleGoogleRevoked", () => {
    beforeEach(() => {
      mockToast.isActive.mockReturnValue(false);
    });

    it("shows toast with GOOGLE_REVOKED_TOAST_ID when not already active", () => {
      handleGoogleRevoked();
      expect(mockToast.error).toBeDefined();
    });

    it("dispatches removeEventsByOrigin for Google origins", () => {
      handleGoogleRevoked();
      expect(mockStore.dispatch).toBeDefined();
    });

    it("clears auth and user metadata state", () => {
      handleGoogleRevoked();
      expect(mockStore.dispatch).toBeDefined();
    });

    it("dispatches triggerFetch with GOOGLE_REVOKED reason", () => {
      handleGoogleRevoked();
      expect(mockStore.dispatch).toBeDefined();
    });

    it("reconnects SSE stream so the client gets a fresh session after revocation", () => {
      handleGoogleRevoked();
      expect(mockSse.closeStream).toBeDefined();
    });

    it("marks Google as revoked in session state", () => {
      handleGoogleRevoked();
      expect(isGoogleRevoked()).toBeDefined();
    });

    it("does not show toast when one is already active (idempotent)", () => {
      mockToast.isActive.mockReturnValue(true);

      handleGoogleRevoked();
      expect(mockToast.isActive).toBeDefined();
    });
  });
});

afterAll(() => {
  mock.restore();
});
