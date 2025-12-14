import { calendar } from "@googleapis/calendar";
import { Categories_Recurrence, Schema_Event } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { isInstance } from "@core/util/event/event.util";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import { getEventsInDb } from "@backend/__tests__/helpers/mock.db.queries";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { simulateDbAfterGcalImport } from "@backend/__tests__/helpers/mock.events.init";
import {
  baseHasRecurrenceRule,
  noInstancesAfterSplitDate,
  updateBasePayloadToExpireOneDayAfterFirstInstance,
} from "@backend/sync/services/sync/__tests__/gcal.sync.processor.test.util";
import { GcalSyncProcessor } from "@backend/sync/services/sync/gcal.sync.processor";

describe("GcalSyncProcessor: UPSERT: BASE SPLIT", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should handle new UNTIL in BASE by updating BASE rule and recreating the instances", async () => {
    /* Assemble */
    const { user } = await UtilDriver.setupTestUser();

    const { gcalEvents } = await simulateDbAfterGcalImport(user._id.toString());

    const { gBaseWithUntil, untilDateStr } =
      updateBasePayloadToExpireOneDayAfterFirstInstance(gcalEvents);

    // simulate event update in Google Calendar
    await calendar({ version: "v3" }).events.patch({
      eventId: gBaseWithUntil.id,
      requestBody: gBaseWithUntil,
    });

    /* Act */
    const origEvents = await getEventsInDb({ user: user._id.toString() });
    const processor = new GcalSyncProcessor(user._id.toString());
    const changes = await processor.processEvents([gBaseWithUntil]);

    /* Assert */
    // Verify the base was updated
    expect(changes).toHaveLength(4);
    expect(changes).toEqual(
      expect.arrayContaining([
        {
          title: gBaseWithUntil.summary as string,
          category: Categories_Recurrence.RECURRENCE_BASE,
          operation: "SERIES_DELETED",
          transition: ["RECURRENCE_BASE", "RECURRENCE_BASE_CONFIRMED"],
        },
        {
          title: gBaseWithUntil.summary as string,
          category: Categories_Recurrence.RECURRENCE_BASE,
          operation: "SERIES_CREATED",
          transition: ["RECURRENCE_BASE", "RECURRENCE_BASE_CONFIRMED"],
        },
        {
          title: gBaseWithUntil.summary as string,
          category: Categories_Recurrence.RECURRENCE_BASE,
          operation: "RECURRENCE_BASE_UPDATED",
          transition: ["RECURRENCE_BASE", "RECURRENCE_BASE_CONFIRMED"],
        },
        {
          title: gBaseWithUntil.summary as string,
          category: Categories_Recurrence.RECURRENCE_BASE,
          operation: "TIMED_INSTANCES_UPDATED",
          transition: ["RECURRENCE_BASE", "RECURRENCE_BASE_CONFIRMED"],
        },
      ]),
    );

    // Verify DB changed
    const remainingEvents = await getEventsInDb({
      user: user._id.toString(),
      $or: [
        { gEventId: gBaseWithUntil.id },
        { gRecurringEventId: gBaseWithUntil.id },
      ],
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
      isInstance(e as unknown as Schema_Event),
    );

    expect(instances.length).toBeGreaterThan(0);
  });

  it("should handle cancelled instance at split point by deleting it", async () => {
    /* Assemble */
    const { user } = await UtilDriver.setupTestUser();

    const { gcalEvents } = await simulateDbAfterGcalImport(user._id.toString());

    const origEvents = await getEventsInDb({ user: user._id.toString() });

    /* Act */
    // Simulate a gcal notification payload after an instance was cancelled
    const cancelledInstance: gSchema$Event = {
      ...gcalEvents.instances[1],
      status: "cancelled",
    };

    const processor = new GcalSyncProcessor(user._id.toString());
    const changes = await processor.processEvents([cancelledInstance]);

    /* Assert */
    // Verify the change summary
    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({
      title: cancelledInstance.summary,
      category: Categories_Recurrence.RECURRENCE_INSTANCE,
      operation: "RECURRENCE_INSTANCE_DELETED",
      transition: ["RECURRENCE_INSTANCE", "RECURRENCE_INSTANCE_CANCELLED"],
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
