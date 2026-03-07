import { type TokenPayload } from "google-auth-library";
import { ObjectId, type WithId } from "mongodb";
import { faker } from "@faker-js/faker";
import { type Schema_User } from "@core/types/user.types";
import mongoService from "@backend/common/services/mongo.service";
import userService from "../../user/services/user.service";

interface CreateUserOptions {
  withGoogleRefreshToken?: boolean;
}

export class UserDriver {
  static generateGoogleUser(
    overrides: Partial<TokenPayload> = {},
  ): TokenPayload {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
      iss: "https://accounts.google.com",
      azp: faker.string.uuid(),
      aud: faker.string.uuid(),
      sub: faker.string.uuid(),
      email: faker.internet.email(),
      email_verified: true,
      at_hash: faker.string.alphanumeric(10),
      name: `${firstName} ${lastName}`,
      given_name: firstName,
      family_name: lastName,
      picture: faker.image.urlPicsumPhotos(),
      locale: "en",
      iat: faker.number.int({ min: 1, max: 1000 }),
      exp: faker.number.int({ min: 1001, max: 2000 }),
      ...overrides,
    };
  }

  static async createUser(
    options: CreateUserOptions = {},
  ): Promise<WithId<Schema_User>> {
    const { withGoogleRefreshToken = true } = options;
    const gUser = UserDriver.generateGoogleUser();
    const gRefreshToken = faker.internet.jwt();

    const { userId, ...user } = await userService.createUser(
      gUser,
      gRefreshToken,
    );

    const _id = new ObjectId(userId);

    // Remove refresh token if requested (simulates revoked token scenario)
    if (!withGoogleRefreshToken) {
      await mongoService.user.updateOne(
        { _id },
        { $unset: { "google.gRefreshToken": "" } },
      );
      // Return user without the refresh token
      const updatedUser = { ...user };
      if (updatedUser.google) {
        delete (updatedUser.google as { gRefreshToken?: string }).gRefreshToken;
      }
      return { ...updatedUser, _id };
    }

    return { ...user, _id };
  }

  static async createUsers(count: number): Promise<Array<WithId<Schema_User>>> {
    return Promise.all(Array.from({ length: count }, UserDriver.createUser));
  }
}
