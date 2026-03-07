import { ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";
import { type Schema_User } from "@core/types/user.types";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";
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
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();

      const metadata = await userMetadataService.fetchUserMetadata(userId);

      expect(metadata.google?.hasRefreshToken).toBe(true);
      expect(metadata.google?.connectionStatus).toBe("connected");
      expect(metadata.google?.syncStatus).toBe("healthy");
    });

    it("enriches metadata with hasRefreshToken = false when user has no refresh token", async () => {
      const user = await UserDriver.createUser({
        withGoogleRefreshToken: false,
      });
      const userId = user._id.toString();

      const metadata = await userMetadataService.fetchUserMetadata(userId);

      expect(metadata.google?.hasRefreshToken).toBe(false);
      expect(metadata.google?.connectionStatus).toBe("reconnect_required");
      expect(metadata.google?.syncStatus).toBe("none");
    });

    it("returns not_connected when the user never linked Google", async () => {
      const userId = new ObjectId().toString();
      const user: Schema_User & { _id: ObjectId } = {
        _id: new ObjectId(userId),
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        name: faker.person.fullName(),
        locale: "en",
      };

      await mongoService.user.insertOne(user);

      const metadata = await userMetadataService.fetchUserMetadata(userId);

      expect(metadata.google?.connectionStatus).toBe("not_connected");
      expect(metadata.google?.syncStatus).toBe("none");
    });

    it("returns attention when Google is connected but sync is broken", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      const metadata = await userMetadataService.fetchUserMetadata(userId);

      expect(metadata.google?.connectionStatus).toBe("connected");
      expect(metadata.google?.syncStatus).toBe("attention");
    });

    it("returns repairing when a repair is already in progress", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "restart" } },
      });

      const metadata = await userMetadataService.fetchUserMetadata(userId);

      expect(metadata.google?.connectionStatus).toBe("connected");
      expect(metadata.google?.syncStatus).toBe("repairing");
    });
  });
});
