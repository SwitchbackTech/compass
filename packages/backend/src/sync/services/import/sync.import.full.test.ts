import { isBase, isInstance } from "@core/util/event/event.util";
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
import { createSyncImport } from "@backend/sync/services/import/sync.import";

describe("SyncImport: Full", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should import the first instance of a recurring event (and the base)", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const syncImport = await createSyncImport(user._id.toString());
    // Importing both the bae and first instance helps us find the series recurrence rule.
    // To prevent duplicates in the UI, the GET API will not return the base event
    await syncImport.importAllEvents(user._id.toString(), "test-calendar", 1);

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
    const { user } = await UtilDriver.setupTestUser();
    const syncImport = await createSyncImport(user._id.toString());

    await syncImport.importAllEvents(user._id.toString(), "test-calendar", 1);

    const { baseEvents, instanceEvents } = await getCategorizedEventsInDb({
      user: user._id.toString(),
    });

    expect(instanceEvents).toHaveLength(3);
    instanceEvents.forEach((instance) => {
      expect(instance.recurrence?.eventId).toBe(baseEvents[0]?._id?.toString());
    });
  });

  it("should include regular and recurring events and skip cancelled events", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const syncImport = await createSyncImport(user._id.toString());

    const { totalProcessed, totalChanged, nextSyncToken } =
      await syncImport.importAllEvents(user._id.toString(), "test-calendar", 1);

    const currentEventsInDb = await getEventsInDb({
      user: user._id.toString(),
    });

    expect(totalProcessed).toBe(6); // base + 3 instances + regular + cancelled
    expect(totalChanged).toBe(5); // base + 3 instances + regular
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

    // Verify sync token
    expect(nextSyncToken).toBe("final-sync-token");
  });

  it("should not create duplicate events for recurring events", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const syncImport = await createSyncImport(user._id.toString());

    await syncImport.importAllEvents(user._id.toString(), "test-calendar", 1);

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
    const { user } = await UtilDriver.setupTestUser();
    const syncImport = await createSyncImport(user._id.toString());

    await syncImport.importAllEvents(user._id.toString(), "test-calendar", 1);

    const currentEventsInDb = await getEventsInDb({
      user: user._id.toString(),
    });

    const regularEvents = currentEventsInDb.filter(
      ({ recurrence }) => recurrence === undefined || recurrence === null,
    );

    expect(regularEvents).toHaveLength(1);
    expect(regularEvents[0]?.gEventId).toBe("regular-1");
  });
});
