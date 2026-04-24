import { faker } from "@faker-js/faker";
import { WatchSchema } from "@core/types/watch.types";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { createGoogleError } from "@backend/__tests__/mocks.gcal/errors/error.google.factory";
import { invalidGrant400Error } from "@backend/__tests__/mocks.gcal/errors/error.google.invalidGrant";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";
import { sseServer } from "@backend/servers/sse/sse.server";
import syncImportRunner from "@backend/sync/services/import/sync.import-runner";
import syncRepairRunner from "@backend/sync/services/repair/sync.repair-runner";
import syncWatchService from "@backend/sync/services/watch/sync.watch.service";
import userService from "@backend/user/services/user.service";
import userMetadataService from "@backend/user/services/user-metadata.service";

describe("syncRepairRunner", () => {
  beforeAll(initSupertokens);
  beforeEach(async () => {
    await setupTestDb();
    await cleanupCollections();
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  describe("restartGoogleCalendarSync", () => {
    it("restarts the import workflow and completes successfully", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const importEndSpy = jest.spyOn(sseServer, "handleImportGCalEnd");

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "RESTART" } },
      });

      await syncRepairRunner.restartGoogleCalendarSync(userId);

      const metadata = await userMetadataService.fetchUserMetadata(userId);
      expect(metadata.sync?.importGCal).toBe("COMPLETED");
      expect(importEndSpy).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          operation: "INCREMENTAL",
          status: "COMPLETED",
        }),
      );
    });

    it("skips restart when import is completed and not forced", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const importEndSpy = jest.spyOn(sseServer, "handleImportGCalEnd");

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "COMPLETED" } },
      });

      const stopSpy = jest.spyOn(userService, "stopGoogleCalendarSync");
      const startSpy = jest.spyOn(syncImportRunner, "startGoogleCalendarSync");

      await syncRepairRunner.restartGoogleCalendarSync(userId);

      expect(stopSpy).not.toHaveBeenCalled();
      expect(startSpy).not.toHaveBeenCalled();

      const metadata = await userMetadataService.fetchUserMetadata(userId);
      expect(metadata.sync?.importGCal).toBe("COMPLETED");
      expect(importEndSpy).toHaveBeenCalledWith(userId, {
        operation: "INCREMENTAL",
        status: "IGNORED",
        message: `User ${userId} gcal import is in progress or completed, ignoring this request`,
      });

      stopSpy.mockRestore();
      startSpy.mockRestore();
    });

    it("forces restart when import is completed", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "COMPLETED" } },
      });

      const stopSpy = jest
        .spyOn(userService, "stopGoogleCalendarSync")
        .mockResolvedValue();
      const startSpy = jest
        .spyOn(syncImportRunner, "startGoogleCalendarSync")
        .mockResolvedValue({ eventsCount: 0, calendarsCount: 0 });

      await syncRepairRunner.restartGoogleCalendarSync(userId, { force: true });

      expect(stopSpy).toHaveBeenCalledWith(userId);
      expect(startSpy).toHaveBeenCalledWith(userId);

      const metadata = await userMetadataService.fetchUserMetadata(userId);
      expect(metadata.sync?.importGCal).toBe("COMPLETED");

      stopSpy.mockRestore();
      startSpy.mockRestore();
    });

    it("ignores a duplicate restart while the first full sync is still starting", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const importEndSpy = jest.spyOn(sseServer, "handleImportGCalEnd");
      let resolveFetchMetadata: (() => void) | undefined;
      const fetchMetadataDeferred = new Promise<void>((resolve) => {
        resolveFetchMetadata = resolve;
      });
      let fetchMetadataCallCount = 0;

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "RESTART" } },
      });

      const fetchMetadataSpy = jest
        .spyOn(userService, "fetchUserMetadata")
        .mockImplementation(async (targetUserId) => {
          fetchMetadataCallCount += 1;

          if (fetchMetadataCallCount === 1) {
            await fetchMetadataDeferred;
          }

          return userMetadataService.fetchUserMetadata(targetUserId);
        });
      const startSpy = jest
        .spyOn(syncImportRunner, "startGoogleCalendarSync")
        .mockResolvedValue({ eventsCount: 0, calendarsCount: 0 });
      const stopSpy = jest
        .spyOn(userService, "stopGoogleCalendarSync")
        .mockResolvedValue();

      const firstRestart = syncRepairRunner.restartGoogleCalendarSync(userId, {
        force: true,
      });
      await Promise.resolve();

      const secondRestart = syncRepairRunner.restartGoogleCalendarSync(userId, {
        force: true,
      });

      resolveFetchMetadata?.();

      await Promise.all([firstRestart, secondRestart]);

      expect(startSpy).toHaveBeenCalledTimes(1);
      expect(importEndSpy).toHaveBeenCalledWith(userId, {
        operation: "REPAIR",
        status: "IGNORED",
        message: `User ${userId} gcal import is in progress or completed, ignoring this request`,
      });

      fetchMetadataSpy.mockRestore();
      startSpy.mockRestore();
      stopSpy.mockRestore();
    });

    it("cleans up partial watch state when restart fails", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const importEndSpy = jest.spyOn(sseServer, "handleImportGCalEnd");
      const stopWatchesSpy = jest
        .spyOn(syncWatchService, "stopWatches")
        .mockImplementation(async (targetUserId) => {
          await syncWatchService.deleteWatchesByUser(targetUserId);
          return [];
        });
      const startSpy = jest
        .spyOn(syncImportRunner, "startGoogleCalendarSync")
        .mockImplementation(async () => {
          await mongoService.watch.insertOne(
            WatchSchema.parse({
              _id: mongoService.objectId(),
              user: userId,
              resourceId: faker.string.uuid(),
              expiration: faker.date.future(),
              gCalendarId: faker.string.uuid(),
              createdAt: new Date(),
            }),
          );

          throw new Error("sync failed");
        });

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "RESTART" } },
      });

      await syncRepairRunner.restartGoogleCalendarSync(userId, { force: true });

      const metadata = await userMetadataService.fetchUserMetadata(userId);
      expect(metadata.sync?.importGCal).toBe("ERRORED");
      expect(await mongoService.watch.countDocuments({ user: userId })).toBe(0);
      expect(importEndSpy).toHaveBeenCalledWith(userId, {
        operation: "REPAIR",
        status: "ERRORED",
        message: "Google Calendar repair failed. Please try again.",
      });

      stopWatchesSpy.mockRestore();
      startSpy.mockRestore();
    });

    it("prunes Google data and notifies revoked state when repair loses access", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const googleRevokedSpy = jest.spyOn(sseServer, "handleGoogleRevoked");
      const importEndSpy = jest.spyOn(sseServer, "handleImportGCalEnd");
      const startSpy = jest
        .spyOn(syncImportRunner, "startGoogleCalendarSync")
        .mockRejectedValue(invalidGrant400Error);

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "RESTART" } },
      });

      await syncRepairRunner.restartGoogleCalendarSync(userId, { force: true });

      const storedUser = await mongoService.user.findOne({ _id: user._id });
      const metadata = await userMetadataService.fetchUserMetadata(userId);

      expect(storedUser?.google?.gRefreshToken).toBe("");
      expect(metadata.google?.connectionState).toBe("RECONNECT_REQUIRED");
      expect(googleRevokedSpy).toHaveBeenCalledWith(userId);
      expect(importEndSpy).not.toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ status: "ERRORED" }),
      );

      startSpy.mockRestore();
    });

    it("emits a friendly quota error when Google repair hits rate limits", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const importEndSpy = jest.spyOn(sseServer, "handleImportGCalEnd");
      const quotaError = createGoogleError({
        code: "403",
        responseStatus: 403,
        message: "Quota exceeded",
      });
      if (quotaError.response) {
        quotaError.response.data = {
          error: {
            message:
              "Quota exceeded for quota metric 'Queries' and limit 'Queries per minute per user'.",
            errors: [{ reason: "quotaExceeded" }],
          },
        };
      }
      const startSpy = jest
        .spyOn(syncImportRunner, "startGoogleCalendarSync")
        .mockRejectedValue(quotaError);

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "RESTART" } },
      });

      await syncRepairRunner.restartGoogleCalendarSync(userId, { force: true });

      const metadata = await userMetadataService.fetchUserMetadata(userId);

      expect(metadata.sync?.importGCal).toBe("ERRORED");
      expect(importEndSpy).toHaveBeenCalledWith(userId, {
        operation: "REPAIR",
        status: "ERRORED",
        message:
          "Google Calendar repair hit a Google API limit. Please wait a few minutes and try again.",
      });

      startSpy.mockRestore();
    });
  });
});
