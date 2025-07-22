import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import {
  getGCalEventsSyncPageToken,
  updateGCalEventsSyncPageToken,
} from "@backend/sync/util/sync.queries";
import { UtilDriver } from "../../__tests__/drivers/util.driver";

describe("sync.queries nextPageToken", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("updates and retrieves nextPageToken", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const token = "page123";
    const gCalendarId = "test-calendar";

    await updateGCalEventsSyncPageToken(
      user._id.toString(),
      gCalendarId,
      token,
    );

    await expect(
      getGCalEventsSyncPageToken(user._id.toString(), gCalendarId),
    ).resolves.toBe(token);
  });

  it("returns undefined when token not found", async () => {
    const { user } = await UtilDriver.setupTestUser();

    await expect(
      getGCalEventsSyncPageToken(user._id.toString(), "missing-cal"),
    ).resolves.toBeUndefined();
  });
});
