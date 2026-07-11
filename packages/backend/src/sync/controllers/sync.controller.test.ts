import { faker } from "@faker-js/faker";
import { ObjectId } from "mongodb";
import { Status } from "@core/errors/status.codes";
import { type ServerMessage } from "@core/types/server-message.contracts";
import { Resource_Sync, XGoogleResourceState } from "@core/types/sync.types";
import { BaseDriver } from "@backend/__tests__/drivers/base.driver";
import { GoogleSyncDriver } from "@backend/__tests__/drivers/google-sync.driver";
import { SyncControllerDriver } from "@backend/__tests__/drivers/sync.controller.driver";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { invalidGrant400Error } from "@backend/__tests__/mocks.gcal/errors/error.google.invalidGrant";
import { missingRefreshTokenError } from "@backend/__tests__/mocks.gcal/errors/error.missingRefreshToken";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { sseServer } from "@backend/servers/sse/sse.server";
import { googleCalendarSyncService } from "@backend/sync/services/google-sync/google-sync.service";
import { GCalNotificationHandler } from "@backend/sync/services/notify/handler/gcal.notification.handler";
import * as syncQueries from "@backend/sync/services/records/sync-records.repository";
import { updateSync } from "@backend/sync/services/records/sync-records.repository";
import { googleWatchService } from "@backend/sync/services/watch/google-watch.service";
import userService from "@backend/user/services/user.service";
import userMetadataService from "@backend/user/services/user-metadata.service";
import { randomUUID } from "node:crypto";

// B10: legacy IMPORT_GCAL_END/EVENT_CHANGED/USER_METADATA/GOOGLE_REVOKED SSE
// event names were deleted along with the legacy transport; every publish
// now goes out under the single "message" SSE event name, dispatched by
// BaseDriver's stream helper under the ServerMessage's own `type` field.
type ImportCompletedMessage = Extract<
  ServerMessage,
  { type: "importCompleted" }
>;

