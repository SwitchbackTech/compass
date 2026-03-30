import { type Credentials, type TokenPayload } from "google-auth-library";
import { StringV4Schema, zObjectId } from "@core/types/type.utils";
import { getSync } from "@backend/sync/util/sync.queries";
import { canDoIncrementalSync } from "@backend/sync/util/sync.util";
import { findCanonicalCompassUser } from "@backend/user/queries/user.queries";
import { type AuthDecision } from "../google.auth.types";
import { type ParsedReconnectGoogleParams } from "../google.auth.types";

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
      hasStoredRefreshToken: false,
      hasHealthySync: false,
      createdNewRecipeUser,
    };
  }

  const compassUserId = user._id.toString();
  const hasStoredRefreshToken = !!user.google?.gRefreshToken;
  const sync = await getSync({ userId: compassUserId });
  const hasHealthySync = sync ? !!canDoIncrementalSync(sync) : false;

  if (!hasStoredRefreshToken || !hasHealthySync) {
    return {
      authMode: "RECONNECT_REPAIR",
      compassUserId,
      hasStoredRefreshToken,
      hasHealthySync,
      createdNewRecipeUser,
    };
  }

  return {
    authMode: "SIGNIN_INCREMENTAL",
    compassUserId,
    hasStoredRefreshToken,
    hasHealthySync,
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
