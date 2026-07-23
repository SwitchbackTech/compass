import { type UserMetadata } from "@core/types/user.types";
import { GoogleWatchDriver } from "@backend/__tests__/drivers/google-watch.driver";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UserMetadataServiceDriver } from "@backend/__tests__/drivers/user-metadata.service.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { getUserMetadataStore } from "@backend/auth/ports/supertokens.registry";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import {
  endGoogleSync,
  resetGoogleSyncActivityForTests,
  tryBeginGoogleSync,
} from "@backend/sync/services/google-sync/google-sync.activity";
import { googleCalendarSyncService } from "@backend/sync/services/google-sync/google-sync.service";
import * as googleWatchConfig from "@backend/sync/services/watch/google-watch-config";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  spyOn,
} from "bun:test";

describe("UserMetadataService", () => {
  const driver = new UserMetadataServiceDriver();

  beforeAll(initSupertokens);
  beforeAll(() => setupTestDb(import.meta.url));
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

    it("does not persist email subscription metadata from an update", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      await driver.updateUserMetadata({
        userId,
        data: { subscribeToUpdates: true } as Partial<UserMetadata>,
      });

      const stored = await getUserMetadataStore().getUserMetadata(userId);

      expect(stored.metadata).not.toHaveProperty("subscribeToUpdates");
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

    it("does not expose legacy email subscription metadata", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      await getUserMetadataStore().updateUserMetadata(userId, {
        subscribeToUpdates: true,
      } as Partial<UserMetadata>);

      const metadata = await driver.fetchUserMetadata(userId);

      expect(metadata).not.toHaveProperty("subscribeToUpdates");
    });

    it("does not expose legacy email subscription metadata after an update", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      await getUserMetadataStore().updateUserMetadata(userId, {
        subscribeToUpdates: true,
      } as Partial<UserMetadata>);

      const metadata = await driver.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "RESTART" } },
      });

      expect(metadata).not.toHaveProperty("subscribeToUpdates");
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
      const isUsingGcalWebhookHttpsSpy = spyOn(
        googleWatchConfig,
        "isUsingGcalWebhookHttps",
      ).mockReturnValue(false);

      await GoogleWatchDriver.removeActiveGoogleWatchesForUser(userId);

      const metadata = await driver.fetchUserMetadata(userId);

      expect(metadata.google?.connectionState).toBe("HEALTHY");

      isUsingGcalWebhookHttpsSpy.mockRestore();
    });

    it("returns ATTENTION without active watches when using an HTTPS Google webhook URL", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const isUsingGcalWebhookHttpsSpy = spyOn(
        googleWatchConfig,
        "isUsingGcalWebhookHttps",
      ).mockReturnValue(true);

      await GoogleWatchDriver.removeActiveGoogleWatchesForUser(userId);

      const metadata = await driver.fetchUserMetadata(userId);

      expect(metadata.google?.connectionState).toBe("ATTENTION");

      isUsingGcalWebhookHttpsSpy.mockRestore();
    });

    it("returns ATTENTION without scheduling repair when connected sync state is broken", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const restartSpy = spyOn(
        googleCalendarSyncService,
        "startGoogleCalendarSyncIfNeeded",
      ).mockResolvedValue();

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
      const restartSpy = spyOn(
        googleCalendarSyncService,
        "startGoogleCalendarSyncIfNeeded",
      ).mockResolvedValue();

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
