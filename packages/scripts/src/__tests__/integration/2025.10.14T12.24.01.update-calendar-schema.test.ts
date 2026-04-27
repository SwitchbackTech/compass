import { zodToMongoSchema } from "@scripts/common/zod-to-mongo-schema";
import BaseCalendarMigration from "@scripts/migrations/2025.10.03T01.19.59.calendar-schema";
import Migration from "@scripts/migrations/2025.10.14T12.24.01.update-calendar-schema";
import { CompassCalendarSchema } from "@core/types/calendar.types";
import { IDSchemaV4 } from "@core/types/type.utils";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";

describe("2025.10.14T12.24.01.update-calendar-schema migration (integration)", () => {
  const userIndexName = `${Collections.CALENDAR}_user_index`;
  const userPrimaryUniqueIndexName = `${Collections.CALENDAR}_user_primary_unique`;
  const $jsonSchema = zodToMongoSchema(CompassCalendarSchema);
  const $oldJsonSchema = zodToMongoSchema(
    CompassCalendarSchema.extend({ user: IDSchemaV4 }),
  );

  async function validateOldSchema() {
    const indexes = await mongoService.calendar.indexes();
    const collectionInfo = await mongoService.calendar.options();

    const userPrimaryUniqueIndex = indexes.find(
      ({ name }) => name === userPrimaryUniqueIndexName,
    );

    // Ensure baseline full validation schema exists
    expect(collectionInfo["validationLevel"]).toBe("strict");
    expect(collectionInfo["validator"]).toBeDefined();
    expect(collectionInfo["validator"]).toHaveProperty("$jsonSchema");
    expect(collectionInfo["validator"]["$jsonSchema"]).toEqual($oldJsonSchema);

    // Ensure baseline user primary unique index exists (no partial filter)
    expect(userPrimaryUniqueIndex).toEqual(
      expect.objectContaining({
        name: userPrimaryUniqueIndexName,
        unique: true,
        key: { user: 1, primary: 1 },
      }),
    );

    expect(userPrimaryUniqueIndex).not.toHaveProperty(
      "partialFilterExpression",
    );

    const userIndex = indexes.find(({ name }) => name === userIndexName);

    expect(userIndex).toBeUndefined();
  }

  async function validateNewSchema() {
    const indexes = await mongoService.calendar.indexes();
    const collectionInfo = await mongoService.calendar.options();

    const userPrimaryUniqueIndex = indexes.find(
      ({ name }) => name === userPrimaryUniqueIndexName,
    );

    const userIndex = indexes.find(({ name }) => name === userIndexName);

    // Ensure full validation schema exists
    expect(collectionInfo["validationLevel"]).toBe("strict");
    expect(collectionInfo["validator"]).toBeDefined();
    expect(collectionInfo["validator"]).toHaveProperty("$jsonSchema");
    expect(collectionInfo["validator"]["$jsonSchema"]).toEqual($jsonSchema);

    // Ensure baseline user primary unique index exists (no partial filter)
    expect(userPrimaryUniqueIndex).toEqual(
      expect.objectContaining({
        name: userPrimaryUniqueIndexName,
        unique: true,
        key: { user: 1, primary: 1 },
        partialFilterExpression: { primary: { $eq: true } },
      }),
    );

    expect(userIndex).toEqual(
      expect.objectContaining({ name: userIndexName, key: { user: 1 } }),
    );
  }

  beforeAll(setupTestDb);
  beforeEach(cleanupCollections);
  beforeEach(BaseCalendarMigration.prototype.up);
  beforeEach(validateOldSchema);
  beforeEach(Migration.prototype.up);
  beforeEach(validateNewSchema);
  afterEach(() => mongoService.calendar.drop());
  afterAll(cleanupTestDb);

  it("up() applies partial unique index and updated schema", async () => {
    // Validation done in beforeEach hooks
  });

  it("down() restores full unique index and extended schema", async () => {
    // Run down
    await Migration.prototype.down();
    await validateOldSchema();
  });
});
