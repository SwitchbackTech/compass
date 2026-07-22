import { faker } from "@faker-js/faker";
import { type Credentials, type TokenPayload } from "google-auth-library";
import { ObjectId } from "mongodb";
import * as syncRecords from "@backend/sync/services/records/sync-records.repository";
import * as userQueries from "@backend/user/queries/user.queries";
import {
  determineGoogleAuthMode,
  parseReconnectGoogleParams,
} from "./google.auth.util";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

function makeCompassUser(overrides?: {
  googleId?: string;
  hasRefreshToken?: boolean;
}) {
  return {
    _id: new ObjectId(),
    google: {
      googleId: overrides?.googleId ?? faker.string.uuid(),
      gRefreshToken:
        overrides?.hasRefreshToken === false ? null : faker.string.uuid(),
    },
  };
}

describe("determineGoogleAuthMode", () => {

  it("returns SIGNUP when there is no linked Compass user", async () => {
    const googleUserId = faker.string.uuid();
    spyOn(userQueries, "findCanonicalCompassUser").mockResolvedValue(null);

    await expect(
      determineGoogleAuthMode(googleUserId, null, true),
    ).resolves.toEqual({
      authMode: "SIGNUP",
      compassUserId: null,
      hasStoredRefreshToken: false,
      hasHealthySync: false,
      createdNewRecipeUser: true,
    });

    expect(userQueries.findCanonicalCompassUser).toHaveBeenCalledWith({
      googleUserId,
      email: null,
    });
  });

  it("returns RECONNECT_REPAIR when the user is missing a stored refresh token", async () => {
    const user = makeCompassUser({ hasRefreshToken: false });
    spyOn(userQueries, "findCanonicalCompassUser").mockResolvedValue(user);
    spyOn(syncRecords, "getSync").mockResolvedValue({
      google: { events: [{ nextSyncToken: "x" }] },
    });
    spyOn(syncRecords, "canDoIncrementalSync").mockReturnValue(true);

    await expect(
      determineGoogleAuthMode(user.google.googleId, null, false),
    ).resolves.toEqual({
      authMode: "RECONNECT_REPAIR",
      compassUserId: user._id.toString(),
      hasStoredRefreshToken: false,
      hasHealthySync: true,
      createdNewRecipeUser: false,
    });
  });

  it("returns RECONNECT_REPAIR when sync is not healthy", async () => {
    const user = makeCompassUser();
    spyOn(userQueries, "findCanonicalCompassUser").mockResolvedValue(user);
    spyOn(syncRecords, "getSync").mockResolvedValue({ google: { events: [] } });
    spyOn(syncRecords, "canDoIncrementalSync").mockReturnValue(false);

    await expect(
      determineGoogleAuthMode(user.google.googleId, null, false),
    ).resolves.toEqual({
      authMode: "RECONNECT_REPAIR",
      compassUserId: user._id.toString(),
      hasStoredRefreshToken: true,
      hasHealthySync: false,
      createdNewRecipeUser: false,
    });
  });

  it("returns SIGNIN_INCREMENTAL when the user has a refresh token and healthy sync", async () => {
    const user = makeCompassUser();
    spyOn(userQueries, "findCanonicalCompassUser").mockResolvedValue(user);
    spyOn(syncRecords, "getSync").mockResolvedValue({
      google: { events: [{ nextSyncToken: "token" }] },
    });
    spyOn(syncRecords, "canDoIncrementalSync").mockReturnValue(true);

    await expect(
      determineGoogleAuthMode(user.google.googleId, null, false),
    ).resolves.toEqual({
      authMode: "SIGNIN_INCREMENTAL",
      compassUserId: user._id.toString(),
      hasStoredRefreshToken: true,
      hasHealthySync: true,
      createdNewRecipeUser: false,
    });
  });

  it("reuses a same-email Compass user when Google is not linked yet", async () => {
    const user = { _id: new ObjectId() };
    const googleUserId = faker.string.uuid();
    spyOn(userQueries, "findCanonicalCompassUser").mockResolvedValueOnce(user);
    spyOn(syncRecords, "getSync").mockResolvedValue(null);

    await expect(
      determineGoogleAuthMode(googleUserId, " Existing@Example.com ", false),
    ).resolves.toEqual({
      authMode: "RECONNECT_REPAIR",
      compassUserId: user._id.toString(),
      hasStoredRefreshToken: false,
      hasHealthySync: false,
      createdNewRecipeUser: false,
    });

    expect(userQueries.findCanonicalCompassUser).toHaveBeenCalledWith({
      googleUserId,
      email: " Existing@Example.com ",
    });
  });
});

describe("parseReconnectGoogleParams", () => {
  it("parses/validates and returns cUserId, gUser, and refreshToken", () => {
    const compassObjectId = new ObjectId();
    const compassUserId = compassObjectId.toString();

    const gUser: TokenPayload = {
      sub: faker.string.uuid(),
    } as TokenPayload;

    const refreshToken = faker.string.uuid();
    const oAuthTokens: Pick<Credentials, "refresh_token" | "access_token"> = {
      refresh_token: refreshToken,
      access_token: faker.internet.jwt(),
    };

    const parsed = parseReconnectGoogleParams(
      compassUserId,
      gUser,
      oAuthTokens,
    );

    expect(parsed).toEqual({
      cUserId: compassObjectId.toString(),
      gUser,
      refreshToken,
    });
  });

  it("throws when compassUserId is not a valid ObjectId", () => {
    const gUser: TokenPayload = {
      sub: faker.string.uuid(),
    } as TokenPayload;

    const refreshToken = faker.string.uuid();
    const oAuthTokens: Pick<Credentials, "refresh_token" | "access_token"> = {
      refresh_token: refreshToken,
      access_token: faker.internet.jwt(),
    };

    expect(() =>
      parseReconnectGoogleParams("not-an-object-id", gUser, oAuthTokens),
    ).toThrow();
  });

  it("throws when gUser.sub is empty", () => {
    const compassObjectId = new ObjectId();
    const compassUserId = compassObjectId.toString();

    const gUser: TokenPayload = {
      sub: "",
    } as TokenPayload;

    const refreshToken = faker.string.uuid();
    const oAuthTokens: Pick<Credentials, "refresh_token" | "access_token"> = {
      refresh_token: refreshToken,
      access_token: faker.internet.jwt(),
    };

    expect(() =>
      parseReconnectGoogleParams(compassUserId, gUser, oAuthTokens),
    ).toThrow();
  });

  it("throws when refresh_token is empty", () => {
    const compassObjectId = new ObjectId();
    const compassUserId = compassObjectId.toString();

    const gUser: TokenPayload = {
      sub: faker.string.uuid(),
    } as TokenPayload;

    const oAuthTokens: Pick<Credentials, "refresh_token" | "access_token"> = {
      refresh_token: "",
      access_token: faker.internet.jwt(),
    };

    expect(() =>
      parseReconnectGoogleParams(compassUserId, gUser, oAuthTokens),
    ).toThrow();
  });
});
