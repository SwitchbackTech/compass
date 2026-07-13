import { EmailDriver } from "@backend/__tests__/drivers/email.driver";
import { GoogleWatchDriver } from "@backend/__tests__/drivers/google-watch.driver";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UserMetadataServiceDriver } from "@backend/__tests__/drivers/user-metadata.service.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import {
  endGoogleSync,
  resetGoogleSyncActivityForTests,
  tryBeginGoogleSync,
} from "@backend/sync/services/google-sync/google-sync.activity";
import { googleCalendarSyncService } from "@backend/sync/services/google-sync/google-sync.service";
import { isUsingGcalWebhookHttps } from "@backend/sync/services/watch/google-watch-config";

// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- mock factory spreads requireActual
jest.mock("@backend/sync/services/watch/google-watch-config", () => ({
  ...jest.requireActual("@backend/sync/services/watch/google-watch-config"),
  isUsingGcalWebhookHttps: jest.fn(),
}));

describe("UserMetadataService", () => {
  const driver = new UserMetadataServiceDriver();

  beforeAll(initSupertokens);
  beforeAll(setupTestDb);
  beforeEach(cleanupCollections);
  afterEach(resetGoogleSyncActivityForTests);
  afterAll(cleanupTestDb);

  describe("updateUserMetadata", () => {
    it("merges metadata and returns the latest snapshot", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      const metadata = await driver.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "RESTART" } },
      });

      expect(metadata.sync?.importGCal).toBe("RESTART");

      const persisted = await driver.fetchUserMetadata(userId);

      expect(persisted.sync?.importGCal).toBe("RESTART");
    });

    it("tags the user in Kit on first opt-in to updates", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const { addTagToSubscriber } = EmailDriver.mockEmailServiceResponse();

      const metadata = await driver.updateUserMetadata({
        userId,
        data: { subscribeToUpdates: true },
      });

      expect(metadata.subscribeToUpdates).toBe(true);
      expect(addTagToSubscriber).toHaveBeenCalledTimes(1);

      addTagToSubscriber.mockRestore();
    });

    it("does not re-tag the user in Kit on a repeat opt-in", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const { addTagToSubscriber } = EmailDriver.mockEmailServiceResponse();

      await driver.updateUserMetadata({
        userId,
        data: { subscribeToUpdates: true },
      });
      await driver.updateUserMetadata({
        userId,
        data: { subscribeToUpdates: true },
      });

      expect(addTagToSubscriber).toHaveBeenCalledTimes(1);

      addTagToSubscriber.mockRestore();
    });

    it("does not tag the user in Kit when not opting in", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const { addTagToSubscriber } = EmailDriver.mockEmailServiceResponse();

      const metadata = await driver.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "RESTART" } },
      });

      expect(metadata.subscribeToUpdates).toBeUndefined();
      expect(addTagToSubscriber).not.toHaveBeenCalled();

      addTagToSubscriber.mockRestore();
    });
  });

  describe("fetchUserMetadata", () => {
    it("retrieves stored metadata for the user", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      await driver.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "RESTART" } },
      });

      const metadata = await driver.fetchUserMetadata(userId);

      expect(metadata.sync?.importGCal).toBe("RESTART");
    });

    it("returns NOT_CONNECTED when the user never connected Google", async () => {
      const user = await UserDriver.createUser({ withGoogle: false });
      const userId = user._id.toString();

      const metadata = await driver.fetchUserMetadata(userId);

      expect(metadata.google?.connectionState).toBe("NOT_CONNECTED");
    });

    it("returns RECONNECT_REQUIRED when the refresh token is missing", async () => {
      const user = await UserDriver.createUser({
        withGoogleRefreshToken: false,
      });
      const userId = user._id.toString();

      const metadata = await driver.fetchUserMetadata(userId);

      expect(metadata.google?.connectionState).toBe("RECONNECT_REQUIRED");
    });

    it("returns HEALTHY when the account is connected and sync state is healthy", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();

      const metadata = await driver.fetchUserMetadata(userId);

      expect(metadata.google?.connectionState).toBe("HEALTHY");
    });

    it("returns HEALTHY without active watches when running without an HTTPS Google webhook URL", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const isUsingGcalWebhookHttpsSpy = isUsingGcalWebhookHttps as jest.Mock;
      isUsingGcalWebhookHttpsSpy.mockReturnValue(false);

      await GoogleWatchDriver.removeActiveGoogleWatchesForUser(userId);

      const metadata = await driver.fetchUserMetadata(userId);

      expect(metadata.google?.connectionState).toBe("HEALTHY");

      isUsingGcalWebhookHttpsSpy.mockRestore();
    });

    it("returns ATTENTION without active watches when using an HTTPS Google webhook URL", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const isUsingGcalWebhookHttpsSpy = isUsingGcalWebhookHttps as jest.Mock;
      isUsingGcalWebhookHttpsSpy.mockReturnValue(true);

      await GoogleWatchDriver.removeActiveGoogleWatchesForUser(userId);

      const metadata = await driver.fetchUserMetadata(userId);

      expect(metadata.google?.connectionState).toBe("ATTENTION");

      isUsingGcalWebhookHttpsSpy.mockRestore();
    });

    it("returns ATTENTION without scheduling repair when connected sync state is broken", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const restartSpy = jest
        .spyOn(googleCalendarSyncService, "startGoogleCalendarSyncIfNeeded")
        .mockResolvedValue();

      const metadata = await driver.fetchUserMetadata(userId);

      expect(metadata.google?.connectionState).toBe("ATTENTION");
      expect(restartSpy).not.toHaveBeenCalled();

      restartSpy.mockRestore();
    });

    it("returns ATTENTION after a repair failed", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      await driver.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "ERRORED" } },
      });

      const metadata = await driver.fetchUserMetadata(userId);

      expect(metadata.google?.connectionState).toBe("ATTENTION");
    });

    it("returns ATTENTION when stored importing metadata has no active sync", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const restartSpy = jest
        .spyOn(googleCalendarSyncService, "startGoogleCalendarSyncIfNeeded")
        .mockResolvedValue();

      await driver.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "IMPORTING" } },
      });

      const metadata = await driver.fetchUserMetadata(userId);

      expect(metadata.google?.connectionState).toBe("ATTENTION");
      expect(restartSpy).not.toHaveBeenCalled();

      restartSpy.mockRestore();
    });

    it("returns IMPORTING while Google sync work is active", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      expect(tryBeginGoogleSync(userId)).toBe(true);
      const metadata = await driver.fetchUserMetadata(userId);
      endGoogleSync(userId);

      expect(metadata.google?.connectionState).toBe("IMPORTING");
    });

    it("returns ATTENTION when a restart is pending", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      await driver.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "RESTART" } },
      });

      const metadata = await driver.fetchUserMetadata(userId);

      expect(metadata.google?.connectionState).toBe("ATTENTION");
    });
  });
});
