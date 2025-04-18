import {
  filterBaseEvents,
  filterExistingInstances,
} from "@core/util/event.util";
import {
  cleanupCollections,
  cleanupTestMongo,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { mockRecurringBaseEvent } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { mockGcalEvents } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory.set";
import mongoService from "@backend/common/services/mongo.service";
import { createSyncImport } from "./sync.import";

// Mock Gcal Instances API response
jest.mock("@backend/common/services/gcal/gcal.service", () => ({
  __esModule: true,
  default: {
    getEventInstances: jest.fn().mockResolvedValue({
      data: { items: mockGcalEvents().gcalEvents.instances },
    }),
  },
}));

describe("SyncImport: Series", () => {
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

  it("should import a series when provided a gcal base event", async () => {
    /* Assemble */
    const baseRecurringGcalEvent = mockRecurringBaseEvent();

    /* Act */
    // trigger a series import with base event
    const result = await syncImport.importSeries(
      setup.userId,
      "test-calendar",
      baseRecurringGcalEvent,
    );

    /* Assert */
    // make sure this is the same function being used in the mock at the top of this file
    const expectedInstances = mockGcalEvents().gcalEvents.instances.length;
    // validate return value
    expect(result.insertedCount).toEqual(1 + expectedInstances);

    // validate DB state
    const currentEventsInDb = await mongoService.event.find().toArray();

    const baseEvents = filterBaseEvents(currentEventsInDb);
    expect(baseEvents).toHaveLength(1);

    const instancesInDb = filterExistingInstances(currentEventsInDb);
    expect(instancesInDb).toHaveLength(expectedInstances);
    // expect(recurringEvents[0]?.gEventId).toBe(baseRecurringGcalEvent.id);
  });
});
