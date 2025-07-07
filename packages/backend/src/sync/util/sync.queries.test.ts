import {
  cleanupTestMongo,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import {
  getGCalEventsSyncPageToken,
  updateGCalEventsSyncPageToken,
} from "@backend/sync/util/sync.queries";

describe("sync.queries nextPageToken", () => {
  let setup: Awaited<ReturnType<typeof setupTestDb>>;

  beforeAll(async () => {
    setup = await setupTestDb();
  });

  afterAll(async () => {
    await cleanupTestMongo(setup);
  });

  it("updates and retrieves nextPageToken", async () => {
    const token = "page123";
    const gCalendarId = "test-calendar";

    await updateGCalEventsSyncPageToken(setup.userId, gCalendarId, token);

    await expect(
      getGCalEventsSyncPageToken(setup.userId, gCalendarId),
    ).resolves.toBe(token);
  });

  it("returns undefined when token not found", async () => {
    await expect(
      getGCalEventsSyncPageToken(setup.userId, "missing-cal"),
    ).resolves.toBeUndefined();
  });
});
