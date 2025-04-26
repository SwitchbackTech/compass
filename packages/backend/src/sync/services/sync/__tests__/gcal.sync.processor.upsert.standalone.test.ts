import { Categories_Recurrence } from "@core/types/event.types";
import { getEventsInDb } from "@backend/__tests__/helpers/mock.db.queries";
import {
  TestSetup,
  cleanupCollections,
  cleanupTestMongo,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { simulateDbAfterGcalImport } from "@backend/__tests__/helpers/mock.events.init";
import { mockAndCategorizeGcalEvents } from "@backend/__tests__/mocks.gcal/factories/gcal.event.batch";
import { mockRegularGcalEvent } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { RecurringEventRepository } from "@backend/event/services/recur/repo/recur.event.repo";
import { GcalSyncProcessor } from "../gcal.sync.processor";

// Mock Gcal Instances API response
jest.mock("@backend/common/services/gcal/gcal.service", () => ({
  __esModule: true,
  default: {
    getEventInstances: jest.fn().mockResolvedValue({
      data: { items: mockAndCategorizeGcalEvents().gcalEvents.instances },
    }),
  },
}));

describe("GcalSyncProcessor UPSERT: STANDALONE", () => {
  let setup: TestSetup;
  let repo: RecurringEventRepository;

  beforeAll(async () => {
    setup = await setupTestDb();
    repo = new RecurringEventRepository(setup.userId);
  });

  beforeEach(async () => {
    await cleanupCollections(setup.db);
  });

  afterAll(async () => {
    await cleanupTestMongo(setup);
  });

  it("should handle UPSERTING a new STANDALONE event", async () => {
    /* Assemble */
    await simulateDbAfterGcalImport(setup.db, setup.userId);
    const origEventsCount = (await getEventsInDb()).length;

    /* Act */
    const newStandalone = mockRegularGcalEvent({
      summary: "New Standalone Event",
    });
    const processor = new GcalSyncProcessor(repo);
    const changes = await processor.processEvents([newStandalone]);

    /* Assert */
    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({
      title: newStandalone.summary,
      category: Categories_Recurrence.STANDALONE,
      operation: "UPSERTED",
    });

    // Verify that a new event was added
    const updatedEvents = await getEventsInDb();
    expect(updatedEvents).toHaveLength(origEventsCount + 1);

    // Verify the the new event has the right data
    const updatedEvent = updatedEvents.find(
      (e) => e.gEventId === newStandalone.id,
    );
    expect(updatedEvent?.title).toEqual(newStandalone.summary);
  });
  it("should handle UPSERTING an existing STANDALONE event", async () => {
    /* Assemble */
    const { gcalEvents } = await simulateDbAfterGcalImport(
      setup.db,
      setup.userId,
    );

    // Simulate a change to the standalone event in GCal
    const origStandalone = gcalEvents.regular;
    const updatedStandalone = {
      ...origStandalone,
      summary: origStandalone.summary + " - Changed in GCal",
    };

    const origEventsCount = (await getEventsInDb()).length;
    /* Act */
    const processor = new GcalSyncProcessor(repo);
    const changes = await processor.processEvents([updatedStandalone]);

    /* Assert */
    // Verify the correct change was detected
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      title: updatedStandalone.summary,
      category: Categories_Recurrence.STANDALONE,
      operation: "UPSERTED",
    });

    const updatedEvents = await getEventsInDb();

    // Verify no other events were deleted/added
    expect(updatedEvents).toHaveLength(gcalEvents.all.length - 1);
    expect(updatedEvents).toHaveLength(origEventsCount);

    // Verify the event was updated
    const updatedEvent = updatedEvents.find(
      (e) => e.gEventId === updatedStandalone.id,
    );
    expect(updatedEvent?.title).toEqual(updatedStandalone.summary);
  });
});
