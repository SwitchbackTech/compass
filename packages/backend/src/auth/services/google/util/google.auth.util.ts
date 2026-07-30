import { type Credentials, type TokenPayload } from "google-auth-library";
import { StringV4Schema, zObjectId } from "@core/types/type.utils";
import { findCanonicalCompassUser } from "@backend/user/queries/user.queries";
import {
  type AuthDecision,
  type ParsedReconnectGoogleParams,
} from "../google.auth.types";

export async function determineGoogleAuthMode(
  googleUserId: string,
  email: string | null | undefined,
  createdNewRecipeUser: boolean,
): Promise<AuthDecision> {
  const user = await findCanonicalCompassUser({ googleUserId, email });

  if (!user) {
    return {
      authMode: "SIGNUP",
      compassUserId: null,
      createdNewRecipeUser,
    };
  }

  return {
    authMode: "SIGNIN",
    compassUserId: user._id.toString(),
    createdNewRecipeUser,
  };
}

export function parseReconnectGoogleParams(
  compassUserId: string,
  gUser: TokenPayload,
  oAuthTokens: Pick<Credentials, "refresh_token" | "access_token">,
): ParsedReconnectGoogleParams {
  const cUserId = zObjectId.parse(compassUserId).toString();
  StringV4Schema.parse(gUser.sub);
  const refreshToken = StringV4Schema.parse(oAuthTokens.refresh_token);
  return { cUserId, gUser, refreshToken };
}
