import { faker } from "@faker-js/faker";
import { zodToMongoSchema } from "@scripts/common/zod-to-mongo-schema";
import Migration from "@scripts/migrations/2025.10.03T01.19.59.calendar-schema";
import { gcalCalendarList } from "@core/__mocks__/v1/calendarlist/gcal.calendarlist";
import {
  CompassCalendarSchema,
  GoogleCalendarMetadataSchema,
} from "@core/types/calendar.types";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";

describe("2025.10.03T01.19.59.calendar-schema", () => {
  const migration = new Migration();
  const collectionName = Collections.CALENDAR;

  beforeAll(setupTestDb);
  beforeEach(cleanupCollections);
  afterEach(() => mongoService.calendar.drop());
  afterAll(cleanupTestDb);

  async function validateUpMigration() {
    const indexes = await mongoService.calendar.indexes();
    const collectionInfo = await mongoService.calendar.options();
    const $jsonSchema = zodToMongoSchema(CompassCalendarSchema);

    expect(collectionInfo["validationLevel"]).toBe("strict");
    expect(collectionInfo["validator"]).toBeDefined();
    expect(collectionInfo["validator"]).toHaveProperty("$jsonSchema");
    expect(collectionInfo["validator"]["$jsonSchema"]).toEqual($jsonSchema);

    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "_id_", key: { _id: 1 } }),
        expect.objectContaining({
          name: "calendar_user_primary_unique",
          unique: true,
          key: { user: 1, primary: 1 },
        }),
        expect.objectContaining({
          name: "calendar_user_metadata__id_metadata__provider_unique",
          unique: true,
          key: { user: 1, "metadata.id": 1, "metadata.provider": 1 },
        }),
        expect.objectContaining({
          name: "calendar_user_selected_index",
          key: { user: 1, selected: 1 },
        }),
      ]),
    );
  }

  it("should create collection with schema and indexes if not exists", async () => {
    const existsBefore = await mongoService.collectionExists(collectionName);

    expect(existsBefore).toBe(false);

    await migration.up();

    const existsAfter = await mongoService.collectionExists(collectionName);

    expect(existsAfter).toBe(true);

    await validateUpMigration();
  });

  it("should update collection with schema and indexes if exists", async () => {
    await mongoService.db.createCollection(collectionName);

    const existsBefore = await mongoService.collectionExists(collectionName);

    expect(existsBefore).toBe(true);

    await migration.up();

    const existsAfter = await mongoService.collectionExists(collectionName);

    expect(existsAfter).toBe(true);

    await validateUpMigration();
  });

  it("should remove schema and indexes but not collection on down", async () => {
    await migration.up();

    const existsBefore = await mongoService.collectionExists(collectionName);

    expect(existsBefore).toBe(true);

    await validateUpMigration();

    await migration.down();

    const existsAfter = await mongoService.collectionExists(collectionName);

    expect(existsAfter).toBe(true);

    const indexes = await mongoService.calendar.indexes();
    const collectionInfo = await mongoService.calendar.options();

    expect(indexes).toHaveLength(1);
    expect(indexes).toEqual([
      expect.objectContaining({ name: "_id_", key: { _id: 1 } }),
    ]);

    expect(collectionInfo["validationLevel"]).toBe("off");
    expect(collectionInfo["validationAction"]).toBe("error");
    expect(collectionInfo).not.toHaveProperty("validator");
  });

  describe("mongo $jsonSchema validation", () => {
    const maxIndex = gcalCalendarList.items!.length - 1;

    function generateCompassCalendar() {
      const calendarIndex = faker.number.int({ min: 0, max: maxIndex });
      const gCalendarEntry = gcalCalendarList.items![calendarIndex]!;
      const gCalendar = GoogleCalendarMetadataSchema.parse(gCalendarEntry);

      return CompassCalendarSchema.parse({
        _id: faker.database.mongodbObjectId(),
        user: faker.database.mongodbObjectId(),
        backgroundColor: gCalendarEntry.backgroundColor!,
        color: gCalendarEntry.foregroundColor!,
        primary: gCalendarEntry.primary!,
        selected: gCalendarEntry.selected!,
        timezone: gCalendarEntry.timeZone!,
        createdAt: new Date(),
        metadata: gCalendar,
      });
    }

    beforeEach(migration.up.bind(migration));

    it("should accept valid calendar document", async () => {
      const calendar = generateCompassCalendar();

      await expect(mongoService.calendar.insertOne(calendar)).resolves.toEqual(
        expect.objectContaining({
          acknowledged: true,
          insertedId: calendar._id,
        }),
      );
    });

    it("should reject calendar with missing 'user' field", async () => {
      const calendar = generateCompassCalendar();
      // @ts-expect-error testing missing user field
      delete calendar.user;

      await expect(mongoService.calendar.insertOne(calendar)).rejects.toThrow(
        /Document failed validation/,
      );
    });

    it("should reject calendar with missing 'primary' field", async () => {
      const calendar = generateCompassCalendar();
      // @ts-expect-error testing missing primary field
      delete calendar.primary;

      await expect(mongoService.calendar.insertOne(calendar)).rejects.toThrow(
        /Document failed validation/,
      );
    });

    it("should reject calendar with missing 'selected' field", async () => {
      const calendar = generateCompassCalendar();
      // @ts-expect-error testing missing selected field
      delete calendar.selected;

      await expect(mongoService.calendar.insertOne(calendar)).rejects.toThrow(
        /Document failed validation/,
      );
    });

    it("should reject calendar with missing 'color' field", async () => {
      const calendar = generateCompassCalendar();
      // @ts-expect-error testing missing color field
      delete calendar.color;

      await expect(mongoService.calendar.insertOne(calendar)).rejects.toThrow(
        /Document failed validation/,
      );
    });

    it("should reject calendar with missing 'backgroundColor' field", async () => {
      const calendar = generateCompassCalendar();
      // @ts-expect-error testing missing backgroundColor field
      delete calendar.backgroundColor;

      await expect(mongoService.calendar.insertOne(calendar)).rejects.toThrow(
        /Document failed validation/,
      );
    });

    it("should reject calendar with missing 'createdAt' field", async () => {
      const calendar = generateCompassCalendar();
      // @ts-expect-error testing missing createdAt field
      delete calendar.createdAt;

      await expect(mongoService.calendar.insertOne(calendar)).rejects.toThrow(
        /Document failed validation/,
      );
    });
  });
});