describe("SyncController", () => {
  const baseDriver = new BaseDriver();
  const syncDriver = new SyncControllerDriver(baseDriver);
  const importTimeoutMs = 7_000;

  function parseImportResult(
    result: ImportCompletedMessage | undefined,
  ): ImportCompletedMessage {
    expect(result).toEqual(
      expect.objectContaining({
        type: "importCompleted",
        eventsCount: expect.any(Number) as number,
        calendarsCount: expect.any(Number) as number,
      }),
    );

    return result as ImportCompletedMessage;
  }

  beforeAll(async () => {
    await setupTestDb();
    await baseDriver.listen();
  });

  beforeEach(cleanupCollections);

  afterAll(async () => {
    await baseDriver.teardown();
    await cleanupTestDb();
  });

  describe("handleGoogleNotification", () => {
    it("should ignore notification when no watch record found", async () => {
      const response = await syncDriver.handleGoogleNotification(
        {
          resource: Resource_Sync.EVENTS,
          channelId: new ObjectId(),
          resourceId: faker.string.uuid(),
          resourceState: XGoogleResourceState.EXISTS,
          expiration: faker.date.future(),
        },
        Status.OK,
      );

      expect(response.text).toEqual("IGNORED");
    });

    it("should ignore notification when watch channel is initialized", async () => {
      const response = await syncDriver.handleGoogleNotification(
        {
          resource: Resource_Sync.EVENTS,
          channelId: new ObjectId(),
          resourceId: faker.string.uuid(),
          resourceState: XGoogleResourceState.SYNC,
          expiration: faker.date.future(),
        },
        Status.OK,
      );

      expect(response.text).toEqual("INITIALIZED");
    });

    it("should ignore notification when no sync token found", async () => {
      // Setup
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const restartSpy = jest
        .spyOn(googleCalendarSyncService, "repairGoogleCalendarSync")
        .mockResolvedValue();

      const watch = await mongoService.watch.findOne({
        user: userId,
        gCalendarId: { $ne: Resource_Sync.CALENDAR },
      });

      expect(watch).toBeDefined();
      expect(watch).not.toBeNull();

      const calendarId = watch!.gCalendarId;
      const resource = Resource_Sync.EVENTS;
      const channelId = watch!._id;
      const resourceId = watch!.resourceId;
      const expiration = watch!.expiration;

      await updateSync(Resource_Sync.EVENTS, userId, calendarId, {
        nextSyncToken: undefined,
      });

      const response = await syncDriver.handleGoogleNotification(
        {
          resource,
          channelId,
          resourceId,
          resourceState: XGoogleResourceState.EXISTS,
          expiration,
        },
        Status.NO_CONTENT,
      );

      expect(response.text).toEqual("");
      expect(restartSpy).toHaveBeenCalledWith(userId);

      restartSpy.mockRestore();
    });

    it("should delegate repeated missing-sync-token recovery to the restart service", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const restartSpy = jest
        .spyOn(googleCalendarSyncService, "repairGoogleCalendarSync")
        .mockImplementation(async () => {
          await userMetadataService.updateUserMetadata({
            userId,
            data: { sync: { importGCal: "IMPORTING" } },
          });
        });

      const watch = await mongoService.watch.findOne({
        user: userId,
        gCalendarId: { $ne: Resource_Sync.CALENDAR },
      });

      expect(watch).toBeDefined();
      expect(watch).not.toBeNull();

      await updateSync(Resource_Sync.EVENTS, userId, watch!.gCalendarId, {
        nextSyncToken: undefined,
      });

      await syncDriver.handleGoogleNotification(
        {
          resource: Resource_Sync.EVENTS,
          channelId: watch!._id,
          resourceId: watch!.resourceId,
          resourceState: XGoogleResourceState.EXISTS,
          expiration: watch!.expiration,
        },
        Status.NO_CONTENT,
      );

      await syncDriver.handleGoogleNotification(
        {
          resource: Resource_Sync.EVENTS,
          channelId: watch!._id,
          resourceId: watch!.resourceId,
          resourceState: XGoogleResourceState.EXISTS,
          expiration: watch!.expiration,
        },
        Status.NO_CONTENT,
      );

      expect(restartSpy).toHaveBeenCalledTimes(1);
      expect(restartSpy).toHaveBeenCalledWith(userId);

      restartSpy.mockRestore();
    });

    it("should ignore stale notifications when only resourceId matches", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const calendarId = "test-calendar";
      const resource = Resource_Sync.EVENTS;
      const channelId = new ObjectId();
      const resourceId = "test-resource-id";
      const expiration = faker.date.future();

      await mongoService.watch.updateOne(
        { user: userId, gCalendarId: calendarId },
        { $set: { resourceId } },
      );

      const response = await syncDriver.handleGoogleNotification(
        {
          resource,
          channelId,
          resourceId,
          resourceState: XGoogleResourceState.EXISTS,
          expiration,
        },
        Status.OK,
      );

      expect(response.text).toEqual("IGNORED");
      expect(
        await mongoService.watch.findOne({ user: userId, resourceId }),
      ).toEqual(expect.objectContaining({ user: userId, resourceId }));
    });

    it("does not trigger a repair import for a late stale notification after a processed change", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const watch = await mongoService.watch.findOne({
        user: userId,
        gCalendarId: { $ne: Resource_Sync.CALENDAR },
      });

      expect(watch).toBeDefined();
      expect(watch).not.toBeNull();

      const notificationSpy = jest
        .spyOn(GCalNotificationHandler.prototype, "handleNotification")
        .mockResolvedValue({
          summary: "PROCESSED",
          calendarId: new ObjectId(),
          eventIds: [],
        });
      const backgroundChangeSpy = jest.spyOn(sseServer, "publishEventsChanged");
      const importStartSpy = jest.spyOn(sseServer, "publishSyncStatus");

      const activeResponse = await syncDriver.handleGoogleNotification(
        {
          resource: Resource_Sync.EVENTS,
          channelId: watch!._id,
          resourceId: watch!.resourceId,
          resourceState: XGoogleResourceState.EXISTS,
          expiration: watch!.expiration,
        },
        Status.OK,
      );

      const staleResponse = await syncDriver.handleGoogleNotification(
        {
          resource: Resource_Sync.EVENTS,
          channelId: new ObjectId(),
          resourceId: watch!.resourceId,
          resourceState: XGoogleResourceState.EXISTS,
          expiration: watch!.expiration,
        },
        Status.OK,
      );

      expect(activeResponse.text).toContain("PROCESSED");
      expect(staleResponse.text).toEqual("IGNORED");
      expect(notificationSpy).toHaveBeenCalledTimes(1);
      expect(backgroundChangeSpy).toHaveBeenCalledTimes(1);
      expect(importStartSpy).not.toHaveBeenCalled();
      expect(
        await mongoService.watch.findOne({ _id: watch!._id, user: userId }),
      ).toEqual(expect.objectContaining({ user: userId }));

      notificationSpy.mockRestore();
      backgroundChangeSpy.mockRestore();
      importStartSpy.mockRestore();
    });

    it("should prune Google data, notify client via SSE, and return structured response when user revokes access", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();

      const watch = await mongoService.watch.findOne({
        user: userId,
        gCalendarId: { $ne: Resource_Sync.CALENDAR },
      });

      expect(watch).toBeDefined();
      expect(watch).not.toBeNull();

      const handleGoogleWatchNotificationSpy = jest
        .spyOn(googleWatchService, "handleGoogleWatchNotification")
        .mockRejectedValue(invalidGrant400Error);

      const pruneGoogleDataSpy = jest
        .spyOn(userService, "pruneGoogleData")
        .mockResolvedValue();

      const handleGoogleRevokedSpy = jest.spyOn(sseServer, "publishSyncStatus");

      const response = await syncDriver.handleGoogleNotification(
        {
          resource: Resource_Sync.EVENTS,
          channelId: watch!._id,
          resourceId: watch!.resourceId,
          resourceState: XGoogleResourceState.EXISTS,
          expiration: watch!.expiration,
        },
        Status.GONE,
      );

      expect(response.body).toEqual({
        code: "GOOGLE_REVOKED",
        message: "User revoked access, pruned Google data",
      });
      expect(pruneGoogleDataSpy).toHaveBeenCalledWith(userId);
      expect(handleGoogleRevokedSpy).toHaveBeenCalledWith(userId, {
        status: "attention",
        code: "GOOGLE_REVOKED",
        retryable: false,
      });

      handleGoogleWatchNotificationSpy.mockRestore();
      pruneGoogleDataSpy.mockRestore();
      handleGoogleRevokedSpy.mockRestore();
    });

    it("should prune Google data, notify client via SSE, and return structured response when refresh token is missing", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();

      const watch = await mongoService.watch.findOne({
        user: userId,
        gCalendarId: { $ne: Resource_Sync.CALENDAR },
      });

      expect(watch).toBeDefined();
      expect(watch).not.toBeNull();

      const handleGoogleWatchNotificationSpy = jest
        .spyOn(googleWatchService, "handleGoogleWatchNotification")
        .mockRejectedValue(missingRefreshTokenError);

      const pruneGoogleDataSpy = jest
        .spyOn(userService, "pruneGoogleData")
        .mockResolvedValue();

      const handleGoogleRevokedSpy = jest.spyOn(sseServer, "publishSyncStatus");

      const response = await syncDriver.handleGoogleNotification(
        {
          resource: Resource_Sync.EVENTS,
          channelId: watch!._id,
          resourceId: watch!.resourceId,
          resourceState: XGoogleResourceState.EXISTS,
          expiration: watch!.expiration,
        },
        Status.GONE,
      );

      expect(response.body).toEqual({
        code: "GOOGLE_REVOKED",
        message: "Missing refresh token, pruned Google data",
      });
      expect(pruneGoogleDataSpy).toHaveBeenCalledWith(userId);
      expect(handleGoogleRevokedSpy).toHaveBeenCalledWith(userId, {
        status: "attention",
        code: "GOOGLE_REVOKED",
        retryable: false,
      });

      handleGoogleWatchNotificationSpy.mockRestore();
      pruneGoogleDataSpy.mockRestore();
      handleGoogleRevokedSpy.mockRestore();
    });

    it("should return GONE status when missing refresh token and no watch record found", async () => {
      const handleGoogleWatchNotificationSpy = jest
        .spyOn(googleWatchService, "handleGoogleWatchNotification")
        .mockRejectedValue(missingRefreshTokenError);

      const response = await syncDriver.handleGoogleNotification(
        {
          resource: Resource_Sync.EVENTS,
          channelId: new ObjectId(),
          resourceId: faker.string.uuid(),
          resourceState: XGoogleResourceState.EXISTS,
          expiration: faker.date.future(),
        },
        Status.GONE,
      );

      expect(response.text).toBe("Missing refresh token");

      handleGoogleWatchNotificationSpy.mockRestore();
    });
  });

  describe("importGCal:", () => {
    describe("Import Status:", () => {
      it("force-repairs an already-completed sync and reports counts", async () => {
        const { user } = await UtilDriver.setupTestUser();
        const userId = user._id.toString();

        const getAllEventsSpy = jest.spyOn(gcalService, "getAllEvents");

        await userMetadataService.updateUserMetadata({
          userId,
          data: { sync: { importGCal: "COMPLETED" } },
        });

        const stream = baseDriver.openSSEStream({
          userId,
          sessionId: randomUUID(),
        });
        const importEndPromise = stream.waitForEvent(
          "importCompleted",
          importTimeoutMs,
        );
        await syncDriver.importGCal({ userId }, { force: true });
        const result = (await importEndPromise) as ImportCompletedMessage;
        stream.close();

        const parsed = parseImportResult(result);
        expect(parsed.operation).toBe("repair");
        expect(getAllEventsSpy).toHaveBeenCalled();

        getAllEventsSpy.mockRestore();
      });

      it("ignores a non-forced request while a completed sync is still fresh", async () => {
        const { user } = await UtilDriver.setupTestUser();
        const userId = user._id.toString();

        await userMetadataService.updateUserMetadata({
          userId,
          data: { sync: { importGCal: "COMPLETED" } },
        });

        const getAllEventsSpy = jest.spyOn(gcalService, "getAllEvents");
        const importEndSpy = jest.spyOn(sseServer, "publishImportCompleted");

        await syncDriver.importGCal({ userId });
        await new Promise((resolve) => setTimeout(resolve, 200));

        expect(importEndSpy).not.toHaveBeenCalled();
        expect(getAllEventsSpy).not.toHaveBeenCalled();

        getAllEventsSpy.mockRestore();
        importEndSpy.mockRestore();
      });

      it("ignores a request while an import is already in progress", async () => {
        const getAllEventsSpy = jest.spyOn(gcalService, "getAllEvents");
        const user = await UserDriver.createUser();
        const userId = user._id.toString();

        await GoogleSyncDriver.createHealthyGoogleSync(user);
        await userMetadataService.updateUserMetadata({
          userId,
          data: { sync: { importGCal: "IMPORTING" } },
        });

        const importEndSpy = jest.spyOn(sseServer, "publishImportCompleted");

        await syncDriver.importGCal({ userId });
        await new Promise((resolve) => setTimeout(resolve, 200));

        expect(importEndSpy).not.toHaveBeenCalled();
        expect(getAllEventsSpy).not.toHaveBeenCalled();

        getAllEventsSpy.mockRestore();
        importEndSpy.mockRestore();
      });

      it("retries a non-forced import after a restart is requested", async () => {
        const getGCalEventsSyncPageTokenSpy = jest
          .spyOn(syncQueries, "getGCalEventsSyncPageToken")
          .mockResolvedValue("5");
        const getAllEventsSpy = jest.spyOn(gcalService, "getAllEvents");
        const user = await UserDriver.createUser();
        const userId = user._id.toString();

        await GoogleSyncDriver.createHealthyGoogleSync(user);
        await userMetadataService.updateUserMetadata({
          userId,
          data: { sync: { importGCal: "RESTART" } },
        });

        const stream = baseDriver.openSSEStream({
          userId,
          sessionId: randomUUID(),
        });
        const importEndPromise = stream.waitForEvent(
          "importCompleted",
          importTimeoutMs,
        );
        await syncDriver.importGCal({ userId });
        const result = (await importEndPromise) as ImportCompletedMessage;
        stream.close();

        const parsed = parseImportResult(result);
        expect(parsed.operation).toBe("incremental");
        expect(getAllEventsSpy).toHaveBeenCalledWith(
          expect.objectContaining({ pageToken: "5" }),
        );

        getAllEventsSpy.mockRestore();
        getGCalEventsSyncPageTokenSpy.mockRestore();
      });

      it("retries a non-forced import after a previous failure", async () => {
        const getGCalEventsSyncPageTokenSpy = jest
          .spyOn(syncQueries, "getGCalEventsSyncPageToken")
          .mockResolvedValue("5");
        const getAllEventsSpy = jest.spyOn(gcalService, "getAllEvents");
        const user = await UserDriver.createUser();
        const userId = user._id.toString();

        await GoogleSyncDriver.createHealthyGoogleSync(user);
        await userMetadataService.updateUserMetadata({
          userId,
          data: { sync: { importGCal: "ERRORED" } },
        });

        const stream = baseDriver.openSSEStream({
          userId,
          sessionId: randomUUID(),
        });
        const importEndPromise = stream.waitForEvent(
          "importCompleted",
          importTimeoutMs,
        );
        await syncDriver.importGCal({ userId });
        const result = (await importEndPromise) as ImportCompletedMessage;
        stream.close();

        const parsed = parseImportResult(result);
        expect(parsed.operation).toBe("incremental");
        expect(getAllEventsSpy).toHaveBeenCalledWith(
          expect.objectContaining({ pageToken: "5" }),
        );

        getAllEventsSpy.mockRestore();
        getGCalEventsSyncPageTokenSpy.mockRestore();
      });
    });

    describe("Frontend Notifications", () => {
      it("notifies the frontend that the import has started", async () => {
        const user = await UserDriver.createUser();
        const userId = user._id.toString();

        await GoogleSyncDriver.createHealthyGoogleSync(user);

        const syncStatusSpy = jest.spyOn(sseServer, "publishSyncStatus");

        await syncDriver.importGCal({ userId });

        // Wait a tick for the async fire-and-forget to run
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(syncStatusSpy).toHaveBeenCalledWith(userId, {
          status: "syncing",
        });

        syncStatusSpy.mockRestore();
      });

      it("notifies the frontend that the import is complete", async () => {
        const user = await UserDriver.createUser();
        const userId = user._id.toString();

        await GoogleSyncDriver.createHealthyGoogleSync(user);

        const stream = baseDriver.openSSEStream({
          userId,
          sessionId: randomUUID(),
        });
        const importEndPromise = stream.waitForEvent(
          "importCompleted",
          importTimeoutMs,
        );
        await syncDriver.importGCal({ userId });
        const result = (await importEndPromise) as ImportCompletedMessage;
        stream.close();

        parseImportResult(result);
      });

      it("notifies the frontend to refetch events for the affected calendar on completion", async () => {
        const user = await UserDriver.createUser();
        const userId = user._id.toString();

        await GoogleSyncDriver.createHealthyGoogleSync(user);

        const eventsChangedSpy = jest.spyOn(sseServer, "publishEventsChanged");

        const stream = baseDriver.openSSEStream({
          userId,
          sessionId: randomUUID(),
        });
        const importEndPromise = stream.waitForEvent(
          "importCompleted",
          importTimeoutMs,
        );
        await syncDriver.importGCal({ userId });
        await importEndPromise;
        stream.close();

        // importCompleted is published before the trailing eventsChanged
        // reconcile publish (which awaits one more calendar lookup); give
        // that microtask a tick to run.
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(eventsChangedSpy).toHaveBeenCalledWith(
          userId,
          expect.objectContaining({ reason: "reconciled" }),
        );

        eventsChangedSpy.mockRestore();
      });
    });
  });
});
