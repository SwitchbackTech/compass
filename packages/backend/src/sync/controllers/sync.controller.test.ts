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

        const websocketClient = baseDriver.createWebsocketClient({ userId });

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

    describe("Frontend Notifications", () => {
      beforeEach(() => cleanupCollections(setup.db));

      it("should notify the frontend that the import has started", async () => {
        const websocketClient = baseDriver.createWebsocketClient({
          userId: setup.userId,
        });

        await expect(
          syncDriver.waitUntilImportGCalStart<boolean>(
            websocketClient,
            () => syncDriver.importGCal({ userId: setup.userId }),
            () => Promise.resolve(true),
          ),
        ).resolves.toBeTruthy();
      });

      it("should notify the frontend that the import is complete", async () => {
        const websocketClient = baseDriver.createWebsocketClient({
          userId: setup.userId,
        });

        await expect(
          syncDriver.waitUntilImportGCalEnd(
            websocketClient,
            () => syncDriver.importGCal({ userId: setup.userId }),
            (reason) => Promise.resolve(reason),
          ),
        ).resolves.toBeNull();
      });

      it("should notify the frontend to refetch the calendar events on completion", async () => {
        const websocketClient = baseDriver.createWebsocketClient({
          userId: setup.userId,
        });

        await expect(
          baseDriver.waitUntilWebsocketEvent(
            websocketClient,
            EVENT_CHANGED,
            () => syncDriver.importGCal({ userId: setup.userId }),
            () => Promise.resolve(true),
          ),
        ).resolves.toBeTruthy();
      });
    });
  });
});
