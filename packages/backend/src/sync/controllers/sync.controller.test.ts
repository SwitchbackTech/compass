import { WithId } from "mongodb";
import { randomUUID } from "node:crypto";
import { DefaultEventsMap } from "socket.io";
import { Socket } from "socket.io-client";
import { faker } from "@faker-js/faker";
import { EVENT_CHANGED } from "@core/constants/websocket.constants";
import { Status } from "@core/errors/status.codes";
import { Resource_Sync } from "@core/types/sync.types";
import { Schema_User } from "@core/types/user.types";
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
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import { waitUntilEvent } from "@backend/common/helpers/common.util";
import gcalService from "@backend/common/services/gcal/gcal.service";
import * as syncQueries from "@backend/sync/util/sync.queries";
import { updateSync } from "@backend/sync/util/sync.queries";
import userService from "@backend/user/services/user.service";

describe("SyncController", () => {
  const baseDriver = new BaseDriver();
  const syncDriver = new SyncControllerDriver(baseDriver);

  async function websocketUserFlow(waitForEventChanged = false): Promise<{
    user: WithId<Schema_User>;
    websocketClient: Socket<DefaultEventsMap, DefaultEventsMap>;
  }> {
    const { user } = await UtilDriver.setupTestUser();

    const websocketClient = baseDriver.createWebsocketClient(
      { userId: user._id.toString(), sessionId: randomUUID() },
      { autoConnect: false },
    );

    await waitUntilEvent(websocketClient, "connect", 100, () =>
      Promise.resolve(websocketClient.connect()),
    );

    const [importEnd, eventChanged] = await Promise.allSettled([
      syncDriver.waitUntilImportGCalEnd(
        websocketClient,
        () => syncDriver.importGCal({ userId: user._id.toString() }),
        (reason) => Promise.resolve(reason),
      ),
      ...(waitForEventChanged
        ? [baseDriver.waitUntilWebsocketEvent(websocketClient, EVENT_CHANGED)]
        : []),
    ]);

    expect(importEnd.status).toEqual("fulfilled");
    expect((importEnd as { value: unknown })?.value).toBeNull();

    if (waitForEventChanged) expect(eventChanged?.status).toEqual("fulfilled");

    return { user, websocketClient };
  }

  beforeAll(async () => {
    await setupTestDb();

    baseDriver.initWebsocketServer();

    await baseDriver.listen();
  });

  beforeEach(cleanupCollections);

  afterAll(async () => {
    await baseDriver.teardown();
    await cleanupTestDb();
  });

  describe("handleGoogleNotification", () => {
    it("should throw error when no sync record found", async () => {
      const response = await syncDriver.handleGoogleNotification(
        {
          channelId: faker.string.uuid(),
          resourceId: faker.string.uuid(),
          resourceState: "exists",
          expiration: faker.date.future().toISOString(),
        },
        Status.BAD_REQUEST,
      );

      expect(response.body).toEqual(SyncError.NoSyncRecordForUser);
    });

    it("should ignore notification when no sync token found", async () => {
      // Setup
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const calendarId = "test-calendar";
      const channelId = faker.string.uuid();
      const resourceId = faker.string.uuid();
      const expiration = faker.date.future().toISOString();

      await updateSync(Resource_Sync.EVENTS, userId, calendarId, {
        channelId,
        resourceId,
        expiration,
        nextSyncToken: undefined,
      });

      await syncDriver.handleGoogleNotification(
        { channelId, resourceId, resourceState: "exists", expiration },
        Status.NO_CONTENT,
      );
    });

    it("should cleanup stale gcal watches for unknown channels if resourceId exists", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const calendarId = "test-calendar";
      const channelId = faker.string.uuid();
      const resourceId = "test-resource-id";
      const expiration = faker.date.future().toISOString();

      await updateSync(Resource_Sync.EVENTS, userId, calendarId, {
        resourceId,
      });

      await syncDriver.handleGoogleNotification(
        { channelId, resourceId, resourceState: "exists", expiration },
        Status.OK,
      );
    });
  });

  describe("importGCal: ", () => {
    describe("Imported Data: ", () => {
      it("should import the first instance of a recurring event (and the base)", async () => {
        // Importing both the base and first instance helps us find the series recurrence rule.
        // To prevent duplicates in the UI, the GET API will not return the base event
        const { user } = await websocketUserFlow(true);

        const currentEventsInDb = await getEventsInDb({
          user: user._id.toString(),
        });

        const baseEvent = currentEventsInDb.find(isBase)!;
        const firstInstance = currentEventsInDb.find(isInstance)!;

        expect(baseEvent).toBeDefined();
        expect(firstInstance).toBeDefined();

        expect(baseEvent.startDate).toEqual(firstInstance.startDate);
      });

      it("should connect instances to their base events", async () => {
        const { user } = await websocketUserFlow(true);

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
        const { user } = await websocketUserFlow(true);

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
        const { user } = await websocketUserFlow(true);

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
        const { user } = await websocketUserFlow(true);

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
        const { user, websocketClient } = await websocketUserFlow(true);
        const userId = user._id.toString();

        const getGCalEventsSyncPageTokenSpy = jest
          .spyOn(syncQueries, "getGCalEventsSyncPageToken")
          .mockResolvedValue("5");

        const getAllEventsSpy = jest.spyOn(gcalService, "getAllEvents");

        const { sync } = await userService.fetchUserMetadata(userId);

        expect(sync?.importGCal).toEqual("completed");

        await userService.updateUserMetadata({
          userId,
          data: { sync: { importGCal: "restart" } },
        });

        await syncDriver.waitUntilImportGCalEnd(websocketClient, () =>
          syncDriver.importGCal({ userId }),
        );

        expect(getAllEventsSpy).toHaveBeenCalledWith(
          expect.objectContaining({ pageToken: "5" }),
        );

        getAllEventsSpy.mockRestore();
        getGCalEventsSyncPageTokenSpy.mockRestore();
      });
    });

    describe("Import Status: ", () => {
      it("should not retry import once it has completed", async () => {
        const { user, websocketClient } = await websocketUserFlow(true);
        const userId = user._id.toString();

        const { sync } = await userService.fetchUserMetadata(userId);

        expect(sync?.importGCal).toEqual("completed");

        const getGCalEventsSyncPageTokenSpy = jest
          .spyOn(syncQueries, "getGCalEventsSyncPageToken")
          .mockResolvedValue("5");

        const getAllEventsSpy = jest.spyOn(gcalService, "getAllEvents");

        const failReason = await syncDriver.waitUntilImportGCalEnd(
          websocketClient,
          () => syncDriver.importGCal({ userId }),
          (reason) => Promise.resolve(reason),
        );

        expect(failReason).toEqual(
          `User ${userId} gcal import is in progress or completed, ignoring this request`,
        );

        expect(getAllEventsSpy).not.toHaveBeenCalled();

        await waitUntilEvent(websocketClient, "disconnect", 100, () =>
          Promise.resolve(websocketClient.disconnect()),
        );

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

        const websocketClient = baseDriver.createWebsocketClient(
          { userId, sessionId: randomUUID() },
          { autoConnect: false },
        );

        await waitUntilEvent(websocketClient, "connect", 100, () =>
          Promise.resolve(websocketClient.connect()),
        );

        await userService.updateUserMetadata({
          userId,
          data: { sync: { importGCal: "importing" } },
        });

        const failReason = await syncDriver.waitUntilImportGCalEnd(
          websocketClient,
          () => syncDriver.importGCal({ userId }),
          (reason) => Promise.resolve(reason),
        );

        expect(failReason).toEqual(
          `User ${userId} gcal import is in progress or completed, ignoring this request`,
        );

        expect(getAllEventsSpy).not.toHaveBeenCalled();

        await waitUntilEvent(websocketClient, "disconnect", 100, () =>
          Promise.resolve(websocketClient.disconnect()),
        );

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

        const websocketClient = baseDriver.createWebsocketClient(
          { userId, sessionId: randomUUID() },
          { autoConnect: false },
        );

        await waitUntilEvent(websocketClient, "connect", 100, () =>
          Promise.resolve(websocketClient.connect()),
        );

        await userService.updateUserMetadata({
          userId,
          data: { sync: { importGCal: "restart" } },
        });

        const failReason = await syncDriver.waitUntilImportGCalEnd(
          websocketClient,
          () => syncDriver.importGCal({ userId }),
          (reason) => Promise.resolve(reason),
        );

        expect(failReason).toBeNull();

        expect(getAllEventsSpy).toHaveBeenCalledWith(
          expect.objectContaining({ pageToken: "5" }),
        );

        await waitUntilEvent(websocketClient, "disconnect", 100, () =>
          Promise.resolve(websocketClient.disconnect()),
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

        const websocketClient = baseDriver.createWebsocketClient(
          { userId, sessionId: randomUUID() },
          { autoConnect: false },
        );

        await waitUntilEvent(websocketClient, "connect", 100, () =>
          Promise.resolve(websocketClient.connect()),
        );

        await userService.updateUserMetadata({
          userId,
          data: { sync: { importGCal: "errored" } },
        });

        const failReason = await syncDriver.waitUntilImportGCalEnd(
          websocketClient,
          () => syncDriver.importGCal({ userId }),
          (reason) => Promise.resolve(reason),
        );

        expect(failReason).toBeNull();

        expect(getAllEventsSpy).toHaveBeenCalledWith(
          expect.objectContaining({ pageToken: "5" }),
        );

        await waitUntilEvent(websocketClient, "disconnect", 100, () =>
          Promise.resolve(websocketClient.disconnect()),
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

        const websocketClient = baseDriver.createWebsocketClient(
          { userId },
          { autoConnect: false },
        );

        await waitUntilEvent(websocketClient, "connect", 100, () =>
          Promise.resolve(websocketClient.connect()),
        );

        await expect(
          syncDriver.waitUntilImportGCalStart<boolean>(
            websocketClient,
            () => syncDriver.importGCal({ userId }),
            () => Promise.resolve(true),
          ),
        ).resolves.toBeTruthy();

        await waitUntilEvent(websocketClient, "disconnect", 100, () =>
          Promise.resolve(websocketClient.disconnect()),
        );
      });

      it("should notify the frontend that the import is complete", async () => {
        const user = await UserDriver.createUser();
        const userId = user._id.toString();

        await SyncDriver.createSync(user);

        const websocketClient = baseDriver.createWebsocketClient(
          { userId },
          { autoConnect: false },
        );

        await waitUntilEvent(websocketClient, "connect", 100, () =>
          Promise.resolve(websocketClient.connect()),
        );

        await expect(
          syncDriver.waitUntilImportGCalEnd(
            websocketClient,
            () => syncDriver.importGCal({ userId }),
            (reason) => Promise.resolve(reason),
          ),
        ).resolves.toBeNull();

        await waitUntilEvent(websocketClient, "disconnect", 100, () =>
          Promise.resolve(websocketClient.disconnect()),
        );
      });

      it("should notify the frontend to refetch the calendar events on completion", async () => {
        const user = await UserDriver.createUser();
        const userId = user._id.toString();

        await SyncDriver.createSync(user);

        const websocketClient = baseDriver.createWebsocketClient(
          { userId },
          { autoConnect: false },
        );

        await waitUntilEvent(websocketClient, "connect", 100, () =>
          Promise.resolve(websocketClient.connect()),
        );

        await expect(
          baseDriver.waitUntilWebsocketEvent(
            websocketClient,
            EVENT_CHANGED,
            () => syncDriver.importGCal({ userId }),
            () => Promise.resolve(true),
          ),
        ).resolves.toBeTruthy();

        await waitUntilEvent(websocketClient, "disconnect", 100, () =>
          Promise.resolve(websocketClient.disconnect()),
        );
      });
    });
  });
});
