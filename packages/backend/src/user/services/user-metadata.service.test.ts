import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import userMetadataService from "@backend/user/services/user-metadata.service";

describe("UserMetadataService", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  describe("updateUserMetadata", () => {
    it("merges metadata and returns the latest snapshot", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      const metadata = await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "restart" } },
      });

      expect(metadata.sync?.importGCal).toBe("restart");

      const persisted = await userMetadataService.fetchUserMetadata(userId);

      expect(persisted.sync?.importGCal).toBe("restart");
    });
  });

  describe("fetchUserMetadata", () => {
    it("retrieves stored metadata for the user", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "restart" } },
      });

      const metadata = await userMetadataService.fetchUserMetadata(userId);

      expect(metadata.sync?.importGCal).toBe("restart");
    });

    it("enriches metadata with hasRefreshToken = true when user has refresh token", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      const metadata = await userMetadataService.fetchUserMetadata(userId);

      expect(metadata.google?.hasRefreshToken).toBe(true);
    });

    it("enriches metadata with hasRefreshToken = false when user has no refresh token", async () => {
      const user = await UserDriver.createUser({
        withGoogleRefreshToken: false,
      });
      const userId = user._id.toString();

      const metadata = await userMetadataService.fetchUserMetadata(userId);

      expect(metadata.google?.hasRefreshToken).toBe(false);
    });
  });
});
