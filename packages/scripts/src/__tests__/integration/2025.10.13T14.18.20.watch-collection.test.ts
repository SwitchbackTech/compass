import { faker } from "@faker-js/faker";
import { zodToMongoSchema } from "@scripts/common/zod-to-mongo-schema";
import Migration from "@scripts/migrations/2025.10.13T14.18.20.watch-collection";
import { Watch, WatchSchemaStrict } from "@core/types/watch.types";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";

describe("2025.10.13T14.18.20.watch-collection", () => {
  const migration = new Migration();
  const collectionName = Collections.WATCH;

  beforeAll(setupTestDb);
  beforeEach(cleanupCollections);
  afterEach(() => mongoService.watch.drop());
  afterAll(cleanupTestDb);

  function generateWatch(): Watch {
    return {
      _id: faker.string.uuid(),
      userId: faker.database.mongodbObjectId(),
      resourceId: faker.string.alphanumeric(20),
      expiration: faker.date.future(),
      createdAt: faker.date.recent(),
    };
  }

  async function validateUpMigration() {
    const indexes = await mongoService.watch.indexes();
    const collectionInfo = await mongoService.watch.options();
    const $jsonSchema = zodToMongoSchema(WatchSchemaStrict);

    expect(collectionInfo["validationLevel"]).toBe("strict");
    expect(collectionInfo["validator"]).toBeDefined();
    expect(collectionInfo["validator"]).toHaveProperty("$jsonSchema");
    expect(collectionInfo["validator"]["$jsonSchema"]).toEqual($jsonSchema);

    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "_id_", key: { _id: 1 } }),
        expect.objectContaining({
          name: `${collectionName}_userId_index`,
          key: { userId: 1 },
        }),
        expect.objectContaining({
          name: `${collectionName}_userId_expiration_index`,
          key: { userId: 1, expiration: 1 },
        }),
      ]),
    );
  }

  it("up() creates collection when it doesn't exist", async () => {
    const existsBefore = await mongoService.collectionExists(collectionName);

    expect(existsBefore).toBe(false);

    await migration.up();

    const existsAfter = await mongoService.collectionExists(collectionName);

    expect(existsAfter).toBe(true);

    await validateUpMigration();
  });

  it("up() modifies collection when it exists", async () => {
    // Create collection first
    await mongoService.db.createCollection(collectionName);

    const existsBefore = await mongoService.collectionExists(collectionName);

    expect(existsBefore).toBe(true);

    await migration.up();

    await validateUpMigration();
  });

  it("down() removes schema validation and indexes without dropping collection", async () => {
    await migration.up();

    const existsBefore = await mongoService.collectionExists(collectionName);

    expect(existsBefore).toBe(true);

    await validateUpMigration();

    await migration.down();

    const existsAfter = await mongoService.collectionExists(collectionName);

    expect(existsAfter).toBe(true);

    const indexes = await mongoService.watch.indexes();
    const collectionInfo = await mongoService.watch.options();

    expect(indexes).toHaveLength(1);
    expect(indexes).toEqual([
      expect.objectContaining({ name: "_id_", key: { _id: 1 } }),
    ]);

    expect(collectionInfo["validationLevel"]).toBe("off");
    expect(collectionInfo["validationAction"]).toBe("error");
    expect(collectionInfo).not.toHaveProperty("validator");
  });

  describe("mongo $jsonSchema validation", () => {
    function generateValidWatch() {
      return {
        _id: faker.string.uuid(),
        userId: faker.database.mongodbObjectId(),
        resourceId: faker.string.alphanumeric(20),
        expiration: new Date(faker.date.future()),
        createdAt: new Date(faker.date.recent()),
      };
    }

    beforeEach(migration.up.bind(migration));

    it("allows valid watch documents", async () => {
      const watch = generateValidWatch();

      await expect(mongoService.watch.insertOne(watch)).resolves.toMatchObject({
        acknowledged: true,
        insertedId: watch._id,
      });
    });

    it("rejects documents with missing required fields", async () => {
      const incompleteWatch = {
        _id: faker.string.uuid(),
        userId: faker.database.mongodbObjectId(),
        // missing resourceId and expiration
        createdAt: new Date(),
      };

      await expect(
        mongoService.watch.insertOne(incompleteWatch),
      ).rejects.toThrow();
    });

    it("rejects documents with missing userId", async () => {
      const watchWithoutUserId = {
        ...generateValidWatch(),
      };
      // @ts-expect-error testing missing userId field
      delete watchWithoutUserId.userId;

      await expect(
        mongoService.watch.insertOne(watchWithoutUserId),
      ).rejects.toThrow(/Document failed validation/);
    });

    it("rejects documents with additional properties", async () => {
      const watchWithExtra = {
        ...generateValidWatch(),
        extraProperty: "should-not-be-allowed",
      };

      await expect(
        mongoService.watch.insertOne(watchWithExtra),
      ).rejects.toThrow();
    });

    it("enforces unique constraint on _id (channelId)", async () => {
      const watch1 = generateValidWatch();
      const watch2 = {
        ...generateValidWatch(),
        _id: watch1._id, // Same channelId
      };

      await mongoService.watch.insertOne(watch1);

      await expect(mongoService.watch.insertOne(watch2)).rejects.toThrow();
    });
  });
});
