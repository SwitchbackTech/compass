import { faker } from "@faker-js/faker";
import {
  type EventNew,
  EventNewSchema,
} from "@scripts/common/migration-support/event-new.types";
import { zodToMongoSchema } from "@scripts/common/zod-to-mongo-schema";
import Migration from "@scripts/migrations/2025.10.18T19.43.00.new-events-collection";
import { ObjectId } from "mongodb";
import { Origin } from "@core/constants/core.constants";
import { CalendarProvider } from "@core/types/calendar.types";
import dayjs from "@core/util/date/dayjs";
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
  const $jsonSchema = zodToMongoSchema(EventNewSchema);

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
          name: `${collectionName}_calendar_metadata__gRecurringEventId_index`,
          key: { calendar: 1, "metadata.gRecurringEventId": 1 },
        }),
        expect.objectContaining({
          name: `${collectionName}_calendar_metadata__gEventId_unique`,
          key: { calendar: 1, "metadata.gEventId": 1 },
          unique: true,
          partialFilterExpression: { "metadata.gEventId": { $exists: true } },
        }),
      ]),
    );
  }

  async function validateCollectionExistence(exists = true) {
    await expect(mongoService.collectionExists(collectionName)).resolves.toBe(
      exists,
    );
  }

  function generateEvent(metadata?: EventNew["metadata"][number]): EventNew {
    return {
      _id: new ObjectId(),
      calendar: new ObjectId(),
      title: faker.lorem.words(3),
      description: faker.lorem.sentence(),
      startDate: faker.date.future(),
      endDate: faker.date.future(),
      origin: Origin.COMPASS,
      createdAt: faker.date.recent(),
      metadata: [metadata ?? { provider: CalendarProvider.COMPASS }],
    };
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
    it("allows valid events documents", async () => {
      const event = generateEvent();

      await expect(
        newEventCollection().insertOne(event),
      ).resolves.toMatchObject({ acknowledged: true, insertedId: event._id });
    });

    it("rejects events with missing calendar field", async () => {
      const eventWithoutCalendar = generateEvent();

      delete (eventWithoutCalendar as Partial<EventNew>).calendar;

      await expect(
        newEventCollection().insertOne(eventWithoutCalendar),
      ).rejects.toThrow(/Document failed validation/);
    });

    it("rejects events with missing startDate field", async () => {
      const eventWithoutStartDate = generateEvent();

      delete (eventWithoutStartDate as Partial<EventNew>).startDate;

      await expect(
        newEventCollection().insertOne(eventWithoutStartDate),
      ).rejects.toThrow(/Document failed validation/);
    });

    it("rejects events with missing endDate field", async () => {
      const eventWithoutEndDate = generateEvent();

      delete (eventWithoutEndDate as Partial<EventNew>).endDate;

      await expect(
        newEventCollection().insertOne(eventWithoutEndDate),
      ).rejects.toThrow(/Document failed validation/);
    });

    it("rejects events with missing origin field", async () => {
      const eventWithoutOrigin = generateEvent();

      delete (eventWithoutOrigin as Partial<EventNew>).origin;

      await expect(
        newEventCollection().insertOne(eventWithoutOrigin),
      ).rejects.toThrow(/Document failed validation/);
    });

    it("rejects events with invalid startDate field", async () => {
      const event = generateEvent();
      const eventWithInvalidStartDate = {
        ...event,
        startDate: dayjs().toRFC5545String(),
      };

      await expect(
        newEventCollection().insertOne(eventWithInvalidStartDate),
      ).rejects.toThrow(/Document failed validation/);
    });

    it("rejects events with invalid endDate field", async () => {
      const event = generateEvent();
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
        ...generateEvent(),
        extraProperty: "should-not-be-allowed",
      };

      await expect(
        newEventCollection().insertOne(eventWithExtra),
      ).rejects.toThrow();
    });

    describe("Calendar Providers", () => {
      describe("Google", () => {
        it("enforces unique constraint on 'calendar' and metadata field 'gEventId'", async () => {
          const gEventId = generateGcalId();
          const provider = CalendarProvider.GOOGLE;
          const event = generateEvent({ gEventId, provider });

          const duplicateGoogleEvent = { ...event, _id: new ObjectId() };

          await newEventCollection().insertOne(event);

          await expect(
            newEventCollection().insertOne(duplicateGoogleEvent),
          ).rejects.toThrow(
            /E11000 duplicate .+: .+ index: .+_calendar_metadata__gEventId_unique/,
          );
        });

        it("rejects events with invalid metadata field", async () => {
          const gRecurringEventId = generateGcalId();

          const metadata = {
            provider: CalendarProvider.GOOGLE,
            gRecurringEventId,
          } as EventNew["metadata"][number];

          const eventWithInvalidMetadata = generateEvent(metadata);

          await expect(
            newEventCollection().insertOne(eventWithInvalidMetadata),
          ).rejects.toThrow(/Document failed validation/);
        });

        it("rejects events with invalid metadata gRecurringEventId field", async () => {
          const gEventId = generateGcalId();

          const metadata = {
            provider: CalendarProvider.GOOGLE,
            gEventId,
            gRecurringEventId: null,
          } as EventNew["metadata"][number];

          const eventWithInvalidMetadata = generateEvent(metadata);

          await expect(
            newEventCollection().insertOne(eventWithInvalidMetadata),
          ).rejects.toThrow(/Document failed validation/);
        });
      });
    });
  });
});
