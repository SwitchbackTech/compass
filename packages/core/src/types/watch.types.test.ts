import { faker } from "@faker-js/faker";
import {
  Watch,
  WatchInput,
  WatchSchema,
  WatchSchemaStrict,
} from "@core/types/watch.types";

describe("Watch Types", () => {
  const validWatch: Watch = {
    _id: faker.string.uuid(),
    userId: faker.database.mongodbObjectId(),
    resourceId: faker.string.alphanumeric(20),
    expiration: faker.date.future(),
    createdAt: new Date(),
  };

  describe("WatchSchema", () => {
    it("parses valid watch data", () => {
      expect(() => WatchSchema.parse(validWatch)).not.toThrow();
    });

    it("defaults createdAt to current date when not provided", () => {
      const watchWithoutCreatedAt = {
        ...validWatch,
        createdAt: undefined,
      };

      const parsed = WatchSchema.parse(watchWithoutCreatedAt);
      expect(parsed.createdAt).toBeInstanceOf(Date);
    });

    it("accepts valid MongoDB ObjectId for userId", () => {
      const watchData = {
        ...validWatch,
        userId: faker.database.mongodbObjectId(),
      };

      expect(() => WatchSchema.parse(watchData)).not.toThrow();
    });

    it("rejects invalid MongoDB ObjectId for userId", () => {
      const watchData = {
        ...validWatch,
        userId: "invalid-object-id",
      };

      expect(() => WatchSchema.parse(watchData)).toThrow();
    });

    it("requires all mandatory fields", () => {
      const requiredFields = ["_id", "userId", "resourceId", "expiration"];

      requiredFields.forEach((field) => {
        const incompleteWatch = { ...validWatch };
        delete incompleteWatch[field as keyof Watch];

        expect(() => WatchSchema.parse(incompleteWatch)).toThrow();
      });
    });

    it("accepts string for _id (channelId)", () => {
      const watchData = {
        ...validWatch,
        _id: "test-channel-id-123",
      };

      expect(() => WatchSchema.parse(watchData)).not.toThrow();
    });

    it("requires expiration to be a Date", () => {
      const watchData = {
        ...validWatch,
        expiration: "2024-12-31T23:59:59Z", // string instead of Date
      };

      expect(() => WatchSchema.parse(watchData)).toThrow();
    });
  });

  describe("WatchSchemaStrict", () => {
    it("rejects additional properties when using strict schema", () => {
      const watchWithExtra = {
        ...validWatch,
        extraProperty: "should-not-be-allowed",
      };

      expect(() => WatchSchemaStrict.parse(watchWithExtra)).toThrow();
    });

    it("accepts valid watch data with strict schema", () => {
      expect(() => WatchSchemaStrict.parse(validWatch)).not.toThrow();
    });
  });

  describe("WatchInput type", () => {
    it("allows creating watch input without createdAt", () => {
      const watchInput: WatchInput = {
        _id: faker.string.uuid(),
        userId: faker.database.mongodbObjectId(),
        resourceId: faker.string.alphanumeric(20),
        expiration: faker.date.future(),
      };

      // This should compile without errors
      expect(watchInput).toBeDefined();
      expect(watchInput.createdAt).toBeUndefined();
    });

    it("allows creating watch input with createdAt", () => {
      const watchInput: WatchInput = {
        _id: faker.string.uuid(),
        userId: faker.database.mongodbObjectId(),
        resourceId: faker.string.alphanumeric(20),
        expiration: faker.date.future(),
        createdAt: new Date(),
      };

      // This should compile without errors
      expect(watchInput).toBeDefined();
      expect(watchInput.createdAt).toBeInstanceOf(Date);
    });
  });
});
