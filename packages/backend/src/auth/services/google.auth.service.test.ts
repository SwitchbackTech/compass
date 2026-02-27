import { GaxiosError } from "gaxios";
import { ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";
import { Schema_User } from "@core/types/user.types";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { error } from "@backend/common/errors/handlers/error.handler";
import {
  UserError,
  isGoogleNotConnectedError,
} from "@backend/common/errors/user/user.errors";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

jest.mock("@backend/user/queries/user.queries", () => ({
  findCompassUserBy: jest.fn(),
}));

const mockFindCompassUserBy = findCompassUserBy as jest.MockedFunction<
  typeof findCompassUserBy
>;

describe("getGcalClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws UserError.GoogleNotConnected when user exists but has no google", async () => {
    const userId = new ObjectId().toString();
    const userWithoutGoogle: Schema_User & { _id: ObjectId } = {
      _id: new ObjectId(userId),
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      name: faker.person.fullName(),
      locale: "en",
      // google is undefined - user signed up with email/password
    };

    mockFindCompassUserBy.mockResolvedValue(userWithoutGoogle);

    await expect(getGcalClient(userId)).rejects.toMatchObject({
      description: UserError.GoogleNotConnected.description,
    });

    expect(mockFindCompassUserBy).toHaveBeenCalledWith("_id", userId);
  });

  it("throws UserError.GoogleNotConnected when user has google but no gRefreshToken", async () => {
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
        gRefreshToken: "", // empty token - invalid
      },
    };

    mockFindCompassUserBy.mockResolvedValue(userWithEmptyGoogle);

    await expect(getGcalClient(userId)).rejects.toMatchObject({
      description: UserError.GoogleNotConnected.description,
    });
  });

  it("throws GaxiosError when user is not found", async () => {
    const userId = new ObjectId().toString();
    mockFindCompassUserBy.mockResolvedValue(null);

    await expect(getGcalClient(userId)).rejects.toThrow(GaxiosError);
    expect(mockFindCompassUserBy).toHaveBeenCalledWith("_id", userId);
  });

  it("isGoogleNotConnectedError returns true for GoogleNotConnected error", () => {
    const googleNotConnectedError = error(
      UserError.GoogleNotConnected,
      "User has not connected Google Calendar",
    );

    expect(isGoogleNotConnectedError(googleNotConnectedError)).toBe(true);
    expect(isGoogleNotConnectedError(new Error("other"))).toBe(false);
  });
});
