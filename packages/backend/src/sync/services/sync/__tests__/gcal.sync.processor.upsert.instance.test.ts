import { Categories_Recurrence } from "@core/types/event.types";
import { categorizeEvents } from "@core/util/event/event.util";
import { getEventsInDb } from "@backend/__tests__/helpers/mock.db.queries";
import {
  TestSetup,
  cleanupCollections,
  cleanupTestMongo,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { simulateDbAfterGcalImport } from "@backend/__tests__/helpers/mock.events.init";
import { RecurringEventRepository } from "@backend/event/services/recur/repo/recur.event.repo";
import { GcalSyncProcessor } from "../gcal.sync.processor";

describe("GcalSyncProcessor UPSERT: INSTANCE", () => {
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

  it("should handle UPSERTING a TIMED INSTANCE", async () => {
    /* Assemble */
    const { gcalEvents } = await simulateDbAfterGcalImport(
      setup.db,
      setup.userId,
    );

    // Simulate a change to the instance in GCal
    const origInstance = gcalEvents.instances[1];
    const origTitle = origInstance?.summary;
    const instance = {
      ...origInstance,
      summary: origTitle + " - Changed in GCal",
    };
    const instanceTitle = instance.summary;

    const processor = new GcalSyncProcessor(repo);
    const changes = await processor.processEvents([instance]);

    // Verify the correct change was detected
    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({
      title: instanceTitle,
      category: Categories_Recurrence.RECURRENCE_INSTANCE,
      operation: "UPSERTED",
    });

    // Verify no other events were deleted
    const remainingEvents = await getEventsInDb().then((events) =>
      events.map((event) => ({ ...event, _id: event._id?.toString() })),
    );

    expect(remainingEvents).toHaveLength(gcalEvents.all.length - 1); // exclude cancelled instance

    // Verify the instance was updated
    const { instances } = categorizeEvents(remainingEvents);
    const updatedInstance = instances.find((i) => i.title === instanceTitle);
    expect(updatedInstance).toBeDefined();
    expect(updatedInstance?.title).toEqual(instanceTitle);
  });
  it("should handle UPDATING a TIMED INSTANCE", async () => {
    const { gcalEvents } = await simulateDbAfterGcalImport(
      setup.db,
      setup.userId,
    );

    const updatedRegular = {
      ...gcalEvents.regular,
      summary: "Updated Regular Event",
    };
    const updatedInstance = {
      ...gcalEvents.instances[0],
      summary: "Updated Recurring Instance Event",
    };

    const updatedGcalEvents = [updatedRegular, updatedInstance];

    const processor = new GcalSyncProcessor(repo);
    const changes = await processor.processEvents(updatedGcalEvents);

    expect(changes).toHaveLength(2);
    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: updatedRegular.summary,
          category: Categories_Recurrence.STANDALONE,
          operation: "UPSERTED",
        }),
        expect.objectContaining({
          title: updatedInstance.summary,
          category: Categories_Recurrence.RECURRENCE_INSTANCE,
          operation: "UPSERTED",
        }),
      ]),
    );
  });
});
