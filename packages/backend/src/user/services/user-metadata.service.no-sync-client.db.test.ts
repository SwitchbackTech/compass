import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UserMetadataServiceDriver } from "@backend/__tests__/drivers/user-metadata.service.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { mockEnv } from "@backend/__tests__/helpers/mock.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";

// Isolated from user-metadata.service.db.test.ts on purpose:
// getSyncServiceClient() caches its result for the life of the process, so
// this file needs to unset SYNC_SERVICE_URL/SYNC_INTERNAL_AUTH_TOKEN before
// ANY test (in this file or any other sharing the process) calls
// fetchUserMetadata with a real client - otherwise the cached client wins
// regardless of what CONFIG says afterward.
describe("UserMetadataService (no Sync client configured)", () => {
  const driver = new UserMetadataServiceDriver();

  beforeAll(initSupertokens);
  beforeAll(() => setupTestDb(import.meta.url));
  beforeEach(() => {
    mockEnv({
      SYNC_SERVICE_URL: undefined,
      SYNC_INTERNAL_AUTH_TOKEN: undefined,
    });
  });
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  describe("fetchUserMetadata", () => {
    // assessGoogleMetadata's local fallback: real deployments always have a
    // Sync client (SYNC_SERVICE_URL/SYNC_INTERNAL_AUTH_TOKEN are required
    // config), but the code still defends against a CONFIG in a state the
    // schema wouldn't produce (e.g. a test/mock override) rather than crash.
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

    it("returns ATTENTION when connected but no Sync client is configured", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      const metadata = await driver.fetchUserMetadata(userId);

      expect(metadata.google?.connectionState).toBe("ATTENTION");
    });
  });
});
