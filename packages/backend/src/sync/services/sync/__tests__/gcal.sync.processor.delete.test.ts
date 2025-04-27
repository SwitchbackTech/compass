import { Categories_Recurrence, Schema_Event } from "@core/types/event.types";
import { WithGcalId, gSchema$Event } from "@core/types/gcal";
import {
  categorizeEvents,
  isExistingInstance,
} from "@core/util/event/event.util";
import {
  getEventsInDb,
  isEventCollectionEmpty,
} from "@backend/__tests__/helpers/mock.db.queries";
import {
  TestSetup,
  cleanupCollections,
  cleanupTestMongo,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { simulateDbAfterGcalImport } from "@backend/__tests__/helpers/mock.events.init";
import { mockAndCategorizeGcalEvents } from "@backend/__tests__/mocks.gcal/factories/gcal.event.batch";
import { mockRecurringGcalBaseEvent } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { RecurringEventRepository } from "@backend/event/services/recur/repo/recur.event.repo";
import { Change_Gcal } from "@backend/sync/sync.types";
import { GcalSyncProcessor } from "../gcal.sync.processor";
import {
  createSeries,
  getCompassInstance,
} from "./gcal.sync.processor.delete.util";
import { createCompassSeriesFromGcalBase } from "./gcal.sync.processor.test.util";

// Mock Gcal Instances API response
jest.mock("@backend/common/services/gcal/gcal.service", () => ({
  __esModule: true,
  default: {
    getEventInstances: jest.fn().mockResolvedValue({
      data: {
        items: mockAndCategorizeGcalEvents().gcalEvents.instances,
      },
    }),
  },
}));
describe("GcalSyncProcessor: DELETE", () => {
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

  it("should delete a STANDALONE event", async () => {
    /* Assemble */
    const { gcalEvents } = await simulateDbAfterGcalImport(
      setup.db,
      setup.userId,
    );

    const origEvents = await getEventsInDb();

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
    const remainingEvents = await getEventsInDb();
    const { standaloneEvents } = categorizeEvents(remainingEvents);
    const eventIsGone =
      standaloneEvents.find((e) => e.gEventId === gStandalone.id) === undefined;
    expect(eventIsGone).toBe(true);

    // Verify no other events deleted
    expect(remainingEvents).toHaveLength(origEvents.length - 1);
  });
  it("should delete an INSTANCE after cancelling it", async () => {
    /* Assemble */
    const { compassBaseId, gcalBaseId, meta } = await createSeries(setup);

    // Query the Compass DB for actual recurring instances
    const compassInstance = await getCompassInstance(compassBaseId);

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

    const remainingEvents = await getEventsInDb();

    // Verify only the instance was deleted
    expect(remainingEvents).toHaveLength(meta.createdCount - 1);
    expect(remainingEvents[0]?._id.toString()).toBe(compassBaseId);
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

    const { state } = await createCompassSeriesFromGcalBase(
      setup,
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
    const remainingEvents = await getEventsInDb();
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
    const gcalBaseEvent = mockRecurringGcalBaseEvent({
      recurrence: ["RRULE:FREQ=DAILY"],
    });
    await createCompassSeriesFromGcalBase(setup, gcalBaseEvent);

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
