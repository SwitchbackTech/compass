import { getCategorizedEventsInDb } from "@backend/__tests__/helpers/mock.db.queries";
import {
  cleanupCollections,
  cleanupTestMongo,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { mockAndCategorizeGcalEvents } from "@backend/__tests__/mocks.gcal/factories/gcal.event.batch";
import { mockGcal } from "@backend/__tests__/mocks.gcal/factories/gcal.factory";
import mongoService from "@backend/common/services/mongo.service";
import { createSyncImport } from "./sync.import";

// Mock Google Calendar API responses,
jest.mock("googleapis", () => {
  const { gcalEvents } = mockAndCategorizeGcalEvents();
  const googleapis = mockGcal({ events: gcalEvents.all });
  return googleapis;
});

describe("SyncImport: Full", () => {
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

  it("should import the first instance of a recurring event (and the base)", async () => {
    // Importing both the bae and first instance helps us find the series recurrence rule.
    // To prevent duplicates in the UI, the GET API will not return the base event
    await syncImport.importAllEvents(setup.userId, "test-calendar");

    const currentEventsInDb = await mongoService.event.find().toArray();

    const recurringEvents = currentEventsInDb.filter(
      (e) => e.recurrence !== undefined,
    );

    const baseStart = recurringEvents[0]?.startDate;
    const firstInstanceStart = recurringEvents[1]?.startDate;
    expect(baseStart).toEqual(firstInstanceStart);
  });

  it("should connect instances to their base events", async () => {
    await syncImport.importAllEvents(setup.userId, "test-calendar");
    const { baseEvents, instanceEvents } = await getCategorizedEventsInDb();

    expect(instanceEvents).toHaveLength(2);
    instanceEvents.forEach((instance) => {
      expect(instance.recurrence?.eventId).toBe(baseEvents[0]?._id?.toString());
    });
  });
  it("should include regular and recurring events and skip cancelled events", async () => {
    const { totalProcessed, totalChanged, nextSyncToken } =
      await syncImport.importAllEvents(setup.userId, "test-calendar");

    const currentEventsInDb = await mongoService.event.find().toArray();

    expect(totalProcessed).toBe(5); // base + 2 instances + regular + cancelled
    expect(totalChanged).toBe(4); // base + 2 instances + regular - cancelled
    expect(currentEventsInDb).toHaveLength(4); // base + 2 instances + regular - cancelled
    // Verify we have the base recurring event
    const baseEvents = currentEventsInDb.filter(
      (e) => e.recurrence?.rule !== undefined,
    );
    expect(baseEvents).toHaveLength(1);
    expect(baseEvents[0]?.title).toBe("Recurrence");

    // Verify we have the correct instance
    const instanceEvents = currentEventsInDb.filter(
      (e) => e.recurrence?.eventId !== undefined,
    );
    expect(instanceEvents).toHaveLength(2);
    const baseGevId = baseEvents[0]?.gEventId as string;
    expect(instanceEvents.map((e) => e.gEventId)).toEqual(
      expect.arrayContaining([expect.stringMatching(baseGevId)]),
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

  it("should not create duplicate events for regular events", async () => {
    await syncImport.importAllEvents(setup.userId, "test-calendar");

    const currentEventsInDb = await mongoService.event.find().toArray();
  });
});
