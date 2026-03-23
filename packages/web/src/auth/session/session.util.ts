import { session } from "@web/common/classes/Session";
import { UNAUTHENTICATED_USER } from "@web/common/constants/auth.constants";
import { isExpectedSessionAuthError } from "./session.error.util";

interface AccessTokenPayload {
  sub: string;
}

export const getUserId = async () => {
  try {
    const sessionExists = await session.doesSessionExist();

    if (!sessionExists) {
      return UNAUTHENTICATED_USER;
    }

    const accessTokenPayload =
      (await session.getAccessTokenPayloadSecurely()) as AccessTokenPayload;
    const userId = accessTokenPayload["sub"];
    return userId;
  } catch (error) {
    if (!isExpectedSessionAuthError(error)) {
      console.error("Failed to resolve user id from session:", error);
    }

    return UNAUTHENTICATED_USER;
  }
};
