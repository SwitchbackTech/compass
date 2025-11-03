import { TokenPayload } from "google-auth-library";
import { decode } from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { z } from "zod/v4";
import { faker } from "@faker-js/faker";
import { CalendarProvider } from "@core/types/calendar.types";
import { StringV4Schema } from "@core/types/type.utils";
import { CalendarDriver } from "@backend/__tests__/drivers/calendar.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";

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
      sub: new ObjectId().toString(),
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

  static generateGoogleRefreshToken(
    gUser: Pick<TokenPayload, "sub" | "email">,
  ): string {
    return faker.internet.jwt({
      payload: { sub: gUser.sub, email: gUser.email, iss: "google" },
    });
  }

  static decodeGoogleRefreshToken(gRefreshToken?: string | null): {
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

  static createGoogleAuthUser(): {
    gUser: TokenPayload;
    gRefreshToken: string;
  } {
    const testState = UtilDriver.getProviderTestState(CalendarProvider.GOOGLE);
    const gUser = UserDriver.generateGoogleUser();
    const gRefreshToken = UserDriver.generateGoogleRefreshToken(gUser);

    testState.set(gUser.sub, {
      calendars: new Map(CalendarDriver.createCalendarTestState()),
      channels: [],
    });

    return { gUser, gRefreshToken };
  }
}
