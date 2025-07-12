import { randomUUID } from "node:crypto";
import { EVENT_CHANGED } from "@core/constants/websocket.constants";
import { isBase, isExistingInstance } from "@core/util/event/event.util";
import { BaseDriver } from "@backend/__tests__/drivers/base.driver";
import { SyncControllerDriver } from "@backend/__tests__/drivers/sync.controller.driver";
import { getCategorizedEventsInDb } from "@backend/__tests__/helpers/mock.db.queries";
import {
  cleanupCollections,
  cleanupTestMongo,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import * as syncQueries from "@backend/sync/util/sync.queries";
import { SyncDriver } from "../../__tests__/drivers/sync.driver";
import { UserDriver } from "../../__tests__/drivers/user.driver";
import { waitUntilEvent } from "../../common/helpers/common.util";
import userService from "../../user/services/user.service";

describe("SyncController", () => {
  const baseDriver = new BaseDriver();
  const syncDriver = new SyncControllerDriver(baseDriver);

  let setup: Awaited<ReturnType<typeof setupTestDb>>;

  beforeAll(async () => {
    setup = await setupTestDb();

    baseDriver.initWebsocketServer();

    await baseDriver.listen();
  });

  afterAll(async () => {
    await baseDriver.teardown();
    await cleanupTestMongo(setup);
    jest.clearAllMocks();
  });

  describe("importGCal: ", () => {
    describe("Imported Data: ", () => {
      beforeAll(async () => {
        const websocketClient = baseDriver.createWebsocketClient({
          userId: setup.userId,
          sessionId: randomUUID(),
        });

        await cleanupCollections(setup.db);

        const failReason = await syncDriver.waitUntilImportGCalEnd(
          websocketClient,
          () => syncDriver.importGCal({ userId: setup.userId }),
          (reason) => Promise.resolve(reason),
        );

        expect(failReason).toBeNull();
      });

      it("should import the first instance of a recurring event (and the base)", async () => {
        // Importing both the base and first instance helps us find the series recurrence rule.
        // To prevent duplicates in the UI, the GET API will not return the base event
        const currentEventsInDb = await mongoService.event.find().toArray();
        const baseEvent = currentEventsInDb.find(isBase)!;
        const firstInstance = currentEventsInDb.find(isExistingInstance)!;

        expect(baseEvent).toBeDefined();
        expect(firstInstance).toBeDefined();

        expect(baseEvent.startDate).toEqual(firstInstance.startDate);
      });

      it("should connect instances to their base events", async () => {
        const { baseEvents, instanceEvents } = await getCategorizedEventsInDb();

        expect(instanceEvents).toHaveLength(3);

        instanceEvents.forEach((instance) => {
          expect(instance.recurrence?.eventId).toBe(
            baseEvents[0]?._id?.toString(),
          );
        });
      });

      it("should include regular and recurring events and skip cancelled events", async () => {
        const currentEventsInDb = await mongoService.event.find().toArray();

        expect(currentEventsInDb).toHaveLength(5); // base + 3 instances + regular

        // Verify we have the base event
        const baseEvents = currentEventsInDb.filter(isBase);

        expect(baseEvents).toHaveLength(1);
        expect(baseEvents[0]?.title).toBe("Recurrence");

        // Verify we have the correct instance
        const instanceEvents = currentEventsInDb.filter(isExistingInstance);

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
        const currentEventsInDb = await mongoService.event.find().toArray();

        // Get all instance events
        const instances = currentEventsInDb.filter(isExistingInstance);

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
        const currentEventsInDb = await mongoService.event.find().toArray();

        const regularEvents = currentEventsInDb.filter(
          ({ recurrence }) => recurrence === undefined || recurrence === null,
        );

        expect(regularEvents).toHaveLength(1);
        expect(regularEvents[0]?.gEventId).toBe("regular-1");
      });

      it("should resume import using stored nextPageToken", async () => {
        const getGCalEventsSyncPageTokenSpy = jest
          .spyOn(syncQueries, "getGCalEventsSyncPageToken")
          .mockResolvedValue("5");

        const getAllEventsSpy = jest.spyOn(gcalService, "getAllEvents");
        const { userId } = setup;

        const websocketClient = baseDriver.createWebsocketClient({
          userId,
          sessionId: randomUUID(),
        });

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

        const reason = await syncDriver.waitUntilImportGCalEnd(
          websocketClient,
          () => syncDriver.importGCal({ userId }),
          (reason) => Promise.resolve(reason),
        );

        expect(reason).toBeNull();

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
      beforeEach(() => cleanupCollections(setup.db));

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
