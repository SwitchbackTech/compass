import { RRule } from "rrule";
import { faker } from "@faker-js/faker";
import { Categories_Recurrence } from "@core/types/event.types";
import { WithGcalId, gSchema$Event } from "@core/types/gcal";
import dayjs from "@core/util/date/dayjs";
import { isBase, isExistingInstance } from "@core/util/event/event.util";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import {
  simulateDbAfterGcalImport,
  simulateGoogleCalendarEventCreation,
} from "@backend/__tests__/helpers/mock.events.init";
import {
  generateGcalId,
  mockRecurringGcalBaseEvent,
  mockRegularGcalEvent,
} from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { createNewRecurringEventPayload } from "@backend/__tests__/mocks.gcal/fixtures/recurring/create/create";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import mongoService from "@backend/common/services/mongo.service";
import { GcalEventParser } from "@backend/event/classes//gcal.event.parser";

describe("GcalEventParser", () => {
  describe("Before Init", () => {
    it("should be called before accessing these public members", () => {
      const events = createNewRecurringEventPayload.items ?? [];
      const event = events[0] as WithGcalId<gSchema$Event>;

      const parser = new GcalEventParser(
        event,
        faker.database.mongodbObjectId().toString(),
      );
      const developerError = GenericError.DeveloperError.description;

      expect(() => parser.category).toThrow(developerError);
      expect(() => parser.isBase).toThrow(developerError);
      expect(() => parser.isCompassBase).toThrow(developerError);
      expect(() => parser.isCompassInstance).toThrow(developerError);
      expect(() => parser.isCompassStandalone).toThrow(developerError);
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
      const events = createNewRecurringEventPayload.items ?? [];
      const event = events[0] as WithGcalId<gSchema$Event>;

      const parser = new GcalEventParser(
        event,
        faker.database.mongodbObjectId().toString(),
      );
      const developerError = GenericError.DeveloperError.description;
      const status = event.status == "cancelled" ? "CANCELLED" : "CONFIRMED";

      await parser.init();

      expect(() => parser.category).not.toThrow(developerError);
      expect(() => parser.isBase).not.toThrow(developerError);
      expect(() => parser.isCompassBase).not.toThrow(developerError);
      expect(() => parser.isCompassInstance).not.toThrow(developerError);
      expect(() => parser.isCompassStandalone).not.toThrow(developerError);
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
        parser.isCompassBase,
        parser.isCompassInstance,
        parser.isCompassStandalone,
        parser.isInstance,
        parser.isStandalone,
      ]).toContain(true);

      expect(parser.rrule).toBeInstanceOf(RRule);

      expect(parser.summary).toEqual({
        title: event.summary ?? event.id ?? "unknown",
        transition: [null, `${parser.category}_${status}`],
        category: parser.category,
      });

      expect(parser.getTransitionString()).toStrictEqual(
        `NIL->>${parser.category}_${status}`,
      );
    });
  });

  describe("cancelSeries", () => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    it("should disregard a non-existent series", async () => {
      const events = createNewRecurringEventPayload.items ?? [];
      const event = events[0] as WithGcalId<gSchema$Event>;

      const parser = new GcalEventParser(
        event,
        faker.database.mongodbObjectId().toString(),
      );

      await parser.init();

      const changes = await parser.cancelSeries();

      expect(changes).toHaveLength(0);
      expect(changes).toStrictEqual([]);
    });

    it("should cancel a series", async () => {
      const userId = faker.database.mongodbObjectId().toString();

      const { gcalEvents, compassEvents } =
        await simulateDbAfterGcalImport(userId);

      const event = gcalEvents.recurring as WithGcalId<gSchema$Event>;

      Object.assign(event, { status: "cancelled" }); // Simulate cancellation

      const parser = new GcalEventParser(event, userId);

      await parser.init();

      const changes = await parser.cancelSeries();

      const baseEvent = compassEvents.find(
        ({ gEventId }) => gEventId === event.id,
      );

      expect(baseEvent).toBeDefined();

      const dbSeries = await mongoService.event
        .find({
          $or: [
            { _id: mongoService.objectId(baseEvent!._id) },
            { gEventId: event.id },
            { gRecurringEventId: event.id },
          ],
        })
        .toArray();

      expect(changes).toHaveLength(1);

      expect(dbSeries).toEqual([]);

      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: event.summary ?? event.id ?? "unknown",
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

  describe("deleteCompassEvent", () => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    it("should delete a series instance", async () => {
      const userId = faker.database.mongodbObjectId().toString();

      const { gcalEvents, compassEvents } =
        await simulateDbAfterGcalImport(userId);

      const randomIndex = faker.number.int({
        min: 0,
        max: gcalEvents.instances.length - 1,
      });

      const event = gcalEvents.instances[
        randomIndex
      ] as WithGcalId<gSchema$Event>;

      expect(event).toBeDefined();

      Object.assign(event, { status: "cancelled" }); // Simulate cancellation

      const parser = new GcalEventParser(event, userId);

      await parser.init();

      const changes = await parser.deleteCompassEvent();

      const instanceEvent = compassEvents.find(
        ({ gEventId }) => gEventId === event.id,
      );

      expect(instanceEvent).toBeDefined();

      const dbSeriesInstance = await mongoService.event.findOne({
        gRecurringEventId: event.id,
      });

      expect(changes).toHaveLength(1);

      expect(dbSeriesInstance).toBeNull();

      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: event.summary ?? event.id ?? "unknown",
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

    it("should delete a regular event", async () => {
      const userId = faker.database.mongodbObjectId().toString();

      const { gcalEvents, compassEvents } =
        await simulateDbAfterGcalImport(userId);

      const event = gcalEvents.regular as WithGcalId<gSchema$Event>;

      expect(event).toBeDefined();

      Object.assign(event, { status: "cancelled" }); // Simulate cancellation

      const parser = new GcalEventParser(event, userId);

      await parser.init();

      const changes = await parser.deleteCompassEvent();

      const instanceEvent = compassEvents.find(
        ({ gEventId }) => gEventId === event.id,
      );

      expect(instanceEvent).toBeDefined();

      const dbRegularEvent = await mongoService.event.findOne({
        gRecurringEventId: event.id,
      });

      expect(changes).toHaveLength(1);

      expect(dbRegularEvent).toBeNull();

      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: event.summary ?? event.id ?? "unknown",
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

  describe("upsertCompassEvent", () => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    it("should create a regular event", async () => {
      const userId = faker.database.mongodbObjectId().toString();

      const { gcalEvents, compassEvents } =
        await simulateDbAfterGcalImport(userId);

      const event = Object.assign(gcalEvents.regular, { id: generateGcalId() });

      const parser = new GcalEventParser(event, userId);

      await parser.init();

      const changes = await parser.upsertCompassEvent();

      const regularEvent = compassEvents.find(
        ({ gEventId }) => gEventId === event.id,
      );

      expect(regularEvent).toBeUndefined();

      const dbRegularEvent = await mongoService.event.findOne({
        gEventId: event.id,
      });

      expect(changes).toHaveLength(1);

      expect(dbRegularEvent).toEqual(
        expect.objectContaining({ gEventId: event.id }),
      );

      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: event.summary ?? event.id ?? "unknown",
            transition: [null, `${Categories_Recurrence.STANDALONE}_CONFIRMED`],
            category: Categories_Recurrence.STANDALONE,
            operation: "STANDALONE_CREATED",
          }),
        ]),
      );
    });

    it("should create an instance event", async () => {
      const userId = faker.database.mongodbObjectId().toString();

      const { gcalEvents, compassEvents } =
        await simulateDbAfterGcalImport(userId);

      const randomIndex = faker.number.int({
        min: 0,
        max: gcalEvents.instances.length - 1,
      });

      const event = gcalEvents.instances[
        randomIndex
      ] as WithGcalId<gSchema$Event>;

      const startDate = dayjs(event.start?.dateTime).tz(event.start!.timeZone!);
      const isAllDay = "date" in event.start!;

      const idSuffix = startDate
        .add(10, "minutes")
        .toRRuleDTSTARTString(isAllDay);

      Object.assign(event, { id: `${event.recurringEventId}_${idSuffix}` });

      const parser = new GcalEventParser(event, userId);

      await parser.init();

      const changes = await parser.upsertCompassEvent();

      const instanceEvent = compassEvents.find(
        ({ gEventId }) => gEventId === event.id,
      );

      expect(instanceEvent).toBeUndefined();

      const dbSeriesInstance = await mongoService.event.findOne({
        gEventId: event.id,
      });

      expect(changes).toHaveLength(1);

      expect(dbSeriesInstance).toEqual(
        expect.objectContaining({ gEventId: event.id }),
      );

      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: event.summary ?? event.id ?? "unknown",
            transition: [
              null,
              `${Categories_Recurrence.RECURRENCE_INSTANCE}_CONFIRMED`,
            ],
            category: Categories_Recurrence.RECURRENCE_INSTANCE,
            operation: "RECURRENCE_INSTANCE_CREATED",
          }),
        ]),
      );
    });

    it("should update a regular event", async () => {
      const userId = faker.database.mongodbObjectId().toString();

      const { gcalEvents, compassEvents } =
        await simulateDbAfterGcalImport(userId);

      const event = gcalEvents.regular as WithGcalId<gSchema$Event>;

      expect(event).toBeDefined();

      Object.assign(event, { summary: "updated summary" });

      const parser = new GcalEventParser(event, userId);

      await parser.init();

      const changes = await parser.upsertCompassEvent();

      const instanceEvent = compassEvents.find(
        ({ gEventId }) => gEventId === event.id,
      );

      expect(instanceEvent).toBeDefined();

      const dbRegularEvent = await mongoService.event.findOne({
        gEventId: event.id,
      });

      expect(changes).toHaveLength(1);

      expect(dbRegularEvent?.title).not.toEqual(instanceEvent?.title);

      expect(dbRegularEvent?.title).toEqual("updated summary");

      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: event.summary ?? event.id ?? "unknown",
            transition: [
              Categories_Recurrence.STANDALONE,
              `${Categories_Recurrence.STANDALONE}_CONFIRMED`,
            ],
            category: Categories_Recurrence.STANDALONE,
            operation: "STANDALONE_UPDATED",
          }),
        ]),
      );
    });

    it("should update an instance event", async () => {
      const userId = faker.database.mongodbObjectId().toString();

      const { gcalEvents, compassEvents } =
        await simulateDbAfterGcalImport(userId);

      const randomIndex = faker.number.int({
        min: 0,
        max: gcalEvents.instances.length - 1,
      });

      const event = gcalEvents.instances[
        randomIndex
      ] as WithGcalId<gSchema$Event>;

      Object.assign(event, { summary: "updated summary" });

      const parser = new GcalEventParser(event, userId);

      await parser.init();

      const changes = await parser.upsertCompassEvent();

      const instanceEvent = compassEvents.find(
        ({ gEventId }) => gEventId === event.id,
      );

      expect(instanceEvent).toBeDefined();

      const dbSeriesInstance = await mongoService.event.findOne({
        gEventId: event.id,
      });

      expect(changes).toHaveLength(1);

      expect(dbSeriesInstance).toEqual(
        expect.objectContaining({
          gEventId: event.id,
          title: "updated summary",
        }),
      );

      expect(dbSeriesInstance?.title).not.toEqual(instanceEvent?.title);

      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: event.summary ?? event.id ?? "unknown",
            transition: [
              Categories_Recurrence.RECURRENCE_INSTANCE,
              `${Categories_Recurrence.RECURRENCE_INSTANCE}_CONFIRMED`,
            ],
            category: Categories_Recurrence.RECURRENCE_INSTANCE,
            operation: "RECURRENCE_INSTANCE_UPDATED",
          }),
        ]),
      );
    });
  });

  describe("createSeries", () => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    it("should create a compass series", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const baseEvent = mockRecurringGcalBaseEvent({}, false, { count: 3 });

      await simulateGoogleCalendarEventCreation(baseEvent);

      const parser = new GcalEventParser(baseEvent, userId);

      await parser.init();

      const changes = await parser.createSeries();

      const dbSeries = await mongoService.event
        .find({
          $or: [
            { gEventId: baseEvent.id },
            { gRecurringEventId: baseEvent.id },
          ],
        })
        .toArray();

      const dbSeriesBase = dbSeries.find(isBase);
      const dbSeriesInstance = dbSeries.find(isExistingInstance);

      expect(changes).toHaveLength(1);

      expect(dbSeriesBase).toBeDefined();

      expect(dbSeriesInstance).toBeDefined();

      expect(dbSeriesBase?.gEventId).toEqual(baseEvent.id);

      expect(dbSeriesInstance?.gRecurringEventId).toEqual(baseEvent.id);

      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: baseEvent.summary ?? baseEvent.id ?? "unknown",
            transition: [
              null,
              `${Categories_Recurrence.RECURRENCE_BASE}_CONFIRMED`,
            ],
            category: Categories_Recurrence.RECURRENCE_BASE,
            operation: "SERIES_CREATED",
          }),
        ]),
      );
    });
  });

  describe("updateSeries", () => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    it("should update a compass series", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const baseEvent = mockRecurringGcalBaseEvent({}, false, { count: 3 });

      await simulateGoogleCalendarEventCreation(baseEvent);

      const parser = new GcalEventParser(baseEvent, userId);

      await parser.init();

      await parser.createSeries();

      const updateParser = new GcalEventParser(
        Object.assign(baseEvent, { summary: "updated summary" }),
        userId,
      );

      await updateParser.init();

      const updateChanges = await updateParser.updateSeries();

      const dbSeries = await mongoService.event
        .find({
          $or: [
            { gEventId: baseEvent.id },
            { gRecurringEventId: baseEvent.id },
          ],
        })
        .toArray();

      expect(dbSeries).toEqual(
        expect.arrayContaining(
          dbSeries.map(() =>
            expect.objectContaining({ title: "updated summary" }),
          ),
        ),
      );

      expect(updateChanges).toHaveLength(2);

      expect(updateChanges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: "updated summary",
            transition: [
              Categories_Recurrence.RECURRENCE_BASE,
              `${Categories_Recurrence.RECURRENCE_BASE}_CONFIRMED`,
            ],
            category: Categories_Recurrence.RECURRENCE_BASE,
            operation: "RECURRENCE_BASE_UPDATED",
          }),
          expect.objectContaining({
            title: "updated summary",
            transition: [
              Categories_Recurrence.RECURRENCE_BASE,
              `${Categories_Recurrence.RECURRENCE_BASE}_CONFIRMED`,
            ],
            category: Categories_Recurrence.RECURRENCE_BASE,
            operation: "TIMED_INSTANCES_UPDATED",
          }),
        ]),
      );
    });
  });

  describe("seriesToStandalone", () => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    it("should convert a compass series to a regular event", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const baseEvent = mockRecurringGcalBaseEvent({}, false, { count: 3 });

      await simulateGoogleCalendarEventCreation(baseEvent);

      const parser = new GcalEventParser(baseEvent, userId);

      await parser.init();

      await parser.createSeries();

      const standaloneParser = new GcalEventParser(baseEvent, userId);

      await standaloneParser.init();

      const changes = await standaloneParser.seriesToStandalone();

      const dbSeries = await mongoService.event
        .find({
          $or: [
            { gEventId: baseEvent.id },
            { gRecurringEventId: baseEvent.id },
          ],
        })
        .toArray();

      expect(dbSeries).toHaveLength(1);

      expect(dbSeries[0]?.gEventId).toEqual(baseEvent.id);

      expect(dbSeries[0]?.recurrence).toBeUndefined();

      expect(changes).toHaveLength(2);

      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            transition: [
              Categories_Recurrence.RECURRENCE_BASE,
              `${Categories_Recurrence.RECURRENCE_BASE}_CONFIRMED`,
            ],
            category: Categories_Recurrence.RECURRENCE_BASE,
            operation: "SERIES_DELETED",
          }),
          expect.objectContaining({
            transition: [
              Categories_Recurrence.RECURRENCE_BASE,
              `${Categories_Recurrence.RECURRENCE_BASE}_CONFIRMED`,
            ],
            category: Categories_Recurrence.RECURRENCE_BASE,
            operation: "RECURRENCE_BASE_UPDATED",
          }),
        ]),
      );
    });
  });

  describe("standaloneToSeries", () => {
    beforeAll(setupTestDb);

    beforeEach(cleanupCollections);

    afterAll(cleanupTestDb);

    it("should convert a compass regular event to series", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const regularEvent = mockRegularGcalEvent();

      await simulateGoogleCalendarEventCreation(regularEvent);

      const parser = new GcalEventParser(regularEvent, userId);

      await parser.init();

      await parser.upsertCompassEvent();

      Object.assign(regularEvent, { recurrence: ["RRULE:FREQ=DAILY"] });

      const seriesParser = new GcalEventParser(regularEvent, userId);

      await seriesParser.init();

      const changes = await seriesParser.standaloneToSeries();

      const dbSeries = await mongoService.event
        .find({
          $or: [
            { gEventId: regularEvent.id },
            { gRecurringEventId: regularEvent.id },
          ],
        })
        .toArray();

      expect(dbSeries.length).toBeGreaterThan(1);

      const baseEvent = dbSeries.find(
        ({ gEventId }) => gEventId === regularEvent.id,
      );

      const instanceEvent = dbSeries.find(
        ({ gRecurringEventId }) => gRecurringEventId === regularEvent.id,
      );

      expect(baseEvent?.recurrence?.rule).toBeDefined();

      expect(instanceEvent).toBeDefined();

      expect(changes).toHaveLength(2);

      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            transition: [
              Categories_Recurrence.STANDALONE,
              `${Categories_Recurrence.RECURRENCE_BASE}_CONFIRMED`,
            ],
            category: Categories_Recurrence.STANDALONE,
            operation: "STANDALONE_UPDATED",
          }),
          expect.objectContaining({
            transition: [
              Categories_Recurrence.STANDALONE,
              `${Categories_Recurrence.RECURRENCE_BASE}_CONFIRMED`,
            ],
            category: Categories_Recurrence.STANDALONE,
            operation: "SERIES_CREATED",
          }),
        ]),
      );
    });
  });
});
