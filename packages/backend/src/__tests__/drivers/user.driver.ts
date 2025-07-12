import { WithId } from "mongodb";
import { faker } from "@faker-js/faker";
import { Schema_User } from "@core/types/user.types";
import mongoService from "@backend/common/services/mongo.service";

export class UserDriver {
  static async createUser(): Promise<WithId<Schema_User>> {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    const user: Schema_User = {
      email: faker.internet.email(),
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      locale: faker.location.language().alpha2,
      google: {
        googleId: faker.string.uuid(),
        picture: faker.internet.url({ protocol: "https" }),
        gRefreshToken: faker.internet.jwt(),
      },
    };

    const created = await mongoService.user.insertOne(user);

    return { _id: created.insertedId, ...user };
  }
}
