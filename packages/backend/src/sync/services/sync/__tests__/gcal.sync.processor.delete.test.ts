import { ObjectId } from "mongodb";
import {
  Categories_Recurrence,
  Schema_Event,
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";
import {
  WithGcalId,
  gSchema$Event,
  gSchema$EventInstance,
} from "@core/types/gcal";
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
import { createRecurrenceSeries } from "@backend/__tests__/mocks.db/ccal.mock.db.util";
import {
  mockRecurringGcalBaseEvent,
  mockRecurringGcalInstances,
  mockRegularGcalEvent,
} from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { mockGcalEvents } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory.set";
import { RecurringEventRepository } from "@backend/event/services/recur/repo/recur.event.repo";
import { Change_Gcal } from "@backend/sync/sync.types";
import { GcalSyncProcessor } from "../gcal.sync.processor";

// Mock Gcal Instances API response
jest.mock("@backend/common/services/gcal/gcal.service", () => ({
  __esModule: true,
  default: {
    getEventInstances: jest.fn().mockResolvedValue({
      data: { items: mockGcalEvents().gcalEvents.instances },
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

    //Verify no other events deleted
    expect(remainingEvents).toHaveLength(origEvents.length - 1);
  });
  it("should delete BASE and all INSTANCES after cancelling a BASE", async () => {
    const gcalBaseEvent = mockRecurringGcalBaseEvent({
      recurrence: ["RRULE:FREQ=DAILY"],
    });
    const gcalInstance = mockRecurringGcalInstances(
      gcalBaseEvent,
      1,
      1,
    )[0] as gSchema$EventInstance;

    const baseCompassId = new ObjectId().toString();
    const compassBaseEvent: Schema_Event_Recur_Base = {
      title: gcalBaseEvent.summary as string,
      user: setup.userId,
      _id: baseCompassId,
      gEventId: gcalBaseEvent.id as string,
      recurrence: {
        rule: ["RRULE:FREQ=DAILY"],
      },
    };

    const compassInstanceTemplate: Schema_Event_Recur_Instance = {
      title: gcalInstance.summary as string,
      user: setup.userId,
      gEventId: gcalInstance.id as string,
      recurrence: {
        eventId: baseCompassId,
      },
    };
    await createRecurrenceSeries(
      setup,
      compassBaseEvent,
      compassInstanceTemplate,
    );

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

  it("should delete an INSTANCE after cancelling it", async () => {
    /* Assemble */
    const gcalBaseEvent = mockRegularGcalEvent({
      recurrence: ["RRULE:FREQ=DAILY"],
    });
    const gcalInstance = mockRegularGcalEvent({
      recurringEventId: gcalBaseEvent.id + "_20250325T130000Z",
    });
    // Create base and instances in Compass,
    // that point to the original gcal base
    const compassBaseId = new ObjectId().toString();
    const compassBase = {
      title: gcalBaseEvent.summary as string,
      user: setup.userId,
      _id: compassBaseId,
      gEventId: gcalBaseEvent.id as string,
    };
    const compassInstanceTemplate = {
      title: gcalInstance.summary as string,
      user: setup.userId,
      gEventId: gcalInstance.id as string,
      recurrence: {
        eventId: compassBaseId,
      },
    };

    const { meta } = await createRecurrenceSeries(
      setup,
      compassBase,
      compassInstanceTemplate,
    );

    // This happens when cancelling one instance
    // or 'this and following'
    const cancelledGcalInstance = {
      kind: "calendar#event",
      id: gcalInstance.id,
      status: "cancelled",
      recurringEventId: gcalBaseEvent.id + "_20250325T130000Z",
      originalStartTime: {
        date: "2025-04-10",
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
});
