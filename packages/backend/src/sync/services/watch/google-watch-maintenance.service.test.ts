import { ObjectId } from "mongodb";
import { Origin } from "@core/constants/core.constants";
import { Resource_Sync } from "@core/types/sync.types";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";
import { googleWatchMaintenanceService } from "@backend/sync/services/watch/google-watch-maintenance.service";
import { googleWatchRepairService } from "@backend/sync/services/watch/google-watch-repair.service";

describe("googleWatchMaintenanceService", () => {
  beforeAll(initSupertokens);
  beforeEach(async () => {
    await setupTestDb();
    await cleanupCollections();
  });
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

  it("repairs expired watches for active Google-connected users instead of pruning them", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();
    const repairSpy = jest
      .spyOn(googleWatchRepairService, "ensureGoogleWatches")
      .mockResolvedValue({
        action: "REPAIRED",
        reason: "WATCHES_EXPIRED",
      });

    await mongoService.event.insertOne({
      user: userId,
      origin: Origin.COMPASS,
      updatedAt: new Date(),
    } as never);
    await mongoService.sync.insertOne({
      user: userId,
      google: {
        calendarlist: [
          {
            gCalendarId: Resource_Sync.CALENDAR,
            nextSyncToken: "calendar-token",
            lastSyncedAt: new Date(),
          },
        ],
        events: [
          {
            gCalendarId: "primary",
            nextSyncToken: "event-token",
            lastSyncedAt: new Date(),
          },
        ],
      },
    });
    await mongoService.watch.insertOne({
      _id: new ObjectId(),
      user: userId,
      resourceId: "resource-id",
      expiration: new Date(Date.now() - 60_000),
      gCalendarId: "primary",
      createdAt: new Date(),
    });

    const result = await googleWatchMaintenanceService.runMaintenanceByUser(
      userId,
      { log: false },
    );

    expect(repairSpy).toHaveBeenCalledWith(userId, expect.any(Object));
    expect(result.repaired).toBe(1);
    expect(result.pruned).toBe(0);

    repairSpy.mockRestore();
  });
});
