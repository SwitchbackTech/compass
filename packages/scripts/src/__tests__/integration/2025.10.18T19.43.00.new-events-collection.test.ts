import { ObjectId } from "mongodb";
import { zodToMongoSchema } from "@scripts/common/zod-to-mongo-schema";
import Migration from "@scripts/migrations/2025.10.18T19.43.00.new-events-collection";
import { CalendarProvider } from "@core/types/calendar.types";
import { DBEventSchema, Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import {
  createMockBaseEvent,
  createMockInstances,
  createMockRegularEvent,
} from "@core/util/test/ccal.event.factory";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { generateGcalId } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";

describe("2025.10.18T19.43.00.new-events-collection", () => {
  const collectionName = `${Collections.EVENT}_new`;
  const newEventCollection = () => mongoService.db.collection(collectionName);
  const $jsonSchema = zodToMongoSchema(DBEventSchema);

  beforeAll(setupTestDb);
  afterAll(cleanupTestDb);
  beforeEach(cleanupCollections);
  beforeEach(Migration.prototype.up);
  beforeEach(validateCollectionExistence);
  beforeEach(validateSchema);
  beforeEach(validateIndexes);
  afterEach(async () =>
    newEventCollection()
      .drop()
      .catch(() => {}),
  );

  async function validateSchema() {
    const options = await newEventCollection().options();

    expect(options["validationLevel"]).toBe("strict");
    expect(options["validator"]).toBeDefined();
    expect(options["validator"]).toHaveProperty("$jsonSchema");
    expect(options["validator"]["$jsonSchema"]).toEqual($jsonSchema);
  }

  async function validateIndexes() {
    const indexes = await newEventCollection().indexes();

    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "_id_", key: { _id: 1 } }),
        expect.objectContaining({
          name: `${collectionName}_calendar_index`,
          key: { calendar: 1 },
        }),
        expect.objectContaining({
          name: `${collectionName}_calendar_startDate_index`,
          key: { calendar: 1, startDate: 1 },
        }),
        expect.objectContaining({
          name: `${collectionName}_calendar_endDate_index`,
          key: { calendar: 1, endDate: 1 },
        }),
        expect.objectContaining({
          name: `${collectionName}_calendar_startDate_endDate_index`,
          key: { calendar: 1, startDate: 1, endDate: 1 },
        }),
        expect.objectContaining({
          name: `${collectionName}_calendar_isSomeday_index`,
          key: { calendar: 1, isSomeday: 1 },
        }),
        expect.objectContaining({
          name: `${collectionName}_calendar_metadata__recurringEventId_index`,
          key: { calendar: 1, "metadata.recurringEventId": 1 },
          sparse: true,
        }),
        expect.objectContaining({
          name: `${collectionName}_calendar_metadata__id_unique`,
          key: { calendar: 1, "metadata.id": 1 },
          unique: true,
          sparse: true,
        }),
        expect.objectContaining({
          name: `${collectionName}_calendar_recurrence__eventId_originalStartDate_unique`,
          key: { calendar: 1, "recurrence.eventId": 1, originalStartDate: 1 },
          unique: true,
          sparse: true,
        }),
      ]),
    );
  }

  async function validateCollectionExistence(exists = true) {
    await expect(mongoService.collectionExists(collectionName)).resolves.toBe(
      exists,
    );
  }

  describe("up", () => {
    it("creates collection with schema and indexes", async () => {
      // validated in beforeEach hooks
    });
  });

  describe("down", () => {
    beforeEach(Migration.prototype.down);

    it("drops the new events collection", async () => {
      await validateCollectionExistence(false);
    });
  });

  describe("mongo $jsonSchema validation", () => {
    it("allows valid regular events documents", async () => {
      const event = createMockRegularEvent();

      await expect(
        newEventCollection().insertOne(event),
      ).resolves.toMatchObject({ acknowledged: true, insertedId: event._id });
    });

    it("allows valid base events documents", async () => {
      const event = createMockBaseEvent();

      await expect(
        newEventCollection().insertOne(event),
      ).resolves.toMatchObject({ acknowledged: true, insertedId: event._id });
    });

    it("allows valid instance events documents", async () => {
      const baseEvent = createMockBaseEvent();
      const instances = createMockInstances(baseEvent, 3);

      await expect(
        newEventCollection().insertMany(instances),
      ).resolves.toMatchObject({
        acknowledged: true,
        insertedIds: instances.map((e) => e._id),
      });
    });

    it("rejects events with missing calendar field", async () => {
      const eventWithoutCalendar = createMockRegularEvent();

      delete (eventWithoutCalendar as Partial<Schema_Event>).calendar;

      await expect(
        newEventCollection().insertOne(eventWithoutCalendar),
      ).rejects.toThrow(/Document failed validation/);
    });

    it("rejects events with missing startDate field", async () => {
      const eventWithoutStartDate = createMockBaseEvent();

      delete (eventWithoutStartDate as Partial<Schema_Event>).startDate;

      await expect(
        newEventCollection().insertOne(eventWithoutStartDate),
      ).rejects.toThrow(/Document failed validation/);
    });

    it("rejects events with missing endDate field", async () => {
      const eventWithoutEndDate = createMockRegularEvent();

      delete (eventWithoutEndDate as Partial<Schema_Event>).endDate;

      await expect(
        newEventCollection().insertOne(eventWithoutEndDate),
      ).rejects.toThrow(/Document failed validation/);
    });

    it("rejects events with missing isSomeday field", async () => {
      const eventWithoutIsSomeday = createMockBaseEvent();

      delete (eventWithoutIsSomeday as Partial<Schema_Event>).isSomeday;

      await expect(
        newEventCollection().insertOne(eventWithoutIsSomeday),
      ).rejects.toThrow(/Document failed validation/);
    });

    it("rejects events with missing origin field", async () => {
      const eventWithoutOrigin = createMockRegularEvent();

      delete (eventWithoutOrigin as Partial<Schema_Event>).origin;

      await expect(
        newEventCollection().insertOne(eventWithoutOrigin),
      ).rejects.toThrow(/Document failed validation/);
    });

    it("rejects events with missing priority field", async () => {
      const eventWithoutPriority = createMockBaseEvent();

      delete (eventWithoutPriority as Partial<Schema_Event>).priority;

      await expect(
        newEventCollection().insertOne(eventWithoutPriority),
      ).rejects.toThrow(/Document failed validation/);
    });

    it("rejects events with invalid startDate field", async () => {
      const event = createMockRegularEvent();
      const eventWithInvalidStartDate = {
        ...event,
        startDate: dayjs().toRFC5545String(),
      };

      await expect(
        newEventCollection().insertOne(eventWithInvalidStartDate),
      ).rejects.toThrow(/Document failed validation/);
    });

    it("rejects events with invalid endDate field", async () => {
      const event = createMockBaseEvent();
      const eventWithInvalidEndDate = {
        ...event,
        endDate: dayjs().toRFC5545String(),
      };

      await expect(
        newEventCollection().insertOne(eventWithInvalidEndDate),
      ).rejects.toThrow(/Document failed validation/);
    });

    it("rejects events with additional properties", async () => {
      const eventWithExtra = {
        ...createMockRegularEvent(),
        extraProperty: "should-not-be-allowed",
      };

      await expect(
        newEventCollection().insertOne(eventWithExtra),
      ).rejects.toThrow();
    });

    describe("Calendar Providers", () => {
      describe("Google", () => {
        it("enforces unique constraint on 'calendar' and metadata field 'id'", async () => {
          const event = createMockBaseEvent();

          const duplicateGoogleEvent = { ...event, _id: new ObjectId() };

          await newEventCollection().insertOne(event);

          await expect(
            newEventCollection().insertOne(duplicateGoogleEvent),
          ).rejects.toThrow(
            /E11000 duplicate .+: .+ index: .+_calendar_metadata__gEventId_unique/,
          );
        });

        it("rejects events with invalid metadata field", async () => {
          const metadata = {
            provider: CalendarProvider.GOOGLE,
            gRecurringEventId: "invalid-id",
          } as unknown as Schema_Event["metadata"];

          const eventWithInvalidMetadata = createMockRegularEvent({ metadata });

          await expect(
            newEventCollection().insertOne(eventWithInvalidMetadata),
          ).rejects.toThrow(/Document failed validation/);
        });

        it("rejects events with invalid metadata recurringEventId field", async () => {
          const id = generateGcalId();

          const metadata = {
            id,
            recurringEventId: null,
          } as Schema_Event["metadata"];

          const eventWithInvalidMetadata = createMockRegularEvent({ metadata });

          await expect(
            newEventCollection().insertOne(eventWithInvalidMetadata),
          ).rejects.toThrow(/Document failed validation/);
        });
      });
    });
  });
});
