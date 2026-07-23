import { faker } from "@faker-js/faker";
import { ObjectId } from "mongodb";
import { IDSchema } from "@core/types/type.utils";
import { type Schema_User } from "@core/types/user.types";
import { UserError } from "@backend/common/errors/user/user.errors";
import { requireGoogleConnection } from "@backend/common/guards/google.guard";
import * as userQueries from "@backend/user/queries/user.queries";
import { beforeEach, describe, expect, it, spyOn } from "bun:test";

const isGoogleConnected = async (userId: string): Promise<boolean> => {
  if (!IDSchema.safeParse(userId).success) {
    return false;
  }
  const user = await userQueries.findCompassUserBy("_id", userId);
  return !!user?.google?.gRefreshToken;
};

describe("google.guard", () => {
  beforeEach(() => {
    if (
      typeof (userQueries.findCompassUserBy as { mockClear?: () => void })
        .mockClear === "function"
    ) {
      (userQueries.findCompassUserBy as Mock).mockClear();
    }
  });

  describe("isGoogleConnected", () => {
    it("returns true when user has google.gRefreshToken", async () => {
      const userId = new ObjectId().toString();
      const userWithGoogle: Schema_User & { _id: ObjectId } = {
        _id: new ObjectId(userId),
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        name: faker.person.fullName(),
        locale: "en",
        google: {
          googleId: faker.string.uuid(),
          picture: faker.image.url(),
          gRefreshToken: "valid-refresh-token",
        },
      };

      spyOn(userQueries, "findCompassUserBy").mockResolvedValue(userWithGoogle);

      const result = await isGoogleConnected(userId);

      expect(result).toBe(true);
      expect(userQueries.findCompassUserBy).toHaveBeenCalledWith("_id", userId);
    });

    it("returns false when user has no google", async () => {
      const userId = new ObjectId().toString();
      const userWithoutGoogle: Schema_User & { _id: ObjectId } = {
        _id: new ObjectId(userId),
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        name: faker.person.fullName(),
        locale: "en",
      };

      spyOn(userQueries, "findCompassUserBy").mockResolvedValue(
        userWithoutGoogle,
      );

      const result = await isGoogleConnected(userId);

      expect(result).toBe(false);
    });

    it("returns false when user has google but empty gRefreshToken", async () => {
      const userId = new ObjectId().toString();
      const userWithEmptyGoogle = {
        _id: new ObjectId(userId),
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        name: faker.person.fullName(),
        locale: "en",
        google: {
          googleId: faker.string.uuid(),
          picture: faker.image.url(),
          gRefreshToken: "",
        },
      };

      spyOn(userQueries, "findCompassUserBy").mockResolvedValue(
        userWithEmptyGoogle,
      );

      const result = await isGoogleConnected(userId);

      expect(result).toBe(false);
    });

    it("returns false when user is not found", async () => {
      const userId = new ObjectId().toString();
      spyOn(userQueries, "findCompassUserBy").mockResolvedValue(null);

      const result = await isGoogleConnected(userId);

      expect(result).toBe(false);
    });
  });

  describe("requireGoogleConnection", () => {
    it("does not throw when user has google.gRefreshToken", async () => {
      const userId = new ObjectId().toString();
      const userWithGoogle: Schema_User & { _id: ObjectId } = {
        _id: new ObjectId(userId),
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        name: faker.person.fullName(),
        locale: "en",
        google: {
          googleId: faker.string.uuid(),
          picture: faker.image.url(),
          gRefreshToken: "valid-refresh-token",
        },
      };

      spyOn(userQueries, "findCompassUserBy").mockResolvedValue(userWithGoogle);

      await expect(requireGoogleConnection(userId)).resolves.toBeUndefined();
    });

    it("throws when userId is not a valid ObjectId", async () => {
      const findSpy = spyOn(userQueries, "findCompassUserBy");

      await expect(
        requireGoogleConnection("not-an-object-id"),
      ).rejects.toMatchObject({
        description: UserError.InvalidValue.description,
      });
      expect(findSpy).not.toHaveBeenCalled();
    });

    it("throws UserError.UserNotFound when user does not exist", async () => {
      const userId = new ObjectId().toString();
      spyOn(userQueries, "findCompassUserBy").mockResolvedValue(null);

      await expect(requireGoogleConnection(userId)).rejects.toMatchObject({
        description: UserError.UserNotFound.description,
      });
    });

    it("throws when user has no google.gRefreshToken", async () => {
      const userId = new ObjectId().toString();
      const userWithoutGoogle: Schema_User & { _id: ObjectId } = {
        _id: new ObjectId(userId),
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        name: faker.person.fullName(),
        locale: "en",
      };

      spyOn(userQueries, "findCompassUserBy").mockResolvedValue(
        userWithoutGoogle,
      );

      await expect(requireGoogleConnection(userId)).rejects.toMatchObject({
        description: UserError.MissingGoogleRefreshToken.description,
      });
    });
  });
});
