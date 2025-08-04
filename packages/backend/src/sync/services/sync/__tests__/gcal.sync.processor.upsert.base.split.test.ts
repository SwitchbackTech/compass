import { Categories_Recurrence, Schema_Event } from "@core/types/event.types";
import { isExistingInstance } from "@core/util/event/event.util";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import { getEventsInDb } from "@backend/__tests__/helpers/mock.db.queries";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { simulateDbAfterGcalImport } from "@backend/__tests__/helpers/mock.events.init";
import { RecurringEventRepository } from "@backend/event/services/recur/repo/recur.event.repo";
import { GcalSyncProcessor } from "@backend/sync/services/sync/gcal.sync.processor";
import {
  baseHasRecurrenceRule,
  noInstancesAfterSplitDate,
  updateBasePayloadToExpireOneDayAfterFirstInstance,
} from "./gcal.sync.processor.test.util";

describe("GcalSyncProcessor: UPSERT: BASE SPLIT", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should handle new UNTIL in BASE by updating BASE rule and DELETING instances after the UNTIL date", async () => {
    /* Assemble */
    const { user } = await UtilDriver.setupTestUser();
    const repo = new RecurringEventRepository(user._id.toString());

    const { gcalEvents } = await simulateDbAfterGcalImport(user._id.toString());

    const { gBaseWithUntil, untilDateStr } =
      updateBasePayloadToExpireOneDayAfterFirstInstance(gcalEvents);

    /* Act */
    const origEvents = await getEventsInDb({ user: user._id.toString() });
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
    const remainingEvents = await getEventsInDb({
      user: user._id.toString(),
    }).then((events) =>
      events.map((event) => ({ ...event, _id: event._id?.toString() })),
    );

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
    const { user } = await UtilDriver.setupTestUser();
    const repo = new RecurringEventRepository(user._id.toString());

    const { gcalEvents } = await simulateDbAfterGcalImport(user._id.toString());

    const origEvents = await getEventsInDb({ user: user._id.toString() });

    /* Act */
    // Simulate a gcal notification payload after an instance was cancelled
    const cancelledInstance = Object.assign(gcalEvents.instances[1]!, {
      status: "cancelled",
    });

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
    const remainingEvents = await getEventsInDb({ user: user._id.toString() });
    expect(remainingEvents.length).toBeLessThan(origEvents.length);

    // Verify the cancelled instance was removed
    const cancelledInstanceExists = remainingEvents.some(
      (e) => e["gEventId"] === gcalEvents.cancelled.id,
    );
    expect(cancelledInstanceExists).toBe(false);
  });
});
