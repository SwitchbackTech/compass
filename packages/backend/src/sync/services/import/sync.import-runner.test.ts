import { faker } from "@faker-js/faker";
import { Resource_Sync } from "@core/types/sync.types";
import { WatchSchema } from "@core/types/watch.types";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { createGoogleError } from "@backend/__tests__/mocks.gcal/errors/error.google.factory";
import { invalidGrant400Error } from "@backend/__tests__/mocks.gcal/errors/error.google.invalidGrant";
import calendarService from "@backend/calendar/services/calendar.service";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";
import { sseServer } from "@backend/servers/sse/sse.server";
import * as syncImportService from "@backend/sync/services/import/sync.import";
import syncImportRunner from "@backend/sync/services/import/sync.import-runner";
import syncWatchService from "@backend/sync/services/watch/sync.watch.service";
import { isUsingGcalWebhookHttps } from "@backend/sync/util/sync.util";
import userService from "@backend/user/services/user.service";
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

  describe("restartGoogleCalendarSync", () => {
    it("restarts the import workflow and completes successfully", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const importEndSpy = jest.spyOn(sseServer, "handleImportGCalEnd");

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "RESTART" } },
      });

      await syncImportRunner.restartGoogleCalendarSync(userId);

      const metadata = await userMetadataService.fetchUserMetadata(userId);
      expect(metadata.sync?.importGCal).toBe("COMPLETED");

      const listCalendarsForUser =
        calendarService.getByUser.bind(calendarService);
      const calendars = await listCalendarsForUser(userId);
      expect(calendars.length).toBeGreaterThan(0);
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

      await syncImportRunner.restartGoogleCalendarSync(userId);

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

      await syncImportRunner.restartGoogleCalendarSync(userId, { force: true });

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

      const firstRestart = syncImportRunner.restartGoogleCalendarSync(userId, {
        force: true,
      });
      await Promise.resolve();

      const secondRestart = syncImportRunner.restartGoogleCalendarSync(userId, {
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

      await syncImportRunner.restartGoogleCalendarSync(userId, { force: true });

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

      await syncImportRunner.restartGoogleCalendarSync(userId, { force: true });

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

      await syncImportRunner.restartGoogleCalendarSync(userId, { force: true });

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
