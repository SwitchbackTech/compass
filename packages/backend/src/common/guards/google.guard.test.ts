import { ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";
import { Schema_User } from "@core/types/user.types";
import { UserError } from "@backend/common/errors/user/user.errors";
import {
  isGoogleConnected,
  requireGoogleConnection,
} from "@backend/common/guards/google.guard";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

jest.mock("@backend/user/queries/user.queries", () => ({
  findCompassUserBy: jest.fn(),
}));

const mockFindCompassUserBy = findCompassUserBy as jest.MockedFunction<
  typeof findCompassUserBy
>;

describe("google.guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("hasGoogleConnected", () => {
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

      mockFindCompassUserBy.mockResolvedValue(userWithGoogle);

      const result = await isGoogleConnected(userId);

      expect(result).toBe(true);
      expect(mockFindCompassUserBy).toHaveBeenCalledWith("_id", userId);
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

      mockFindCompassUserBy.mockResolvedValue(userWithoutGoogle);

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

      mockFindCompassUserBy.mockResolvedValue(userWithEmptyGoogle);

      const result = await isGoogleConnected(userId);

      expect(result).toBe(false);
    });

    it("returns false when user is not found", async () => {
      const userId = new ObjectId().toString();
      mockFindCompassUserBy.mockResolvedValue(null);

      const result = await isGoogleConnected(userId);

      expect(result).toBe(false);
    });
  });

  describe("requireGoogleConnected", () => {
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

      mockFindCompassUserBy.mockResolvedValue(userWithGoogle);

      await expect(requireGoogleConnection(userId)).resolves.not.toThrow();
    });

    it("throws when userId is not a valid ObjectId", async () => {
      await expect(
        requireGoogleConnection("not-an-object-id"),
      ).rejects.toMatchObject({
        description: UserError.InvalidValue.description,
      });
      expect(mockFindCompassUserBy).not.toHaveBeenCalled();
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

      mockFindCompassUserBy.mockResolvedValue(userWithoutGoogle);

      await expect(requireGoogleConnection(userId)).rejects.toMatchObject({
        description: UserError.MissingGoogleField.description,
      });
    });
  });
});
