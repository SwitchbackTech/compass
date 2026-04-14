import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { createGoogleError } from "@backend/__tests__/mocks.gcal/errors/error.google.factory";
import { invalidGrant400Error } from "@backend/__tests__/mocks.gcal/errors/error.google.invalidGrant";
import { missingRefreshTokenError } from "@backend/__tests__/mocks.gcal/errors/error.missingRefreshToken";
import * as googleCalendarClient from "@backend/auth/services/google/clients/google.calendar.client";
import calendarService from "@backend/calendar/services/calendar.service";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { sseServer } from "@backend/servers/sse/sse.server";
import * as syncImportService from "@backend/sync/services/import/sync.import";
import syncService from "@backend/sync/services/sync.service";
import { isUsingHttps } from "@backend/sync/util/sync.util";
import userService from "@backend/user/services/user.service";
import userMetadataService from "@backend/user/services/user-metadata.service";
import { Resource_Sync, XGoogleResourceState } from "@core/types/sync.types";
import { WatchSchema } from "@core/types/watch.types";
import { faker } from "@faker-js/faker";
import { ObjectId } from "mongodb";

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return -- jest.mock factory delegates to requireActual */
jest.mock("@backend/sync/util/sync.util", () => {
  const actual = jest.requireActual("@backend/sync/util/sync.util");
  return {
    ...actual,
    isUsingHttps: jest.fn(() => actual.isUsingHttps()),
  };
});
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */

const createWatch = async (user: string) => {
  const watch = WatchSchema.parse({
    _id: new ObjectId(),
    user,
    resourceId: faker.string.uuid(),
    expiration: new Date(Date.now() + 60_000),
    gCalendarId: faker.string.uuid(),
    createdAt: new Date(),
  });

  await mongoService.watch.insertOne(watch);

  return watch;
};

