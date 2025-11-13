import { TokenPayload } from "google-auth-library";
import { ObjectId, WithId } from "mongodb";
import { faker } from "@faker-js/faker";
import { Schema_User } from "@core/types/user.types";
import userService from "../../user/services/user.service";

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

  static async createUser(): Promise<WithId<Schema_User>> {
    const gUser = UserDriver.generateGoogleUser();
    const gRefreshToken = faker.internet.jwt();

    const { userId, ...user } = await userService.createUser(
      gUser,
      gRefreshToken,
    );

    return { ...user, _id: new ObjectId(userId) };
  }

  static async createUsers(count: number): Promise<Array<WithId<Schema_User>>> {
    return Promise.all(Array.from({ length: count }, UserDriver.createUser));
  }
}
