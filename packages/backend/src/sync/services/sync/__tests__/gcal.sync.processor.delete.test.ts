import { Categories_Recurrence, Schema_Event } from "@core/types/event.types";
import { WithGcalId, gSchema$Event } from "@core/types/gcal";
import {
  categorizeEvents,
  isExistingInstance,
} from "@core/util/event/event.util";
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
import { RecurringEventRepository } from "@backend/event/services/recur/repo/recur.event.repo";
import { createSeries } from "@backend/sync/services/sync/__tests__/gcal.sync.processor.delete.util";
import { createCompassSeriesFromGcalBase } from "@backend/sync/services/sync/__tests__/gcal.sync.processor.test.util";
import { GcalSyncProcessor } from "@backend/sync/services/sync/gcal.sync.processor";
import { Change_Gcal } from "@backend/sync/sync.types";

describe("GcalSyncProcessor: DELETE", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should delete a STANDALONE event", async () => {
    /* Assemble */
    const { user } = await UtilDriver.setupTestUser();
    const repo = new RecurringEventRepository(user._id.toString());

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

    const processor = new GcalSyncProcessor(repo);
    const changes = await processor.processEvents([cancelledGStandalone]);

    /* Assert: Should return a DELETED change */
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      title: cancelledGStandalone.id,
      operation: "DELETED",
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
    const repo = new RecurringEventRepository(user._id.toString());
    const { compassBaseId, gcalBaseId, meta } = await createSeries(user);

    // Query the Compass DB for actual recurring instances
    const compassInstances = await getEventsInDb({
      gRecurringEventId: compassBaseId,
    });

    const compassInstance = compassInstances[0];

    const cancelledGcalInstance = {
      kind: "calendar#event",
      id: compassInstance?.gEventId,
      status: "cancelled",
      recurringEventId: gcalBaseId,
      originalStartTime: {
        date: compassInstance?.startDate?.slice(0, 10) || "2025-04-10",
      },
    };

    /* Act */
    const processor = new GcalSyncProcessor(repo);
    const changes = await processor.processEvents([cancelledGcalInstance]);

    /* Assert */
    expect(changes).toHaveLength(1);
    const expected: Change_Gcal = {
      title: cancelledGcalInstance.id as string,
      category: Categories_Recurrence.RECURRENCE_INSTANCE,
      operation: "DELETED",
    };
    expect(changes[0]).toEqual(expected);

    const remainingEvents = await getEventsInDb({ user: user._id.toString() });

    // Verify only the instance was deleted
    expect(remainingEvents).toHaveLength(meta.createdCount - 1);
    expect(remainingEvents[0]?._id?.toString()).toBe(compassBaseId);

    expect(
      isExistingInstance(remainingEvents[1] as unknown as Schema_Event),
    ).toBe(true);
  });

  it("should handle a mixed payload of multiple INSTANCE DELETIONS and one BASE UPSERT", async () => {
    // This scenario happens when a user updates a series that includes multiple instance exceptions

    /* Assemble */
    const gcalBaseEvent = mockRecurringGcalBaseEvent({
      recurrence: ["RRULE:FREQ=DAILY"],
    });

    const { user } = await UtilDriver.setupTestUser();
    const repo = new RecurringEventRepository(user._id.toString());

    const { state } = await createCompassSeriesFromGcalBase(
      user,
      gcalBaseEvent,
    );

    // Create cancellation payloads for each instance
    const cancellations = state.instances.map((i) => ({
      kind: "calendar#event",
      id: i.gEventId,
      status: "cancelled",
    }));

    /* Act */
    const processor = new GcalSyncProcessor(repo);
    const changes = await processor.processEvents([
      gcalBaseEvent,
      ...cancellations,
    ]);

    /* Assert */
    // Validate all changes detected
    expect(changes).toHaveLength(3);

    // Validate change types
    const deletions = changes.filter((c) => c.operation === "DELETED");
    const upserts = changes.filter((c) => c.operation === "UPSERTED");
    expect(deletions).toHaveLength(2);
    expect(upserts).toHaveLength(1);

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
      instances.every(
        (i) => i.recurrence?.eventId === baseEvents[0]?._id?.toString(),
      ),
    ).toBe(true);
  });

  it("should delete BASE and all INSTANCES after cancelling a BASE", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const repo = new RecurringEventRepository(user._id.toString());

    const gcalBaseEvent = mockRecurringGcalBaseEvent({
      recurrence: ["RRULE:FREQ=DAILY"],
    });

    await createCompassSeriesFromGcalBase(user, gcalBaseEvent);

    // Cancel the entire series
    const cancelledBase = {
      kind: "calendar#event",
      id: gcalBaseEvent.id,
      status: "cancelled",
    };

    const processor = new GcalSyncProcessor(repo);
    const changes = await processor.processEvents([cancelledBase]);

    expect(changes).toHaveLength(1);
    const expected: Change_Gcal = {
      title: cancelledBase.id as string,
      category: Categories_Recurrence.RECURRENCE_BASE,
      operation: "DELETED",
    };
    expect(changes[0]).toEqual(expected);

    // Verify all Compass events that match the gcal base were deleted
    const isEmpty = await isEventCollectionEmpty();
    expect(isEmpty).toBe(true);
  });
});
