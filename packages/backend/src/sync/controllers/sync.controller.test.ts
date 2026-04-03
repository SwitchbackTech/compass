import { ObjectId, type WithId } from "mongodb";
import { randomUUID } from "node:crypto";
import { faker } from "@faker-js/faker";
import {
  EVENT_CHANGED,
  GOOGLE_REVOKED,
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
} from "@core/constants/sse.constants";
import { Status } from "@core/errors/status.codes";
import { type ImportGCalEndPayload } from "@core/types/sse.types";
import { Resource_Sync, XGoogleResourceState } from "@core/types/sync.types";
import { type Schema_User } from "@core/types/user.types";
import { isBase, isInstance } from "@core/util/event/event.util";
import { BaseDriver } from "@backend/__tests__/drivers/base.driver";
import { SyncControllerDriver } from "@backend/__tests__/drivers/sync.controller.driver";
import { SyncDriver } from "@backend/__tests__/drivers/sync.driver";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  getCategorizedEventsInDb,
  getEventsInDb,
} from "@backend/__tests__/helpers/mock.db.queries";
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
import { GCalNotificationHandler } from "@backend/sync/services/notify/handler/gcal.notification.handler";
import syncService from "@backend/sync/services/sync.service";
import * as syncQueries from "@backend/sync/util/sync.queries";
import { updateSync } from "@backend/sync/util/sync.queries";
import userMetadataService from "@backend/user/services/user-metadata.service";
import userService from "@backend/user/services/user.service";

