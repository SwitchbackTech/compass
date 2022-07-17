import { UserInfo_Google } from "@core/types/auth.types";
import { Schema_User_Base } from "@core/types/user.types";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";

// Map  user object given by google signin to our schema //
export const mapUserToCompass = (
  gUserInfo: UserInfo_Google
): Schema_User_Base => {
  const { gUser } = gUserInfo;

  if (
    !gUser.email ||
    !gUser.name ||
    !gUser.given_name ||
    !gUser.family_name ||
    !gUser.picture ||
    !gUser.locale
  ) {
    throw new BaseError(
      "Missing UserInfo",
      `Required user props missing from ${JSON.stringify(gUser)}`,
      Status.BAD_REQUEST,
      true
    );
  }

  return {
    email: gUser.email,
    name: gUser.name,
    firstName: gUser.given_name,
    lastName: gUser.family_name,
    locale: gUser.locale,
    googleId: gUser.sub,
    picture: gUser.picture || "not provided",
    tokens: gUserInfo.tokens,
  };
};
