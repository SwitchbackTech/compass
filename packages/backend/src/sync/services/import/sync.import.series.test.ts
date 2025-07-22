import { ObjectId } from "mongodb";
import {
  filterBaseEvents,
  filterExistingInstances,
} from "@core/util/event/event.util";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { mockRecurringGcalBaseEvent } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import mongoService from "@backend/common/services/mongo.service";
import { createSyncImport } from "@backend/sync/services/import/sync.import";

describe("SyncImport: Series", () => {
  let syncImport: Awaited<ReturnType<typeof createSyncImport>>;
  let setup: Awaited<ReturnType<typeof setupTestDb>>;

  beforeAll(async () => {
    setup = await setupTestDb();
    syncImport = await createSyncImport(setup.userId);
  });

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should import a series when provided a gcal base event", async () => {
    /* Assemble */
    const baseRecurringGcalEvent = mockRecurringGcalBaseEvent();

    /* Act */
    // trigger a series import with base event
    const result = await syncImport.importSeries(
      setup.userId,
      "test-calendar",
      baseRecurringGcalEvent,
    );

    // validate return value - base + 3 instances
    expect(result.insertedCount).toEqual(4);

    // validate DB state
    const currentEventsInDb = await mongoService.event.find().toArray();

    const baseEvents = filterBaseEvents(currentEventsInDb);

    // the number of base events created within the gcal.event.batch.ts file
    // https://github.com/SwitchbackTech/compass/blob/188d32c80036bcc2c70c6282a3d48080b7eb1057/packages/backend/src/__tests__/mocks.gcal/factories/gcal.event.batch.ts#L13
    expect(baseEvents).toHaveLength(1);

    const instancesInDb = filterExistingInstances(currentEventsInDb);

    // the number of instances created within the gcal.factory.ts file
    // https://github.com/SwitchbackTech/compass/blob/188d32c80036bcc2c70c6282a3d48080b7eb1057/packages/backend/src/__tests__/mocks.gcal/factories/gcal.factory.ts#L123
    expect(instancesInDb).toHaveLength(3);

    // validate ids
    currentEventsInDb.forEach((event) => {
      expect(event._id).toBeInstanceOf(ObjectId);
    });
  });
});
