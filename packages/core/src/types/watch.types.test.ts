import { faker } from "@faker-js/faker";
import { Watch, WatchSchema } from "@core/types/watch.types";

describe("Watch Types", () => {
  const validWatch: Watch = {
    _id: faker.string.uuid(),
    user: faker.database.mongodbObjectId(),
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

    it("accepts valid MongoDB ObjectId for user", () => {
      const watchData = {
        ...validWatch,
        user: faker.database.mongodbObjectId(),
      };

      expect(() => WatchSchema.parse(watchData)).not.toThrow();
    });

    it("rejects invalid MongoDB ObjectId for user", () => {
      const watchData = {
        ...validWatch,
        user: "invalid-object-id",
      };

      expect(() => WatchSchema.parse(watchData)).toThrow();
    });

    it("requires all mandatory fields", () => {
      const requiredFields = ["_id", "user", "resourceId", "expiration"];

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
});