describe("SyncController", () => {
  const baseDriver = new BaseDriver();
  const syncDriver = new SyncControllerDriver(baseDriver);
  const importTimeoutMs = 7_000;
  type ImportOperation = "INCREMENTAL" | "REPAIR";

  interface ImportSummary {
    operation: ImportOperation;
    status: "COMPLETED";
    eventsCount: number;
    calendarsCount: number;
  }

  function parseImportResult(
    result: ImportGCalEndPayload | undefined,
    operation: ImportOperation = "INCREMENTAL",
  ): ImportSummary {
    expect(result).toEqual(
      expect.objectContaining({
        operation,
        status: "COMPLETED",
        eventsCount: expect.any(Number) as number,
        calendarsCount: expect.any(Number) as number,
      }),
    );

    return result as ImportSummary;
  }

  async function sseUserFlow(waitForEventChanged = false): Promise<{
    user: WithId<Schema_User>;
  }> {
    const { user } = await UtilDriver.setupTestUser();
    const userId = user._id.toString();

    const stream = baseDriver.openSSEStream({
      userId,
      sessionId: randomUUID(),
    });

    await Promise.allSettled([
      stream.waitForEvent(IMPORT_GCAL_END, importTimeoutMs),
      syncDriver.importGCal({ userId }),
      ...(waitForEventChanged
        ? [stream.waitForEvent(EVENT_CHANGED, importTimeoutMs)]
        : []),
    ]);

    stream.close();

    return { user };
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
        .spyOn(syncService, "restartGoogleCalendarSync")
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
      expect(restartSpy).toHaveBeenCalledWith(userId, { force: true });

      restartSpy.mockRestore();
    });

    it("should delegate repeated missing-sync-token recovery to the restart service", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const restartSpy = jest
        .spyOn(syncService, "restartGoogleCalendarSync")
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
      expect(restartSpy).toHaveBeenCalledWith(userId, { force: true });

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
        .mockResolvedValue({ summary: "PROCESSED", changes: [] });
      const backgroundChangeSpy = jest.spyOn(
        sseServer,
        "handleBackgroundCalendarChange",
      );
      const importStartSpy = jest.spyOn(sseServer, "handleImportGCalStart");

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

      const handleGcalNotificationSpy = jest
        .spyOn(syncService, "handleGcalNotification")
        .mockRejectedValue(invalidGrant400Error);

      const pruneGoogleDataSpy = jest
        .spyOn(userService, "pruneGoogleData")
        .mockResolvedValue();

      const handleGoogleRevokedSpy = jest.spyOn(
        sseServer,
        "handleGoogleRevoked",
      );

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
        code: GOOGLE_REVOKED,
        message: "User revoked access, pruned Google data",
      });
      expect(pruneGoogleDataSpy).toHaveBeenCalledWith(userId);
      expect(handleGoogleRevokedSpy).toHaveBeenCalledWith(userId);

      handleGcalNotificationSpy.mockRestore();
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

      const handleGcalNotificationSpy = jest
        .spyOn(syncService, "handleGcalNotification")
        .mockRejectedValue(missingRefreshTokenError);

      const pruneGoogleDataSpy = jest
        .spyOn(userService, "pruneGoogleData")
        .mockResolvedValue();

      const handleGoogleRevokedSpy = jest.spyOn(
        sseServer,
        "handleGoogleRevoked",
      );

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
        code: GOOGLE_REVOKED,
        message: "Missing refresh token, pruned Google data",
      });
      expect(pruneGoogleDataSpy).toHaveBeenCalledWith(userId);
      expect(handleGoogleRevokedSpy).toHaveBeenCalledWith(userId);

      handleGcalNotificationSpy.mockRestore();
      pruneGoogleDataSpy.mockRestore();
      handleGoogleRevokedSpy.mockRestore();
    });

    it("should return GONE status when missing refresh token and no watch record found", async () => {
      const handleGcalNotificationSpy = jest
        .spyOn(syncService, "handleGcalNotification")
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

      handleGcalNotificationSpy.mockRestore();
    });
  });

  describe("importGCal:", () => {
    describe("Imported Data:", () => {
      it("should import the first instance of a recurring event (and the base)", async () => {
        // Importing both the base and first instance helps us find the series recurrence rule.
        // To prevent duplicates in the UI, the GET API will not return the base event
        const { user } = await sseUserFlow(true);

        const currentEventsInDb = await getEventsInDb({
          user: user._id.toString(),
        });

        const baseEvent = currentEventsInDb.find(isBase)!;
        const firstInstance = currentEventsInDb.find(isInstance)!;

        expect(baseEvent).toBeDefined();
        expect(baseEvent).not.toBeNull();
        expect(firstInstance).toBeDefined();
        expect(firstInstance).not.toBeNull();

        expect(baseEvent.startDate).toEqual(firstInstance.startDate);
      });

      it("should connect instances to their base events", async () => {
        const { user } = await sseUserFlow(true);

        const { baseEvents, instanceEvents } = await getCategorizedEventsInDb({
          user: user._id.toString(),
        });

        expect(instanceEvents).toHaveLength(3);

        instanceEvents.forEach((instance) => {
          expect(instance.recurrence?.eventId).toBe(
            baseEvents[0]?._id?.toString(),
          );
        });
      });

      it("should include regular and recurring events and skip cancelled events", async () => {
        const { user } = await sseUserFlow(true);

        const currentEventsInDb = await getEventsInDb({
          user: user._id.toString(),
        });

        expect(currentEventsInDb).toHaveLength(5); // base + 3 instances + regular

        // Verify we have the base event
        const baseEvents = currentEventsInDb.filter(isBase);

        expect(baseEvents).toHaveLength(1);
        expect(baseEvents[0]?.title).toBe("Recurrence");

        // Verify we have the correct instance
        const instanceEvents = currentEventsInDb.filter(isInstance);

        expect(instanceEvents).toHaveLength(3);

        const baseGevId = baseEvents[0]?.gEventId as string;

        expect(instanceEvents.map((e) => e.gEventId)).toEqual(
          expect.arrayContaining([expect.stringMatching(baseGevId)]),
        );

        // Verify we have the regular event
        const regularEvents = currentEventsInDb.filter(
          ({ recurrence }) => recurrence === undefined || recurrence === null,
        );

        expect(regularEvents).toHaveLength(1);
        expect(regularEvents[0]?.gEventId).toBe("regular-1");
      });

      it("should not create duplicate events for recurring events", async () => {
        const { user } = await sseUserFlow(true);

        const currentEventsInDb = await getEventsInDb({
          user: user._id.toString(),
        });

        // Get all instance events
        const instances = currentEventsInDb.filter(isInstance);

        // For each instance event, verify there are no duplicates
        const eventIds = new Set<string>();
        const duplicateEvents = instances.filter((event) => {
          if (!event.gEventId) return false; // Skip events without IDs
          if (eventIds.has(event.gEventId)) {
            return true;
          }
          eventIds.add(event.gEventId);
          return false;
        });

        expect(duplicateEvents).toHaveLength(0);
      });

      it("should not create duplicate events for regular events", async () => {
        const { user } = await sseUserFlow(true);

        const currentEventsInDb = await getEventsInDb({
          user: user._id.toString(),
        });

        const regularEvents = currentEventsInDb.filter(
          (e) => !isBase(e) && !isInstance(e),
        );

        expect(regularEvents).toHaveLength(1);
        expect(regularEvents[0]?.gEventId).toBe("regular-1");
      });

      it("should resume import using stored nextPageToken", async () => {
        const { user } = await sseUserFlow(true);
        const userId = user._id.toString();

        const getGCalEventsSyncPageTokenSpy = jest
          .spyOn(syncQueries, "getGCalEventsSyncPageToken")
          .mockResolvedValue("5");

        const getAllEventsSpy = jest.spyOn(gcalService, "getAllEvents");

        const { sync } = await userMetadataService.fetchUserMetadata(userId);

        expect(sync?.importGCal).toEqual("COMPLETED");

        await userMetadataService.updateUserMetadata({
          userId,
          data: { sync: { importGCal: "RESTART" } },
        });

        const stream = baseDriver.openSSEStream({
          userId,
          sessionId: randomUUID(),
        });
        const importEndPromise = stream.waitForEvent(
          IMPORT_GCAL_END,
          importTimeoutMs,
        );
        await syncDriver.importGCal({ userId });
        await importEndPromise;
        stream.close();

        expect(getAllEventsSpy).toHaveBeenCalledWith(
          expect.objectContaining({ pageToken: "5" }),
        );

        getAllEventsSpy.mockRestore();
        getGCalEventsSyncPageTokenSpy.mockRestore();
      });
    });

    describe("Import Status:", () => {
      it("should force a repair import even after a completed sync", async () => {
        const { user } = await sseUserFlow(true);
        const userId = user._id.toString();

        const getAllEventsSpy = jest.spyOn(gcalService, "getAllEvents");

        const { sync } = await userMetadataService.fetchUserMetadata(userId);

        expect(sync?.importGCal).toEqual("COMPLETED");

        const stream = baseDriver.openSSEStream({
          userId,
          sessionId: randomUUID(),
        });
        const importEndPromise = stream.waitForEvent(
          IMPORT_GCAL_END,
          importTimeoutMs,
        );
        await syncDriver.importGCal({ userId }, { force: true });
        const result = (await importEndPromise) as ImportGCalEndPayload;
        stream.close();

        const parsed = parseImportResult(result, "REPAIR");

        expect(parsed).toHaveProperty("eventsCount");
        expect(parsed).toHaveProperty("calendarsCount");
        expect(getAllEventsSpy).toHaveBeenCalled();

        getAllEventsSpy.mockRestore();
      });

      it("should not retry import once it has completed", async () => {
        const { user } = await sseUserFlow(true);
        const userId = user._id.toString();

        const { sync } = await userMetadataService.fetchUserMetadata(userId);

        expect(sync?.importGCal).toEqual("COMPLETED");

        const getGCalEventsSyncPageTokenSpy = jest
          .spyOn(syncQueries, "getGCalEventsSyncPageToken")
          .mockResolvedValue("5");

        const getAllEventsSpy = jest.spyOn(gcalService, "getAllEvents");

        const stream = baseDriver.openSSEStream({
          userId,
          sessionId: randomUUID(),
        });
        const importEndPromise = stream.waitForEvent(
          IMPORT_GCAL_END,
          importTimeoutMs,
        );
        await syncDriver.importGCal({ userId });
        const failReason = (await importEndPromise) as ImportGCalEndPayload;
        stream.close();

        expect(failReason).toEqual({
          operation: "INCREMENTAL",
          status: "IGNORED",
          message: `User ${userId} gcal import is in progress or completed, ignoring this request`,
        });

        expect(getAllEventsSpy).not.toHaveBeenCalled();

        getAllEventsSpy.mockRestore();
        getGCalEventsSyncPageTokenSpy.mockRestore();
      });

      it("should not retry import if it is in progress", async () => {
        const getGCalEventsSyncPageTokenSpy = jest
          .spyOn(syncQueries, "getGCalEventsSyncPageToken")
          .mockResolvedValue("5");

        const getAllEventsSpy = jest.spyOn(gcalService, "getAllEvents");
        const user = await UserDriver.createUser();
        const userId = user._id.toString();

        await SyncDriver.createSync(user);

        await userMetadataService.updateUserMetadata({
          userId,
          data: { sync: { importGCal: "IMPORTING" } },
        });

        const stream = baseDriver.openSSEStream({
          userId,
          sessionId: randomUUID(),
        });
        const importEndPromise = stream.waitForEvent(
          IMPORT_GCAL_END,
          importTimeoutMs,
        );
        await syncDriver.importGCal({ userId });
        const failReason = (await importEndPromise) as ImportGCalEndPayload;
        stream.close();

        expect(failReason).toEqual({
          operation: "INCREMENTAL",
          status: "IGNORED",
          message: `User ${userId} gcal import is in progress or completed, ignoring this request`,
        });

        expect(getAllEventsSpy).not.toHaveBeenCalled();

        getAllEventsSpy.mockRestore();
        getGCalEventsSyncPageTokenSpy.mockRestore();
      });

      it("should retry import if it is restarted", async () => {
        const getGCalEventsSyncPageTokenSpy = jest
          .spyOn(syncQueries, "getGCalEventsSyncPageToken")
          .mockResolvedValue("5");

        const getAllEventsSpy = jest.spyOn(gcalService, "getAllEvents");
        const user = await UserDriver.createUser();
        const userId = user._id.toString();

        await SyncDriver.createSync(user);

        await userMetadataService.updateUserMetadata({
          userId,
          data: { sync: { importGCal: "RESTART" } },
        });

        const stream = baseDriver.openSSEStream({
          userId,
          sessionId: randomUUID(),
        });
        const importEndPromise = stream.waitForEvent(
          IMPORT_GCAL_END,
          importTimeoutMs,
        );
        await syncDriver.importGCal({ userId });
        const result = (await importEndPromise) as ImportGCalEndPayload;
        stream.close();

        const parsed = parseImportResult(result);
        expect(parsed).toHaveProperty("eventsCount");
        expect(parsed).toHaveProperty("calendarsCount");

        expect(getAllEventsSpy).toHaveBeenCalledWith(
          expect.objectContaining({ pageToken: "5" }),
        );

        getAllEventsSpy.mockRestore();
        getGCalEventsSyncPageTokenSpy.mockRestore();
      });

      it("should retry import if it failed", async () => {
        const getGCalEventsSyncPageTokenSpy = jest
          .spyOn(syncQueries, "getGCalEventsSyncPageToken")
          .mockResolvedValue("5");

        const getAllEventsSpy = jest.spyOn(gcalService, "getAllEvents");
        const user = await UserDriver.createUser();
        const userId = user._id.toString();

        await SyncDriver.createSync(user);

        await userMetadataService.updateUserMetadata({
          userId,
          data: { sync: { importGCal: "ERRORED" } },
        });

        const stream = baseDriver.openSSEStream({
          userId,
          sessionId: randomUUID(),
        });
        const importEndPromise = stream.waitForEvent(
          IMPORT_GCAL_END,
          importTimeoutMs,
        );
        await syncDriver.importGCal({ userId });
        const result = (await importEndPromise) as ImportGCalEndPayload;
        stream.close();

        const parsed = parseImportResult(result);
        expect(parsed).toHaveProperty("eventsCount");
        expect(parsed).toHaveProperty("calendarsCount");

        expect(getAllEventsSpy).toHaveBeenCalledWith(
          expect.objectContaining({ pageToken: "5" }),
        );

        getAllEventsSpy.mockRestore();
        getGCalEventsSyncPageTokenSpy.mockRestore();
      });
    });

    describe("Frontend Notifications", () => {
      it("should notify the frontend that the import has started", async () => {
        const user = await UserDriver.createUser();
        const userId = user._id.toString();

        await SyncDriver.createSync(user);

        const importStartSpy = jest.spyOn(sseServer, "handleImportGCalStart");

        await syncDriver.importGCal({ userId });

        // Wait a tick for the async fire-and-forget to run
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(importStartSpy).toHaveBeenCalledWith(userId);

        importStartSpy.mockRestore();
      });

      it("should notify the frontend that the import is complete", async () => {
        const user = await UserDriver.createUser();
        const userId = user._id.toString();

        await SyncDriver.createSync(user);

        const stream = baseDriver.openSSEStream({
          userId,
          sessionId: randomUUID(),
        });
        const importEndPromise = stream.waitForEvent(
          IMPORT_GCAL_END,
          importTimeoutMs,
        );
        await syncDriver.importGCal({ userId });
        const result = (await importEndPromise) as ImportGCalEndPayload;
        stream.close();

        const parsed = parseImportResult(result);
        expect(parsed).toHaveProperty("eventsCount");
        expect(parsed).toHaveProperty("calendarsCount");
      });

      it("should notify the frontend to refetch the calendar events on completion", async () => {
        const user = await UserDriver.createUser();
        const userId = user._id.toString();

        await SyncDriver.createSync(user);

        const backgroundChangeSpy = jest.spyOn(
          sseServer,
          "handleBackgroundCalendarChange",
        );

        const stream = baseDriver.openSSEStream({
          userId,
          sessionId: randomUUID(),
        });
        const importEndPromise = stream.waitForEvent(
          IMPORT_GCAL_END,
          importTimeoutMs,
        );
        await syncDriver.importGCal({ userId });
        await importEndPromise;
        stream.close();

        expect(backgroundChangeSpy).toHaveBeenCalledWith(userId);

        backgroundChangeSpy.mockRestore();
      });
    });
  });
});
