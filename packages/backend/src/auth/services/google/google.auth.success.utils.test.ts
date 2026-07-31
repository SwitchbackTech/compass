import { faker } from "@faker-js/faker";
import { ObjectId } from "mongodb";
import * as userQueries from "@backend/user/queries/user.queries";
import { determineGoogleAuthMode } from "./util/google.auth.util";
import { describe, expect, it, spyOn } from "bun:test";

describe("determineGoogleAuthMode", () => {
  it("returns SIGNUP when there is no linked Compass user", async () => {
    const googleUserId = faker.string.uuid();
    spyOn(userQueries, "findCanonicalCompassUser").mockResolvedValue(null);

    await expect(
      determineGoogleAuthMode(googleUserId, null, true),
    ).resolves.toEqual({
      authMode: "SIGNUP",
      compassUserId: null,
      createdNewRecipeUser: true,
    });

    expect(userQueries.findCanonicalCompassUser).toHaveBeenCalledWith({
      googleUserId,
      email: null,
    });
  });

  it("returns SIGNIN when a Compass user is already linked", async () => {
    const user = { _id: new ObjectId() };
    spyOn(userQueries, "findCanonicalCompassUser").mockResolvedValue(user);

    await expect(
      determineGoogleAuthMode(faker.string.uuid(), null, false),
    ).resolves.toEqual({
      authMode: "SIGNIN",
      compassUserId: user._id.toString(),
      createdNewRecipeUser: false,
    });
  });

  it("reuses a same-email Compass user when Google is not linked yet", async () => {
    const user = { _id: new ObjectId() };
    const googleUserId = faker.string.uuid();
    spyOn(userQueries, "findCanonicalCompassUser").mockResolvedValueOnce(user);

    await expect(
      determineGoogleAuthMode(googleUserId, " Existing@Example.com ", false),
    ).resolves.toEqual({
      authMode: "SIGNIN",
      compassUserId: user._id.toString(),
      createdNewRecipeUser: false,
    });

    expect(userQueries.findCanonicalCompassUser).toHaveBeenCalledWith({
      googleUserId,
      email: " Existing@Example.com ",
    });
  });
});
