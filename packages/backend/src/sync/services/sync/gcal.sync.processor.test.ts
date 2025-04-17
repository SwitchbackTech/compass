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
  cleanupCollections,
  cleanupTestMongo,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { simulateDbAfterGcalImport } from "@backend/__tests__/helpers/mock.events.init";
import { createRecurrenceSeries } from "@backend/__tests__/mocks.ccal/ccal.mock.db.util";
import { mockGcalEvent } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { mockCancelledInstance } from "@backend/__tests__/mocks.gcal/mocks.gcal/factories/gcal.event.factory";
import { RecurringEventRepository } from "@backend/event/services/recur/repo/recur.event.repo";
import { isInstance } from "@backend/event/services/recur/util/recur.util";
import { Change_Gcal } from "@backend/sync/sync.types";
import { GcalSyncProcessor } from "./gcal.sync.processor";
import {
  baseHasRecurrenceRule,
  noInstancesAfterSplitDate,
  updateBasePayloadToExpireOneDayAfterFirstInstance,
} from "./gcal.sync.processor.test.util";

describe("GcalSyncProcessor", () => {
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

  describe("DELETE", () => {
    it("should delete BASE and all INSTANCES after cancelling a BASE", async () => {
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

    it("should delete an INSTANCE after cancelling it", async () => {
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
  describe("UPSERT: INSTANCE", () => {
    it("should handle updating recurring INSTANCE gcal event", async () => {
      const { gcalEvents } = await simulateDbAfterGcalImport(setup.db);

      const updatedRegular = {
        ...gcalEvents.regular,
        summary: "Updated Regular Event",
      };
      const updatedInstance = {
        ...gcalEvents.instances[0],
        summary: "Updated Recurring Instance Event",
      };

      const updatedGcalEvents = [updatedRegular, updatedInstance];

      const processor = new GcalSyncProcessor(repo);
      const changes = await processor.processEvents(updatedGcalEvents);

      expect(changes).toHaveLength(2);
      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: updatedRegular.summary,
            category: Categories_Recurrence.STANDALONE,
            operation: "UPSERTED",
          }),
          expect.objectContaining({
            title: updatedInstance.summary,
            category: Categories_Recurrence.RECURRENCE_INSTANCE,
            operation: "UPSERTED",
          }),
        ]),
      );
    });
  });

  describe("UPSERT: BASE", () => {
    it("should handle updating recurring BASE and REGULAR gcal events", async () => {
      const { gcalEvents } = await simulateDbAfterGcalImport(setup.db);

      // todo support cancellation changes (separate test?)
      const updatedRegularGcalEvent = {
        ...gcalEvents.regular,
        summary: "Updated Regular Event",
      };
      const updatedRecurringGcalEvent = {
        ...gcalEvents.recurring,
        summary: "Updated Recurring Base Event",
      };

      const updatedGcalEvents = [
        updatedRegularGcalEvent,
        updatedRecurringGcalEvent,
      ];

      const processor = new GcalSyncProcessor(repo);
      const changes = await processor.processEvents(updatedGcalEvents);

      expect(changes).toHaveLength(2);
      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: updatedRegularGcalEvent.summary,
            category: Categories_Recurrence.STANDALONE,
            operation: "UPSERTED",
          }),
          expect.objectContaining({
            title: updatedRecurringGcalEvent.summary,
            category: Categories_Recurrence.RECURRENCE_BASE,
            operation: "UPSERTED",
          }),
        ]),
      );
    });
  });

  describe("UPSERT: BASE SPLIT", () => {
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
        isInstance(e as unknown as Schema_Event),
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
});
