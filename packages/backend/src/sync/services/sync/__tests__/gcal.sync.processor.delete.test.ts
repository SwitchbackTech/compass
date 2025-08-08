import { RRule } from "rrule";
import { Categories_Recurrence } from "@core/types/event.types";
import { WithGcalId, gSchema$Event } from "@core/types/gcal";
import { categorizeEvents } from "@core/util/event/event.util";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  getEventsInDb,
  isEventCollectionEmpty,
} from "@backend/__tests__/helpers/mock.db.queries";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { simulateDbAfterGcalImport } from "@backend/__tests__/helpers/mock.events.init";
import { mockRecurringGcalBaseEvent } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { createCompassSeriesFromGcalBase } from "@backend/sync/services/sync/__tests__/gcal.sync.processor.test.util";
import { GcalSyncProcessor } from "@backend/sync/services/sync/gcal.sync.processor";

describe("GcalSyncProcessor: DELETE", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should delete a STANDALONE event", async () => {
    /* Assemble */
    const { user } = await UtilDriver.setupTestUser();

    const { gcalEvents } = await simulateDbAfterGcalImport(user._id.toString());

    const origEvents = await getEventsInDb({ user: user._id.toString() });

    /* Act: Simulate a cancelled event from Gcal */
    const gStandalone = gcalEvents.regular;
    const cancelledGStandalone = {
      kind: gStandalone.kind,
      etag: gStandalone.etag,
      id: gStandalone.id,
      status: "cancelled",
    } as WithGcalId<gSchema$Event>;

    const processor = new GcalSyncProcessor(user._id.toString());
    const changes = await processor.processEvents([cancelledGStandalone]);

    /* Assert: Should return a DELETED change */
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      title: cancelledGStandalone.id,
      operation: "STANDALONE_DELETED",
    });

    // Verify the event is deleted from the DB
    const remainingEvents = await getEventsInDb({
      user: user._id.toString(),
    }).then((events) =>
      events.map((event) => ({ ...event, _id: event._id?.toString() })),
    );

    const { standaloneEvents } = categorizeEvents(remainingEvents);
    const eventIsGone =
      standaloneEvents.find((e) => e.gEventId === gStandalone.id) === undefined;
    expect(eventIsGone).toBe(true);

    // Verify no other events deleted
    expect(remainingEvents).toHaveLength(origEvents.length - 1);
  });

  it("should delete an INSTANCE after cancelling it", async () => {
    /* Assemble */
    const { user } = await UtilDriver.setupTestUser();

    const { gcalEvents, compassEvents } = await simulateDbAfterGcalImport(
      user._id.toString(),
    );

    const compassInstance = compassEvents[0]!;
    const isAllDay = compassInstance.isAllDay;
    const dateKey = isAllDay ? "date" : "dateTime";

    const cancelledGcalInstance = {
      ...gcalEvents.instances[1],
      status: "cancelled",
      originalStartTime: { [dateKey]: compassInstance?.startDate },
    };

    /* Act */
    const processor = new GcalSyncProcessor(user._id.toString());

    const changes = await processor.processEvents([
      gcalEvents.recurring,
      cancelledGcalInstance,
    ]);

    /* Assert */
    expect(changes).toHaveLength(3);

    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: gcalEvents.recurring.summary,
          category: Categories_Recurrence.RECURRENCE_BASE,
          operation: "RECURRENCE_BASE_UPDATED",
        }),
        expect.objectContaining({
          title: gcalEvents.recurring.summary,
          category: Categories_Recurrence.RECURRENCE_BASE,
          operation: "TIMED_INSTANCES_UPDATED",
        }),
        expect.objectContaining({
          title: cancelledGcalInstance.summary as string,
          category: Categories_Recurrence.RECURRENCE_INSTANCE,
          operation: "RECURRENCE_INSTANCE_DELETED",
        }),
      ]),
    );

    const remainingEvents = await getEventsInDb({ user: user._id.toString() });

    // Verify only the instance was deleted
    expect(remainingEvents).toHaveLength(compassEvents.length - 1);
    expect(remainingEvents[0]?._id?.toString()).toBe(
      compassEvents[0]?._id.toString(),
    );

    expect(
      remainingEvents.find(
        ({ gRecurringEventId }) =>
          gRecurringEventId === cancelledGcalInstance.id,
      ),
    ).toBeUndefined();
  });

  it("should handle a mixed payload of multiple INSTANCE DELETIONS and one BASE UPSERT", async () => {
    // This scenario happens when a user updates a series that includes multiple instance exceptions

    /* Assemble */
    const { user } = await UtilDriver.setupTestUser();

    const { gcalEvents } = await simulateDbAfterGcalImport(user._id.toString());

    const gcalBaseEvent = gcalEvents.recurring;

    // Create cancellation payloads for each instance
    const cancellations: gSchema$Event[] = gcalEvents.instances.map((i) => ({
      ...i,
      status: "cancelled",
    }));

    /* Act */
    const processor = new GcalSyncProcessor(user._id.toString());

    const changes = await processor.processEvents([
      gcalBaseEvent,
      ...cancellations,
    ]);

    /* Assert */
    // Validate all changes detected
    expect(changes).toHaveLength(5);

    // Validate change types
    const baseUpdate = changes.filter((c) =>
      c.operation?.includes("RECURRENCE_BASE_UPDATED"),
    );

    const timedInstancesUpdate = changes.filter((c) =>
      c.operation?.includes("TIMED_INSTANCES_UPDATED"),
    );

    const instanceDeletes = changes.filter((c) =>
      c.operation?.includes("RECURRENCE_INSTANCE_DELETED"),
    );

    expect(baseUpdate).toHaveLength(1);
    expect(timedInstancesUpdate).toHaveLength(1); // cascading updates from base to instances
    expect(instanceDeletes).toHaveLength(cancellations.length);

    // Validate DB state
    const remainingEvents = await getEventsInDb({
      user: user._id.toString(),
    }).then((events) =>
      events.map((event) => ({ ...event, _id: event._id?.toString() })),
    );

    const { baseEvents, instances } = categorizeEvents(remainingEvents);
    // Validate base exists
    expect(baseEvents).toHaveLength(1);
    // Validate instances point to new base
    expect(
      instances.find((i) => cancellations.some((c) => c.id === i.gEventId)),
    ).toBeUndefined();
  });

  it("should delete BASE and all INSTANCES after cancelling a BASE", async () => {
    const { user } = await UtilDriver.setupTestUser();

    const gcalBaseEvent = mockRecurringGcalBaseEvent({}, false, {
      freq: RRule.DAILY,
    });

    await createCompassSeriesFromGcalBase(user, gcalBaseEvent);

    // Cancel the entire series
    const cancelledBase = {
      ...gcalBaseEvent,
      status: "cancelled",
    };

    const processor = new GcalSyncProcessor(user._id.toString());
    const changes = await processor.processEvents([cancelledBase]);

    expect(changes).toHaveLength(1);

    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: cancelledBase.summary as string,
          category: Categories_Recurrence.RECURRENCE_BASE,
          operation: "SERIES_DELETED",
        }),
      ]),
    );

    // Verify all Compass events that match the gcal base were deleted
    const isEmpty = await isEventCollectionEmpty();
    expect(isEmpty).toBe(true);
  });
});
