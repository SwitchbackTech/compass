import { RRule } from "rrule";
import { faker } from "@faker-js/faker";
import { Origin } from "@core/constants/core.constants";
import { MapEvent, gEventToCompassEvent } from "@core/mappers/map.event";
import {
  Categories_Recurrence,
  CompassEvent,
  CompassEventStatus,
  Event_Core,
  Schema_Event_Core,
} from "@core/types/event.types";
import { gSchema$EventInstance } from "@core/types/gcal";
import {
  createMockBaseEvent,
  createMockInstance,
  createMockStandaloneEvent,
} from "@core/util/test/ccal.event.factory";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { simulateGoogleCalendarEventCreation } from "@backend/__tests__/helpers/mock.events.init";
import {
  generateGcalId,
  mockRecurringGcalBaseEvent,
  mockRecurringGcalInstances,
  mockRegularGcalEvent,
} from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import mongoService from "@backend/common/services/mongo.service";
import { CompassEventParser } from "@backend/event/classes/compass.event.parser";
import { createSyncImport } from "@backend/sync/services/import/sync.import";

describe("CompassEventParser", () => {
  describe("Before Init", () => {
    it("should be called before accessing these public members", () => {
      const payload = createMockBaseEvent() as Event_Core;

      const event: CompassEvent = {
        payload,
        eventId: payload._id!,
        userId: payload.user,
        status: CompassEventStatus.CONFIRMED,
      };

      const parser = new CompassEventParser(event);
      const developerError = GenericError.DeveloperError.description;

      expect(() => parser.category).toThrow(developerError);
      expect(() => parser.isBase).toThrow(developerError);
      expect(() => parser.isDbBase).toThrow(developerError);
      expect(() => parser.isDbInstance).toThrow(developerError);
      expect(() => parser.isDbStandalone).toThrow(developerError);
      expect(() => parser.isInstance).toThrow(developerError);
      expect(() => parser.isStandalone).toThrow(developerError);
      expect(() => parser.rrule).toThrow(developerError);
      expect(() => parser.summary).toThrow(developerError);
      expect(() => parser.transition).toThrow(developerError);
    });
  });

  describe("Init", () => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    it("should initialize these members after init", async () => {
      const payload = createMockBaseEvent() as Event_Core;

      const event: CompassEvent = {
        payload,
        eventId: payload._id!,
        userId: payload.user,
        status: CompassEventStatus.CONFIRMED,
      };

      const parser = new CompassEventParser(event);
      const developerError = GenericError.DeveloperError.description;
      const status = event.status;

      await parser.init();

      expect(() => parser.category).not.toThrow(developerError);
      expect(() => parser.isBase).not.toThrow(developerError);
      expect(() => parser.isDbBase).not.toThrow(developerError);
      expect(() => parser.isDbInstance).not.toThrow(developerError);
      expect(() => parser.isDbStandalone).not.toThrow(developerError);
      expect(() => parser.isInstance).not.toThrow(developerError);
      expect(() => parser.isStandalone).not.toThrow(developerError);
      expect(() => parser.rrule).not.toThrow(developerError);
      expect(() => parser.summary).not.toThrow(developerError);
      expect(() => parser.transition).not.toThrow(developerError);

      expect([
        Categories_Recurrence.RECURRENCE_BASE,
        Categories_Recurrence.RECURRENCE_INSTANCE,
        Categories_Recurrence.STANDALONE,
      ]).toContain(parser.category);

      expect([
        parser.isBase,
        parser.isDbBase,
        parser.isDbInstance,
        parser.isDbStandalone,
        parser.isInstance,
        parser.isStandalone,
      ]).toContain(true);

      expect(parser.rrule).toBeInstanceOf(RRule);

      expect(parser.summary).toEqual({
        title: event.payload.title ?? event.eventId ?? "unknown",
        transition: [null, `${parser.category}_${status}`],
        category: parser.category,
      });

      expect(parser.getTransitionString()).toStrictEqual(
        `NIL->>${parser.category}_${status}`,
      );
    });
  });

  describe("deleteEvent - Series", () => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    it("should not delete a non-existent series", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const _id = faker.database.mongodbObjectId().toString();
      const payload = createMockBaseEvent({ user: userId, _id }) as Event_Core;

      const event: CompassEvent = {
        payload,
        eventId: payload._id!,
        userId: payload.user,
        status: CompassEventStatus.CANCELLED,
      };

      const parser = new CompassEventParser(event);

      await parser.init();

      await expect(parser.deleteEvent()).rejects.toThrow(
        "cannot delete gcal event without id",
      );
    });

    it("should cancel a series", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const status = CompassEventStatus.CANCELLED;
      const origin = Origin.GOOGLE_IMPORT;
      const gcalBase = mockRecurringGcalBaseEvent({}, false, { count: 2 });
      const instances = mockRecurringGcalInstances(gcalBase);
      const payload = gEventToCompassEvent(gcalBase, userId, origin);

      await simulateGoogleCalendarEventCreation(gcalBase);
      await Promise.all(instances.map(simulateGoogleCalendarEventCreation));

      const syncImport = await createSyncImport(user._id.toString());

      const { totalSaved } = await syncImport.importSeries(
        userId,
        "test-calendar",
        gcalBase,
      );

      expect(totalSaved).toEqual(3); // 1 base + 2 instances

      const baseEvent = await mongoService.event.findOne({
        user: userId,
        gEventId: gcalBase.id,
      });

      expect(baseEvent).toBeDefined();
      expect(baseEvent).not.toBeNull();

      const eventId = baseEvent!._id.toString();

      Object.assign(payload, { _id: eventId });

      const event: CompassEvent = { payload, eventId, userId, status };

      const parser = new CompassEventParser(event);

      await parser.init();

      const changes = await parser.deleteEvent();

      const gcal = await getGcalClient(userId);

      await expect(
        gcal.events.get({ eventId: payload.gEventId }),
      ).rejects.toThrow(`Event with id ${payload.gEventId} not found`);

      await expect(
        Promise.allSettled(
          instances.map(({ id }) => gcal.events.get({ eventId: id })),
        ),
      ).resolves.toEqual(
        expect.arrayContaining(
          instances.map(({ id }) =>
            expect.objectContaining({
              status: "rejected",
              reason: new Error(`Event with id ${id} not found`),
            }),
          ),
        ),
      );

      expect(changes).toHaveLength(1);

      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: event.payload.title ?? event.eventId ?? "unknown",
            transition: [
              Categories_Recurrence.RECURRENCE_BASE,
              `${Categories_Recurrence.RECURRENCE_BASE}_CANCELLED`,
            ],
            category: Categories_Recurrence.RECURRENCE_BASE,
            operation: "SERIES_DELETED",
          }),
        ]),
      );
    });
  });

  describe("deleteEvent - Instance", () => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    it("should not delete a non-existent instance", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const _id = faker.database.mongodbObjectId().toString();
      const gBaseId = generateGcalId();

      const payload = createMockInstance(_id, gBaseId, {
        user: userId,
      }) as Event_Core;

      const event: CompassEvent = {
        payload,
        eventId: payload._id!,
        userId: payload.user,
        status: CompassEventStatus.CANCELLED,
      };

      const parser = new CompassEventParser(event);

      await parser.init();

      await expect(parser.deleteEvent()).rejects.toThrow(
        `Event with id ${payload.gEventId} not found`,
      );
    });

    it("should cancel an instance event", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const status = CompassEventStatus.CANCELLED;
      const gcalBase = mockRecurringGcalBaseEvent({}, false, { count: 1 });
      const syncImport = await createSyncImport(user._id.toString());

      await simulateGoogleCalendarEventCreation(gcalBase);

      const baseImport = await syncImport.importSeries(
        userId,
        "test-calendar",
        gcalBase,
      );

      expect(baseImport.totalSaved).toEqual(1);

      const baseEvent = await mongoService.event.findOne({
        user: userId,
        gEventId: gcalBase.id,
      });

      expect(baseEvent).toBeDefined();
      expect(baseEvent).not.toBeNull();

      const payload = createMockInstance(
        baseEvent!._id.toString(),
        gcalBase.id,
        { user: userId },
      ) as Event_Core;

      const gcalInstance: gSchema$EventInstance = {
        ...MapEvent.toGcal(payload),
        id: payload.gEventId!,
        recurringEventId: gcalBase.id,
      };

      await simulateGoogleCalendarEventCreation(gcalInstance);

      const { totalSaved } = await syncImport.importSeries(
        userId,
        "test-calendar",
        gcalBase,
      );

      expect(totalSaved).toEqual(2); // base + instance

      const instanceEvent = await mongoService.event.findOne({
        user: userId,
        gEventId: gcalInstance.id,
      });

      expect(instanceEvent).toBeDefined();
      expect(instanceEvent).not.toBeNull();

      const eventId = instanceEvent!._id.toString();

      Object.assign(payload, {
        recurrence: { eventId: baseEvent!._id.toString() },
      });

      const event: CompassEvent = { payload, eventId, userId, status };

      const parser = new CompassEventParser(event);

      await parser.init();

      const changes = await parser.deleteEvent();

      const gcal = await getGcalClient(userId);

      await expect(
        gcal.events.get({ eventId: payload.gEventId }),
      ).rejects.toThrow(`Event with id ${payload.gEventId} not found`);

      expect(changes).toHaveLength(1);

      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: event.payload.title ?? event.eventId ?? "unknown",
            transition: [
              Categories_Recurrence.RECURRENCE_INSTANCE,
              `${Categories_Recurrence.RECURRENCE_INSTANCE}_CANCELLED`,
            ],
            category: Categories_Recurrence.RECURRENCE_INSTANCE,
            operation: "RECURRENCE_INSTANCE_DELETED",
          }),
        ]),
      );
    });
  });

  describe("deleteEvent - Regular", () => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    it("should not delete a non-existent regular event", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const gEventId = generateGcalId();

      const payload = createMockStandaloneEvent({
        user: userId,
        gEventId,
      }) as Event_Core;

      const event: CompassEvent = {
        payload,
        eventId: payload._id!,
        userId: payload.user,
        status: CompassEventStatus.CANCELLED,
      };

      const parser = new CompassEventParser(event);

      await parser.init();

      await expect(parser.deleteEvent()).rejects.toThrow(
        `Event with id ${payload.gEventId} not found`,
      );
    });

    it("should cancel a regular event", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const status = CompassEventStatus.CANCELLED;
      const gcalRegular = mockRegularGcalEvent();
      const syncImport = await createSyncImport(user._id.toString());

      await simulateGoogleCalendarEventCreation(gcalRegular);

      await syncImport.importAllEvents(userId, "test-calendar");

      const regularEvent = await mongoService.event.findOne({
        user: userId,
        gEventId: gcalRegular.id,
      });

      expect(regularEvent).toBeDefined();
      expect(regularEvent).not.toBeNull();

      const eventId = regularEvent!._id.toString();
      const payload = { ...regularEvent, _id: eventId } as Schema_Event_Core;

      const event: CompassEvent = { payload, eventId, userId, status };

      const parser = new CompassEventParser(event);

      await parser.init();

      const changes = await parser.deleteEvent();

      const gcal = await getGcalClient(userId);

      await expect(
        gcal.events.get({ eventId: payload.gEventId }),
      ).rejects.toThrow(`Event with id ${payload.gEventId} not found`);

      expect(changes).toHaveLength(1);

      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: event.payload.title ?? event.eventId ?? "unknown",
            transition: [
              Categories_Recurrence.STANDALONE,
              `${Categories_Recurrence.STANDALONE}_CANCELLED`,
            ],
            category: Categories_Recurrence.STANDALONE,
            operation: "STANDALONE_DELETED",
          }),
        ]),
      );
    });
  });

  describe("updateEvent", () => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    it("should update a regular event", async () => {
      // @TODO
      expect(true).toBeFalsy();
    });

    it("should update an instance event", async () => {
      // @TODO
      expect(true).toBeFalsy();
    });

    it("should update a recurring event", async () => {
      // @TODO
      expect(true).toBeFalsy();
    });
  });

  describe("seriesToStandalone", () => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    it("should convert a compass series to a regular event", async () => {
      // @TODO
      expect(true).toBeFalsy();
    });
  });

  describe("standaloneToSeries", () => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    it("should convert a compass regular event to series", async () => {
      // @TODO
      expect(true).toBeFalsy();
    });
  });

  describe("createEvent", () => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    it("should create a regular event", async () => {
      // @TODO
      expect(true).toBeFalsy();
    });

    it("should create a recurring event", async () => {
      // @TODO
      expect(true).toBeFalsy();
    });
  });

  describe("someday events", () => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    it("should create a someday event", async () => {
      // @TODO
      expect(true).toBeFalsy();
    });

    it("should update a someday event", async () => {
      // @TODO
      expect(true).toBeFalsy();
    });

    it("should delete a someday event", async () => {
      // @TODO
      expect(true).toBeFalsy();
    });
  });
});
