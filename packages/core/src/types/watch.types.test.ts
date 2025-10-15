import { ObjectId } from "bson";
import { faker } from "@faker-js/faker";
import { Schema_Watch, WatchSchema } from "@core/types/watch.types";
import dayjs from "@core/util/date/dayjs";

describe("Watch Types", () => {
  const validWatch: Schema_Watch = {
    _id: new ObjectId(),
    gCalendarId: "primary",
    user: faker.database.mongodbObjectId(),
    resourceId: faker.string.alphanumeric(20),
    expiration: faker.date.future({
      refDate: dayjs().add(5, "minutes").toDate(),
    }),
    createdAt: new Date(),
  };

  describe("WatchSchema", () => {
    it("parses valid watch data", () => {
      expect(() => WatchSchema.parse(validWatch)).not.toThrow();
      expect(WatchSchema.parse(validWatch).expiration).toBeInstanceOf(Date);
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
        delete incompleteWatch[field as keyof Schema_Watch];

        expect(() => WatchSchema.parse(incompleteWatch)).toThrow();
      });
    });

    it("rejects empty gCalendarId", () => {
      const watchData = { ...validWatch, gCalendarId: "" };

      expect(() => WatchSchema.parse(watchData)).toThrow();
    });

    it("rejects empty resourceId", () => {
      const watchData = { ...validWatch, resourceId: "" };

      expect(() => WatchSchema.parse(watchData)).toThrow();
    });

    it("accepts missing createdAt and sets default", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { createdAt, ...watchData } = validWatch;
      const parsed = WatchSchema.parse(watchData);

      expect(parsed.createdAt).toBeInstanceOf(Date);
    });

    it("rejects missing gCalendarId", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { gCalendarId, ...watchData } = validWatch;

      expect(() => WatchSchema.parse(watchData)).toThrow();
    });

    it("rejects missing resourceId", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { resourceId, ...watchData } = validWatch;

      expect(() => WatchSchema.parse(watchData)).toThrow();
    });

    it("rejects expiration dates less than 5 minutes in the future", () => {
      const soonExpiration = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
      const watchData = { ...validWatch, expiration: soonExpiration };

      expect(() => WatchSchema.parse(watchData)).toThrow();
    });

    it("accepts expiration dates at least 5 minutes in the future", () => {
      const futureExpiration = new Date(Date.now() + 6 * 60 * 1000); // 6 minutes from now
      const watchData = { ...validWatch, expiration: futureExpiration };

      expect(() => WatchSchema.parse(watchData)).not.toThrow();
      expect(WatchSchema.parse(watchData).expiration).toBeInstanceOf(Date);
    });

    it("parses expiration as string if valid ISO and in future", () => {
      const isoExpiration = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const watchData = { ...validWatch, expiration: isoExpiration };

      expect(() => WatchSchema.parse(watchData)).not.toThrow();
      expect(WatchSchema.parse(watchData).expiration).toBeInstanceOf(Date);
    });

    it("rejects invalid expiration string", () => {
      const watchData = { ...validWatch, expiration: "not-a-date" };

      expect(() => WatchSchema.parse(watchData)).toThrow();
    });
  });
});
