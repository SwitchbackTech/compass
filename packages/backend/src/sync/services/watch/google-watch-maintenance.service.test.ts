import { ObjectId } from "mongodb";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";
import { googleWatchMaintenanceService } from "@backend/sync/services/watch/google-watch-maintenance.service";

describe("googleWatchMaintenanceService", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  it("returns maintenance buckets in dry mode without mutating watches", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();
    const watch = {
      _id: new ObjectId(),
      user: userId,
      resourceId: "resource-id",
      expiration: new Date(Date.now() - 60_000),
      gCalendarId: "primary",
      createdAt: new Date(),
    };
    await mongoService.watch.insertOne(watch);

    const result = await googleWatchMaintenanceService.runMaintenanceByUser(
      userId,
      { dry: true },
    );

    expect(result.prune[0].payload).toEqual([watch]);
    expect(await mongoService.watch.countDocuments({ user: userId })).toBe(1);
  });
});