describe("SyncService", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  describe("deleteWatchesByUser", () => {
    it("deletes only the target user's watch records and returns their identities", async () => {
      const firstUser = await UserDriver.createUser();
      const secondUser = await UserDriver.createUser();
      const firstUserWatchA = await createWatch(firstUser._id.toString());
      const firstUserWatchB = await createWatch(firstUser._id.toString());
      const secondUserWatch = await createWatch(secondUser._id.toString());

      const deleted = await syncService.deleteWatchesByUser(
        firstUser._id.toString(),
      );

      expect(deleted).toEqual(
        expect.arrayContaining([
          {
            channelId: firstUserWatchA._id.toString(),
            resourceId: firstUserWatchA.resourceId,
          },
          {
            channelId: firstUserWatchB._id.toString(),
            resourceId: firstUserWatchB.resourceId,
          },
        ]),
      );
      expect(deleted).toHaveLength(2);
      expect(
        await mongoService.watch.countDocuments({
          user: firstUser._id.toString(),
        }),
      ).toBe(0);
      expect(
        await mongoService.watch.findOne({ _id: secondUserWatch._id }),
      ).toEqual(expect.objectContaining({ user: secondUser._id.toString() }));
    });
  });

  describe("stopWatch", () => {
    it("deletes the local watch record when Google returns 401", async () => {
      const user = await UserDriver.createUser();
      const watch = await createWatch(user._id.toString());

      jest
        .spyOn(gcalService, "stopWatch")
        .mockRejectedValue(
          createGoogleError({ code: "401", responseStatus: 401 }),
        );

      await expect(
        syncService.stopWatch(
          user._id.toString(),
          watch._id.toString(),
          watch.resourceId,
        ),
      ).resolves.toBeUndefined();

      expect(await mongoService.watch.findOne({ _id: watch._id })).toBeNull();
    });

    it("deletes the local watch record when Google returns invalid_grant", async () => {
      const user = await UserDriver.createUser();
      const watch = await createWatch(user._id.toString());

      jest
        .spyOn(gcalService, "stopWatch")
        .mockRejectedValue(invalidGrant400Error);

      await expect(
        syncService.stopWatch(
          user._id.toString(),
          watch._id.toString(),
          watch.resourceId,
        ),
      ).resolves.toBeUndefined();

      expect(await mongoService.watch.findOne({ _id: watch._id })).toBeNull();
    });

    it("deletes the local watch record when the user is missing a refresh token", async () => {
      const user = await UserDriver.createUser({
        withGoogleRefreshToken: false,
      });
      const watch = await createWatch(user._id.toString());

      jest
        .spyOn(gcalService, "stopWatch")
        .mockRejectedValue(missingRefreshTokenError);

      await expect(
        syncService.stopWatch(
          user._id.toString(),
          watch._id.toString(),
          watch.resourceId,
        ),
      ).resolves.toBeUndefined();

      expect(await mongoService.watch.findOne({ _id: watch._id })).toBeNull();
    });

    it("preserves the existing delete behavior when Google returns 404", async () => {
      const user = await UserDriver.createUser();
      const watch = await createWatch(user._id.toString());

      jest
        .spyOn(gcalService, "stopWatch")
        .mockRejectedValue(
          createGoogleError({ code: "404", responseStatus: 404 }),
        );

      await expect(
        syncService.stopWatch(
          user._id.toString(),
          watch._id.toString(),
          watch.resourceId,
        ),
      ).resolves.toBeUndefined();

      expect(await mongoService.watch.findOne({ _id: watch._id })).toBeNull();
    });

    it("rethrows unexpected Google stop errors and keeps the local watch", async () => {
      const user = await UserDriver.createUser();
      const watch = await createWatch(user._id.toString());

      jest
        .spyOn(gcalService, "stopWatch")
        .mockRejectedValue(
          createGoogleError({ code: "500", responseStatus: 500 }),
        );

      await expect(
        syncService.stopWatch(
          user._id.toString(),
          watch._id.toString(),
          watch.resourceId,
        ),
      ).rejects.toMatchObject({ code: "500" });

      expect(
        await mongoService.watch.findOne({
          _id: watch._id,
          resourceId: watch.resourceId,
        }),
      ).toEqual(expect.objectContaining({ user: user._id.toString() }));
    });
  });

  describe("stopWatches", () => {
    it("returns early when the user has no stored watches", async () => {
      const user = await UserDriver.createUser({ withGoogle: false });
      const getGcalClientSpy = jest.spyOn(
        googleCalendarClient,
        "getGcalClient",
      );

      await expect(
        syncService.stopWatches(user._id.toString()),
      ).resolves.toEqual([]);

      expect(getGcalClientSpy).not.toHaveBeenCalled();
    });

    it("deletes local watch records when the user is missing a refresh token", async () => {
      const user = await UserDriver.createUser({
        withGoogleRefreshToken: false,
      });
      const watch = await createWatch(user._id.toString());
      const getGcalClientSpy = jest.spyOn(
        googleCalendarClient,
        "getGcalClient",
      );

      await expect(
        syncService.stopWatches(user._id.toString()),
      ).resolves.toEqual([]);

      expect(await mongoService.watch.findOne({ _id: watch._id })).toBeNull();
      expect(getGcalClientSpy).not.toHaveBeenCalled();
    });
  });

  describe("handleGcalNotification", () => {
    it("ignores expired notifications when no local watch record remains", async () => {
      const cleanupSpy = jest
        .spyOn(syncService, "cleanupStaleWatchChannel")
        .mockResolvedValue(false);

      await expect(
        syncService.handleGcalNotification({
          resource: Resource_Sync.EVENTS,
          channelId: new ObjectId(),
          resourceId: faker.string.uuid(),
          resourceState: XGoogleResourceState.EXISTS,
          expiration: faker.date.future(),
        }),
      ).resolves.toBe("IGNORED");

      expect(cleanupSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("cleanupStaleWatchChannel", () => {
    it("ignores stale notifications when no exact watch record exists", async () => {
      const user = await UserDriver.createUser();
      const watch = await createWatch(user._id.toString());
      const stopWatchSpy = jest.spyOn(syncService, "stopWatch");

      await expect(
        syncService.cleanupStaleWatchChannel({
          resource: Resource_Sync.EVENTS,
          channelId: new ObjectId(),
          resourceId: watch.resourceId,
          resourceState: XGoogleResourceState.EXISTS,
          expiration: faker.date.future(),
        }),
      ).resolves.toBe(false);

      expect(stopWatchSpy).not.toHaveBeenCalled();
      expect(await mongoService.watch.findOne({ _id: watch._id })).toEqual(
        expect.objectContaining({ user: user._id.toString() }),
      );
    });
  });

  describe("importIncremental", () => {
    it("emits INCREMENTAL operation when incremental import is ignored", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const importEndSpy = jest.spyOn(sseServer, "handleImportGCalEnd");

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { incrementalGCalSync: "COMPLETED" } },
      });

      await syncService.importIncremental(userId);

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

      await syncService.importIncremental(userId);

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

      await expect(syncService.importIncremental(userId)).rejects.toThrow(
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

      await syncService.startGoogleCalendarSync(userId);

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
      const importFull = syncService.importFull.bind(syncService);
      const startWatching =
        syncService.startWatchingGcalResources.bind(syncService);

      const importFullSpy = jest
        .spyOn(syncService, "importFull")
        .mockImplementation(async (...args) => {
          callOrder.push("importFull");
          return importFull(...args);
        });
      const startWatchingSpy = jest
        .spyOn(syncService, "startWatchingGcalResources")
        .mockImplementation(async (...args) => {
          callOrder.push("startWatching");
          return startWatching(...args);
        });

      await syncService.startGoogleCalendarSync(userId);

      expect(callOrder).toEqual(["importFull", "startWatching"]);

      importFullSpy.mockRestore();
      startWatchingSpy.mockRestore();
    });

    it("does not create watches when full import fails before token persistence", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const importError = new Error("import failed before sync token");
      const importFullSpy = jest
        .spyOn(syncService, "importFull")
        .mockRejectedValue(importError);
      const startWatchingSpy = jest.spyOn(
        syncService,
        "startWatchingGcalResources",
      );

      await expect(syncService.startGoogleCalendarSync(userId)).rejects.toThrow(
        importError,
      );

      expect(startWatchingSpy).not.toHaveBeenCalled();
      expect(await mongoService.watch.countDocuments({ user: userId })).toBe(0);

      importFullSpy.mockRestore();
      startWatchingSpy.mockRestore();
    });

    it("persists event sync tokens without https so local sync can settle healthy", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      (isUsingHttps as jest.Mock).mockReturnValue(false);

      await syncService.startGoogleCalendarSync(userId);

      const syncRecord = await mongoService.sync.findOne({ user: userId });
      const metadata = await userMetadataService.fetchUserMetadata(userId);

      expect(syncRecord?.google?.events?.length ?? 0).toBeGreaterThan(0);
      expect(
        syncRecord?.google?.events?.every(({ nextSyncToken }) =>
          Boolean(nextSyncToken),
        ),
      ).toBe(true);
      expect(metadata.google?.connectionState).toBe("HEALTHY");

      (isUsingHttps as jest.Mock).mockRestore();
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

      await syncService.restartGoogleCalendarSync(userId);

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
      const startSpy = jest.spyOn(syncService, "startGoogleCalendarSync");

      await syncService.restartGoogleCalendarSync(userId);

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
        .spyOn(syncService, "startGoogleCalendarSync")
        .mockResolvedValue({ eventsCount: 0, calendarsCount: 0 });

      await syncService.restartGoogleCalendarSync(userId, { force: true });

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
        .spyOn(syncService, "startGoogleCalendarSync")
        .mockResolvedValue({ eventsCount: 0, calendarsCount: 0 });
      const stopSpy = jest
        .spyOn(userService, "stopGoogleCalendarSync")
        .mockResolvedValue();

      const firstRestart = syncService.restartGoogleCalendarSync(userId, {
        force: true,
      });
      await Promise.resolve();

      const secondRestart = syncService.restartGoogleCalendarSync(userId, {
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
        .spyOn(syncService, "stopWatches")
        .mockImplementation(async (targetUserId) => {
          await syncService.deleteWatchesByUser(targetUserId);
          return [];
        });
      const startSpy = jest
        .spyOn(syncService, "startGoogleCalendarSync")
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

      await syncService.restartGoogleCalendarSync(userId, { force: true });

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
        .spyOn(syncService, "startGoogleCalendarSync")
        .mockRejectedValue(invalidGrant400Error);

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "RESTART" } },
      });

      await syncService.restartGoogleCalendarSync(userId, { force: true });

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
        .spyOn(syncService, "startGoogleCalendarSync")
        .mockRejectedValue(quotaError);

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "RESTART" } },
      });

      await syncService.restartGoogleCalendarSync(userId, { force: true });

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
