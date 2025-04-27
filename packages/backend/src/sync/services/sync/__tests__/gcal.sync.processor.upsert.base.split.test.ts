import { Categories_Recurrence, Schema_Event } from "@core/types/event.types";
import { isExistingInstance } from "@core/util/event/event.util";
import { getEventsInDb } from "@backend/__tests__/helpers/mock.db.queries";
import {
  TestSetup,
  cleanupCollections,
  cleanupTestMongo,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { simulateDbAfterGcalImport } from "@backend/__tests__/helpers/mock.events.init";
import { mockAndCategorizeGcalEvents } from "@backend/__tests__/mocks.gcal/factories/gcal.event.batch";
import { mockCancelledInstance } from "@backend/__tests__/mocks.gcal/mocks.gcal/factories/gcal.event.factory";
import { RecurringEventRepository } from "@backend/event/services/recur/repo/recur.event.repo";
import { GcalSyncProcessor } from "../gcal.sync.processor";
import {
  baseHasRecurrenceRule,
  noInstancesAfterSplitDate,
  updateBasePayloadToExpireOneDayAfterFirstInstance,
} from "./gcal.sync.processor.test.util";

// Mock Gcal Instances API response
jest.mock("@backend/common/services/gcal/gcal.service", () => ({
  __esModule: true,
  default: {
    getEventInstances: jest.fn().mockResolvedValue({
      data: { items: mockAndCategorizeGcalEvents().gcalEvents.instances },
    }),
  },
}));

describe("GcalSyncProcessor: UPSERT: BASE SPLIT", () => {
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
  it("should handle new UNTIL in BASE by updating BASE rule and DELETING instances after the UNTIL date", async () => {
    /* Assemble */
    const { gcalEvents } = await simulateDbAfterGcalImport(
      setup.db,
      setup.userId,
    );

    const { gBaseWithUntil, untilDateStr } =
      updateBasePayloadToExpireOneDayAfterFirstInstance(gcalEvents);

    /* Act */
    const origEvents = await getEventsInDb();
    const processor = new GcalSyncProcessor(repo);
    const changes = await processor.processEvents([gBaseWithUntil]);

    /* Assert */
    // Verify the base was updated
    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({
      title: gBaseWithUntil.summary as string,
      category: Categories_Recurrence.RECURRENCE_BASE,
      operation: "UPSERTED",
    });

    // Verify DB changed
    const remainingEvents = await getEventsInDb();
    expect(remainingEvents).not.toHaveLength(origEvents.length);

    // Verify base has new recurrence rule
    await baseHasRecurrenceRule(remainingEvents, gBaseWithUntil.recurrence);

    // Verify no instances exist after the split date
    await noInstancesAfterSplitDate(remainingEvents, untilDateStr);

    // Verify the instance before the UNTIL date still exists
    const instances = remainingEvents.filter((e) =>
      isExistingInstance(e as unknown as Schema_Event),
    );
    expect(instances).toHaveLength(1);
  });

  it("should handle cancelled instance at split point by deleting it", async () => {
    /* Assemble */
    const { gcalEvents } = await simulateDbAfterGcalImport(
      setup.db,
      setup.userId,
    );
    const origEvents = await getEventsInDb();

    /* Act */
    // Simulate a gcal notification payload after an instance was cancelled
    const cancelledInstance = mockCancelledInstance(
      gcalEvents.recurring,
      gcalEvents.instances[1]?.start?.dateTime as string,
    );
    const processor = new GcalSyncProcessor(repo);
    const changes = await processor.processEvents([cancelledInstance]);

    /* Assert */
    // Verify the change summary
    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({
      title: cancelledInstance.summary,
      category: Categories_Recurrence.RECURRENCE_INSTANCE,
      operation: "DELETED",
    });

    // Verify database state
    const remainingEvents = await getEventsInDb();
    expect(remainingEvents.length).toBeLessThan(origEvents.length);

    // Verify the cancelled instance was removed
    const cancelledInstanceExists = remainingEvents.some(
      (e) => e["gEventId"] === gcalEvents.cancelled.id,
    );
    expect(cancelledInstanceExists).toBe(false);
  });
});
