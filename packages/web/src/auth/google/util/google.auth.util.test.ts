import {
  clearGoogleRevokedState,
  isGoogleRevoked,
  markGoogleAsRevoked,
} from "@web/auth/google/state/google.auth.state";
import {
  createGoogleAuthUtil,
  LOCAL_EVENTS_SYNC_ERROR_MESSAGE,
  LOCAL_EVENTS_SYNC_SESSION_EXPIRED_MESSAGE,
} from "./google.auth.util.factory";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

const mockSyncLocalEventsToCloud = mock();
const mockToastError = mock();
const mockIsToastActive = mock(() => false);
const mockClearUserMetadata = mock();
const mockCloseStream = mock();
const mockOpenStream = mock();
const mockRefreshEventRepositorySource = mock();
const mockRemoveEventsByOrigin = mock();
const mockRemoveEventQueries = mock();

const googleAuthUtil = createGoogleAuthUtil({
  clearUserMetadata: mockClearUserMetadata,
  closeStream: mockCloseStream,
  isToastActive: mockIsToastActive,
  markGoogleAsRevoked,
  openStream: mockOpenStream,
  refreshEventRepositorySource: mockRefreshEventRepositorySource,
  removeEventsByOrigin: mockRemoveEventsByOrigin,
  removeEventQueries: mockRemoveEventQueries,
  syncLocalEventsToCloud: mockSyncLocalEventsToCloud,
  toastError: mockToastError,
});

const { handleGoogleRevoked, syncLocalEvents, syncPendingLocalEvents } =
  googleAuthUtil;

describe("google-auth.util", () => {
  beforeEach(() => {
    mockSyncLocalEventsToCloud.mockClear();
    mockToastError.mockClear();
    mockIsToastActive.mockClear();
    mockIsToastActive.mockReturnValue(false);
    mockClearUserMetadata.mockClear();
    mockCloseStream.mockClear();
    mockOpenStream.mockClear();
    mockRefreshEventRepositorySource.mockClear();
    mockRemoveEventsByOrigin.mockClear();
    mockRemoveEventQueries.mockClear();

    clearGoogleRevokedState();
  });

  afterEach(() => {
    clearGoogleRevokedState();
  });

  describe("syncLocalEvents", () => {
    it("returns syncedCount and success when sync succeeds", async () => {
      mockSyncLocalEventsToCloud.mockResolvedValue(5);

      await expect(syncLocalEvents()).resolves.toEqual({
        syncedCount: 5,
        success: true,
      });
    });

    it("returns 0 count when no events to sync", async () => {
      mockSyncLocalEventsToCloud.mockResolvedValue(0);

      await expect(syncLocalEvents()).resolves.toEqual({
        syncedCount: 0,
        success: true,
      });
    });

    it("returns error when sync fails", async () => {
      const error = new Error("Network failed");
      mockSyncLocalEventsToCloud.mockRejectedValue(error);

      await expect(syncLocalEvents()).resolves.toEqual({
        error,
        syncedCount: 0,
        success: false,
      });
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

      await expect(syncPendingLocalEvents()).resolves.toBe(true);
    });

    it("returns true when syncedCount is zero", async () => {
      mockSyncLocalEventsToCloud.mockResolvedValue(0);

      await expect(syncPendingLocalEvents()).resolves.toBe(true);
    });

    it("shows toast and returns false on sync failure", async () => {
      const error = new Error("Network failed");
      mockSyncLocalEventsToCloud.mockRejectedValue(error);

      await expect(syncPendingLocalEvents()).resolves.toBe(false);

      expect(mockToastError).toHaveBeenCalledWith(
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

      expect(mockToastError).toHaveBeenCalledWith(
        LOCAL_EVENTS_SYNC_SESSION_EXPIRED_MESSAGE,
        expect.any(Object),
      );
      expect(consoleSpy).toHaveBeenCalledWith(error);
    });
  });

  describe("handleGoogleRevoked", () => {
    it("shows toast with GOOGLE_REVOKED_TOAST_ID when not already active", () => {
      handleGoogleRevoked();

      expect(mockToastError).toHaveBeenCalledWith(
        "Google access revoked. Your Google data has been removed.",
        expect.objectContaining({ autoClose: false }),
      );
    });

    it("clears user metadata and Google-origin events on revocation", () => {
      handleGoogleRevoked();

      expect(mockClearUserMetadata).toHaveBeenCalledTimes(1);
      expect(mockRemoveEventsByOrigin).toHaveBeenCalledTimes(1);
    });

    it("re-keys queries to local and removes stale remote cache entries", () => {
      handleGoogleRevoked();

      expect(mockRefreshEventRepositorySource).toHaveBeenCalledTimes(1);
      expect(mockRemoveEventQueries).toHaveBeenCalledTimes(1);
    });

    it("reconnects SSE stream so the client gets a fresh session after revocation", () => {
      handleGoogleRevoked();

      expect(mockCloseStream).toHaveBeenCalledTimes(1);
      expect(mockOpenStream).toHaveBeenCalledTimes(1);
    });

    it("marks Google as revoked in session state", () => {
      handleGoogleRevoked();

      expect(isGoogleRevoked()).toBe(true);
    });

    it("does not show toast when one is already active", () => {
      mockIsToastActive.mockReturnValue(true);

      handleGoogleRevoked();

      expect(mockToastError).not.toHaveBeenCalled();
    });
  });
});
