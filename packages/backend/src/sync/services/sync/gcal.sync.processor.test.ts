import { ObjectId } from "mongodb";
import {
  Categories_Recurrence,
  Schema_Event,
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";
import {
  getEventsInDb,
  isEventCollectionEmpty,
} from "@backend/__tests__/helpers/mock.db.queries";
import {
  TestSetup,
  cleanupTestMongo,
  clearCollections,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { createRecurrenceSeries } from "@backend/__tests__/mocks.ccal/ccal.mock.db.util";
import { mockGcalEvent } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { RecurringEventRepository } from "@backend/event/queries/event.recur.queries";
import { isInstance } from "@backend/event/services/recur/util/recur.util";
import { Change_Gcal } from "@backend/sync/sync.types";
import { GcalSyncProcessor } from "./gcal.sync.processor";

describe("GcalSyncProcessor", () => {
  let setup: TestSetup;
  let repo: RecurringEventRepository;

  beforeAll(async () => {
    setup = await setupTestDb();
    repo = new RecurringEventRepository(setup.userId);
  });

  beforeEach(async () => {
    await clearCollections(setup.db);
  });

  afterAll(async () => {
    await cleanupTestMongo(setup);
  });
  it("should handle all gcal event types", async () => {
    const processor = new GcalSyncProcessor(repo);

    const regularEvent = mockGcalEvent();
    const recurrenceBase = mockGcalEvent({
      recurrence: ["RRULE:FREQ=DAILY"], // this makes it a base
    });
    const recurrenceInstance = mockGcalEvent({
      id: "1234567890",
      recurringEventId: recurrenceBase.id,
      originalStartTime: {
        dateTime: "2025-03-24T07:30:00-05:00",
        timeZone: "America/Chicago",
      },
    });

    const changes = await processor.processEvents([
      regularEvent,
      recurrenceBase,
      recurrenceInstance,
    ]);

    expect(changes).toHaveLength(3);
    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: regularEvent.summary,
          category: Categories_Recurrence.STANDALONE,
          operation: "UPSERTED",
        }),
        expect.objectContaining({
          title: recurrenceBase.summary,
          category: Categories_Recurrence.RECURRENCE_BASE,
          operation: "UPSERTED",
        }),
        expect.objectContaining({
          title: recurrenceInstance.summary,
          category: Categories_Recurrence.RECURRENCE_INSTANCE,
          operation: "UPSERTED",
        }),
      ]),
    );
  });
  describe("DELETE", () => {
    it("should delete base and all instances after cancelling a base", async () => {
      const gcalBaseEvent = mockGcalEvent({
        recurrence: ["RRULE:FREQ=DAILY"],
      });
      const gcalInstance = mockGcalEvent({
        recurringEventId: gcalBaseEvent.id,
        originalStartTime: {
          dateTime: "2025-03-24T07:30:00-05:00",
          timeZone: "America/Chicago",
        },
      });

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

    it("should delete an instance after cancelling it", async () => {
      const gcalBaseEvent = mockGcalEvent({
        recurrence: ["RRULE:FREQ=DAILY"],
      });
      const gcalInstance = mockGcalEvent({
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
      const processor = new GcalSyncProcessor(repo);
      const changes = await processor.processEvents([cancelledGcalInstance]);

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
      expect(isInstance(remainingEvents[1] as unknown as Schema_Event)).toBe(
        true,
      );
    });
  });

  describe("UPSERT", () => {
    //TODO add DB checks to this once ready
    it("should create Compass events after receiving a recurring event", async () => {
      const processor = new GcalSyncProcessor(repo);

      const recurringEvent = mockGcalEvent({
        recurrence: ["RRULE:FREQ=DAILY"],
      });
      const changes = await processor.processEvents([recurringEvent]);

      expect(changes).toHaveLength(1);
      const expected: Change_Gcal = {
        title: recurringEvent.summary as string,
        category: Categories_Recurrence.RECURRENCE_BASE,
        operation: "UPSERTED",
      };
      expect(changes[0]).toEqual(expected);
    });
    it.todo("should create an instance");
    it.todo("should edit an instance");
    it.todo("should create a series");
    it.todo("should edit a series");
  });
});
