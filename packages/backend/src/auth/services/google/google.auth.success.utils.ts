import { getSync } from "@backend/sync/util/sync.queries";
import { canDoIncrementalSync } from "@backend/sync/util/sync.util";
import { findCompassUserBy } from "@backend/user/queries/user.queries";
import { type AuthDecision } from "./google.auth.types";

export async function determineGoogleAuthMode(
  googleUserId: string,
  createdNewRecipeUser: boolean,
): Promise<AuthDecision> {
  const user = await findCompassUserBy("google.googleId", googleUserId);

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
