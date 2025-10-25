import { decode } from "jsonwebtoken";
import { WithId } from "mongodb";
import { z } from "zod/v4";
import { faker } from "@faker-js/faker";
import { UserInfo_Google } from "@core/types/auth.types";
import { CalendarProvider } from "@core/types/calendar.types";
import { StringV4Schema } from "@core/types/type.utils";
import { Schema_User } from "@core/types/user.types";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import userService from "@backend/user/services/user.service";
import { CalendarDriver } from "./calendar.driver";

export class UserDriver {
  static generateGoogleUser(
    overrides: Partial<UserInfo_Google["gUser"]> = {},
  ): UserInfo_Google["gUser"] {
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

  static generateGoogleRefreshToken(gUser: UserInfo_Google["gUser"]): string {
    return faker.internet.jwt({
      payload: { sub: gUser.sub, email: gUser.email, iss: "google" },
    });
  }

  static decodeGoogleRefreshToken(gRefreshToken: string): {
    sub: string;
    email: string;
    iss: "google";
  } {
    const token = StringV4Schema.parse(gRefreshToken, {
      error: () => "invalid or no google refresh token supplied",
    });

    const decoded = decode(token) as Record<string, unknown>;

    return {
      email: z.email().parse(decoded["email"]),
      sub: StringV4Schema.parse(decoded["sub"]),
      iss: z.literal("google").parse(decoded["iss"]),
    };
  }

  static async createGoogleAuthUser(): Promise<WithId<Schema_User>> {
    const testState = UtilDriver.getProviderTestState(CalendarProvider.GOOGLE);
    const gUser = UserDriver.generateGoogleUser();
    const gRefreshToken = UserDriver.generateGoogleRefreshToken(gUser);

    testState.set(gUser.sub, {
      calendars: new Map(CalendarDriver.createCalendarTestState()),
      channels: [],
    });

    const user = await userService.initUserData(gUser, gRefreshToken);

    return user;
  }

  static async createUsers(count: number): Promise<Array<WithId<Schema_User>>> {
    return Promise.all(
      Array.from({ length: count }, UserDriver.createGoogleAuthUser),
    );
  }
}
