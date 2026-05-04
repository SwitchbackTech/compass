import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import { sseServer } from "@backend/servers/sse/sse.server";
import { syncChannelService } from "@backend/sync/services/channel/sync-channel.service";
import * as syncImportService from "@backend/sync/services/import/sync.import";
import { googleSyncLifecycleService } from "@backend/sync/services/lifecycle/google-sync-lifecycle.service";
import userService from "@backend/user/services/user.service";
import userMetadataService from "@backend/user/services/user-metadata.service";

describe("googleSyncLifecycleService", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  describe("importIncremental", () => {
    it("emits INCREMENTAL operation when incremental import is ignored", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const importEndSpy = jest.spyOn(sseServer, "handleImportGCalEnd");

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { incrementalGCalSync: "COMPLETED" } },
      });

      await googleSyncLifecycleService.importIncremental(userId);

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

      await googleSyncLifecycleService.importIncremental(userId);

      expect(importEndSpy).toHaveBeenCalledWith(userId, {
        operation: "INCREMENTAL",
        status: "COMPLETED",
      });
    });
  });

  describe("startGoogleCalendarSync", () => {
    it("starts Google watches only after full import succeeds", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const callOrder: string[] = [];
      const importFull = googleSyncLifecycleService.importFull;
      const startWatching = syncChannelService.startWatchingGcalResources;

      jest
        .spyOn(googleSyncLifecycleService, "importFull")
        .mockImplementation(async (...args) => {
          callOrder.push("importFull");
          return importFull(...args);
        });
      jest
        .spyOn(syncChannelService, "startWatchingGcalResources")
        .mockImplementation(async (...args) => {
          callOrder.push("startWatching");
          return startWatching(...args);
        });

      await googleSyncLifecycleService.startGoogleCalendarSync(userId);

      expect(callOrder).toEqual(["importFull", "startWatching"]);
    });
  });

  describe("restartGoogleCalendarSync", () => {
    it("skips restart when import is completed and not forced", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const importEndSpy = jest.spyOn(sseServer, "handleImportGCalEnd");

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "COMPLETED" } },
      });

      const stopSpy = jest.spyOn(userService, "stopGoogleCalendarSync");
      const startSpy = jest.spyOn(
        googleSyncLifecycleService,
        "startGoogleCalendarSync",
      );

      await googleSyncLifecycleService.restartGoogleCalendarSync(userId);

      expect(stopSpy).not.toHaveBeenCalled();
      expect(startSpy).not.toHaveBeenCalled();
      expect(importEndSpy).toHaveBeenCalledWith(userId, {
        operation: "INCREMENTAL",
        status: "IGNORED",
        message: `User ${userId} gcal import is in progress or completed, ignoring this request`,
      });
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
        .spyOn(googleSyncLifecycleService, "startGoogleCalendarSync")
        .mockResolvedValue({ eventsCount: 0, calendarsCount: 0 });

      await googleSyncLifecycleService.restartGoogleCalendarSync(userId, {
        force: true,
      });

      expect(stopSpy).toHaveBeenCalledWith(userId);
      expect(startSpy).toHaveBeenCalledWith(userId);
    });
  });
});
