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
import {
  mockCancelledInstance,
  mockGcalEvents,
} from "@backend/__tests__/mocks.gcal/mocks.gcal/factories/gcal.event.factory";
import { RecurringEventRepository } from "@backend/event/services/recur/repo/recur.event.repo";
import { Change_Gcal } from "@backend/sync/sync.types";
import { GcalSyncProcessor } from "./gcal.sync.processor";
import {
  baseHasRecurrenceRule,
  getLatestEventsFromDb,
  noInstancesAfterSplitDate,
  updateBasePayloadToExpireOneDayAfterFirstInstance,
  validateHasNewUpdatedAtTimestamp,
  validateInstanceDataMatchCompassBase,
  validateInstanceDataMatchesGoogleBase,
} from "./gcal.sync.processor.test.util";

// Mock Gcal Instances API response
jest.mock("@backend/common/services/gcal/gcal.service", () => ({
  __esModule: true,
  default: {
    getEventInstances: jest.fn().mockResolvedValue({
      data: { items: mockGcalEvents().gcalEvents.instances },
    }),
  },
}));

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
        standaloneEvents.find((e) => e.gEventId === gStandalone.id) ===
        undefined;
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
  describe("UPSERT: STANDALONE", () => {
    it("should handle UPSERTING a new STANDALONE event", async () => {
      /* Assemble */
      await simulateDbAfterGcalImport(setup.db, setup.userId);
      const origEventsCount = (await getEventsInDb()).length;

      /* Act */
      const newStandalone = mockRegularGcalEvent({
        summary: "New Standalone Event",
      });
      const processor = new GcalSyncProcessor(repo);
      const changes = await processor.processEvents([newStandalone]);

      /* Assert */
      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        title: newStandalone.summary,
        category: Categories_Recurrence.STANDALONE,
        operation: "UPSERTED",
      });

      // Verify that a new event was added
      const updatedEvents = await getEventsInDb();
      expect(updatedEvents).toHaveLength(origEventsCount + 1);

      // Verify the the new event has the right data
      const updatedEvent = updatedEvents.find(
        (e) => e.gEventId === newStandalone.id,
      );
      expect(updatedEvent?.title).toEqual(newStandalone.summary);
    });
    it("should handle UPSERTING an existing STANDALONE event", async () => {
      /* Assemble */
      const { gcalEvents } = await simulateDbAfterGcalImport(
        setup.db,
        setup.userId,
      );

      // Simulate a change to the standalone event in GCal
      const origStandalone = gcalEvents.regular;
      const updatedStandalone = {
        ...origStandalone,
        summary: origStandalone.summary + " - Changed in GCal",
      };

      const origEventsCount = (await getEventsInDb()).length;
      /* Act */
      const processor = new GcalSyncProcessor(repo);
      const changes = await processor.processEvents([updatedStandalone]);

      /* Assert */
      // Verify the correct change was detected
      expect(changes).toHaveLength(1);
      expect(changes[0]).toMatchObject({
        title: updatedStandalone.summary,
        category: Categories_Recurrence.STANDALONE,
        operation: "UPSERTED",
      });

      const updatedEvents = await getEventsInDb();

      // Verify no other events were deleted/added
      expect(updatedEvents).toHaveLength(gcalEvents.all.length - 1);
      expect(updatedEvents).toHaveLength(origEventsCount);

      // Verify the event was updated
      const updatedEvent = updatedEvents.find(
        (e) => e.gEventId === updatedStandalone.id,
      );
      expect(updatedEvent?.title).toEqual(updatedStandalone.summary);
    });
  });
  describe("UPSERT: INSTANCE", () => {
    it("should handle UPSERTING an INSTANCE", async () => {
      /* Assemble */
      const { gcalEvents } = await simulateDbAfterGcalImport(
        setup.db,
        setup.userId,
      );

      // Simulate a change to the instance in GCal
      const origInstance = gcalEvents.instances[1];
      const origTitle = origInstance?.summary;
      const instance = {
        ...origInstance,
        summary: origTitle + " - Changed in GCal",
      };
      const instanceTitle = instance.summary;

      const processor = new GcalSyncProcessor(repo);
      const changes = await processor.processEvents([instance]);

      // Verify the correct change was detected
      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        title: instanceTitle,
        category: Categories_Recurrence.RECURRENCE_INSTANCE,
        operation: "UPSERTED",
      });

      // Verify no other events were deleted
      const remainingEvents = await getEventsInDb();
      expect(remainingEvents).toHaveLength(gcalEvents.all.length - 1); // exclude cancelled instance

      // Verify the instance was updated
      const { instances } = categorizeEvents(remainingEvents);
      const updatedInstance = instances.find((i) => i.title === instanceTitle);
      expect(updatedInstance).toBeDefined();
      expect(updatedInstance?.title).toEqual(instanceTitle);
    });
    it("should handle updating recurring INSTANCE gcal event", async () => {
      const { gcalEvents } = await simulateDbAfterGcalImport(
        setup.db,
        setup.userId,
      );

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
    it("should handle CREATING a SERIES from a BASE", async () => {
      await simulateDbAfterGcalImport(setup.db, setup.userId);

      const newBase = mockRecurringGcalBaseEvent();

      const processor = new GcalSyncProcessor(repo);
      const changes = await processor.processEvents([newBase]);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        title: newBase.summary,
        category: Categories_Recurrence.RECURRENCE_BASE,
        operation: "UPSERTED",
      });
    });

    it("should handle UPDATING an ALL-DAY SERIES", async () => {
      /* Assemble */
      const { gcalEvents } = await simulateDbAfterGcalImport(
        setup.db,
        setup.userId,
      );
      const origEvents = await getEventsInDb();
      const { instances: origInstances } = categorizeEvents(origEvents);

      /* Act */
      const updatedGcalBase = {
        ...gcalEvents.recurring,
        summary: `${gcalEvents.recurring.summary} - UPDATED IN GCAL`,
        description: "ALL-DAY Description adjusted in Gcal",
        start: {
          date: "2025-04-21",
          timeZone: "America/Chicago",
        },
        end: {
          date: "2025-04-23",
          timeZone: "America/Chicago",
        },
      };

      const processor = new GcalSyncProcessor(repo);
      const changes = await processor.processEvents([updatedGcalBase]);

      /* Assert */
      // Validate the correct change was detected
      expect(changes).toHaveLength(1);
      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: updatedGcalBase.summary,
            category: Categories_Recurrence.RECURRENCE_BASE, // TODO change to series for clarity?
            operation: "UPSERTED",
          }),
        ]),
      );

      // Validate that all events in the series (base and instances) were updated
      const { base, instances } = await getLatestEventsFromDb();

      expect(instances.length).toBeGreaterThan(0);
      for (const i of instances) {
        validateInstanceDataMatchesGoogleBase(i, updatedGcalBase);
        validateInstanceDataMatchCompassBase(i, base);
        validateHasNewUpdatedAtTimestamp(i, origInstances);
      }
    });

    it("should handle UPDATING a TIMED SERIES", async () => {
      /* Assemble */
      const { gcalEvents } = await simulateDbAfterGcalImport(
        setup.db,
        setup.userId,
      );
      const origEvents = await getEventsInDb();
      const { instances: origInstances } = categorizeEvents(origEvents);

      /* Act */
      const updatedGcalBase = {
        ...gcalEvents.recurring,
        summary: gcalEvents.recurring.summary + " - UPDATED IN GCAL",
        description: "Description adjusted in Gcal",
        start: {
          dateTime: "2025-04-21T19:15:00-05:00",
          timeZone: "America/Chicago",
        },
        end: {
          dateTime: "2025-04-21T20:30:00-05:00",
          timeZone: "America/Chicago",
        },
      };

      const processor = new GcalSyncProcessor(repo);
      const changes = await processor.processEvents([updatedGcalBase]);

      /* Assert */
      // Validate the correct change was detected
      expect(changes).toHaveLength(1);
      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: updatedGcalBase.summary,
            category: Categories_Recurrence.RECURRENCE_BASE, // TODO change to series for clarity?
            operation: "UPSERTED",
          }),
        ]),
      );

      // Validate that all events in the series (base and instances) were updated
      const { base, instances } = await getLatestEventsFromDb();

      expect(instances.length).toBeGreaterThan(0);
      for (const i of instances) {
        validateInstanceDataMatchesGoogleBase(i, updatedGcalBase);
        validateInstanceDataMatchCompassBase(i, base);
        validateHasNewUpdatedAtTimestamp(i, origInstances);
      }
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
});
