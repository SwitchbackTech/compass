import { faker } from "@faker-js/faker";
import { GaxiosError } from "gaxios";
import { ObjectId } from "mongodb";
import { type Schema_User } from "@core/types/user.types";
import { UserError } from "@backend/common/errors/user/user.errors";
import { getGcalClient } from "@backend/sync/services/google-sync/gcal.client";
import * as userQueries from "@backend/user/queries/user.queries";
import { describe, expect, it, spyOn } from "bun:test";

describe("getGcalClient", () => {
  it("throws UserError.MissingGoogleRefreshToken when user exists but has no google", async () => {
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

    await expect(getGcalClient(userId)).rejects.toMatchObject({
      description: UserError.MissingGoogleRefreshToken.description,
    });

    expect(userQueries.findCompassUserBy).toHaveBeenCalledWith("_id", userId);
  });

  it("throws UserError.MissingGoogleRefreshToken when user has google but no gRefreshToken", async () => {
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

    await expect(getGcalClient(userId)).rejects.toMatchObject({
      description: UserError.MissingGoogleRefreshToken.description,
    });
  });

  it("throws GaxiosError when user is not found", async () => {
    const userId = new ObjectId().toString();
    spyOn(userQueries, "findCompassUserBy").mockResolvedValue(null);

    await expect(getGcalClient(userId)).rejects.toThrow(GaxiosError);
    expect(userQueries.findCompassUserBy).toHaveBeenCalledWith("_id", userId);
  });
});
