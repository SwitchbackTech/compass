import { Resource_Sync } from "@core/types/sync.types";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import calendarService from "@backend/calendar/services/calendar.service";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";
import { sseServer } from "@backend/servers/sse/sse.server";
import * as syncImportService from "@backend/sync/services/import/sync.import";
import syncImportRunner from "@backend/sync/services/import/sync.import-runner";
import syncWatchService from "@backend/sync/services/watch/sync.watch.service";
import { isUsingGcalWebhookHttps } from "@backend/sync/util/sync.util";
import userMetadataService from "@backend/user/services/user-metadata.service";

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return -- jest.mock factory delegates to requireActual */
jest.mock("@backend/sync/util/sync.util", () => {
  const actual = jest.requireActual("@backend/sync/util/sync.util");
  return {
    ...actual,
    isUsingGcalWebhookHttps: jest.fn(() => actual.isUsingGcalWebhookHttps()),
  };
});
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */

describe("syncImportRunner", () => {
  beforeAll(initSupertokens);
  beforeEach(async () => {
    await setupTestDb();
    await cleanupCollections();
  });
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

      await syncImportRunner.importIncremental(userId);

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
      const createSyncImportSpy = jest
        .spyOn(syncImportService, "createSyncImport")
        .mockResolvedValue({
          importLatestEvents: jest.fn().mockResolvedValue({}),
        } as unknown as Awaited<
          ReturnType<typeof syncImportService.createSyncImport>
        >);

      await syncImportRunner.importIncremental(userId);

      expect(importEndSpy).toHaveBeenCalledWith(userId, {
        operation: "INCREMENTAL",
        status: "COMPLETED",
      });

      createSyncImportSpy.mockRestore();
    });

    it("emits INCREMENTAL operation when incremental import fails", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const importEndSpy = jest.spyOn(sseServer, "handleImportGCalEnd");
      const error = new Error("incremental failed");
      const createSyncImportSpy = jest
        .spyOn(syncImportService, "createSyncImport")
        .mockResolvedValue({
          importLatestEvents: jest.fn().mockRejectedValue(error),
        } as unknown as Awaited<
          ReturnType<typeof syncImportService.createSyncImport>
        >);

      await expect(syncImportRunner.importIncremental(userId)).rejects.toThrow(
        "incremental failed",
      );

      expect(importEndSpy).toHaveBeenCalledWith(userId, {
        operation: "INCREMENTAL",
        status: "ERRORED",
        message: `Incremental Google Calendar sync failed for user: ${userId}`,
      });

      createSyncImportSpy.mockRestore();
    });
  });

  describe("startGoogleCalendarSync", () => {
    it("initializes calendars, events, and sync metadata", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      await syncImportRunner.startGoogleCalendarSync(userId);

      const listCalendarsForUser =
        calendarService.getByUser.bind(calendarService);
      const calendars = await listCalendarsForUser(userId);
      expect(calendars.length).toBeGreaterThan(0);

      const syncRecord = await mongoService.sync.findOne({ user: userId });
      expect(syncRecord?.google?.events?.length ?? 0).toBeGreaterThan(0);

      const eventCount = await mongoService.event.countDocuments({
        user: userId,
      });
      expect(eventCount).toBeGreaterThan(0);
    });

    it("starts Google watches only after full import succeeds", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const callOrder: string[] = [];
      const importFull = syncImportRunner.importFull.bind(syncImportRunner);
      const startWatching =
        syncWatchService.startWatchingGcalResources.bind(syncWatchService);

      const importFullSpy = jest
        .spyOn(syncImportRunner, "importFull")
        .mockImplementation(async (...args) => {
          callOrder.push("importFull");
          return importFull(...args);
        });
      const startWatchingSpy = jest
        .spyOn(syncWatchService, "startWatchingGcalResources")
        .mockImplementation(async (...args) => {
          callOrder.push("startWatching");
          return startWatching(...args);
        });

      await syncImportRunner.startGoogleCalendarSync(userId);

      expect(callOrder).toEqual(["importFull", "startWatching"]);

      importFullSpy.mockRestore();
      startWatchingSpy.mockRestore();
    });

    it("does not create watches when full import fails before token persistence", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const importError = new Error("import failed before sync token");
      const importFullSpy = jest
        .spyOn(syncImportRunner, "importFull")
        .mockRejectedValue(importError);
      const startWatchingSpy = jest.spyOn(
        syncWatchService,
        "startWatchingGcalResources",
      );

      await expect(
        syncImportRunner.startGoogleCalendarSync(userId),
      ).rejects.toThrow(importError);

      expect(startWatchingSpy).not.toHaveBeenCalled();
      expect(await mongoService.watch.countDocuments({ user: userId })).toBe(0);

      importFullSpy.mockRestore();
      startWatchingSpy.mockRestore();
    });

    it("persists event sync tokens without https so local sync can settle healthy", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      (isUsingGcalWebhookHttps as jest.Mock).mockReturnValue(false);

      await syncImportRunner.startGoogleCalendarSync(userId);

      const syncRecord = await mongoService.sync.findOne({ user: userId });
      const metadata = await userMetadataService.fetchUserMetadata(userId);

      expect(syncRecord?.google?.events?.length ?? 0).toBeGreaterThan(0);
      expect(
        syncRecord?.google?.events?.every(({ nextSyncToken }) =>
          Boolean(nextSyncToken),
        ),
      ).toBe(true);
      expect(metadata.google?.connectionState).toBe("HEALTHY");

      (isUsingGcalWebhookHttps as jest.Mock).mockRestore();
    });
  });

  describe("startWatchingGcalResources", () => {
    it("skips direct Google watch setup when the Google webhook URL is not HTTPS", async () => {
      (isUsingGcalWebhookHttps as jest.Mock).mockReturnValue(false);
      const startCalendarWatchSpy = jest.spyOn(
        syncWatchService,
        "startWatchingGcalCalendars",
      );
      const startEventWatchSpy = jest.spyOn(
        syncWatchService,
        "startWatchingGcalEvents",
      );

      await expect(
        syncWatchService.startWatchingGcalResources(
          "507f1f77bcf86cd799439011",
          [{ gCalendarId: Resource_Sync.CALENDAR }, { gCalendarId: "primary" }],
          {} as never,
        ),
      ).resolves.toEqual([]);

      expect(startCalendarWatchSpy).not.toHaveBeenCalled();
      expect(startEventWatchSpy).not.toHaveBeenCalled();

      (isUsingGcalWebhookHttps as jest.Mock).mockRestore();
    });

    it("starts Google watches when the Google webhook URL is HTTPS", async () => {
      (isUsingGcalWebhookHttps as jest.Mock).mockReturnValue(true);
      const startCalendarWatchSpy = jest
        .spyOn(syncWatchService, "startWatchingGcalCalendars")
        .mockResolvedValue({ acknowledged: true } as never);
      const startEventWatchSpy = jest
        .spyOn(syncWatchService, "startWatchingGcalEvents")
        .mockResolvedValue({ acknowledged: true } as never);

      await expect(
        syncWatchService.startWatchingGcalResources(
          "507f1f77bcf86cd799439011",
          [{ gCalendarId: Resource_Sync.CALENDAR }, { gCalendarId: "primary" }],
          {} as never,
        ),
      ).resolves.toHaveLength(2);

      expect(startCalendarWatchSpy).toHaveBeenCalledTimes(1);
      expect(startEventWatchSpy).toHaveBeenCalledTimes(1);

      (isUsingGcalWebhookHttps as jest.Mock).mockRestore();
      startCalendarWatchSpy.mockRestore();
      startEventWatchSpy.mockRestore();
    });
  });
});
