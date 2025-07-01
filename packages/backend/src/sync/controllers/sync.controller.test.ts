import {
  EVENT_CHANGED,
  IMPORT_GCAL_END,
} from "@core/constants/websocket.constants";
import { isBase, isExistingInstance } from "@core/util/event/event.util";
import { BaseDriver } from "@backend/__tests__/drivers/base.driver";
import { SyncControllerDriver } from "@backend/__tests__/drivers/sync.controller.driver";
import { mockEventEmitter } from "@backend/__tests__/helpers/event-emitter";
import { getCategorizedEventsInDb } from "@backend/__tests__/helpers/mock.db.queries";
import {
  cleanupCollections,
  cleanupTestMongo,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";

describe("SyncController", () => {
  const baseDriver = new BaseDriver();
  const syncDriver = new SyncControllerDriver(baseDriver);
  const socketId = "socket123";
  const notifySpy = jest.spyOn(mockEventEmitter, "emit");

  let setup: Awaited<ReturnType<typeof setupTestDb>>;

  beforeAll(async () => {
    setup = await setupTestDb();

    baseDriver.initWebsocketServer();

    webSocketServer.addConnection(setup.userId, socketId);
  });

  beforeEach(async () => cleanupCollections(setup.db));

  afterAll(async () => {
    await baseDriver.teardown();
    mockEventEmitter.removeAllListeners();
    jest.clearAllMocks();
    await cleanupTestMongo(setup);
  });

  describe("importGCal", () => {
    beforeEach(async () => {
      mockEventEmitter.removeAllListeners();
      notifySpy.mockClear();

      await new Promise((resolve, reject) => {
        mockEventEmitter.addListener(EVENT_CHANGED, (payload) =>
          payload === socketId ? resolve(payload) : reject("invalid socket"),
        );

        syncDriver
          .importGCal({ userId: setup.userId })
          .then(() => console.log("finished"))
          .catch(reject);
      });
    });

    it("should import the first instance of a recurring event (and the base)", async () => {
      // Importing both the bae and first instance helps us find the series recurrence rule.
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

    it("should notify the frontend that the import is complete", async () => {
      expect(notifySpy).toHaveBeenNthCalledWith(1, IMPORT_GCAL_END, socketId);
    });

    it("should notify the frontend to refetch the calendar events on completion", async () => {
      expect(notifySpy).toHaveBeenLastCalledWith(EVENT_CHANGED, socketId);
    });
  });
});
