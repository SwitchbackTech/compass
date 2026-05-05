import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import { sseServer } from "@backend/servers/sse/sse.server";
import { googleCalendarSyncService } from "@backend/sync/services/google-sync/google-sync.service";
import * as syncImportService from "@backend/sync/services/import/google-import.service";
import { googleWatchService } from "@backend/sync/services/watch/google-watch.service";
import userService from "@backend/user/services/user.service";
import userMetadataService from "@backend/user/services/user-metadata.service";

describe("googleCalendarSyncService", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  describe("importLatestGoogleCalendarChanges", () => {
    it("emits INCREMENTAL operation when incremental import is ignored", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const importEndSpy = jest.spyOn(sseServer, "handleImportGCalEnd");

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { incrementalGCalSync: "COMPLETED" } },
      });

      await googleCalendarSyncService.importLatestGoogleCalendarChanges(userId);

      expect(importEndSpy).toHaveBeenCalledWith(userId, {
        operation: "INCREMENTAL",
        status: "IGNORED",
        message: `User ${userId} gcal incremental sync is in progress or completed, ignoring this request`,
      });
    });

    it("emits INCREMENTAL operation when incremental import completes", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const importEndSpy = jest.spyOn(sseServer, "handleImportGCalEnd");

      jest.spyOn(syncImportService, "createSyncImport").mockResolvedValue({
        importLatestEvents: jest.fn().mockResolvedValue({}),
      } as unknown as Awaited<
        ReturnType<typeof syncImportService.createSyncImport>
      >);

      await googleCalendarSyncService.importLatestGoogleCalendarChanges(userId);

      expect(importEndSpy).toHaveBeenCalledWith(userId, {
        operation: "INCREMENTAL",
        status: "COMPLETED",
      });
    });
  });

  describe("initializeGoogleCalendarSync", () => {
    it("starts Google watches only after full import succeeds", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const callOrder: string[] = [];
      const startWatching = googleWatchService.startGoogleWatches;

      jest.spyOn(syncImportService, "createSyncImport").mockResolvedValue({
        importAllEvents: jest.fn().mockImplementation(async () => {
          callOrder.push("importFull");
          return {
            nextSyncToken: "next-sync-token",
            totalChanged: 0,
            totalProcessed: 0,
            totalSaved: 0,
          };
        }),
      } as unknown as Awaited<
        ReturnType<typeof syncImportService.createSyncImport>
      >);
      jest
        .spyOn(googleWatchService, "startGoogleWatches")
        .mockImplementation(async (...args) => {
          callOrder.push("startWatching");
          return startWatching(...args);
        });

      await googleCalendarSyncService.initializeGoogleCalendarSync(userId);

      expect(callOrder).toEqual(["importFull", "startWatching"]);
    });
  });

  describe("startGoogleCalendarSyncIfNeeded", () => {
    it("skips sync setup when import is completed", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const importEndSpy = jest.spyOn(sseServer, "handleImportGCalEnd");

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "COMPLETED" } },
      });

      const stopSpy = jest.spyOn(userService, "stopGoogleCalendarSync");
      const startSpy = jest.spyOn(
        googleCalendarSyncService,
        "initializeGoogleCalendarSync",
      );

      await googleCalendarSyncService.startGoogleCalendarSyncIfNeeded(userId);

      expect(stopSpy).not.toHaveBeenCalled();
      expect(startSpy).not.toHaveBeenCalled();
      expect(importEndSpy).toHaveBeenCalledWith(userId, {
        operation: "INCREMENTAL",
        status: "IGNORED",
        message: `User ${userId} gcal import is in progress or completed, ignoring this request`,
      });
    });
  });

  describe("repairGoogleCalendarSync", () => {
    it("forces sync setup when import is completed", async () => {
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
        .spyOn(googleCalendarSyncService, "initializeGoogleCalendarSync")
        .mockResolvedValue({ eventsCount: 0, calendarsCount: 0 });

      await googleCalendarSyncService.repairGoogleCalendarSync(userId);

      expect(stopSpy).toHaveBeenCalledWith(userId);
      expect(startSpy).toHaveBeenCalledWith(userId);
    });
  });
});
