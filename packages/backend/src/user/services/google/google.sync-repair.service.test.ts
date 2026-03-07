import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import userMetadataService from "@backend/user/services/user-metadata.service";
import userService from "@backend/user/services/user.service";
import googleSyncRepairService from "./google.sync-repair.service";

describe("GoogleSyncRepairService", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  it("schedules a repair when Google is connected but sync is broken", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();
    const restartSpy = jest
      .spyOn(userService, "restartGoogleCalendarSync")
      .mockResolvedValue();

    await expect(
      googleSyncRepairService.ensureRepairScheduled(userId),
    ).resolves.toBe(true);

    const metadata = await userMetadataService.fetchUserMetadata(userId);

    expect(metadata.sync?.importGCal).toBe("restart");
    expect(restartSpy).toHaveBeenCalledWith(userId, { force: true });
  });

  it("does not schedule a duplicate repair while import is already running", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const userId = user._id.toString();
    const restartSpy = jest
      .spyOn(userService, "restartGoogleCalendarSync")
      .mockResolvedValue();

    await userMetadataService.updateUserMetadata({
      userId,
      data: { sync: { importGCal: "importing" } },
    });

    await expect(
      googleSyncRepairService.ensureRepairScheduled(userId),
    ).resolves.toBe(false);

    expect(restartSpy).not.toHaveBeenCalled();
  });

  it("leaves broken sync in attention after a prior repair failure", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();
    const restartSpy = jest
      .spyOn(userService, "restartGoogleCalendarSync")
      .mockResolvedValue();

    await userMetadataService.updateUserMetadata({
      userId,
      data: { sync: { importGCal: "errored" } },
    });

    await expect(
      googleSyncRepairService.ensureRepairScheduled(userId),
    ).resolves.toBe(false);

    expect(restartSpy).not.toHaveBeenCalled();
  });
});
