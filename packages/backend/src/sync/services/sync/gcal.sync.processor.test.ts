import { ObjectId } from "mongodb";
import {
  Categories_Recurrence,
  Schema_Event,
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";
import {
  TestSetup,
  cleanupTestMongo,
  clearCollections,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { createRecurrenceSeries } from "@backend/__tests__/mocks.ccal/ccal.mock.db.util";
import { mockGcalEvent } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import { RecurringEventRepository } from "@backend/event/queries/event.recur.queries";
import { isInstance } from "@backend/event/services/recur/util/recur.util";
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
    const cancelledInstance = mockGcalEvent({
      status: "cancelled",
      summary: "Cancelled Instance",
      recurringEventId: "some-recurrence-id", // this makes it an instance
    });
    const recurrenceBase = mockGcalEvent({
      recurrence: ["RRULE:FREQ=DAILY"], // this makes it a base
    });
    const recurrenceInstance = mockGcalEvent({
      recurringEventId: recurrenceBase.id,
      originalStartTime: {
        dateTime: "2025-03-24T07:30:00-05:00",
        timeZone: "America/Chicago",
      },
    });

    const changes = await processor.processEvents([
      regularEvent,
      cancelledInstance,
      recurrenceBase,
      recurrenceInstance,
    ]);

    expect(changes).toHaveLength(4);
    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: regularEvent.summary,
          category: Categories_Recurrence.STANDALONE,
          changeType: "ACTIVE",
          operation: "UPSERTED",
        }),
        expect.objectContaining({
          title: cancelledInstance.summary,
          category: Categories_Recurrence.RECURRENCE_INSTANCE,
          changeType: "CANCELLED",
          operation: "CANCELLED",
        }),
        expect.objectContaining({
          title: recurrenceBase.summary,
          category: Categories_Recurrence.RECURRENCE_BASE,
          changeType: "ACTIVE",
          operation: "UPSERTED",
        }),
        expect.objectContaining({
          title: recurrenceInstance.summary,
          category: Categories_Recurrence.RECURRENCE_INSTANCE,
          changeType: "ACTIVE",
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

      // Cancel the series
      const cancelledBase = { ...gcalBaseEvent, status: "cancelled" };
      const processor = new GcalSyncProcessor(repo);
      const changes = await processor.processEvents([cancelledBase]);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        title: cancelledBase.summary,
        category: Categories_Recurrence.RECURRENCE_BASE,
        changeType: "CANCELLED",
        operation: "CANCELLED",
      });

      // Verify all Compass events that match the gcal base were deleted
      const remainingEvents = await mongoService.db
        .collection(Collections.EVENT)
        .find()
        .toArray();

      expect(remainingEvents).toHaveLength(0);
    });

    it("should delete an instance after cancelling it", async () => {
      const gcalBaseEvent = mockGcalEvent({
        recurrence: ["RRULE:FREQ=DAILY"],
      });
      const gcalInstance = mockGcalEvent({
        recurringEventId: gcalBaseEvent.id,
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

      // Cancel just the instance
      const cancelledGcalInstance = { ...gcalInstance, status: "cancelled" };
      const processor = new GcalSyncProcessor(repo);
      const changes = await processor.processEvents([cancelledGcalInstance]);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        title: cancelledGcalInstance.summary,
        category: Categories_Recurrence.RECURRENCE_INSTANCE,
        changeType: "CANCELLED",
        operation: "CANCELLED",
      });

      // Verify only the instance was deleted
      const remainingEvents = await mongoService.db
        .collection(Collections.EVENT)
        .find()
        .toArray();

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
      expect(changes[0]).toEqual({
        title: recurringEvent.summary,
        category: Categories_Recurrence.RECURRENCE_BASE,
        changeType: "ACTIVE",
        operation: "UPSERTED",
      });
    });
    it.todo("should create an instance");
    it.todo("should edit an instance");
    it.todo("should create a series");
    it.todo("should edit a series");
  });
});
