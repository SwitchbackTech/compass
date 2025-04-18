import { getCategorizedEventsInDb } from "@backend/__tests__/helpers/mock.db.queries";
import {
  cleanupCollections,
  cleanupTestMongo,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import {
  mockGcalEventsv2,
  mockRecurringEvent,
} from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { mockGcal } from "@backend/__tests__/mocks.gcal/factories/gcal.factory";
import mongoService from "@backend/common/services/mongo.service";
import { createSyncImport } from "./sync.import";

// Mock Google Calendar API responses
jest.mock("googleapis", () => {
  const { allEvents: gcalEvents } = mockGcalEventsv2();
  const googleapis = mockGcal({ events: gcalEvents });
  return googleapis;
});

// Mock Gcal Instances API response
// jest.mock("@backend/common/services/gcal/gcal.service", () => ({
//   __esModule: true,
//   default: {
//     getEvents: jest.fn().mockResolvedValue({
//       data: { items: mockGcalEventsv2().allEvents },
//     }),
//     getEventInstances: jest.fn().mockResolvedValue({
//       data: { items: mockGcalEventsv2().instances },
//     }),
//   },
// }));

describe("SyncImport", () => {
  let syncImport: Awaited<ReturnType<typeof createSyncImport>>;
  let setup: Awaited<ReturnType<typeof setupTestDb>>;

  beforeAll(async () => {
    setup = await setupTestDb();
    syncImport = await createSyncImport(setup.userId);
  });

  beforeEach(async () => {
    await cleanupCollections(setup.db);
  });

  afterAll(async () => {
    await cleanupTestMongo(setup);
  });

  describe("Full import", () => {
    it("should not import the first instance of a recurring event (just the base)", async () => {
      // including the first instance would result in 2 events with the same start date
      await syncImport.importAllEvents(setup.userId, "test-calendar");

      const currentEventsInDb = await mongoService.event.find().toArray();

      const recurringEvents = currentEventsInDb.filter(
        (e) => e.recurrence !== undefined,
      );

      const baseStart = recurringEvents[0]?.startDate;
      const firstInstanceStart = recurringEvents[1]?.startDate;
      expect(baseStart).not.toEqual(firstInstanceStart);
    });

    it("should connect instances to their base events", async () => {
      await syncImport.importAllEvents(setup.userId, "test-calendar");
      const { baseEvents, instanceEvents } = await getCategorizedEventsInDb();

      expect(instanceEvents).toHaveLength(1); // 2 instances total, but 1 is skipped because it has the same start date as the base event
      expect(instanceEvents[0]?.recurrence?.eventId).toBe(
        baseEvents[0]?._id?.toString(),
      );
    });
    it("should include regular and recurring events and skip cancelled events", async () => {
      const { totalProcessed, totalChanged, nextSyncToken } =
        await syncImport.importAllEvents(setup.userId, "test-calendar");

      const currentEventsInDb = await mongoService.event.find().toArray();

      expect(totalProcessed).toBe(5); // base + 2 instances + regular + cancelled
      expect(totalChanged).toBe(3); // base + 1 instances + regular - cancelled
      expect(currentEventsInDb).toHaveLength(3); // base + 1 instance + regular - cancelled
      // Verify we have the base recurring event
      const baseEvents = currentEventsInDb.filter(
        (e) => e.recurrence?.rule !== undefined,
      );
      expect(baseEvents).toHaveLength(1);
      expect(baseEvents[0]?.gEventId).toBe("recurring-1");

      // Verify we have the correct instance
      const instanceEvents = currentEventsInDb.filter(
        (e) => e.recurrence?.eventId !== undefined,
      );
      expect(instanceEvents).toHaveLength(1); // 2 instances total, but 1 is skipped because it has the same start date as the base event
      expect(instanceEvents.map((e) => e.gEventId)).toEqual(
        expect.arrayContaining(["recurring-1-instance-2"]),
      );

      // Verify we have the regular event
      const regularEvents = currentEventsInDb.filter(
        (e) => e.recurrence === undefined,
      );
      expect(regularEvents).toHaveLength(1);
      expect(regularEvents[0]?.gEventId).toBe("regular-1");

      // Verify sync token
      expect(nextSyncToken).toBe("final-sync-token");
    });

    it("should not create duplicate events for recurring events", async () => {
      await syncImport.importAllEvents(setup.userId, "test-calendar");

      const currentEventsInDb = await mongoService.event.find().toArray();

      // Get all recurring events
      const recurringEvents = currentEventsInDb.filter(
        (e) => e.recurrence !== undefined,
      );

      // For each recurring event, verify there are no duplicates
      const eventIds = new Set<string>();
      const duplicateEvents = recurringEvents.filter((event) => {
        if (!event.gEventId) return false; // Skip events without IDs
        if (eventIds.has(event.gEventId)) {
          return true;
        }
        eventIds.add(event.gEventId);
        return false;
      });

      expect(duplicateEvents).toHaveLength(0);
    });
  });

  describe("Series Import", () => {
    it("should import a series when provided a gcal base event", async () => {
      const baseRecurringGcalEvent = mockRecurringEvent();
      const result = await syncImport.importSeries(
        setup.userId,
        "test-calendar",
        baseRecurringGcalEvent,
      );
      expect(result).toHaveLength(100);
    });
  });
});
