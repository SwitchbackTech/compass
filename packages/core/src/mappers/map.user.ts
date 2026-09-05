import { type TokenPayload } from "google-auth-library";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import {
  type Schema_User,
  type Schema_UserIdentity,
} from "@core/types/user.types";

/**
 * Dual-write the Google login slot into `identities[]` without duplicating
 * an existing google identity. `google.googleId` remains the one-release
 * legacy field; this is the identities copy.
 */
export const mergeGoogleLoginIdentity = (
  identities: Schema_UserIdentity[] | undefined,
  google: Schema_User["google"] | undefined,
  email: string,
  displayName?: string,
  linkedAt?: Date,
): Schema_UserIdentity[] | undefined => {
  if (!google?.googleId) {
    return identities;
  }

  const existing = identities ?? [];
  if (
    existing.some(
      (identity) =>
        identity.provider === "google" &&
        identity.subjectId === google.googleId,
    )
  ) {
    return existing;
  }

  const next: Schema_UserIdentity = {
    provider: "google",
    subjectId: google.googleId,
    email,
    picture: google.picture,
    linkedAt: linkedAt ?? new Date(),
  };
  if (displayName) {
    next.displayName = displayName;
  }

  return [...existing, next];
};

// Map  user object given by google signin to our schema //
export const mapUserToCompass = (gUser: TokenPayload): Schema_User => {
  if (!gUser.email) {
    throw new BaseError(
      `Failed to Map Google User to Compass. \ngUser: ${JSON.stringify(gUser)}`,
      "Missing Required GUser Field",
      Status.NOT_FOUND,
      true,
    );
  }

  const google = {
    googleId: gUser.sub,
    picture: gUser.picture || "not provided",
  };

  return {
    email: gUser.email,
    name: gUser.name || "Mystery Person",
    firstName: gUser.given_name || "Mystery",
    lastName: gUser.family_name || "Person",
    locale: gUser.locale || "not provided",
    google,
    identities: mergeGoogleLoginIdentity(
      undefined,
      google,
      gUser.email,
      gUser.name,
    ),
  };
};
