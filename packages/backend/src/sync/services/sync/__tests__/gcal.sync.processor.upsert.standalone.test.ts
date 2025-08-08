import { Categories_Recurrence } from "@core/types/event.types";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import { getEventsInDb } from "@backend/__tests__/helpers/mock.db.queries";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { simulateDbAfterGcalImport } from "@backend/__tests__/helpers/mock.events.init";
import { mockRegularGcalEvent } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { GcalSyncProcessor } from "@backend/sync/services/sync/gcal.sync.processor";

describe("GcalSyncProcessor UPSERT: STANDALONE", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should handle CREATING a new STANDALONE event", async () => {
    /* Assemble */
    const { user } = await UtilDriver.setupTestUser();

    await simulateDbAfterGcalImport(user._id.toString());

    const userEventsInDb = await getEventsInDb({ user: user._id.toString() });

    const origEventsCount = userEventsInDb.length;

    /* Act */
    const newStandalone = mockRegularGcalEvent({
      summary: "New Standalone Event",
    });
    const processor = new GcalSyncProcessor(user._id.toString());
    const changes = await processor.processEvents([newStandalone]);

    /* Assert */
    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual(
      expect.objectContaining({
        title: newStandalone.summary,
        category: Categories_Recurrence.STANDALONE,
        operation: "STANDALONE_CREATED",
        transition: [null, "STANDALONE_CONFIRMED"],
      }),
    );

    // Verify that a new event was added
    const updatedEvents = await getEventsInDb({ user: user._id.toString() });
    expect(updatedEvents).toHaveLength(origEventsCount + 1);

    // Verify the the new event has the right data
    const updatedEvent = updatedEvents.find(
      (e) => e.gEventId === newStandalone.id,
    );
    expect(updatedEvent?.title).toEqual(newStandalone.summary);
  });

  it("should handle UPDATING an existing STANDALONE event", async () => {
    /* Assemble */
    const { user } = await UtilDriver.setupTestUser();

    const { gcalEvents } = await simulateDbAfterGcalImport(user._id.toString());

    // Simulate a change to the standalone event in GCal
    const origStandalone = gcalEvents.regular;
    const updatedStandalone = {
      ...origStandalone,
      summary: origStandalone.summary + " - Changed in GCal",
    };

    const origEventsCount = (await getEventsInDb({ user: user._id.toString() }))
      .length;
    /* Act */
    const processor = new GcalSyncProcessor(user._id.toString());
    const changes = await processor.processEvents([updatedStandalone]);

    /* Assert */
    // Verify the correct change was detected
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      title: updatedStandalone.summary,
      category: Categories_Recurrence.STANDALONE,
      operation: "STANDALONE_UPDATED",
    });

    const updatedEvents = await getEventsInDb({ user: user._id.toString() });

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
