import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import { googleCalendarSyncService } from "@backend/sync/services/google-sync/google-sync.service";
import { googleWatchService } from "@backend/sync/services/watch/google-watch.service";
import { googleWatchRepairService } from "@backend/sync/services/watch/google-watch-repair.service";
import {
  type GoogleWatchStateInspection,
  GoogleWatchStateStatus,
} from "@backend/sync/services/watch/google-watch-state";

const createState = (
  status: GoogleWatchStateStatus,
  reason: GoogleWatchStateInspection["reason"],
): GoogleWatchStateInspection => ({
  status,
  reason,
  activeWatches: [],
  duplicateWatches: [],
  expectedWatchCalendarIds: [],
  expiredWatches: [],
  missingWatchCalendarIds: [],
  staleWatches: [],
  watchesToRefresh: [],
});

describe("googleWatchRepairService", () => {
  beforeAll(async () => {
    initSupertokens();
    await setupTestDb();
  });
  beforeEach(cleanupCollections);
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  it("recreates watches and forces incremental catch-up when sync tokens are usable", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();
    const stopWatchesSpy = jest
      .spyOn(googleWatchService, "stopWatches")
      .mockResolvedValue([]);
    const importLatestSpy = jest
      .spyOn(googleCalendarSyncService, "importLatestGoogleCalendarChanges")
      .mockResolvedValue([]);

    const result = await googleWatchRepairService.ensureGoogleWatches(userId, {
      force: true,
      state: createState(
        GoogleWatchStateStatus.REPAIR_REQUIRED,
        "WATCHES_MISSING",
      ),
    });

    expect(result).toEqual({
      action: "REPAIRED",
      reason: "WATCHES_MISSING",
    });
    expect(stopWatchesSpy).toHaveBeenCalledWith(userId, expect.any(Object));
    expect(importLatestSpy).toHaveBeenCalledWith(
      userId,
      expect.any(Object),
      1000,
      { force: true },
    );
  });

  it("starts full repair when sync tokens are not usable", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();
    const fullRepairSpy = jest
      .spyOn(googleCalendarSyncService, "repairGoogleCalendarSync")
      .mockResolvedValue();

    const result = await googleWatchRepairService.ensureGoogleWatches(userId, {
      force: true,
      state: createState(
        GoogleWatchStateStatus.FULL_REPAIR_REQUIRED,
        "SYNC_TOKEN_MISSING",
      ),
    });

    expect(result).toEqual({
      action: "FULL_REPAIR_STARTED",
      reason: "SYNC_TOKEN_MISSING",
    });
    expect(fullRepairSpy).toHaveBeenCalledWith(userId);
  });

  it("uses a persisted cooldown to avoid repeated Google repair calls", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();
    const fullRepairSpy = jest
      .spyOn(googleCalendarSyncService, "repairGoogleCalendarSync")
      .mockResolvedValue();
    const state = createState(
      GoogleWatchStateStatus.FULL_REPAIR_REQUIRED,
      "SYNC_TOKEN_MISSING",
    );

    await googleWatchRepairService.ensureGoogleWatches(userId, { state });
    const secondResult = await googleWatchRepairService.ensureGoogleWatches(
      userId,
      { state },
    );

    expect(fullRepairSpy).toHaveBeenCalledTimes(1);
    expect(secondResult).toEqual({
      action: "COOLDOWN",
      reason: "COOLDOWN",
    });
  });
});
