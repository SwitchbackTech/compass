import { BaseError } from "../../errors/errors.base";
import { mapUserToCompass } from "../../mappers/map.user";

describe("Map to Compass", () => {
  it("adds placeholders for acceptible fields", () => {
    const gUser = {
      iss: "https://accounts.google.com",
      azp: "111111520146-mqq17c111hgpgn907j79kgnse1o0lchk.apps.googleusercontent.com",
      aud: "111111520146-mqq17c111hgpgn907j79kgnse1o0lchk.apps.googleusercontent.com",
      sub: "777777778083505439444",
      email: "foobar@gmail.com",
      email_verified: true,
      at_hash: "YYynQxmPcrF3xGKXgJCB4g",
      locale: "en",
      iat: 1675219731,
      exp: 1675223331,
    };
    const cUser = mapUserToCompass(gUser, "refreshToken123");
    expect(cUser.name).toEqual("Mystery Person");
    expect(cUser.firstName).toEqual("Mystery");
    expect(cUser.lastName).toEqual("Person");
    expect(cUser.google.picture).toEqual("not provided");
  });
  it("throws error if missing email", () => {
    expect(() => {
      mapUserToCompass({}, "refeshToken");
    }).toThrow(BaseError);
  });
  it("throws error if missing refresh token", () => {
    expect(() => {
      mapUserToCompass({ email: "foobar@gmail.com" }, null);
    }).toThrow(BaseError);
  });
});
