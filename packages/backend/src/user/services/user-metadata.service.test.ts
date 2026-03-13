import { UserMetadataServiceDriver } from "@backend/__tests__/drivers/user-metadata.service.driver";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import { WatchDriver } from "@backend/__tests__/drivers/watch.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import { isUsingHttps } from "@backend/sync/util/sync.util";
import userService from "@backend/user/services/user.service";

// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- mock factory spreads requireActual
jest.mock("@backend/sync/util/sync.util", () => ({
  ...jest.requireActual("@backend/sync/util/sync.util"),
  isUsingHttps: jest.fn(),
}));

describe("UserMetadataService", () => {
  const driver = new UserMetadataServiceDriver();

  beforeAll(initSupertokens);
  beforeAll(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  describe("updateUserMetadata", () => {
    it("merges metadata and returns the latest snapshot", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      const metadata = await driver.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "restart" } },
      });

      expect(metadata.sync?.importGCal).toBe("restart");

      const persisted = await driver.fetchUserMetadata(userId);

      expect(persisted.sync?.importGCal).toBe("restart");
    });
  });

  describe("fetchUserMetadata", () => {
    it("retrieves stored metadata for the user", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      await driver.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "restart" } },
      });

      const metadata = await driver.fetchUserMetadata(userId);

      expect(metadata.sync?.importGCal).toBe("restart");
    });

    it("returns not_connected when the user never connected Google", async () => {
      const user = await UserDriver.createUser({ withGoogle: false });
      const userId = user._id.toString();

      const metadata = await driver.fetchUserMetadata(userId);

      expect(metadata.google).toMatchObject({
        hasRefreshToken: false,
        connectionStatus: "not_connected",
        syncStatus: "none",
      });
    });

    it("returns reconnect_required when the refresh token is missing", async () => {
      const user = await UserDriver.createUser({
        withGoogleRefreshToken: false,
      });
      const userId = user._id.toString();

      const metadata = await driver.fetchUserMetadata(userId);

      expect(metadata.google).toMatchObject({
        hasRefreshToken: false,
        connectionStatus: "reconnect_required",
        syncStatus: "none",
      });
    });

    it("returns healthy when the account is connected and sync state is healthy", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();

      const metadata = await driver.fetchUserMetadata(userId);

      expect(metadata.google).toMatchObject({
        hasRefreshToken: true,
        connectionStatus: "connected",
        syncStatus: "healthy",
      });
    });

    it("returns healthy without active watches when running without https", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const isUsingHttpsSpy = isUsingHttps as jest.Mock;
      isUsingHttpsSpy.mockReturnValue(false);

      await WatchDriver.deleteManyByUser(userId);

      const metadata = await driver.fetchUserMetadata(userId);

      expect(metadata.google).toMatchObject({
        hasRefreshToken: true,
        connectionStatus: "connected",
        syncStatus: "healthy",
      });

      isUsingHttpsSpy.mockRestore();
    });

    it("returns attention without scheduling repair when connected sync state is broken", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const restartSpy = jest
        .spyOn(userService, "restartGoogleCalendarSync")
        .mockResolvedValue();

      const metadata = await driver.fetchUserMetadata(userId);

      expect(metadata.google).toMatchObject({
        hasRefreshToken: true,
        connectionStatus: "connected",
        syncStatus: "attention",
      });
      expect(restartSpy).not.toHaveBeenCalled();

      restartSpy.mockRestore();
    });

    it("returns attention after a repair failed", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      await driver.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "errored" } },
      });

      const metadata = await driver.fetchUserMetadata(userId);

      expect(metadata.google).toMatchObject({
        hasRefreshToken: true,
        connectionStatus: "connected",
        syncStatus: "attention",
      });
    });

    it("returns repairing while an import is already running without scheduling a repair", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const restartSpy = jest
        .spyOn(userService, "restartGoogleCalendarSync")
        .mockResolvedValue();

      await driver.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "importing" } },
      });

      const metadata = await driver.fetchUserMetadata(userId);

      expect(metadata.google).toMatchObject({
        connectionStatus: "connected",
        syncStatus: "repairing",
      });
      expect(restartSpy).not.toHaveBeenCalled();

      restartSpy.mockRestore();
    });
  });
});
